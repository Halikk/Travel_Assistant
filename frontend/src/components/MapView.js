// src/components/MapView.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

export default function MapView({ coords = [] }) {
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);

  // Geçerli koordinatları filtrele
  const validCoords = useMemo(
    () =>
      coords.filter(
        p =>
          p &&
          typeof p.lat === 'number' &&
          typeof p.lng === 'number' &&
          !isNaN(p.lat) &&
          !isNaN(p.lng)
      ),
    [coords]
  );

  useEffect(() => {
    setDirections(null);

    if (!window.google?.maps?.DirectionsService) return;
    if (validCoords.length < 2) return;

    const service = new window.google.maps.DirectionsService();
    const origin = new window.google.maps.LatLng(validCoords[0].lat, validCoords[0].lng);
    const destination = new window.google.maps.LatLng(
      validCoords[validCoords.length - 1].lat,
      validCoords[validCoords.length - 1].lng
    );
    const waypoints = validCoords
      .slice(1, -1)
      .map(p => ({
        location: new window.google.maps.LatLng(p.lat, p.lng),
        stopover: true
      }));

    // Önce tüm duraklarla rota isteği
    service.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING, waypoints },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          if (mapRef.current && result.routes[0]?.bounds) {
            mapRef.current.fitBounds(result.routes[0].bounds);
          }
        } else {
          // Hangi hata olursa olsun, fallback olarak sadece başlangıç→bitiş iste
          service.route(
            { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
            (res2, st2) => {
              if (st2 === window.google.maps.DirectionsStatus.OK && res2) {
                setDirections(res2);
                if (mapRef.current && res2.routes[0]?.bounds) {
                  mapRef.current.fitBounds(res2.routes[0].bounds);
                }
              } else {
                console.error(`Fallback rota da bulunamadı. Durum: ${st2}`);
              }
            }
          );
        }
      }
    );
  }, [validCoords]);

  const onMapLoad = map => {
    mapRef.current = map;
    // Eğer hala directions yoksa marker-only bounds
    if (!directions && validCoords.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      validCoords.forEach(p => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds);
      if (validCoords.length === 1) map.setZoom(14);
    }
  };

  if (!window.google?.maps) {
    return (
      <div style={mapContainerStyle} className="flex items-center justify-center">
        <p className="text-gray-600">Harita yükleniyor…</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={
        validCoords.length
          ? { lat: validCoords[0].lat, lng: validCoords[0].lng }
          : { lat: 39.92077, lng: 32.85411 }
      }
      zoom={validCoords.length === 1 ? 14 : 10}
      onLoad={onMapLoad}
      onUnmount={() => {
        mapRef.current = null;
      }}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
      }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#4A90E2',
              strokeOpacity: 0.9,
              strokeWeight: 5
            }
          }}
        />
      )}

      {/* Başlangıç marker */}
      {validCoords[0] && (
        <Marker
          position={{ lat: validCoords[0].lat, lng: validCoords[0].lng }}
          title="Başlangıç"
        />
      )}

      {/* Bitiş marker */}
      {validCoords.length > 1 && (
        <Marker
          position={{
            lat: validCoords[validCoords.length - 1].lat,
            lng: validCoords[validCoords.length - 1].lng
          }}
          title="Bitiş"
        />
      )}

      {/* Ara durak marker’ları */}
      {validCoords.slice(1, -1).map((p, idx) => (
        <Marker
          key={`waypoint-${idx}`}
          position={{ lat: p.lat, lng: p.lng }}
          label={{ text: String(idx + 1), color: 'white', fontSize: '12px', fontWeight: 'bold' }}
        />
      ))}
    </GoogleMap>
  );
}
