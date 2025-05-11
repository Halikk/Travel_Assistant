// src/components/ItineraryPlanner.jsx
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios'; // Kaydetme işlemi için
import MapView from './MapView';
import { AuthContext } from '../AuthContext';

// Haversine, reorderNearest, toNum, niceCategory fonksiyonları aynı kalabilir...
function haversine(p1, p2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(p1.latitude), φ2 = toRad(p2.latitude);
  const Δφ = toRad(p2.latitude - p1.latitude);
  const Δλ = toRad(p2.longitude - p1.longitude);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function reorderNearest(sel) {
  if (sel.length < 3) return sel;
  const startNode = sel.find(p => p.external_id === '__start__');
  const endNode = sel.find(p => p.external_id === '__end__');
  let rest = sel.filter(p => p.external_id !== '__start__' && p.external_id !== '__end__');
  if (rest.length === 0) return sel;
  if (!startNode || !endNode) return sel; // Başlangıç veya bitiş yoksa sıralama yapma

  const ordered = [startNode];
  let current = startNode;
  let remaining = [...rest];
  while (remaining.length) {
    let idxMin = 0;
    let dMin = haversine(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < dMin) {
        dMin = d;
        idxMin = i;
      }
    }
    const next = remaining.splice(idxMin, 1)[0];
    ordered.push(next);
    current = next;
  }
  ordered.push(endNode);
  return ordered;
}

function toNum(s) {
  const val = parseFloat(String(s).replace(/,/g, '.'));
  return Number.isNaN(val) ? 0 : val;
}

const niceCategory = cat =>
  cat
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');

