// src/components/MapView.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.25rem',
  overflow: 'hidden',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
};

const defaultCenter = { lat: 39.92077, lng: 32.85411 }; // Ankara merkez

const defaultOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#a3ccff' }]
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#f0f4f7' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#c6e99d' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#e6e6e6' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.local',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#f0f4f7' }]
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#b6b6b6' }]
    }
  ]
};

const markerAnimation = window.google?.maps?.Animation.DROP;

// Daha basit, standart pin ikonları
const startMarkerIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  scaledSize: window.google?.maps ? new window.google.maps.Size(48, 48) : null,
  origin: window.google?.maps ? new window.google.maps.Point(0, 0) : null,
  anchor: window.google?.maps ? new window.google.maps.Point(24, 48) : null,
  labelOrigin: window.google?.maps ? new window.google.maps.Point(24, 18) : null
};

const endMarkerIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  scaledSize: window.google?.maps ? new window.google.maps.Size(48, 48) : null,
  origin: window.google?.maps ? new window.google.maps.Point(0, 0) : null,
  anchor: window.google?.maps ? new window.google.maps.Point(24, 48) : null,
  labelOrigin: window.google?.maps ? new window.google.maps.Point(24, 18) : null
};

const waypointMarkerIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  scaledSize: window.google?.maps ? new window.google.maps.Size(42, 42) : null,
  origin: window.google?.maps ? new window.google.maps.Point(0, 0) : null,
  anchor: window.google?.maps ? new window.google.maps.Point(21, 42) : null,
  labelOrigin: window.google?.maps ? new window.google.maps.Point(21, 18) : null
};

// Loading animation variant
const loadingVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.2 
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Simplified MapView component focused on reliable route display and markers
export default function MapView({ coords = [], startLocationId = null, endLocationId = null }) {
  console.log("MapView rendered with", coords.length, "coordinates");
  
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const directionsRendererRef = useRef(null);

  // Memoize coordinate calculations to prevent unnecessary recalculations
  const {
    validCoords,
    startPoint,
    endPoint,
    waypoints
  } = useMemo(() => {
    const validCoords = coords.filter(
      p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
    );

    const startPoint = startLocationId 
      ? validCoords.find(p => p.id === startLocationId) 
      : validCoords[0];
      
    const endPoint = endLocationId 
      ? validCoords.find(p => p.id === endLocationId) 
      : validCoords[validCoords.length - 1];
      
    const waypoints = validCoords.filter(p => {
      if (!p || !startPoint || !endPoint) return false;
      if (p.id === startPoint.id || (p.lat === startPoint.lat && p.lng === startPoint.lng)) return false;
      if (p.id === endPoint.id || (p.lat === endPoint.lat && p.lng === endPoint.lng)) return false;
      return true;
    });

    return { validCoords, startPoint, endPoint, waypoints };
  }, [coords, startLocationId, endLocationId]);

  // Handle map loading
  const onMapLoad = React.useCallback((map) => {
    console.log("Map loaded", map);
    mapRef.current = map;
    setMapLoaded(true);
    
    if (validCoords.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      validCoords.forEach(p => {
        bounds.extend({ lat: p.lat, lng: p.lng });
      });
      map.fitBounds(bounds);
      
      if (validCoords.length === 1) {
        map.setZoom(14);
      }
    }
  }, [validCoords]);

  // Clear existing directions
  const clearDirections = React.useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setDirections(null);
  }, []);
  
  // Calculate route when necessary dependencies change
  useEffect(() => {
    if (!mapLoaded || !startPoint || !endPoint) {
      return;
    }

    setIsRouteLoading(true);
    clearDirections();

    const directionsService = new window.google.maps.DirectionsService();
    
    const waypointObjects = waypoints.map(p => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true
    }));
    
    const request = {
      origin: { lat: startPoint.lat, lng: startPoint.lng },
      destination: { lat: endPoint.lat, lng: endPoint.lng },
      waypoints: waypointObjects,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false
    };

    directionsService.route(request, (result, status) => {
      setIsRouteLoading(false);
      if (status === window.google.maps.DirectionsStatus.OK && result) {
        console.log("Route calculated successfully");
        setDirections(result);
      } else {
        console.error("Failed to calculate route:", status);
        clearDirections();
      }
    });

    return clearDirections;
  }, [mapLoaded, startPoint, endPoint, waypoints, clearDirections]);

  const onDirectionsRendererLoad = React.useCallback((renderer) => {
    directionsRendererRef.current = renderer;
  }, []);

  // Clean up the DirectionsRenderer on unmount
  useEffect(() => {
    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, []);

  // Etiket stillerini oluştur
  const createMarkerLabel = (text) => {
    return {
      text: text,
      fontWeight: "bold",
      fontSize: "16px",
      color: "#FFFFFF"
    };
  };

  if (!window.google) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] bg-grid-slate-700/[0.2]" />
        <motion.div 
          className="relative flex flex-col items-center space-y-4 text-center p-8"
          variants={loadingVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className="animate-spin rounded-full h-14 w-14 border-b-2 border-t-2 border-indigo-600"
            variants={loadingVariants}
          ></motion.div>
          <motion.p 
            className="text-gray-700 font-medium text-lg"
            variants={loadingVariants}
          >
            Harita yükleniyor...
          </motion.p>
          <motion.p 
            className="text-sm text-gray-500"
            variants={loadingVariants}
          >
            Lütfen bekleyin
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full h-full rounded-2xl shadow-2xl overflow-hidden"
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={validCoords[0] ? { lat: validCoords[0].lat, lng: validCoords[0].lng } : defaultCenter}
        zoom={validCoords.length === 1 ? 14 : 10}
        onLoad={onMapLoad}
        options={defaultOptions}
      >
        {directions && (
          <DirectionsRenderer
            onLoad={onDirectionsRendererLoad}
            directions={directions}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: '#6366F1',
                strokeOpacity: 0.8,
                strokeWeight: 5,
                strokePattern: [
                  {
                    offset: '0%',
                    repeat: '20px',
                    symbol: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 3
                    }
                  }
                ]
              }
            }}
          />
        )}
        
        {startPoint && (
          <Marker
            position={{ lat: startPoint.lat, lng: startPoint.lng }}
            icon={startMarkerIcon}
            label={createMarkerLabel("B")}
            animation={markerAnimation}
            zIndex={1000}
          />
        )}
        
        {endPoint && endPoint !== startPoint && (
          <Marker
            position={{ lat: endPoint.lat, lng: endPoint.lng }}
            icon={endMarkerIcon}
            label={createMarkerLabel("S")}
            animation={markerAnimation}
            zIndex={1000}
          />
        )}
        
        {waypoints.map((point, index) => (
          <Marker
            key={`marker-${point.id || index}`}
            position={{ lat: point.lat, lng: point.lng }}
            icon={waypointMarkerIcon}
            label={createMarkerLabel((index + 1).toString())}
            animation={markerAnimation}
            zIndex={500}
          />
        ))}
      </GoogleMap>
      
      {/* Route loading overlay */}
      <AnimatePresence>
        {isRouteLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg flex items-center space-x-3"
          >
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <p className="text-sm font-medium text-gray-700">Rota hesaplanıyor...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
