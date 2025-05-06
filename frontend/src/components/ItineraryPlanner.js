import React, { useEffect, useState } from 'react'
import MapView from './MapView'

// Dünya üzerindeki iki nokta arasını metre cinsinden hesaplayan haversine fonksiyonu
function haversine(p1, p2) {
  const toRad = x => (x * Math.PI) / 180
  const R = 6371e3
  const φ1 = toRad(p1.latitude), φ2 = toRad(p2.latitude)
  const Δφ = toRad(p2.latitude - p1.latitude)
  const Δλ = toRad(p2.longitude - p1.longitude)
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Başlangıç ve bitiş sabitken aradaki durakları “en yakından en uzağa” sıralar
function reorderNearest(selected) {
  if (selected.length < 3) return selected
  const [start, ...rest] = selected
  const end = rest.pop()
  const ordered = [start]
  let remaining = rest.slice()
  let current = start

  while (remaining.length) {
    let idxMin = 0
    let dMin = haversine(current, remaining[0])
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current, remaining[i])
      if (d < dMin) {
        dMin = d
        idxMin = i
      }
    }
    const next = remaining.splice(idxMin, 1)[0]
    ordered.push(next)
    current = next
  }

  ordered.push(end)
  return ordered
}

export default function ItineraryPlanner({
  suggestions = [],
  initialLocation,
  finishLocation
}) {
  const startPlace = {
    external_id: '__start__',
    name:        '📍 Başlangıç',
    latitude:    Number(initialLocation.latitude),
    longitude:   Number(initialLocation.longitude)
  }
  const endPlace = {
    external_id: '__end__',
    name:        '🏁 Bitiş',
    latitude:    Number(finishLocation.latitude),
    longitude:   Number(finishLocation.longitude)
  }

  // Tüm olası duraklar: başlangıç + öneriler + bitiş
  const [places, setPlaces]     = useState([startPlace, ...suggestions, endPlace])
  // Başlangıçta sadece start & end seçili
  const [selected, setSelected] = useState([startPlace, endPlace])

  useEffect(() => {
    const parsed = suggestions.map(p => ({
      ...p,
      latitude:  Number(p.latitude),
      longitude: Number(p.longitude)
    }))
    const all = [startPlace, ...parsed, endPlace]
    setPlaces(all)
    setSelected([startPlace, endPlace])
  }, [suggestions, initialLocation, finishLocation])

  const toggleSelect = p => {
    if (p.external_id === '__start__' || p.external_id === '__end__') return
    setSelected(prev => {
      const withoutEnd = prev.filter(x => x.external_id !== '__end__')
      let nextSelected
      if (withoutEnd.some(x => x.external_id === p.external_id)) {
        // çıkar
        nextSelected = [
          ...withoutEnd.filter(x => x.external_id !== p.external_id),
          endPlace
        ]
      } else {
        // ekle
        nextSelected = [...withoutEnd, p, endPlace]
      }
      // her değişiklik sonrası otomatik en yakın-first sıralama
      return reorderNearest(nextSelected)
    })
  }

  // Girdi formatı “38,461582” vb ise noktayı noktaya çevirip sayıya parse et
  const coords = selected
    .map(p => ({
      lat: parseFloat(String(p.latitude).replace(/,/g, '.')),
      lng: parseFloat(String(p.longitude).replace(/,/g, '.'))
    }))
    .filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lng))

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Yer Seçimi</h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {places.map(p => (
          <button
            key={p.external_id}
            onClick={() => toggleSelect(p)}
            className={`border p-2 rounded cursor-pointer ${
              selected.some(s => s.external_id === p.external_id)
                ? 'bg-green-100'
                : 'hover:bg-gray-100'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-2">Rota Adımları</h2>
      <ol className="list-decimal list-inside mb-4">
        {selected.map((p, i) => (
          <li key={p.external_id}>{p.name}</li>
        ))}
      </ol>

      <MapView coords={coords} />
    </div>
  )
}
