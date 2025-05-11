# backend/core/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import UserProfile, Place, Itinerary

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email']

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = UserProfile
        fields = ['user', 'preferences']

class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Place
        # 'address' artık burada olmamalı
        fields = ['external_id', 'name', 'latitude', 'longitude', 'category']

class ItinerarySerializer(serializers.ModelSerializer):
    # PlaceSerializer ile sıralı yerler:
    places_details  = PlaceSerializer(source='places_in_order', many=True, read_only=True)
    user_username   = serializers.CharField(source='user.username', read_only=True)
    # JSONField olarak tutulan başlangıç/bitiş konumları
    start_location  = serializers.JSONField()
    end_location    = serializers.JSONField()

    class Meta:
        model = Itinerary
        fields = [
            'id', 'user', 'user_username',
            'name', 'description', 'route', 'suggestions',
            'start_location', 'end_location',
            'places_details', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'user', 'user_username', 'places_details',
            'created_at', 'updated_at'
        ]

    def validate_route(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Route must be a list of place external IDs.")
        place_ids_to_validate = [item for item in value if isinstance(item, str) and not item.startswith("__")]
        if place_ids_to_validate:
            existing = set(Place.objects.filter(external_id__in=place_ids_to_validate)
                                         .values_list('external_id', flat=True))
            for pid in place_ids_to_validate:
                if pid not in existing:
                    raise serializers.ValidationError(f"Place with external_id '{pid}' does not exist.")
        return value
