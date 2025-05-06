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
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  })

  const mapRef = useRef(null)
  const [directions, setDirections] = useState(null)

  const valid = coords.filter(
    p => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  )

  useEffect(() => {
    if (!isLoaded || loadError || valid.length < 2) return

    const origin = valid[0]
    const destination = valid[valid.length - 1]
    const waypoints = valid.slice(1, -1).map(p => ({ location: p, stopover: true }))

    const svc = new window.google.maps.DirectionsService()
    svc.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (res, status) => {
        if (status === 'OK') {
          setDirections(res)
          const bounds = new window.google.maps.LatLngBounds()
          valid.forEach(pt => bounds.extend(pt))
          mapRef.current.fitBounds(bounds)
        } else {
          console.error('Directions error:', status)
        }
      }
    )
  }, [isLoaded, loadError, coords])

  if (loadError) return <div className="p-4 text-red-600">Harita yüklenemedi.</div>
  if (!isLoaded) return <div className="p-4">Harita yükleniyor…</div>

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={valid[0] || { lat: 39.9, lng: 32.8 }}
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
              strokeColor: '#1976D2',
              strokeWeight: 6
            }
          }}
        />
      )}

      {/* Sadece ara duraklar için numaralı marker */}
      {valid.slice(1, -1).map((pos, idx) => (
        <Marker
          key={idx}
          position={pos}
          label={{
            text: String(idx + 1),
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          zIndex={1000 + idx}
        />
      ))}
    </GoogleMap>
  )
}
