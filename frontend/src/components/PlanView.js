// src/components/PlanView.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Autocomplete } from '@react-google-maps/api';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export default function PlanView({ onPlan }) {
  const [text, setText] = useState('I love historical sites and local food');
  const [waypoints, setWaypoints] = useState([
    { id: 'start', place: null, inputValue: '' },
    { id: 'end', place: null, inputValue: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const autocompleteRefs = useRef([]);

  useEffect(() => {
    autocompleteRefs.current = autocompleteRefs.current.slice(0, waypoints.length);
  }, [waypoints.length]);

  const handlePlaceSelect = (index) => {
    if (autocompleteRefs.current[index] && window.google && window.google.maps) {
      const placeResult = autocompleteRefs.current[index].getPlace();
      if (placeResult && placeResult.geometry && placeResult.geometry.location) {
        const newWaypoints = [...waypoints];
        newWaypoints[index] = {
          ...newWaypoints[index],
          place: {
            name: placeResult.name || placeResult.formatted_address,
            latitude: placeResult.geometry.location.lat(),
            longitude: placeResult.geometry.location.lng(),
            placeId: placeResult.place_id,
            address: placeResult.formatted_address,
          },
          inputValue: placeResult.name || placeResult.formatted_address,
        };
        setWaypoints(newWaypoints);
      } else {
        console.warn("PlanView: Autocomplete sonucu beklenen formatta değil veya yer bulunamadı:", placeResult);
        const newWaypoints = [...waypoints];
        if (newWaypoints[index]) { // inputValue'u koruyarak place'i null yap
          newWaypoints[index].place = null;
          setWaypoints(newWaypoints);
        }
      }
    } else if (!window.google || !window.google.maps) {
      console.warn("PlanView: Google Maps API henüz Autocomplete için hazır değil.");
    }
  };

  const handleInputChange = (index, value) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].inputValue = value;
    if (newWaypoints[index].place && newWaypoints[index].place.name !== value) {
      newWaypoints[index].place = null;
    }
    setWaypoints(newWaypoints);
  };

  const addWaypointField = () => {
    if (waypoints.length >= 10) {
      alert("Maksimum ara durak sayısına ulaştınız.");
      return;
    }
    const endIndex = waypoints.length - 1;
    const newWaypoints = [
      ...waypoints.slice(0, endIndex),
      { id: `waypoint-${Date.now()}`, place: null, inputValue: '' },
      waypoints[endIndex],
    ];
    setWaypoints(newWaypoints);
  };

  const removeWaypointField = (indexToRemove) => {
    if (indexToRemove === 0 || indexToRemove === waypoints.length - 1 || waypoints.length <= 2) return;
    setWaypoints(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handlePlan = async () => {
    const allPlacesSelected = waypoints.every(wp => wp.place && typeof wp.place.latitude === 'number' && typeof wp.place.longitude === 'number');
    if (!allPlacesSelected) {
      alert("Lütfen tüm başlangıç, bitiş ve (varsa) ara noktalar için geçerli bir yer seçin.");
      return;
    }
    if (waypoints.length < 2) {
      alert("Lütfen en az bir başlangıç ve bir bitiş noktası seçin.");
      return;
    }

    setLoading(true);
    try {
      const waypointsForBackend = waypoints.map(wp => ({
        latitude: wp.place.latitude,
        longitude: wp.place.longitude,
      }));

      const tokenToUse = localStorage.getItem('token');
      if (!tokenToUse) {
        alert("Lütfen giriş yapın.");
        setLoading(false);
        return;
      }

      const { data } = await axios.post(
        `${API_BASE_URL}/plan/`,
        { text, waypoints: waypointsForBackend },
        { headers: { Authorization: `Token ${tokenToUse}` } }
      );
      const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];
      const initialLocationForPlanner = {
        latitude: waypoints[0].place.latitude,
        longitude: waypoints[0].place.longitude,
        name: waypoints[0].place.name,
      };
      const finishLocationForPlanner = {
        latitude: waypoints[waypoints.length - 1].place.latitude,
        longitude: waypoints[waypoints.length - 1].place.longitude,
        name: waypoints[waypoints.length - 1].place.name,
      };
      onPlan(sugs, initialLocationForPlanner, finishLocationForPlanner);
    } catch (err) {
      console.error("PlanView - Plan oluşturulurken hata:", err);
      let errorMessage = "Plan oluşturulurken bir hata oluştu.";
      if (err.response?.data) {
        errorMessage += ` Detay: ${JSON.stringify(err.response.data.detail || err.response.data)}`;
      } else if (err.message) {
        errorMessage += ` Detay: ${err.message}`;
      }
      alert(errorMessage);
      onPlan([], waypoints[0]?.place || null, waypoints[waypoints.length - 1]?.place || null);
    } finally {
      setLoading(false);
    }
  };

  // TravelPlanner API yüklenene kadar bu component render edilmeyecek.
  // Güvenlik önlemi olarak window.google kontrolü eklenebilir, ama gerekmeyebilir.
  if (!(window.google && window.google.maps && window.google.maps.places)) {
     // Bu log, TravelPlanner'daki isLoaded doğru çalışıyorsa normalde görünmemeli.
     console.warn("PlanView: Google Places API henüz hazır değil, Autocomplete düzgün çalışmayabilir.");
     // return <div className="p-4 text-center text-sm text-orange-600">Google Places API bekleniyor...</div>;
     // Yükleme göstergesi TravelPlanner'da olduğu için burada göstermeye gerek yok.
  }

  return (
    // En dıştaki div'den min-h-screen, bg-gray-100, flex, items-center, justify-center kaldırıldı.
    // Ortalama ve arka plan parent component (TravelPlanner -> CardContent) tarafından sağlanacak.
    // w-full max-w-lg bu component'in CardContent içinde ne kadar genişleyeceğini belirler.
    <div className="w-full max-w-lg space-y-6">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 text-center">
        1) Tercih ve Rota Noktalarını Gir
      </h2>
      <div>
        <label htmlFor="plan-text-preference" className="block text-sm font-medium text-gray-700 mb-1">
          Ne tür yerler seversiniz?
        </label>
        <textarea
          id="plan-text-preference"
          className="w-full border border-gray-300 rounded-xl p-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Örn: Tarihi yerler, yerel lezzetler, doğa yürüyüşleri..."
        />
      </div>

      <div className="space-y-4">
        {waypoints.map((wp, index) => (
          <div key={wp.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {index === 0 ? 'Başlangıç Noktası' : index === waypoints.length - 1 ? 'Bitiş Noktası' : `Ara Durak #${index}`}
            </label>
            <div className="flex items-center space-x-2">
              <Autocomplete
                onLoad={(ref) => { autocompleteRefs.current[index] = ref; }}
                onPlaceChanged={() => handlePlaceSelect(index)}
                fields={["place_id", "geometry", "name", "formatted_address"]} // İstenen alanlar
                options={{ types: ['geocode', 'establishment'] }} // Sonuçları daraltır
              >
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={index === 0 ? 'Başlangıç yerini yazın...' : index === waypoints.length - 1 ? 'Bitiş yerini yazın...' : 'Ara durak ekleyin...'}
                  value={wp.inputValue}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                />
              </Autocomplete>
              {(index !== 0 && index !== waypoints.length - 1 && waypoints.length > 2) && (
                <button
                  type="button"
                  onClick={() => removeWaypointField(index)}
                  className="p-2 text-red-500 hover:text-red-700 flex-shrink-0" // flex-shrink-0 eklendi
                  title="Bu durağı sil"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center pt-2"> {/* Biraz üst boşluk eklendi */}
        <button
          type="button"
          onClick={addWaypointField}
          disabled={waypoints.length >= 10 || loading}
          className="text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg border-2 border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Ara Durak Ekle
        </button>
      </div>

      <button
        onClick={handlePlan}
        disabled={loading || waypoints.some(wp => !wp.place) || waypoints.length < 2}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Planlanıyor…' : 'Planla & Önerileri Getir'}
      </button>
    </div>
  );
}