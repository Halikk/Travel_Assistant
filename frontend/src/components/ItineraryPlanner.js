// src/components/ItineraryPlanner.jsx
import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import MapView from './MapView';
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
    let bestIdx = 0, bestDist = Infinity;
    middle.forEach((p,i) => {
      const d = haversine(current,p);
      if (d<bestDist) { bestDist=d; bestIdx=i; }
    });
    current = middle.splice(bestIdx,1)[0];
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

  // 1️⃣ Başlangıç/Bitiş’i oluştur
  useEffect(() => {
    setStartPlace(createSpecialPlace('__start__', initialLocation));
    setEndPlace(  createSpecialPlace('__end__',  finishLocation));
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

      // Gerçek ID’leri al (__*__ başlıcaklar atlanır)
      const coreIds = editingItinerary.route.filter(id => !id.startsWith('__'));
      // Map ile objelere dönüştür
      const mapById = new Map(available.map(p=>[p.external_id,p]));
      const middle  = coreIds.map(id=>mapById.get(id)).filter(Boolean);

      const initialList = [startPlace, ...middle, endPlace];
      // Eğer isterseniz nearest ile sıralayabilirsiniz; ben aynen korudum
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
    selectedPlaces.map(p=>({lat:p.latitude,lng:p.longitude,id:p.external_id,name:p.name})),
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
          value={itineraryName}
          onChange={e=>{setItineraryName(e.target.value); setError(null); setSuccessMsg(null)}}
          className="w-full border p-2 rounded"
          placeholder="Örn: Ege Macerası"
        />
      </div>
      {error      && <div className="text-red-600">{error}</div>}
      {successMsg && <div className="text-green-600">{successMsg}</div>}

      {/* ÖNERİLER */}
      {Object.entries(suggestionGroups).map(([cat, items])=>(
        <div key={cat}>
          <h3 className="font-semibold">{niceCategory(cat)}</h3>
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

      {/* SEÇİLEN DURAKLAR */}
      <div>
        <h3 className="font-semibold">Seçilen Duraklar ({selectedPlaces.length})</h3>
        <ol className="mt-2 space-y-1">
          {selectedPlaces.map((p,i)=>(
            <li key={`${p.external_id}-${i}`} className="flex items-center bg-gray-100 p-2 rounded">
              <span className="w-6 text-center font-bold">
                {p.category==='special_start'
                  ? 'S'
                  : p.category==='special_end'
                    ? 'E'
                    : i}
              </span>
              <span className="ml-2">{p.name}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Kaydediliyor…' : (currentItineraryId ? 'Güncelle' : 'Kaydet')}
      </button>

      <div className="h-64 border rounded overflow-hidden">
        {coords.length>=2
          ? <MapView coords={coords}/>
          : <div className="flex items-center justify-center h-full text-gray-500">
              Harita için en az iki nokta seçin
            </div>
        }
      </div>
    </div>
  );
}
