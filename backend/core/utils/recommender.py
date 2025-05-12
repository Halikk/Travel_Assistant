# core/utils/recommender.py

import os
from django.conf import settings
from core.models import Place
from .nlp_pipeline import analyze_user_preferences
import googlemaps
from googlemaps.convert import decode_polyline

gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)

# Kategorileri Google türleriyle eşleştir (hem ID hem tam isim için)
CATEGORY_MAPPING: dict[str,str] = {
    # NLP sisteminden gelen kategoriler
    "historical site": "tourist_attraction",
    "gastronomy":      "restaurant",
    "nature park":     "park",
    "museum":          "museum",
    "shopping":        "shopping_mall",
    "nightlife":       "night_club",
    "adventure":       "amusement_park",
    "family":          "zoo",
    "relaxation":      "spa",
    
    # Frontend'den gelen kategori ID'leri
    "historical_site": "tourist_attraction",
    "restaurant":      "restaurant", 
    "nature_park":     "park",
    "museum":          "museum",
    "shopping":        "shopping_mall",
    "nightlife":       "night_club",
    "adventure":       "amusement_park",
    "family":          "zoo",
    "relaxation":      "spa",
    "gastronomy":      "restaurant",
    
    # Ek kategori eşleştirmeleri
    "cafe":            "cafe",
    "lodging":         "lodging",
    "beach":           "natural_feature"
}

def fetch_places_by_category(location: tuple[float,float],
                             google_type: str,
                             radius: int = 5000,
                             limit: int = 5) -> list[Place]:
    lat, lng = location
    res = gmaps.places_nearby(location=(lat, lng),
                              radius=radius,
                              type=google_type)
    places = []
    for item in res.get("results", [])[:limit]:
        p, _ = Place.objects.get_or_create(
            external_id=item["place_id"],
            defaults={
                "name":      item.get("name", ""),
                "latitude":  item["geometry"]["location"]["lat"],
                "longitude": item["geometry"]["location"]["lng"],
                "category":  google_type
            }
        )
        places.append(p)
    return places

def get_suggestions_along_route(text: str,
                                waypoints: list[tuple[float,float]],
                                samples_per_segment: int = 5,
                                radius: int = 5000,
                                limit: int = 5) -> tuple[dict,list[Place]]:
    """
    text: kullanıcı girdisi
    waypoints: [(lat,lng), …] — 2 veya daha fazla nokta
    samples_per_segment: her segmentte kaç örnek nokta alalım
    returns: (prefs, unique suggestions list)
    """
    prefs = analyze_user_preferences(text)
    # NLP kategorilerini Google türlerine çevir
    types = [
        CATEGORY_MAPPING[cat]
        for cat in prefs["categories"].keys()
        if cat in CATEGORY_MAPPING
    ]

    all_suggestions = []
    # Her segment için
    for i in range(len(waypoints) - 1):
        origin = waypoints[i]
        dest   = waypoints[i + 1]
        # 1) Directions al
        directions = gmaps.directions(origin, dest, mode="driving")
        if not directions:
            continue
        poly = directions[0]["overview_polyline"]["points"]
        path = decode_polyline(poly)
        # 2) Path boyuna eşit örnekle
        step = max(1, len(path) // samples_per_segment)
        samples = path[0::step][:samples_per_segment]
        # 3) Her örnek nokta için her kategori
        for pt in samples:
            loc = (pt["lat"], pt["lng"])
            for gt in types:
                all_suggestions += fetch_places_by_category(loc, gt,
                                                            radius=radius,
                                                            limit=limit)

    # Tekilleştir
    unique = {p.external_id: p for p in all_suggestions}
    return prefs, list(unique.values())
