"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend_/config/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from core.views import optimize_itinerary
from core.views import (
    UserProfileViewSet, PlaceViewSet, ItineraryViewSet,
    PlanViewSet
)

from core.views import SignupView

router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'places', PlaceViewSet, basename='place')
router.register(r'itineraries', ItineraryViewSet, basename='itinerary')
router.register(r'plan', PlanViewSet, basename='plan')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/signup/', SignupView.as_view(), name='signup'),
    path('api/v1/auth/login/', obtain_auth_token, name='login'),
    path('api/v1/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),  # oturum açma/kapatma
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('api/v1/itineraries/optimize/', optimize_itinerary, name='optimize-itinerary'),
]
