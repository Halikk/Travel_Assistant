// src/components/TravelPlanner.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PlanView from './PlanView';
import ItineraryPlanner from './ItineraryPlanner';
import { Card, CardContent } from "./ui/card"; // Shadcn/ui veya benzeri bir kütüphaneden geldiğini varsayıyorum
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LIBRARIES_TO_LOAD = ["places"]; // Autocomplete için "places". DirectionsService temel API'de.

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
                      <button
                          onClick={handleResetToPlanView}
                          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow hover:shadow-md"
                      >
                          Yeni Plan Oluştur / Değiştir
                      </button>
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