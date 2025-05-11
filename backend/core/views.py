# backend/core/views.py

import googlemaps
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import api_view, action, authentication_classes, permission_classes
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from .models import UserProfile, Place, Itinerary
from .serializers import (
    UserProfileSerializer,
    PlaceSerializer,
    ItinerarySerializer,
    SignupSerializer,
    UserSerializer
)
from .utils.tsp_solver import solve_tsp
from .utils.recommender import get_suggestions_along_route

User = get_user_model()
gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    Kullanıcı profilini CRUD için.
    """
    queryset = UserProfile.objects.select_related('user').all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PlaceViewSet(viewsets.ModelViewSet):
    """
    Place modelini CRUD için.
    """
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer
    permission_classes = [permissions.IsAuthenticated]


class ItineraryViewSet(viewsets.ModelViewSet):
    """
    Itinerary CRUD ve ek optimize-route action’ı.
    """
    serializer_class = ItinerarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Sadece o anki kullanıcıya ait itinerary’leri döndür
        user = self.request.user
        if user and user.is_authenticated:
            return Itinerary.objects.filter(user=user).order_by('-created_at')
        return Itinerary.objects.none()

    def perform_create(self, serializer):
        # suggestions, start_location, end_location payload’dan alınıp saklanıyor
        serializer.save(
            user=self.request.user,
            suggestions=self.request.data.get('suggestions', []),
            start_location=self.request.data.get('start_location', {}),
            end_location=self.request.data.get('end_location', {})
        )

    def perform_update(self, serializer):
        # Güncelleme sırasında suggestions ve konumları da al
        serializer.save(
            suggestions=self.request.data.get('suggestions', serializer.instance.suggestions),
            start_location=self.request.data.get('start_location', serializer.instance.start_location),
            end_location=self.request.data.get('end_location',   serializer.instance.end_location)
        )

    @action(detail=True, methods=['post'], url_path='optimize-route')
    def optimize_route(self, request, pk=None):
        """
        POST /api/v1/itineraries/{pk}/optimize-route/
        route içindeki place ID’lerini TSP ile optimize eder,
        __start__/__end__ belirteçlerini koruyarak yeni route oluşturur.
        """
        itinerary = self.get_object()
        current_route = itinerary.route  # liste halinde external_id’ler

        if not isinstance(current_route, list) or len(current_route) < 2:
            return Response(
                {"detail": "Optimize edilecek en az iki nokta gerekli."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Sadece gerçek place ID’leri al (sentinel’ları atla)
        core_ids = [rid for rid in current_route if not rid.startswith("__")]
        if len(core_ids) < 2:
            return Response(
                {"detail": "Yeterli geçerli yer yok (min 2)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Place ve koordinatları çek
        places = Place.objects.filter(external_id__in=core_ids)
        place_map = {p.external_id: p for p in places}
        coords = []
        valid_ids = []
        for ext_id in core_ids:
            p = place_map.get(ext_id)
            if not p:
                return Response(
                    {"detail": f"Place '{ext_id}' veritabanında bulunamadı."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            coords.append((p.latitude, p.longitude))
            valid_ids.append(ext_id)

        # TSP çöz
        optimized_indices = solve_tsp(coords)
        if optimized_indices is None:
            return Response(
                {"detail": "Rota optimize edilemedi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        optimized_core_ids = [valid_ids[i] for i in optimized_indices]

        # Yeni route listesi: sentinel’ları koru, geriye optimize edilmiş sıralamayı yerleştir
        new_route = []
        idx_ptr = 0
        for rid in current_route:
            if isinstance(rid, str) and rid.startswith("__"):
                new_route.append(rid)
            else:
                new_route.append(optimized_core_ids[idx_ptr])
                idx_ptr += 1

        itinerary.route = new_route
        itinerary.save()
        serializer = self.get_serializer(itinerary)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlanViewSet(viewsets.ViewSet):
    """
    POST /api/v1/plan/
    text + waypoints girilince preferansları ve suggestions listesini döner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        text = request.data.get("text", "").strip()
        wps  = request.data.get("waypoints", [])
        if not text or not isinstance(wps, list) or not wps:
            return Response(
                {"detail": "text ve en az bir waypoint (latitude/longitude) gerekli."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # waypoints tuple listesine çevir
        waypoints = []
        for wp in wps:
            try:
                waypoints.append((float(wp["latitude"]), float(wp["longitude"])))
            except:
                return Response(
                    {"detail": "Her waypoint latitude ve longitude içermeli."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        prefs, suggestions = get_suggestions_along_route(
            text, waypoints,
            samples_per_segment=5,
            radius=5000,
            limit=5
        )

        serialized = PlaceSerializer(suggestions, many=True).data
        return Response({
            "preferences": prefs,
            "waypoints":   wps,
            "suggestions": serialized
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])  # Public endpoint
@permission_classes([])
def optimize_itinerary(request):
    """
    POST /api/v1/optimize-itinerary/
    route + fixed (start/end) verilince Google Directions + OR-Tools ile optimize eder.
    """
    route_ids = request.data.get('route', [])
    fixed     = request.data.get('fixed', {})
    if not route_ids or fixed.get('start') not in route_ids or fixed.get('end') not in route_ids:
        return Response(
            {"detail": "Invalid route or fixed points."},
            status=status.HTTP_400_BAD_REQUEST
        )

    places = list(Place.objects.filter(external_id__in=route_ids))
    id_to_place = {p.external_id: p for p in places}

    coords = [(id_to_place[e].latitude, id_to_place[e].longitude) for e in route_ids]
    start_idx = route_ids.index(fixed['start'])
    end_idx   = route_ids.index(fixed['end'])

    optimized_order = solve_tsp(coords, start_index=start_idx, end_index=end_idx)
    if optimized_order is None:
        return Response(
            {"detail": "Rota optimize edilemedi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    optimized_ids = [route_ids[i] for i in optimized_order]
    return Response({"optimized_route": optimized_ids}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class SignupView(generics.CreateAPIView):
    """
    Public user signup.
    """
    serializer_class       = SignupSerializer
    permission_classes     = [permissions.AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "user":  UserSerializer(user).data,
            "token": token.key
        }, status=status.HTTP_201_CREATED)


class CustomAuthToken(ObtainAuthToken):
    """
    Public login, token döner.
    """
    permission_classes     = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user  = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token':    token.key,
            'user_id':  user.pk,
            'username': user.username
        })
