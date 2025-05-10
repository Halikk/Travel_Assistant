# backend_/core/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
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
        # Django user modeli için create_user kullan
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )

class ItinerarySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Itinerary
        fields = ['id','name','route','created_at']
        read_only_fields = ['id','created_at']


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
