# backend/core/views.py
import googlemaps
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action, authentication_classes
from .models import UserProfile, Place, Itinerary
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.utils.tsp_solver import solve_tsp
from core.models import Place
from .serializers import (
    UserProfileSerializer, PlaceSerializer, ItinerarySerializer
)
from .utils.tsp_solver import solve_tsp
from core.utils.recommender import get_suggestions_along_route



class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.select_related('user').all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticated]


class ItineraryViewSet(viewsets.ModelViewSet):
    queryset = Itinerary.objects.select_related('user').all()
    serializer_class = ItinerarySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def optimize(self, request, pk=None):
        """
        POST /api/v1/itineraries/{id}/optimize/
        Mevcut rota (external_id listesi) için TSP optimizasyonu yapar,
        güncellenmiş sıralamayı kaydeder ve döner.
        """
        itinerary = self.get_object()
        external_ids = itinerary.route or []

        # 1) Place nesnelerini çek
        places = Place.objects.filter(external_id__in=external_ids)
        place_map = {p.external_id: p for p in places}
        coords = []
        for eid in external_ids:
            p = place_map.get(eid)
            if not p:
                return Response(
                    {"detail": f"Place with external_id={eid} not found."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            coords.append((p.latitude, p.longitude))

        # 2) TSP çöz
        optimized_idx = solve_tsp(coords)
        if optimized_idx is None:
            return Response(
                {"detail": "No TSP solution found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3) Yeni external_id sırası
        optimized_route = [external_ids[i] for i in optimized_idx]
        itinerary.route = optimized_route
        itinerary.save()

        return Response(self.get_serializer(itinerary).data)

class PlanViewSet(viewsets.ViewSet):
    """
    POST /api/v1/plan/
    {
      "text": "What I like...",
      "waypoints": [
         {"latitude": 41.0082, "longitude": 28.9784},  # İstanbul
         {"latitude": 39.9208, "longitude": 32.8541},  # Ankara
         {"latitude": 38.4237, "longitude": 27.1428}   # İzmir
      ]
    }
    """
    permission_classes = [IsAuthenticated]

    def create(self, request):
        text = request.data.get("text", "").strip()
        wps  = request.data.get("waypoints", [])
        if not text or not isinstance(wps, list) or not wps:
            return Response(
                {"detail": "text ve en az bir waypoint (latitude/longitude) girilmeli."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # waypoint listelerini tuple listesine çevir
        waypoints = []
        for wp in wps:
            try:
                waypoints.append((float(wp["latitude"]), float(wp["longitude"])))
            except:
                return Response(
                    {"detail": "Her waypoint bir latitude ve longitude içermeli."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        prefs, suggestions = get_suggestions_along_route(
                        text, waypoints,
                        samples_per_segment = 5,
                    radius = 5000,
                    limit = 5
                                     )

        serialized = PlaceSerializer(suggestions, many=True).data
        data = {
                "preferences": prefs,
                "waypoints": wps,
                "suggestions": serialized
                                }
        return Response(data, status=status.HTTP_200_OK)

gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)

@api_view(['POST'])
@authentication_classes([])  # veya kendi auth sınıflarınız
@permission_classes([])      # veya kendi perm sınıflarınız
def optimize_itinerary(request):
    """
    İstemciden gelen `route` dizisini (external_id listesi) alır,
    her bir external_id için Google Directions API ile driving distance
    matrisi çıkartır ve OR-Tools ile en kısa turu hesaplar.
    Dönen optimized indices üzerinden yeni external_id sırasını dön.
    """
    route_ids = request.data.get('route', [])
    fixed     = request.data.get('fixed', {})
    if not route_ids or fixed.get('start') not in route_ids or fixed.get('end') not in route_ids:
        return Response({'detail': 'Invalid route or fixed points'}, status=status.HTTP_400_BAD_REQUEST)

    # 1) Place objelerini çek
    places = list(Place.objects.filter(external_id__in=route_ids))
    id_to_place = {p.external_id: p for p in places}

    # 2) Koordinat listesi oluştur
    coords = [(float(id_to_place[eid].latitude), float(id_to_place[eid].longitude))
              for eid in route_ids]

    # 3) Başlangıç ve bitiş index’leri
    start_idx = route_ids.index(fixed['start'])
    end_idx   = route_ids.index(fixed['end'])

    # 4) TSP çöz (driving distances)
    optimized_order = solve_tsp(coords, start_index=start_idx, end_index=end_idx)
    if optimized_order is None:
        return Response({'detail': 'Could not optimize route'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 5) optimized_order: indice listesini external_id sırasına çevir
    optimized_ids = [route_ids[i] for i in optimized_order]

    return Response({'optimized_route': optimized_ids})