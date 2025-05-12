# backend/core/views.py

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.conf import settings

from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import api_view, action, authentication_classes, permission_classes
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication

from .models import UserProfile, Place, Itinerary
from .serializers import (
    UserProfileSerializer,
    PlaceSerializer,
    ItinerarySerializer,
    SignupSerializer,
    UserSerializer
)
from .utils.tsp_solver import solve_tsp
from .utils.recommender import get_suggestions_along_route, gmaps

User = get_user_model()


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
    
    def retrieve(self, request, pk=None):
        """
        GET /api/v1/places/{external_id}/
        Belirli bir yerin detaylarını döndürür.
        """
        try:
            # Önce veritabanında ara
            place = Place.objects.filter(external_id=pk).first()
            
            if not place:
                return Response(
                    {"detail": f"ID '{pk}' ile yer bulunamadı."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Temel yer bilgilerini al
            basic_data = PlaceSerializer(place).data
            
            # Google Places API'den zengin detayları getir
            if not pk.startswith('__') and len(pk) > 3:
                try:
                    # Google Places Details API çağrısı
                    details = gmaps.place(place_id=pk, fields=[
                        'name', 'formatted_address', 'formatted_phone_number',
                        'geometry', 'opening_hours', 'photos', 'price_level',
                        'rating', 'reviews', 'url', 'website', 'types'
                    ])
                    
                    # DEBUG: API yanıtını yazdır
                    print("\n\n===== GOOGLE PLACES API RESPONSE =====")
                    print(f"Place ID: {pk}")
                    print(f"Fields requested: name, formatted_address, formatted_phone_number, geometry, opening_hours, photos, price_level, rating, reviews, url, website, types")
                    
                    result = details.get('result', {})
                    
                    # Hata ayıklama - API dönüşünü konsola yazdır
                    print("\nAPI Result Keys:", result.keys())
                    if 'rating' in result:
                        print(f"Rating: {result['rating']}")
                    if 'reviews' in result:
                        print(f"Reviews count: {len(result['reviews'])}")
                    if 'photos' in result:
                        print(f"Photos count: {len(result['photos'])}")
                    
                    # Google'dan gelen ek bilgileri basic_data ile birleştir
                    # Adres ve fotoğraflar ekle
                    enhanced_data = {
                        **basic_data,
                        'address': result.get('formatted_address', place.name),
                        'phone': result.get('formatted_phone_number', ''),
                        'rating': result.get('rating'),
                        'types': result.get('types', []),
                        'website': result.get('website', ''),
                        'url': result.get('url', ''),
                    }
                    
                    # Açıklama oluşturma
                    description = []
                    
                    # Temel bilgi
                    place_type = ""
                    if result.get('types') and len(result.get('types')) > 0:
                        place_type = result.get('types')[0].replace('_', ' ').title()
                        description.append(f"{place.name}, {place_type} kategorisindedir.")
                    
                    # Derecelendirme
                    if result.get('rating'):
                        rating = result.get('rating')
                        description.append(f"Google üzerinde {rating}/5.0 değerlendirme puanına sahiptir.")
                    
                    # Reviews varsa
                    if result.get('reviews') and len(result.get('reviews')) > 0:
                        review = result.get('reviews')[0]
                        if review.get('text'):
                            description.append(f"Kullanıcı yorumu: \"{review.get('text')[:150]}...\"")
                    
                    # Adres
                    if result.get('formatted_address'):
                        description.append(f"Adresi: {result.get('formatted_address')}")
                    
                    # Telefon
                    if result.get('formatted_phone_number'):
                        description.append(f"Telefon: {result.get('formatted_phone_number')}")
                    
                    # Fiyat seviyesi
                    if result.get('price_level'):
                        price_level = result.get('price_level')
                        price_text = "₺" * price_level if price_level > 0 else "Ücretsiz"
                        description.append(f"Fiyat seviyesi: {price_text}")
                    
                    # Açıklamayı birleştir
                    enhanced_data['description'] = " ".join(description)
                    
                    # DEBUG: Enhanced data yazdır
                    print("\nEnhanced Data Keys:", enhanced_data.keys())
                    print(f"Description: {enhanced_data.get('description')}")
                    print(f"Rating in enhanced data: {enhanced_data.get('rating')}")
                    print("===== END DEBUG =====\n\n")
                    
                    # Fotoğraflar
                    if 'photos' in result and len(result['photos']) > 0:
                        photo_references = [p.get('photo_reference') for p in result['photos'][:5] if 'photo_reference' in p]
                        if photo_references:
                            enhanced_data['photos'] = []
                            for ref in photo_references:
                                photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={ref}&key={settings.GOOGLE_PLACES_API_KEY}"
                                enhanced_data['photos'].append(photo_url)
                    
                    # Çalışma saatleri 
                    if 'opening_hours' in result and 'weekday_text' in result['opening_hours']:
                        enhanced_data['opening_hours'] = result['opening_hours']['weekday_text']
                    
                    return Response(enhanced_data)
                    
                except Exception as e:
                    # API hatası durumunda sadece temel verileri döndür
                    print(f"Google Places API error: {str(e)}")
                    pass
            
            # Eğer API çağrısı başarısız olursa veya özel bir yer ise, temel verileri döndür
            return Response(basic_data)
            
        except Exception as e:
            return Response(
                {"detail": f"Yer detayı alınırken hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ItineraryViewSet(viewsets.ModelViewSet):
    """
    Itinerary CRUD ve ek optimize-route action'ı.
    """
    serializer_class = ItinerarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Sadece o anki kullanıcıya ait itinerary'leri döndür
        user = self.request.user
        if user and user.is_authenticated:
            return Itinerary.objects.filter(user=user).order_by('-created_at')
        return Itinerary.objects.none()

    def perform_create(self, serializer):
        # suggestions, start_location, end_location payload'dan alınıp saklanıyor
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
        route içindeki place ID'lerini TSP ile optimize eder,
        __start__/__end__ belirteçlerini koruyarak yeni route oluşturur.
        """
        itinerary = self.get_object()
        current_route = itinerary.route  # liste halinde external_id'ler

        if not isinstance(current_route, list) or len(current_route) < 2:
            return Response(
                {"detail": "Optimize edilecek en az iki nokta gerekli."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Sadece gerçek place ID'leri al (sentinel'ları atla)
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

        # Yeni route listesi: sentinel'ları koru, geriye optimize edilmiş sıralamayı yerleştir
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
        use_nlp = request.data.get("use_nlp", True)  # Default olarak NLP'yi kullan
        
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

        # Kategori modu tespiti: "Kategoriler: " ile başlıyorsa
        if text.startswith("Kategoriler:") or use_nlp is False:
            # Kategori listesi ayıkla
            category_text = text.replace("Kategoriler:", "").strip()
            selected_categories = [c.strip() for c in category_text.split(',') if c.strip()]
            
            # Manuel oluşturulan tercihler objesi
            prefs = {
                "translated_text": "Categories selected manually",
                "keywords": selected_categories,
                "categories": {cat: 1.0 for cat in selected_categories}
            }
            
            # Google Place kategorilerini oluştur
            from core.utils.recommender import CATEGORY_MAPPING
            types = []
            for cat in selected_categories:
                # ID'yi doğrudan CATEGORY_MAPPING'de ara
                if cat in CATEGORY_MAPPING:
                    types.append(CATEGORY_MAPPING[cat])
                # Veya alakalı eşleşmeyi bul
                else:
                    for key, value in CATEGORY_MAPPING.items():
                        if cat in key or key in cat:
                            types.append(value)
                            break
            
            # Eğer bir kategori bulunamadıysa varsayılan olarak tourist_attraction ekle
            if not types:
                types = ["tourist_attraction"]
            
            # Tekrarlayan kategorileri kaldır
            types = list(set(types))
            print(f"Aranacak Google Place kategorileri: {types}")
            
            # Her waypoint üzerinde örnekleme yapalım
            from core.utils.recommender import fetch_places_by_category
            all_suggestions = []
            
            # Her segment için
            for i in range(len(waypoints) - 1):
                origin = waypoints[i]
                dest = waypoints[i + 1]
                
                try:
                    # Google Directions ile rota al
                    from core.utils.recommender import gmaps, decode_polyline
                    directions = gmaps.directions(origin, dest, mode="driving")
                    if not directions:
                        print(f"Segment {i}: Rota bulunamadı {origin} -> {dest}")
                        continue
                        
                    poly = directions[0]["overview_polyline"]["points"]
                    path = decode_polyline(poly)
                    
                    # Rotayı örnekle (5 nokta)
                    samples_per_segment = 5
                    step = max(1, len(path) // samples_per_segment)
                    samples = path[0::step][:samples_per_segment]
                    
                    # Her örnek noktada kategori bazlı arama yap
                    for pt in samples:
                        loc = (pt["lat"], pt["lng"])
                        for gt in types:
                            try:
                                places = fetch_places_by_category(loc, gt, radius=5000, limit=5)
                                all_suggestions.extend(places)
                                print(f"Konum {loc} için {gt} kategorisinde {len(places)} yer bulundu")
                            except Exception as e:
                                print(f"Kategori araması hatası: {gt} at {loc} - {str(e)}")
                except Exception as e:
                    print(f"Segment işleme hatası: {str(e)}")
                    continue
            
            # Tekilleştir
            unique = {p.external_id: p for p in all_suggestions}
            suggestions = list(unique.values())
        else:
            # Normal NLP modu
            from core.utils.recommender import get_suggestions_along_route
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
