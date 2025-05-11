// src/components/TravelPlanner.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PlanView from './PlanView';
import ItineraryPlanner from './ItineraryPlanner';
import { Card, CardContent } from "./ui/card"; // ui/card importunun doğru olduğundan emin olun

export default function TravelPlanner() {
  const [suggestions, setSuggestions] = useState([]);
  const [initialLocation, setInitialLocation] = useState(null);
  const [finishLocation, setFinishLocation] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null); // Hata mesajı için state

  const handlePlan = (sugs, initLoc, finalLoc) => {
    setError(null); // Önceki hataları temizle

    // initLoc ve finalLoc'un geçerli olup olmadığını kontrol et
    const isValidLocation = (loc) => {
      return loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    };

    if (!isValidLocation(initLoc) || !isValidLocation(finalLoc)) {
      console.error("Invalid initial or finish location received from PlanView:", initLoc, finalLoc);
      // Kullanıcıya bir hata mesajı gösterebilir veya varsayılan bir duruma dönebiliriz.
      // Şimdilik ItineraryPlanner'ı render etmeyelim ve bir hata gösterelim.
      setError("Başlangıç veya bitiş noktası bilgileri eksik veya geçersiz. Lütfen planınızı tekrar oluşturun.");
      setReady(false); // ItineraryPlanner'ı gösterme
      // State'leri de sıfırlayabiliriz veya null bırakabiliriz
      setSuggestions([]);
      setInitialLocation(null);
      setFinishLocation(null);
      return; // Fonksiyondan çık
    }

    // Eğer buraya geldiysek, lokasyonlar geçerlidir.
    setSuggestions(sugs || []); // sugs undefined ise boş dizi ata
    setInitialLocation(initLoc);
    setFinishLocation(finalLoc);
    setReady(true);
  };

  // ItineraryPlanner'ı resetlemek için bir fonksiyon (opsiyonel)
  const handleResetPlan = () => {
    setReady(false);
    setSuggestions([]);
    setInitialLocation(null);
    setFinishLocation(null);
    setError(null);
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-5xl mx-auto">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-8">
            {error && ( // Hata mesajını göster
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                <p>{error}</p>
                <button
                  onClick={handleResetPlan}
                  className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Yeni Plan Oluştur
                </button>
              </div>
            )}

            {!ready && !error ? ( // Eğer hazır değilse ve hata yoksa PlanView'ı göster
              <PlanView onPlan={handlePlan} />
            ) : null}

            {ready && initialLocation && finishLocation && !error ? ( // Sadece her şey yolundaysa ItineraryPlanner'ı göster
              <>
                <ItineraryPlanner
                  suggestions={suggestions}
                  initialLocation={initialLocation}
                  finishLocation={finishLocation}
                  // editingItinerary={null} // Eğer düzenleme özelliği varsa
                />
                <div className="mt-6 text-center">
                    <button
                        onClick={handleResetPlan}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        Yeni Plan Oluştur / Değiştir
                    </button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}