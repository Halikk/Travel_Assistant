from django.conf import settings
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # NLP’den çıkarılacak tercihler JSON formatında saklanacak
    preferences = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.user.username} Profil"

class Place(models.Model):
    # Örneğin Google Places ID, adı, koordinat vs.
    external_id = models.CharField(max_length=100, unique=True)
    name        = models.CharField(max_length=200)
    latitude    = models.FloatField()
    longitude   = models.FloatField()
    category    = models.CharField(max_length=50)  # "museum", "restaurant", vb.

    def __str__(self):
        return self.name


class Itinerary(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="itineraries"
    )
    name = models.CharField(max_length=200, blank=True)  # Kullanıcının rotaya verdiği isim
    description = models.TextField(blank=True, null=True)
    route = models.JSONField(default=list)  # Boş liste olarak başlatmak iyi bir pratik
    suggestions = models.JSONField(default=list, blank=True)
    start_location = models.JSONField(default=dict, blank=True)  # ← baştan
    end_location = models.JSONField(default=dict, blank=True)  # ← sona
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Genellikle güncellenme zamanını da tutmak istenir

    @property
    def places_in_order(self):
        if not self.route or not isinstance(self.route, list):
            return Place.objects.none()

        # route listesindeki ID'lerin Place olup olmadığını kontrol et
        # "__start__" gibi özel belirteçler varsa bunları filtrele
        place_external_ids = [item for item in self.route if not item.startswith("__")]  # Örnek filtreleme

        if not place_external_ids:
            return Place.objects.none()

        # ID listesindeki sırayı koruyarak Place nesnelerini çekmek
        # Bir kerede çekip Python'da sıralamak daha verimli olabilir
        places_dict = {p.external_id: p for p in Place.objects.filter(external_id__in=place_external_ids)}

        ordered_places = []
        for ext_id in place_external_ids:
            if ext_id in places_dict:
                ordered_places.append(places_dict[ext_id])
        return ordered_places

    def __str__(self):
        display_name = self.name if self.name else f"Itinerary on {self.created_at:%Y-%m-%d}"
        return f"{self.user.username} — {display_name}"