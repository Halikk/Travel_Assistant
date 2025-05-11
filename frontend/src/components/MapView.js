// src/components/MapView.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px' // ItineraryPlanner içinde bu stil ayarlanabilir
};

export default function MapView({ coords = [] }) {
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const [directionsError, setDirectionsError] = useState(null);

  const validCoords = useMemo(() => {
    return coords.filter(
      p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
    );
  }, [coords]);

  useEffect(() => {
    setDirectionsError(null); // Her koordinat değişiminde önceki hatayı temizle

    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) {
      console.warn("MapView: Google Maps API veya DirectionsService henüz hazır değil.");
      setDirections(null);
      // setDirectionsError("Harita API'si (Directions) henüz hazır değil."); // Bu mesaj kullanıcıya gösterilebilir.
      return;
    }

    if (validCoords.length < 2) {
      setDirections(null);
      // setDirectionsError(validCoords.length === 0 ? "Rota için başlangıç ve bitiş noktası gerekli." : "Rota için en az iki nokta gerekli.");
      return;
    }

    const origin = validCoords[0];
    const destination = validCoords[validCoords.length - 1];
    const waypoints = validCoords.slice(1, -1).map(p => ({
      location: new window.google.maps.LatLng(p.lat, p.lng),
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          if (mapRef.current && result.routes?.[0]?.bounds) {
            mapRef.current.fitBounds(result.routes[0].bounds);
          }
        } else {
          const errorMessage = `Rota bulunamadı veya bir hata oluştu. Google Maps Durum: ${status}`;
          console.error(`MapView: Directions request failed. Status: ${status}`, result);
          setDirections(null);
          setDirectionsError(errorMessage);
        }
      }
    );
  }, [validCoords]); // Sadece validCoords değiştiğinde çalışsın

  const onMapLoad = (map) => {
    mapRef.current = map;
    if (validCoords.length > 0 && !directions && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      validCoords.forEach(pt => bounds.extend(new window.google.maps.LatLng(pt.lat, pt.lng)));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        if (validCoords.length === 1) map.setZoom(14);
      }
    }
  };

  // TravelPlanner API yüklenene kadar bu component render edilmeyecek.
  // Ama bir güvenlik önlemi olarak window.google kontrolü.
  if (!(window.google && window.google.maps)) {
    return (
        <div className="flex justify-center items-center" style={mapContainerStyle}>
          <p className="p-4 text-gray-600">Harita bileşenleri yükleniyor (MapView)...</p>
        </div>
    );
  }
  const defaultCenter = { lat: 39.92077, lng: 32.85411 };

  return (
    <div style={mapContainerStyle} className="relative">
      {directionsError && !directions && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-red-100 text-red-700 p-2 rounded-md shadow text-xs max-w-xs text-center">
          {directionsError}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={validCoords.length > 0 ? { lat: validCoords[0].lat, lng: validCoords[0].lng } : defaultCenter}
        zoom={validCoords.length > 0 ? (validCoords.length === 1 ? 14 : (directions ? 10 : 8) ) : 6}
        onLoad={onMapLoad}
        onUnmount={() => { mapRef.current = null; }}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#4A90E2', strokeOpacity: 0.9, strokeWeight: 5 },
            }}
          />
        )}
        {validCoords.length > 0 && (
          <Marker position={{ lat: validCoords[0].lat, lng: validCoords[0].lng }} title="Başlangıç" />
        )}
        {validCoords.length > 1 && (
          <Marker position={{ lat: validCoords[validCoords.length - 1].lat, lng: validCoords[validCoords.length - 1].lng }} title="Bitiş" />
        )}
        {validCoords.slice(1, -1).map((pos, idx) => (
          <Marker
            key={`waypoint-${idx}`}
            position={{ lat: pos.lat, lng: pos.lng }}
            label={{ text: String(idx + 1), color: 'white', fontSize: '12px', fontWeight: 'bold' }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}