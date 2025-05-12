// src/components/ItineraryPlanner.jsx
import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import MapView from './MapView';
import TravelTimeDisplay from './TravelTimeDisplay';
import { AuthContext } from '../AuthContext';

// Haversine hesaplama (metre)
function haversine(a, b) {
  if (!a||!b) return Infinity;
  const toRad = x => (x * Math.PI)/180;
  const R = 6371e3;
  const φ1 = toRad(a.latitude), φ2 = toRad(b.latitude);
  const Δφ = toRad(b.latitude - a.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const c = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.asin(Math.sqrt(c));
}

// Basit nearest‐neighbor sıralaması; ilk ve son sabit kalır
function reorderNearest(list) {
  if (list.length < 3) return list;
  const start = list[0], end = list[list.length-1];
  let middle = list.slice(1, -1);
  const ordered = [start];
  let current = start;
  
  while (middle.length) {
    // Store current in a separate variable to avoid the closure issue
    const currentPoint = current;
    
    let bestIdx = 0, bestDist = Infinity;
    middle.forEach((p, i) => {
      const d = haversine(currentPoint, p);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    
    current = middle.splice(bestIdx, 1)[0];
    ordered.push(current);
  }
  
  ordered.push(end);
  return ordered;
}

function toNum(v) {
  if (typeof v==='number') return v;
  if (typeof v==='string') {
    const n = parseFloat(v.replace(',','.'));
    return isNaN(n)?0:n;
  }
  return 0;
}

const niceCategory = cat => cat
  ? cat.replace(/_/g,' ')
       .split(' ')
       .map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase())
       .join(' ')
  : 'Diğer';

export default function ItineraryPlanner({
  suggestions: initialSuggestions=[],
  initialLocation,
  finishLocation,
  editingItinerary=null
}) {
  const { token } = useContext(AuthContext);

  // Artık external_id her zaman "__start__" veya "__end__"
  const createSpecialPlace = (type, loc) => {
    const isStart = type==='__start__';
    return {
      external_id: type,
      name:        loc?.name || (isStart ? '📍 Başlangıç Noktası'  : '🏁 Bitiş Noktası'),
      latitude:    toNum(loc?.latitude),
      longitude:   toNum(loc?.longitude),
      category:    isStart ? 'special_start' : 'special_end',
      address:     loc?.address || (isStart ? 'Başlangıç konumu' : 'Bitiş konumu')
    };
  };

  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace]     = useState(null);
  const parsedSug = useMemo(
    () => initialSuggestions.map(p => ({
      ...p,
      latitude:  toNum(p.latitude),
      longitude: toNum(p.longitude)
    })),
    [initialSuggestions]
  );
  const [allPlaces, setAllPlaces]       = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [itineraryName, setItineraryName]   = useState('');
  const [currentItineraryId, setCurrentItineraryId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING');

  // 1️⃣ Başlangıç/Bitiş'i oluştur
  useEffect(() => {
    const start = createSpecialPlace('__start__', initialLocation);
    const end = createSpecialPlace('__end__', finishLocation);
    setStartPlace(start);
    setEndPlace(end);
    // Başlangıçta selectedPlaces'i güncelle
    setSelectedPlaces([start, end]);
  }, [initialLocation, finishLocation]);

  // 2️⃣ Yeni rota mı / düzenleme modu mu?
  useEffect(() => {
    if (!startPlace || !endPlace) return;

    // suggestions → start/end hariç
    const filtered = parsedSug.filter(
      p => p.external_id !== startPlace.external_id &&
           p.external_id !== endPlace.external_id
    );
    const available = [startPlace, ...filtered, endPlace];
    setAllPlaces(available);

    if (editingItinerary && Array.isArray(editingItinerary.route)) {
      setItineraryName(editingItinerary.name || 'Düzenlenen Rota');
      setCurrentItineraryId(editingItinerary.id);

      // Gerçek ID'leri al (__*__ başlıcaklar atlanır)
      const coreIds = editingItinerary.route.filter(id => !id.startsWith('__'));
      // Map ile objelere dönüştür
      const mapById = new Map(available.map(p=>[p.external_id,p]));
      const middle  = coreIds.map(id=>mapById.get(id)).filter(Boolean);

      const initialList = [startPlace, ...middle, endPlace];
      setSelectedPlaces(reorderNearest(initialList));
    } else {
      setItineraryName('Yeni Rotam');
      setCurrentItineraryId(null);
      setSelectedPlaces([startPlace, endPlace]);
    }
  }, [parsedSug, startPlace, endPlace, editingItinerary]);

  // toggle seçimi
  const toggleSelect = p => {
    if (p.category.startsWith('special_')) return;
    setSelectedPlaces(prev => {
      const exists = prev.some(x=>x.external_id===p.external_id);
      let next;
      if (exists) {
        next = prev.filter(x=>x.external_id!==p.external_id);
      } else {
        const endIdx = prev.findIndex(x=>x.category==='special_end');
        next = [...prev.slice(0,endIdx), p, ...prev.slice(endIdx)];
      }
      return reorderNearest(next);
    });
  };

  // kaydet
  const handleSave = async () => {
    if (!itineraryName.trim()) {
      setError('Lütfen rota adı girin');
      return;
    }
    const routeIds = selectedPlaces.map(p=>p.external_id);
    const mids     = routeIds.filter(id=>
      id!=='__start__' && id!=='__end__'
    );
    if (routeIds.length<2 || mids.length<1) {
      setError('En az bir ara durak ekleyin');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name:        itineraryName,
      route:       routeIds,
      suggestions: initialSuggestions,
       start_location: {
    external_id: startPlace.external_id,
    name:        startPlace.name,
    latitude:    startPlace.latitude,
    longitude:   startPlace.longitude,
    address:     startPlace.address
  },
  end_location: {
    external_id: endPlace.external_id,
    name:        endPlace.name,
    latitude:    endPlace.latitude,
    longitude:   endPlace.longitude,
    address:     endPlace.address
  }
    };
    const headers = { Authorization:`Token ${token}` };

    try {
      let res;
      if (currentItineraryId) {
        res = await axios.put(
          `/api/v1/itineraries/${currentItineraryId}/`,
          payload,
          { headers }
        );
        setSuccessMsg('Rota güncellendi!');
      } else {
        res = await axios.post('/api/v1/itineraries/', payload, { headers });
        setCurrentItineraryId(res.data.id);
        setSuccessMsg('Rota kaydedildi!');
      }
      setItineraryName(res.data.name);
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.detail || (typeof d==='object'
        ? Object.values(d).flat().join(', ')
        : err.message);
      setError(`Hata: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // öneri grupları
  const suggestionGroups = useMemo(() => {
    return allPlaces
      .filter(p=>!['special_start','special_end'].includes(p.category))
      .reduce((acc,p)=>{
        (acc[p.category] = acc[p.category]||[]).push(p);
        return acc;
      }, {});
  }, [allPlaces]);

  // harita koordinatları
  const coords = useMemo(() =>
    selectedPlaces.map(p=>({
      lat: p.latitude, 
      lng: p.longitude, 
      id: p.external_id, 
      name: p.name
    })),
    [selectedPlaces]
  );

  if (!startPlace||!endPlace) {
    return <div className="p-8 text-center">Yükleniyor…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded space-y-6 shadow">
      <h2 className="text-2xl font-bold text-center">
        {editingItinerary ? `"${editingItinerary.name}" Düzenle` : 'Rota Oluştur'}
      </h2>

      <div>
        <label className="block mb-1">Rota Adı:</label>
        <input
          type="text"
          className="w-full border p-2 rounded"
          value={itineraryName}
          onChange={e=>setItineraryName(e.target.value)}
          placeholder="Rotanıza bir isim verin"
        />
      </div>

      <div className="h-64 border rounded overflow-hidden">
        <MapView 
          coords={coords} 
          startLocationId="__start__" 
          endLocationId="__end__" 
        />
      </div>

      {/* Seyahat Modu Seçimi */}
      <div className="flex space-x-2 mb-4">
        <div className="text-sm font-medium text-gray-700 flex items-center mr-2">Seyahat Modu:</div>
        <button
          onClick={() => setTravelMode('DRIVING')}
          className={`px-3 py-1.5 text-sm rounded-full ${travelMode === 'DRIVING' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10H16M7 14H8M16 14H17M3.5 18V9C3.5 7.89543 4.39543 7 5.5 7H18.5C19.6046 7 20.5 7.89543 20.5 9V18M3.5 18H20.5M3.5 18C3.5 19.1046 4.39543 20 5.5 20H6.5M20.5 18C20.5 19.1046 19.6046 20 18.5 20H17.5M6.5 20V19C6.5 18.4477 6.94772 18 7.5 18H16.5C17.0523 18 17.5 18.4477 17.5 19V20M6.5 20H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Araç
          </span>
        </button>
        <button
          onClick={() => setTravelMode('WALKING')}
          className={`px-3 py-1.5 text-sm rounded-full ${travelMode === 'WALKING' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 5.5C13.5 6.88071 12.3807 8 11 8C9.61929 8 8.5 6.88071 8.5 5.5C8.5 4.11929 9.61929 3 11 3C12.3807 3 13.5 4.11929 13.5 5.5Z" fill="currentColor"/>
              <path d="M13 14.5L11 22M13 14.5L16 17.5M13 14.5L9 11M9 11L10 8.5M9 11L6 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Yürüyüş
          </span>
        </button>
      </div>

      {/* Seyahat zamanı görüntüleme */}
      {selectedPlaces.length >= 2 && (
        <TravelTimeDisplay 
          coords={coords} 
          travelMode={travelMode} 
          startLocationId="__start__" 
          endLocationId="__end__" 
        />
      )}

      {successMsg && (
        <div className="p-3 bg-green-100 text-green-800 rounded">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* ÖNERİLER */}
      {Object.entries(suggestionGroups).map(([cat, items])=>(
        <div key={cat}>
          <h3 className="text-lg font-semibold">{niceCategory(cat)}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {items.map(p=>(
              <button
                key={p.external_id}
                onClick={()=>toggleSelect(p)}
                className={`px-3 py-1 rounded ${
                  selectedPlaces.some(x=>x.external_id===p.external_id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >{p.name}</button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <h3 className="text-lg font-semibold mb-2">Seçilen Duraklar</h3>
        <ol className="mt-2 space-y-1">
          {(() => {
            let waypointCounter = 1; // Başlangıç ve bitiş hariç duraklar için sayaç
            return selectedPlaces.map((p, i) => {
              const isStart = p.category === 'special_start';
              const isEnd = p.category === 'special_end';
              
              // Ara durak numarası için sayaç değerini al ve artır
              const displayNumber = isStart || isEnd ? null : waypointCounter++;
              
              return (
                <li key={`${p.external_id}-${i}`} className="flex items-center bg-gray-100 p-2 rounded">
                  <span className="w-6 text-center font-bold">
                    {isStart ? 'B' : isEnd ? 'S' : displayNumber}
                  </span>
                  <span className="ml-2">{p.name}</span>
                </li>
              );
            });
          })()}
        </ol>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={`px-4 py-2 rounded bg-blue-600 text-white ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
        >
          {isLoading ? 'Kaydediliyor...' : currentItineraryId ? 'Rotayı Güncelle' : 'Rotayı Kaydet'}
        </button>
      </div>
    </div>
  );
}