export default function ItineraryPlanner({
  suggestions = [],
  initialLocation,
  finishLocation,
  editingItinerary = null
}) {
  const { token } = useContext(AuthContext);

  const createSpecialPlace = (type, location) => {
    // initialLocation veya finishLocation undefined ise, hata vermemesi için kontrol
    const loc = location || { latitude: 0, longitude: 0 }; // Güvenli varsayılan
    return {
        external_id: type,
        name: type === '__start__' ? '📍 Başlangıç' : '🏁 Bitiş',
        latitude: toNum(loc.latitude),
        longitude: toNum(loc.longitude),
        category: 'special'
    };
  };

  const [startPlace, setStartPlace] = useState(() => createSpecialPlace('__start__', initialLocation));
  const [endPlace, setEndPlace] = useState(() => createSpecialPlace('__end__', finishLocation));

  const [allAvailablePlaces, setAllAvailablePlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);

  const [itineraryName, setItineraryName] = useState(editingItinerary?.name || 'Yeni Rotam');
  const [currentItineraryId, setCurrentItineraryId] = useState(editingItinerary?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    // initialLocation veya finishLocation değiştiğinde startPlace ve endPlace'i güncelle
    setStartPlace(createSpecialPlace('__start__', initialLocation));
    setEndPlace(createSpecialPlace('__end__', finishLocation));
  }, [initialLocation, finishLocation]);


  useEffect(() => {
    // startPlace, endPlace veya suggestions değiştiğinde çalışır
    if (!startPlace || !endPlace) return; // Henüz özel yerler hazır değilse bir şey yapma

    const parsedSuggestions = suggestions.map(p => ({
      ...p,
      latitude: toNum(p.latitude),
      longitude: toNum(p.longitude)
    }));

    // allAvailablePlaces, öneriler ve start/end'i içerir (toggleSelect için)
    setAllAvailablePlaces([startPlace, ...parsedSuggestions, endPlace]);

    if (editingItinerary && editingItinerary.route) {
      // Mevcut bir rota düzenleniyorsa
      const placesMap = new Map([startPlace, ...parsedSuggestions, endPlace].map(p => [p.external_id, p]));
      const initialSelected = editingItinerary.route
        .map(id => placesMap.get(id))
        .filter(Boolean); // Bulunamayan ID'leri (null/undefined) filtrele

      setSelectedPlaces(initialSelected.length > 0 ? initialSelected : [startPlace, endPlace]); // Eğer route boşsa sadece start/end
      setItineraryName(editingItinerary.name);
      setCurrentItineraryId(editingItinerary.id);
    } else {
      // Yeni bir rota oluşturuluyorsa, başlangıçta sadece start ve end seçili olsun
      setSelectedPlaces([startPlace, endPlace]);
      setItineraryName('Yeni Rotam'); // Yeni rota için varsayılan isim
      setCurrentItineraryId(null);   // Yeni rota için ID null olmalı
    }
  }, [suggestions, startPlace, endPlace, editingItinerary]);


  const toggleSelect = placeToToggle => {
    if (placeToToggle.external_id === '__start__' || placeToToggle.external_id === '__end__') return;

    setSelectedPlaces(prevSelected => {
      const isCurrentlySelected = prevSelected.some(p => p.external_id === placeToToggle.external_id);
      let nextSelectedIntermediate;

      if (isCurrentlySelected) {
        nextSelectedIntermediate = prevSelected.filter(p => p.external_id !== placeToToggle.external_id);
      } else {
        const endIndex = prevSelected.findIndex(p => p.external_id === '__end__');
        if (endIndex !== -1) {
          nextSelectedIntermediate = [
            ...prevSelected.slice(0, endIndex),
            placeToToggle,
            ...prevSelected.slice(endIndex)
          ];
        } else {
          nextSelectedIntermediate = [...prevSelected, placeToToggle]; // __end__ bulunamazsa (olmamalı)
        }
      }
      return reorderNearest(nextSelectedIntermediate);
    });
  };

  const handleSaveItinerary = async () => {
    if (!itineraryName.trim()) {
      setError('Lütfen rotanıza bir isim verin.');
      setSuccessMessage(null);
      return;
    }
    const routePayload = selectedPlaces.map(p => p.external_id);
    if (routePayload.filter(id => id !== '__start__' && id !== '__end__').length === 0 && routePayload.length > 2) {
        // Eğer __start__ ve __end__ dışında yer varsa ve toplamda 2'den fazla yer varsa sorun yok.
        // Bu kontrolü biraz daha iyileştirmek gerekebilir:
        // Eğer sadece __start__ ve __end__ varsa (routePayload.length === 2 ise) kaydetmeye izin verme.
    } else if (routePayload.length <= 2) { // Sadece __start__ ve __end__ veya daha azı
        setError('Lütfen rotanıza en az bir ara durak ekleyin.');
        setSuccessMessage(null);
        return;
    }


    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      name: itineraryName,
      route: routePayload,
    };

    const headers = {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      let response;
      if (currentItineraryId) {
        response = await axios.put(`/api/v1/itineraries/${currentItineraryId}/`, payload, { headers });
        setSuccessMessage('Rota başarıyla güncellendi!');
      } else {
        response = await axios.post('/api/v1/itineraries/', payload, { headers });
        setCurrentItineraryId(response.data.id);
        setSuccessMessage('Rota başarıyla kaydedildi!');
      }
      console.log('Saved/Updated Itinerary:', response.data);
      setItineraryName(response.data.name);
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = "Bir hata oluştu.";
      if (typeof errorData === 'object' && errorData !== null) {
          // DRF'den gelen validasyon hatalarını daha iyi formatla
          errorMsg = Object.entries(errorData).map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
          ).join('; ');
      } else if (errorData) {
          errorMsg = String(errorData.detail || errorData);
      } else {
          errorMsg = err.message;
      }
      setError(`Hata: ${errorMsg}`);
      console.error('Failed to save itinerary:', err.response || err);
    } finally {
      setIsLoading(false);
    }
  };

  // handleOptimizeBackendRoute fonksiyonu silindi

  const suggestionOnly = allAvailablePlaces.filter(
    p => p.external_id !== '__start__' && p.external_id !== '__end__' && p.category !== 'special'
  );

  const groups = suggestionOnly.reduce((acc, p) => {
    if (p && p.category) { // p ve p.category'nin varlığını kontrol et
        acc[p.category] = acc[p.category] || [];
        acc[p.category].push(p);
    }
    return acc;
  }, {});

  const coordsForMap = selectedPlaces
    .map(p => p && typeof p.latitude !== 'undefined' && typeof p.longitude !== 'undefined' ? ({ // p'nin varlığını ve lat/lng'nin varlığını kontrol et
      lat: toNum(p.latitude),
      lng: toNum(p.longitude),
      id: p.external_id
    }) : null)
    .filter(pt => pt && Number.isFinite(pt.lat) && Number.isFinite(pt.lng));


  // initialLocation veya finishLocation prop'ları gelene kadar bir yükleme durumu veya placeholder göster
  if (!initialLocation || !finishLocation || !startPlace || !endPlace) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
              <p>Başlangıç ve bitiş noktaları yükleniyor...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          {editingItinerary ? 'Rotayı Düzenle' : 'Rota Planlayıcı'}
        </h2>

        <div className="mb-4">
            <label htmlFor="itineraryName" className="block text-sm font-medium text-gray-700 mb-1">
                Rota Adı:
            </label>
            <input
                type="text"
                id="itineraryName"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                value={itineraryName}
                onChange={(e) => setItineraryName(e.target.value)}
                placeholder="Örn: Hafta Sonu Kaçamağı"
            />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-100 p-3 rounded-md my-2">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm bg-green-100 p-3 rounded-md my-2">{successMessage}</p>}

        {Object.entries(groups).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {niceCategory(category)}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {items.map(p => (
                <button
                  key={p.external_id}
                  onClick={() => toggleSelect(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
                    ${
                      selectedPlaces.some(s => s && s.external_id === p.external_id) // s'nin varlığını kontrol et
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Rota Adımları ({selectedPlaces.filter(p => p).length}) {/* p'nin varlığını kontrol et */}
          </h3>
          {selectedPlaces.filter(p => p).length > 0 ? ( // p'nin varlığını kontrol et
            <ol className="list-none p-0 m-0 space-y-2">
              {selectedPlaces.map((p, i) => p ? ( // p'nin varlığını kontrol et
                <li key={`${p.external_id}-${i}`} className="flex items-center p-2 bg-gray-50 rounded-md text-sm">
                  <span className="mr-2 font-semibold text-blue-600">{i + 1}.</span>
                  {p.name}
                </li>
              ) : null)}
            </ol>
          ) : (
            <p className="text-gray-500">Henüz rotaya bir yer eklenmedi.</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
                onClick={handleSaveItinerary}
                disabled={isLoading}
                className="w-full sm:w-auto flex-grow bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
            >
                {isLoading ? 'Kaydediliyor...' : (currentItineraryId ? 'Rotayı Güncelle' : 'Rotayı Kaydet')}
            </button>
            {/* "Sunucuda Optimize Et" butonu buradan silindi */}
        </div>

        <div className="h-96 rounded-xl overflow-hidden border shadow-lg">
          {coordsForMap.length > 0 ? <MapView coords={coordsForMap} /> : <div className="flex items-center justify-center h-full bg-gray-200"><p>Rota için yer seçin veya harita yükleniyor...</p></div>}
        </div>
      </div>
    </div>
  );
}