import React, { useEffect, useRef, useState } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker
} from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '400px'
}

export default function MapView({ coords = [] }) {
  // 1) Google Maps JS API yükleme durumu
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  })

  const mapRef = useRef(null)
  const [directions, setDirections] = useState(null)

  // 2) Geçerli koordinatları filtrele
  const validCoords = coords.filter(
    p => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  )

  // 3) Rota hesapla ve tüm noktaları kapsayacak şekilde fitBounds uygula
  useEffect(() => {
    if (!isLoaded || loadError || validCoords.length < 2) return

    const origin      = validCoords[0]
    const destination = validCoords[validCoords.length - 1]
    const waypoints   = validCoords
      .slice(1, -1)
      .map(loc => ({ location: loc, stopover: true }))

    const svc = new window.google.maps.DirectionsService()
    svc.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result)
          // tüm rota noktalarını kapsayacak bound
          const bounds = new window.google.maps.LatLngBounds()
          validCoords.forEach(c => bounds.extend(c))
          mapRef.current.fitBounds(bounds)
        } else {
          console.error('DirectionsService error:', status)
        }
      }
    )
  }, [isLoaded, loadError, coords])

  if (loadError) {
    return <div className="p-4 text-red-600">Harita yüklenemedi.</div>
  }
  if (!isLoaded) {
    return <div className="p-4">Harita yükleniyor…</div>
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={validCoords[0] || { lat: 39.9, lng: 32.8 }}
      zoom={10}
      onLoad={map => (mapRef.current = map)}
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
              zIndex: 1,
              strokeColor: '#1976D2',
              strokeWeight: 6
            }
          }}
        />
      )}

      {validCoords.map((pos, idx) => (
        <Marker
          key={idx}
          position={pos}
          label={{
            text: String(idx + 1),
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          zIndex={1000 + idx}
        />
      ))}
    </GoogleMap>
  )
}
