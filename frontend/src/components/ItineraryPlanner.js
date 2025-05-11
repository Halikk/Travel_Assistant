// src/components/ItineraryPlanner.jsx
import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import MapView from './MapView';
import { AuthContext } from '../AuthContext';

// Haversine formülü ile iki nokta arası mesafe (metre)
function haversine(a, b) {
  if (!a || !b) return Infinity;
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(a.latitude), φ2 = toRad(b.latitude);
  const Δφ = toRad(b.latitude - a.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const c = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.asin(Math.sqrt(c));
}

// Basit nearest‐neighbor sıralaması; ilk ve son öğe sabit kalır
function reorderNearest(list) {
  if (list.length < 3) return list;
  const start = list[0], end = list[list.length - 1];
  let middle = list.slice(1, -1);
  const ordered = [start];
  let current = start;
  while (middle.length) {
    let bestIdx = 0, bestDist = Infinity;
    middle.forEach((p, i) => {
      const d = haversine(current, p);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    current = middle.splice(bestIdx, 1)[0];
    ordered.push(current);
  }
  ordered.push(end);
  return ordered;
}

function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

const niceCategory = cat =>
  cat
    ? cat
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    : 'Diğer';

export default function ItineraryPlanner({
  suggestions: initialSuggestions = [],
  initialLocation,
  finishLocation,
  editingItinerary = null
}) {
  const { token } = useContext(AuthContext);

  // Start ve End objelerini oluşturur
  const createSpecialPlace = (type, loc) => {
    const isStart = type === '__start__';
    return {
      external_id: type,
      name:        loc?.name || (isStart ? '📍 Başlangıç Noktası' : '🏁 Bitiş Noktası'),
      latitude:    toNum(loc?.latitude),
      longitude:   toNum(loc?.longitude),
      category:    isStart ? 'special_start' : 'special_end',
      address:     loc?.address || (isStart ? 'Başlangıç konumu' : 'Bitiş konumu')
    };
  };

  const [startPlace, setStartPlace]           = useState(null);
  const [endPlace, setEndPlace]               = useState(null);
  const [allPlaces, setAllPlaces]             = useState([]);
  const [selectedPlaces, setSelectedPlaces]   = useState([]);
  const [itineraryName, setItineraryName]     = useState('');
  const [currentItineraryId, setCurrentId]     = useState(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState(null);
  const [successMessage, setSuccessMessage]   = useState(null);

  // AI’dan gelen önerileri sayıya çevir
  const parsedSuggestions = useMemo(
    () =>
      initialSuggestions.map(p => ({
        ...p,
        latitude:  toNum(p.latitude),
        longitude: toNum(p.longitude)
      })),
    [initialSuggestions]
  );

  // 1) Başlangıç ve bitişi ayarla
  useEffect(() => {
    setStartPlace(createSpecialPlace('__start__', initialLocation));
    setEndPlace(  createSpecialPlace('__end__',  finishLocation));
  }, [initialLocation, finishLocation]);

  // 2) Yeni oluşturma mı? Düzenleme modu mu?
  useEffect(() => {
    if (!startPlace || !endPlace) return;

    // suggestions’tan start/end’i çıkar
    const filtered = parsedSuggestions.filter(
      p =>
        p.external_id !== startPlace.external_id &&
        p.external_id !== endPlace.external_id
    );
    const available = [startPlace, ...filtered, endPlace];
    setAllPlaces(available);

    if (editingItinerary && Array.isArray(editingItinerary.route)) {
      setItineraryName(editingItinerary.name || 'Düzenlenen Rota');
      setCurrentId(editingItinerary.id);

      // route’dan gerçek ID’leri al
      const coreIds = editingItinerary.route.filter(id => !id.startsWith('__'));
      const mapById = new Map(available.map(p => [p.external_id, p]));
      const middle  = coreIds.map(id => mapById.get(id)).filter(Boolean);

      const initialList = [startPlace, ...middle, endPlace];
      setSelectedPlaces(reorderNearest(initialList));
    } else {
      setItineraryName('Yeni Rotam');
      setCurrentId(null);
      setSelectedPlaces([startPlace, endPlace]);
    }
  }, [parsedSuggestions, startPlace, endPlace, editingItinerary]);

  // Bir öneriye tıklandığında toggle
  const toggleSelect = place => {
    if (place.category.startsWith('special_')) return;
    setSelectedPlaces(prev => {
      const exists = prev.some(x => x.external_id === place.external_id);
      let next;
      if (exists) {
        next = prev.filter(x => x.external_id !== place.external_id);
      } else {
        const endIdx = prev.findIndex(x => x.category === 'special_end');
        next = [...prev.slice(0, endIdx), place, ...prev.slice(endIdx)];
      }
      return reorderNearest(next);
    });
  };

  // Kaydetme fonksiyonu
  const handleSaveItinerary = async () => {
    if (!itineraryName.trim()) {
      setError('Lütfen rota adı girin');
      return;
    }
    const routeIds = selectedPlaces.map(p => p.external_id);
    const mids     = routeIds.filter(id => id !== '__start__' && id !== '__end__');
    if (routeIds.length < 2 || mids.length < 1) {
      setError('En az bir ara durak ekleyin');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      name:        itineraryName,
      route:       routeIds,
      suggestions: initialSuggestions
    };
    const headers = { Authorization: `Token ${token}` };

    try {
      let res;
      if (currentItineraryId) {
        res = await axios.put(
          `/api/v1/itineraries/${currentItineraryId}/`,
          payload,
          { headers }
        );
        setSuccessMessage('Rota güncellendi!');
      } else {
        res = await axios.post('/api/v1/itineraries/', payload, { headers });
        setCurrentId(res.data.id);
        setSuccessMessage('Rota kaydedildi!');
      }
      setItineraryName(res.data.name);
    } catch (err) {
      const d = err.response?.data;
      const msg =
        d?.detail ||
        (typeof d === 'object'
          ? Object.values(d).flat().join(', ')
          : err.message);
      setError(`Hata: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Öneri gruplarını hazırla
  const suggestionGroups = useMemo(() => {
    return allPlaces
      .filter(p => !['special_start', 'special_end'].includes(p.category))
      .reduce((acc, p) => {
        (acc[p.category] = acc[p.category] || []).push(p);
        return acc;
      }, {});
  }, [allPlaces]);

  // Seçilen duraklardan coords oluştur
  const coordsForMap = useMemo(() => {
    return selectedPlaces
      .map(p =>
        p &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number'
          ? { lat: p.latitude, lng: p.longitude, id: p.external_id, name: p.name }
          : null
      )
      .filter(Boolean);
  }, [selectedPlaces]);

  // ▶️ Guard ekleyerek hata önle
  const mapCoords = useMemo(() => {
    if (!startPlace || !endPlace) {
      return [];
    }
    if (coordsForMap.length >= 2) {
      return coordsForMap;
    }
    return [
      { lat: startPlace.latitude, lng: startPlace.longitude, id: startPlace.external_id, name: startPlace.name },
      { lat: endPlace.latitude,   lng: endPlace.longitude,   id: endPlace.external_id,   name: endPlace.name }
    ];
  }, [coordsForMap, startPlace, endPlace]);

  // Yüklenme guard’ı
  if (!startPlace || !endPlace) {
    return (
      <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center p-6">
        <p className="text-xl text-gray-500">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-xl shadow space-y-6">
      <h2 className="text-2xl font-bold text-center">
        {editingItinerary ? `"${editingItinerary.name}" Düzenle` : 'Rota Oluştur'}
      </h2>

      <div>
        <label className="block mb-1">Rota Adı:</label>
        <input
          value={itineraryName}
          onChange={e => {
            setItineraryName(e.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
          className="w-full border p-2 rounded"
          placeholder="Örn: Ege Macerası"
        />
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {successMessage && <div className="text-green-600">{successMessage}</div>}

      {Object.entries(suggestionGroups).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="font-semibold">{niceCategory(cat)}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {items.map(p => (
              <button
                key={p.external_id}
                onClick={() => toggleSelect(p)}
                className={`px-3 py-1 rounded ${
                  selectedPlaces.some(x => x.external_id === p.external_id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <h3 className="font-semibold">Seçilen Duraklar ({selectedPlaces.length})</h3>
        <ol className="mt-2 space-y-1">
          {selectedPlaces.map((p, i) => (
            <li
              key={`${p.external_id}-${i}`}
              className="flex items-center bg-gray-100 p-2 rounded"
            >
              <span className="w-6 text-center font-bold">
                {p.category === 'special_start'
                  ? 'S'
                  : p.category === 'special_end'
                  ? 'E'
                  : i}
              </span>
              <span className="ml-2">{p.name}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={handleSaveItinerary}
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading
          ? 'Kaydediliyor…'
          : currentItineraryId
          ? 'Güncelle'
          : 'Kaydet'}
      </button>

      <div className="h-72 border rounded overflow-hidden">
        <MapView coords={mapCoords} />
      </div>
    </div>
  );
}
