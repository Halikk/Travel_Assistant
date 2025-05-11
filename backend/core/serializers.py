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

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'preferences']

class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = ['external_id', 'name', 'latitude', 'longitude', 'category']


class ItinerarySerializer(serializers.ModelSerializer):
    # places_in_order'ı read-only olarak göstermek için.
    # Bu, PlaceSerializer'ı kullanarak her bir Place'in detaylarını döndürür.
    places_details = PlaceSerializer(source='places_in_order', many=True, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Itinerary
        fields = [
            'id',
            'user', # Yazma işlemlerinde otomatik atanacak, okumada ID döner
            'user_username', # Okumada kullanıcı adını gösterir
            'name',
            'description', # Eğer Itinerary modeline eklerseniz
            'route',       # Kaydetme ve güncelleme için bu alan kullanılır (external_id listesi)
            'suggestions',
            'start_location', 'end_location',
            'places_details', # Detayları göstermek için bu alan kullanılır (Place nesneleri)
            'created_at',
            'updated_at'
        ]
        # user alanı perform_create ile doldurulacağı için read_only_fields'e eklenebilir.
        # Ancak, bazen admin arayüzü veya testler için explicit set etmek gerekebilir.
        # Şimdilik perform_create'e güvenelim.
        read_only_fields = [
            'user',  # <-- BURAYA 'user' ALANINI EKLEYİN
            'user_username',
            'created_at',
            'updated_at',
            'places_details'
        ]

    def validate_route(self, value):
        """
        Route alanının bir liste olduğunu ve içindeki her bir external_id'nin
        mevcut bir Place nesnesine karşılık geldiğini doğrular.
        Özel belirteçler ("__start__" gibi) varsa, bunları atlar.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Route must be a list of place external IDs.")

        if value: # Eğer route boş değilse
            # Sadece Place ID'lerini al (özel belirteçleri filtrele)
            place_ids_to_validate = [item for item in value if isinstance(item, str) and not item.startswith("__")]

            if place_ids_to_validate: # Eğer doğrulanacak ID varsa
                existing_place_ids = set(
                    Place.objects.filter(external_id__in=place_ids_to_validate).values_list('external_id', flat=True)
                )
                for place_id in place_ids_to_validate:
                    if place_id not in existing_place_ids:
                        raise serializers.ValidationError(f"Place with external_id '{place_id}' does not exist.")
        return value # Orijinal route listesini (özel belirteçler dahil) döndür