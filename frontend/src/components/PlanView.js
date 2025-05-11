// src/components/PlanView.jsx
import React, { useState } from 'react';
import axios from 'axios';

// AUTH_TOKEN'ı global veya context'ten almak daha iyi bir pratik olabilir
const API = 'http://127.0.0.1:8000/api/v1';
// const AUTH_TOKEN = 'f4ebf106a00b0baa63bcbb392849b2e05c0d25e0'; // Sabit token geliştirme için olabilir

export default function PlanView({ onPlan }) {
  const [text, setText] = useState('I love historical sites and local food');
  const [waypoints, setWaypoints] = useState([
    { latitude: '38.461582', longitude: '27.213045' },
    { latitude: '37.378123', longitude: '27.269757' },
  ]);
  const [loading, setLoading] = useState(false);
  // const { token } = useContext(AuthContext); // Eğer AuthContext kullanıyorsanız

  const addWaypointField = () =>
    setWaypoints(prev => [...prev, { latitude: '', longitude: '' }]);

  const updateWP = (i, key, val) => {
    setWaypoints(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: val };
      return copy;
    });
  };

  const parseLocation = (locStringObj) => {
    if (!locStringObj || typeof locStringObj.latitude === 'undefined' || typeof locStringObj.longitude === 'undefined') {
        return null; // Eğer obje veya alanlar eksikse null döndür
    }
    const lat = parseFloat(String(locStringObj.latitude).replace(',', '.'));
    const lng = parseFloat(String(locStringObj.longitude).replace(',', '.'));

    if (isNaN(lat) || isNaN(lng)) {
        return null; // Eğer sayıya çevrilemiyorsa null döndür
    }
    return { latitude: lat, longitude: lng };
  };

  const handlePlan = async () => {
    setLoading(true);
    try {
      // Backend'e göndermeden önce waypoint'lerdeki koordinatları sayıya çevir (eğer backend sayı bekliyorsa)
      // Backend'iniz string kabul ediyorsa bu dönüşüme gerek olmayabilir,
      // ama onPlan'a göndereceğimiz veriler için sayıya çevirmek TravelPlanner ile uyumlu olacak.
      const waypointsForBackend = waypoints.map(wp => ({
        latitude: parseFloat(String(wp.latitude).replace(',', '.')),
        longitude: parseFloat(String(wp.longitude).replace(',', '.')),
      }));

      // Waypoint'lerin geçerli olup olmadığını kontrol et (NaN kontrolü)
      for (const wp of waypointsForBackend) {
        if (isNaN(wp.latitude) || isNaN(wp.longitude)) {
          alert('Lütfen tüm waypoint\'ler için geçerli enlem ve boylam değerleri girin.');
          setLoading(false);
          return;
        }
      }

      // AUTH_TOKEN'ı sabit olarak kullanmak yerine context'ten veya localStorage'dan almak daha güvenli.
      // Örneğin: const tokenFromAuth = localStorage.getItem('token');
      const tokenToUse = localStorage.getItem('token') || 'f4ebf106a00b0baa63bcbb392849b2e05c0d25e0'; // Geçici fallback


      const { data } = await axios.post(
        `${API}/plan/`,
        { text, waypoints: waypointsForBackend }, // Backend'e sayısal değerlerle gönder
        { headers: { Authorization: `Token ${tokenToUse}` } } // Dinamik token kullan
      );
      const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];

      // onPlan'a göndermeden önce başlangıç ve bitiş lokasyonlarını parse et
      const initialLocationParsed = parseLocation(waypoints[0]);
      const finishLocationParsed = parseLocation(waypoints[waypoints.length - 1]);

      console.log("PlanView -> onPlan'a gönderilen initialLocationParsed:", initialLocationParsed);
      console.log("PlanView -> onPlan'a gönderilen finishLocationParsed:", finishLocationParsed);

      // Eğer parse işlemi null döndürürse (geçersiz input nedeniyle),
      // TravelPlanner'daki isValidLocation bunu yakalayacaktır.
      // Veya burada ek bir kontrol yapıp onPlan'i çağırmayabilirsiniz.
      if (!initialLocationParsed || !finishLocationParsed) {
        console.error("PlanView: Başlangıç veya bitiş lokasyonu parse edilemedi.");
        onPlan(sugs, null, null); // TravelPlanner'ın hata göstermesi için
      } else {
        onPlan(sugs, initialLocationParsed, finishLocationParsed);
      }

    } catch (err) {
      console.error("Error in handlePlan (PlanView):", err);
      // Hata detayını kullanıcıya göstermek veya loglamak iyi olabilir
      let errorMessage = "Plan oluşturulurken bir hata oluştu.";
      if (err.response) {
        // Backend'den gelen hata
        console.error("Backend Error:", err.response.data);
        errorMessage += ` Detay: ${JSON.stringify(err.response.data.detail || err.response.data)}`;
      } else if (err.request) {
        // İstek yapıldı ama yanıt alınamadı
        console.error("Network Error:", err.request);
        errorMessage += " Sunucuya ulaşılamadı.";
      } else {
        // İsteği ayarlarken bir sorun oldu
        console.error("Request Setup Error:", err.message);
      }
      alert(errorMessage); // Basit bir alert, daha iyi bir UI elemanı kullanılabilir
      onPlan([], null, null); // Hata durumunda TravelPlanner'a null gönder
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-800 text-center">
          1) Tercih ve Waypoint Gir
        </h2>

        <div>
          <label htmlFor="plan-text-preference" className="block text-sm font-medium text-gray-700 mb-1">
            Ne tür yerler seversiniz?
          </label>
          <textarea
            id="plan-text-preference"
            className="w-full border border-gray-300 rounded-xl p-3 h-24 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {waypoints.map((wp, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-4 items-end"
            >
              <div>
                <label htmlFor={`lat-${i}`} className="block text-xs font-medium text-gray-600 mb-1">
                  Lat #{i + 1}
                </label>
                <input
                  id={`lat-${i}`}
                  type="text" // type="number" da kullanılabilir ama step vs. gelebilir, string ve parse daha esnek
                  className="w-full border border-gray-300 rounded-xl p-2
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="38.461582"
                  value={wp.latitude}
                  onChange={e => updateWP(i, 'latitude', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`lng-${i}`} className="block text-xs font-medium text-gray-600 mb-1">
                  Lng #{i + 1}
                </label>
                <input
                  id={`lng-${i}`}
                  type="text"
                  className="w-full border border-gray-300 rounded-xl p-2
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="27.213045"
                  value={wp.longitude}
                  onChange={e => updateWP(i, 'longitude', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addWaypointField}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            + Başka waypoint ekle
          </button>
          {/* Waypoint silme butonu da eklenebilir */}
        </div>

        <button
          onClick={handlePlan}
          disabled={loading || waypoints.length === 0} // En az bir waypoint olmalı
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600
                     hover:from-blue-600 hover:to-indigo-700 text-white
                     font-semibold py-3 rounded-xl shadow-lg transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Planlanıyor…' : 'Planla & Önerileri Getir'}
        </button>
      </div>
    </div>
  );
}