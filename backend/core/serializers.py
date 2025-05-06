# backend_/core/serializers.py

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, Place, Itinerary

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'preferences']

class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = ['id', 'external_id', 'name', 'latitude', 'longitude', 'category']

class ItinerarySerializer(serializers.ModelSerializer):
    # route bir liste olduğu için doğrudan JSONField; istersen nested PlaceSerializer ile genişletebilirsin
    class Meta:
        model = Itinerary
        fields = ['id', 'user', 'name', 'created_at', 'route']
        read_only_fields = ['created_at', 'user']
