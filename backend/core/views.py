# backend/core/views.py
import googlemaps
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action, authentication_classes
from .models import UserProfile, Place
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core.utils.tsp_solver import solve_tsp
from core.models import Place
from .serializers import (
    UserProfileSerializer, PlaceSerializer, UserSerializer)
from .utils.tsp_solver import solve_tsp
from core.utils.recommender import get_suggestions_along_route

from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import SignupSerializer, ItinerarySerializer
from .models import Itinerary

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
    serializer_class = ItinerarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Bu viewset sadece o anki giriş yapmış (authenticated) kullanıcıya ait
        Itinerary nesnelerini döndürmelidir.
        """
        user = self.request.user
        # print(f"DEBUG: get_queryset - Kullanıcı: {user}, Authenticated: {user.is_authenticated}") # Debug için
        if user and user.is_authenticated:
            return Itinerary.objects.filter(user=user).order_by('-created_at')
        # Eğer kullanıcı authenticate olmamışsa (normalde IsAuthenticated bunu engeller ama bir güvenlik önlemi)
        # veya user None ise (beklenmedik bir durum) boş queryset döndür.
        return Itinerary.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # Itinerary için optimize action'ı
    @action(detail=True, methods=['post'], url_path='optimize-route')
    def optimize_route(self, request, pk=None):
        itinerary = self.get_object()
        current_route_ids = itinerary.route # Bu bir liste olmalı (örn: ["id1", "__start__", "id2"])

        if not current_route_ids or not isinstance(current_route_ids, list):
            return Response({"detail": "Itinerary has no route or route is not a list."}, status=status.HTTP_400_BAD_REQUEST)

        # Optimizasyon için sadece Place ID'lerini alalım
        # ve özel belirteçlerin (`__start__`, `__end__`) konumlarını saklayalım
        place_ids_for_tsp = []
        special_tokens = {} # örn: {"__start__": 0, "id1": 1, "__end__": 2} gibi bir map oluşturabiliriz
                            # ya da sadece __start__ ve __end__'in index'lerini bulabiliriz.

        start_node_id = None
        end_node_id = None
        temp_place_ids_for_tsp = []

        for item_id in current_route_ids:
            if isinstance(item_id, str) and item_id.startswith("__"):
                if item_id == "__start__":
                    # Başlangıç noktası olarak işaretlenen bir sonraki Place ID'sini al
                    # Bu varsayımsal bir kullanım. Gerçekte __start__ ve __end__
                    # doğrudan bir Place ID'ye işaret etmeli veya TSP solver'a
                    # sabitlenmiş node'lar olarak geçilmeli.
                    # Şimdilik, "__start__" ve "__end__" gibi belirteçlerin
                    # optimize edilecek asıl Place ID'leri listesinde olmadığını varsayalım.
                    # Bu belirteçler daha çok frontend'de görsel amaçlı olabilir.
                    # VEYA, bu belirteçlerin kendileri optimize edilecek listede
                    # sabitlenmiş noktaları temsil edebilir.
                    # Modelinizdeki `route` tanımı ("__start__", "place1", ...)
                    # bunun nasıl ele alınacağını belirler.
                    # Eğer `__start__` bir Place ID'sine karşılık geliyorsa, o ID'yi kullan.
                    # Eğer değilse, bu mantığı TSP solver'ınıza göre ayarlamanız gerekir.

                    # Basit bir senaryo: __start__ ve __end__ sabit değilse
                    # ve route sadece optimize edilecek place ID'lerini içeriyorsa:
                    pass # Bu döngüde özel bir işlem yapma
                elif item_id == "__end__":
                    pass
                else: # Diğer özel belirteçler (varsa)
                    pass
            else: # Bu bir Place ID'si olmalı
                temp_place_ids_for_tsp.append(item_id)

        place_ids_for_tsp = temp_place_ids_for_tsp

        if len(place_ids_for_tsp) < 2:
            return Response(
                {"detail": "Not enough actual places in the route to optimize (minimum 2)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Place nesnelerini ve koordinatlarını al
        places = Place.objects.filter(external_id__in=place_ids_for_tsp)
        place_map = {p.external_id: p for p in places}

        coords = []
        valid_ordered_ids_for_tsp = [] # TSP'ye giren ID'lerin sırasını tut
        for ext_id in place_ids_for_tsp: # Sadece optimize edilecek ID'ler üzerinden git
            place = place_map.get(ext_id)
            if place:
                coords.append((float(place.latitude), float(place.longitude)))
                valid_ordered_ids_for_tsp.append(ext_id)
            else:
                # Bu durum serializer'daki validate_route ile engellenmeli
                return Response(
                    {"detail": f"Place with external_id '{ext_id}' in route not found in database."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if len(coords) < 2: # Tekrar kontrol, eğer bazı ID'ler DB'de bulunamadıysa
             return Response(
                {"detail": "Not enough valid places to optimize (minimum 2)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TSP çözümünü al
        # Eğer __start__ ve __end__ sabitlenmişse, onların TSP'ye giren listedeki
        # index'lerini bulup solve_tsp'ye `start_index` ve `end_index` olarak geçmelisiniz.
        # Modelinizdeki `route` yapısı ("__start__", "place1", ...) ise,
        # `__start__` ve `__end__` belirteçlerini koruyarak aradaki `placeX` ID'lerini optimize etmeniz gerekebilir.
        # Bu durumda, `solve_tsp` fonksiyonunuzun bu tür sabitlenmiş başlangıç/bitiş noktalarını
        # veya alt-rota optimizasyonunu desteklemesi gerekir.

        # Şimdilik, `place_ids_for_tsp` listesindeki tüm yerlerin optimize edildiğini varsayalım.
        optimized_indices = solve_tsp(coords) # start_index ve end_index olmadan

        if optimized_indices is None:
            return Response({"detail": "Could not optimize the route."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Optimize edilmiş Place ID sırasını oluştur
        optimized_place_ids_sequence = [valid_ordered_ids_for_tsp[i] for i in optimized_indices]

        # Şimdi, orijinal `itinerary.route` listesini bu yeni optimize edilmiş sıra ile güncellemeliyiz.
        # Eğer `__start__` gibi özel belirteçler varsa, onları korumalıyız.
        # Örnek: Orijinal: ["__start__", "id1", "id2", "id3", "__end__"]
        # Optimize edilen ("id1", "id2", "id3") -> ("id2", "id1", "id3")
        # Yeni Rota: ["__start__", "id2", "id1", "id3", "__end__"]

        new_route_list = []
        opt_idx_ptr = 0
        for item in current_route_ids:
            if isinstance(item, str) and item.startswith("__"):
                new_route_list.append(item) # Özel belirteci koru
            else:
                # Bu bir place ID olmalı ve optimize edilmiş listede yer almalı
                if opt_idx_ptr < len(optimized_place_ids_sequence):
                    new_route_list.append(optimized_place_ids_sequence[opt_idx_ptr])
                    opt_idx_ptr += 1
                else:
                    # Bu durum, orijinal route ile optimize edilen ID'ler arasında
                    # bir tutarsızlık olduğunu gösterir. Hata logla veya ver.
                    print(f"Warning: Mismatch during route reconstruction for item {item}")
                    # new_route_list.append(item) # Orijinalini ekle (güvenli fallback)

        itinerary.route = new_route_list
        itinerary.save()

        serializer = self.get_serializer(itinerary)
        return Response(serializer.data)

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

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def create(self, request, *args, **kwargs):
        # 1) İstek verisini serialize et, validasyon yap
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 2) Kayıt işlemi: serializer.save() yeni User döner
        user = serializer.save()
        # 3) Token oluştur veya al
        token, _ = Token.objects.get_or_create(user=user)
        # 4) İkisinin de verisini dön
        return Response(
            {
                "user": UserSerializer(user).data,
                "token": token.key
            },
            status=status.HTTP_201_CREATED
        )

class CustomAuthToken(ObtainAuthToken):
    permission_classes = [permissions.AllowAny]  # Herkese izin ver
    authentication_classes = []                 # Bu view için hiçbir kimlik doğrulama yöntemi çalıştırma

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk, # İsteğe bağlı: Frontend'in ihtiyacı olabilir
            'username': user.username, # İsteğe bağlı
            # 'user': UserSerializer(user, context={'request': request}).data # Tam kullanıcı bilgisi için
        })