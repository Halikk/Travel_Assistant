import React, { useEffect, useState } from 'react'
import MapView from './MapView'

// Haversine ile metre cinsinden mesafe
function haversine(p1, p2) {
  const toRad = x => (x * Math.PI) / 180
  const R = 6371e3
  const φ1 = toRad(p1.latitude), φ2 = toRad(p2.latitude)
  const Δφ = toRad(p2.latitude - p1.latitude)
  const Δλ = toRad(p2.longitude - p1.longitude)
  const a =
    Math.sin(Δφ/2)**2 +
    Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function reorderNearest(sel) {
  if (sel.length < 3) return sel
  const [start, ...rest] = sel
  const end = rest.pop()
  const ordered = [start]
  let remaining = [...rest]
  let current   = start

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

function toNum(s) {
  // virgülü noktaya çevirip parseFloat
  return parseFloat(String(s).replace(/,/g, '.'))
}

export default function ItineraryPlanner({
  suggestions = [],
  initialLocation,
  finishLocation
}) {
  // 1) kesin sayı start & end
  const startPlace = {
    external_id: '__start__',
    name:        '📍 Başlangıç',
    latitude:    toNum(initialLocation.latitude),
    longitude:   toNum(initialLocation.longitude)
  }
  const endPlace = {
    external_id: '__end__',
    name:        '🏁 Bitiş',
    latitude:    toNum(finishLocation.latitude),
    longitude:   toNum(finishLocation.longitude)
  }

  // 2) places ve selected
  const [places,   setPlaces]   = useState([startPlace, ...suggestions, endPlace])
  const [selected, setSelected] = useState([startPlace, endPlace])

  useEffect(() => {
    // önerilerde de parseFloat
    const parsed = suggestions.map(p => ({
      ...p,
      latitude:  toNum(p.latitude),
      longitude: toNum(p.longitude)
    }))
    const all = [startPlace, ...parsed, endPlace]
    setPlaces(all)
    setSelected([startPlace, endPlace])
  }, [suggestions, initialLocation, finishLocation])

  // 3) toggle => en yakın-first reorder
  const toggleSelect = p => {
    if (p.external_id === '__start__' || p.external_id === '__end__') return
    setSelected(prev => {
      const withoutEnd = prev.filter(x => x.external_id !== '__end__')
      let next
      if (withoutEnd.some(x => x.external_id === p.external_id)) {
        // çıkart
        next = [
          ...withoutEnd.filter(x => x.external_id !== p.external_id),
          endPlace
        ]
      } else {
        // ekle
        next = [...withoutEnd, p, endPlace]
      }
      return reorderNearest(next)
    })
  }

  // 4) coords dizisi
  const coords = selected
    .map(p => ({ lat: p.latitude, lng: p.longitude }))
    .filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lng))

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Yer Seçimi</h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {places.map(p => (
          <button
            key={p.external_id}
            onClick={() => toggleSelect(p)}
            className={`border p-2 rounded ${
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
        {selected.map((p, i) => <li key={p.external_id}>{p.name}</li>)}
      </ol>

      <MapView coords={coords} />
    </div>
  )
}
