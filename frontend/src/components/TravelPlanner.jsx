// src/components/TravelPlanner.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PlanView from './PlanView';
import ItineraryPlanner from './ItineraryPlanner';
import { Card, CardContent } from "./ui/card"; // Shadcn/ui veya benzeri bir kütüphaneden geldiğini varsayıyorum
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LIBRARIES_TO_LOAD = ["places"]; // Autocomplete için "places". DirectionsService temel API'de.

// Button animation variants
const buttonVariants = {
  initial: { 
    scale: 1, 
    boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.1)" 
  },
  hover: { 
    scale: 1.05, 
    boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
    y: -5,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10 
    } 
  },
  tap: { 
    scale: 0.97, 
    boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.2)",
    y: 0 
  }
};

export default function TravelPlanner() {
  const [suggestions, setSuggestions] = useState([]);
  const [initialLocation, setInitialLocation] = useState(null);
  const [finishLocation, setFinishLocation] = useState(null);
  const [planReadyForItinerary, setPlanReadyForItinerary] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      const errorMsg = "Google Maps API Anahtarı bulunamadı! Lütfen .env dosyanızı ve REACT_APP_GOOGLE_MAPS_API_KEY değişkenini kontrol edin.";
      console.error(errorMsg);
      setApiError(errorMsg);
    }
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES_TO_LOAD,
    id: 'travel-planner-google-maps-script'
  });

  useEffect(() => {
    if (loadError) {
      const errorMsg = `Google Harita servisleri yüklenemedi. Hata: ${loadError.message}. API anahtarınızı, internet bağlantınızı ve Google Cloud Console ayarlarınızı kontrol edin.`;
      console.error("Google Maps Load Error in TravelPlanner:", loadError);
      setApiError(errorMsg);
    } else if (isLoaded) {
      setApiError(null);
    }
  }, [isLoaded, loadError]);

  const handlePlanSubmitted = (sugs, initLoc, finalLoc) => {
    setApiError(null);
    const isValidLocation = (loc) => loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';

    if (!isValidLocation(initLoc) || !isValidLocation(finalLoc)) {
      alert("Başlangıç veya bitiş noktası bilgileri eksik veya geçersiz. Lütfen geçerli yerler seçin.");
      setPlanReadyForItinerary(false);
      return;
    }
    setSuggestions(sugs || []);
    setInitialLocation(initLoc);
    setFinishLocation(finalLoc);
    setPlanReadyForItinerary(true);
  };

  const handleResetToPlanView = () => {
    setPlanReadyForItinerary(false);
    setSuggestions([]);
    setInitialLocation(null);
    setFinishLocation(null);
    setApiError(null);
  };

  if (apiError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
        <p className="text-red-600 font-semibold text-center">{apiError}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-xl text-gray-600">Harita altyapısı ve servisleri yükleniyor...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-4 sm:p-6 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-2xl mx-auto"> {/* max-w-2xl veya istediğiniz bir genişlik */}
        <Card className="rounded-2xl shadow-xl overflow-hidden"> {/* Daha belirgin gölge için shadow-xl */}
          <CardContent className="p-6 sm:p-10 flex flex-col items-center"> {/* İçeriği ortalamak için */}
            {!planReadyForItinerary ? (
              <PlanView onPlan={handlePlanSubmitted} />
            ) : (
              // initialLocation ve finishLocation null değilse ItineraryPlanner'ı render et
              initialLocation && finishLocation ? (
                <>
                  <ItineraryPlanner
                    suggestions={suggestions}
                    initialLocation={initialLocation}
                    finishLocation={finishLocation}
                  />
                  <div className="mt-8 text-center"> {/* Buton için daha fazla boşluk */}
                    <motion.button
                      onClick={handleResetToPlanView}
                      className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex items-center space-x-2 mx-auto"
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span>Yeni Plan Oluştur / Değiştir</span>
                    </motion.button>
                  </div>
                </>
              ) : ( // Eğer initialLocation veya finishLocation null ise (beklenmedik durum)
                <p className="text-center text-red-500">Rota verileri hazırlanırken bir sorun oluştu.</p>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}