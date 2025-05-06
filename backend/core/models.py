
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
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='itineraries')
    name      = models.CharField(max_length=100)
    created_at= models.DateTimeField(auto_now_add=True)
    # JSON: sıralı place external_id listesi
    route     = models.JSONField(default=list)

    def __str__(self):
        return f"{self.user.username} - {self.name}"
