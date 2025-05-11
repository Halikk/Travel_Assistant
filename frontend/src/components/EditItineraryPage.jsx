// src/components/EditItineraryPage.jsx (Yeni veya güncellenmiş dosya)
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import ItineraryPlanner from './ItineraryPlanner'; // Doğrudan ItineraryPlanner'ı kullanacağız

function EditItineraryPage() {
  const { itineraryId } = useParams(); // URL'den ID'yi al
  const { token } = useContext(AuthContext);
  const navigate = useNavigate(); // Yönlendirme için

  const [initialData, setInitialData] = useState(null); // ItineraryPlanner için gerekli tüm prop'ları tutacak
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItineraryDetails = async () => {
      if (!token || !itineraryId) {
        setError("Geçersiz istek veya giriş yapılmamış.");
        setLoading(false);
        // navigate('/login'); // Gerekirse login'e yönlendir
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/v1/itineraries/${itineraryId}/`, {
          headers: { 'Authorization': `Token ${token}` },
        });

        const fetchedItinerary = response.data;

        // ItineraryPlanner'ın beklediği prop'ları hazırla
        const editingItinerary = {
          id: fetchedItinerary.id,
          name: fetchedItinerary.name,
          route: fetchedItinerary.route, // ['__start__', 'id1', 'id2', '__end__']
        };

        // initialLocation ve finishLocation'ı route ve places_details'tan çıkar
        let initialLoc = { latitude: 0, longitude: 0 }; // Varsayılan
        let finishLoc = { latitude: 0, longitude: 0 };  // Varsayılan

        const routePlaceIds = fetchedItinerary.route.filter(id => !String(id).startsWith("__"));
        const placesDetailsMap = new Map((fetchedItinerary.places_details || []).map(p => [p.external_id, p]));

        if (routePlaceIds.length > 0) {
            const firstPlaceId = routePlaceIds[0];
            const lastPlaceId = routePlaceIds[routePlaceIds.length - 1];

            const firstPlaceDetail = placesDetailsMap.get(firstPlaceId);
            const lastPlaceDetail = placesDetailsMap.get(lastPlaceId);

            if (firstPlaceDetail) {
                initialLoc = {
                    latitude: parseFloat(firstPlaceDetail.latitude),
                    longitude: parseFloat(firstPlaceDetail.longitude)
                };
            }
            if (lastPlaceDetail) {
                finishLoc = {
                    latitude: parseFloat(lastPlaceDetail.latitude),
                    longitude: parseFloat(lastPlaceDetail.longitude)
                };
            }
        }


        setInitialData({
          suggestions: fetchedItinerary.places_details || [], // Rotadaki yerleri öneri olarak kullanabiliriz
          initialLocation: initialLoc,
          finishLocation: finishLoc,
          editingItinerary: editingItinerary,
        });

      } catch (err) {
        console.error("Failed to fetch itinerary for editing:", err);
        if (err.response && err.response.status === 404) {
          setError("Seyahat planı bulunamadı.");
        } else if (err.response && err.response.status === 401) {
          setError("Bu içeriği görmek için giriş yapmalısınız.");
          navigate('/login');
        }
        else {
          setError("Seyahat planı yüklenirken bir sorun oluştu.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchItineraryDetails();
  }, [itineraryId, token, navigate]);

  if (loading) {
    return <div className="text-center p-10">Seyahat planı detayları yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600 bg-red-100 rounded-md">Hata: {error}</div>;
  }

  if (!initialData) {
    // Bu durum normalde error veya loading ile yakalanmalı
    return <div className="text-center p-10">Seyahat planı verileri hazırlanamadı.</div>;
  }

  // ItineraryPlanner'ı yüklenen verilerle render et
  return (
    <ItineraryPlanner
      suggestions={initialData.suggestions}
      initialLocation={initialData.initialLocation}
      finishLocation={initialData.finishLocation}
      editingItinerary={initialData.editingItinerary}
    />
  );
}

export default EditItineraryPage;