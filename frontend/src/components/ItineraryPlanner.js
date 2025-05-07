// src/components/ItineraryPlanner.jsx
import React, { useEffect, useState } from 'react'
import MapView from './MapView'

// Haversine ile iki nokta arası mesafe
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

// En yakın komşuya göre sırala (greedy)
function reorderNearest(sel) {
  if (sel.length < 3) return sel
  const [start, ...rest] = sel
  const end = rest.pop()
  const ordered = [start]
  let remaining = [...rest]
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

// Sayıya dönüştür (virgül yerine nokta destekler)
function toNum(s) {
  return parseFloat(String(s).replace(/,/g, '.'))
}

// Kategori başlığını okunabilir hale getir
const niceCategory = cat =>
  cat
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')

export default function ItineraryPlanner({
  suggestions = [],
  initialLocation,
  finishLocation
}) {
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

  const [places, setPlaces]     = useState([startPlace, ...suggestions, endPlace])
  const [selected, setSelected] = useState([startPlace, endPlace])

  useEffect(() => {
    const parsed = suggestions.map(p => ({
      ...p,
      latitude:  toNum(p.latitude),
      longitude: toNum(p.longitude)
    }))
    const all = [startPlace, ...parsed, endPlace]
    setPlaces(all)
    setSelected([startPlace, endPlace])
  }, [suggestions, initialLocation, finishLocation])

  const toggleSelect = p => {
    if (p.external_id === '__start__' || p.external_id === '__end__') return
    setSelected(prev => {
      const withoutEnd = prev.filter(x => x.external_id !== '__end__')
      let next
      if (withoutEnd.some(x => x.external_id === p.external_id)) {
        // çıkar
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

  const suggestionOnly = places.filter(
    p => p.external_id !== '__start__' && p.external_id !== '__end__'
  )

  const groups = suggestionOnly.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || []
    acc[p.category].push(p)
    return acc
  }, {})

  const coords = selected
    .map(p => ({
      lat: toNum(p.latitude),
      lng: toNum(p.longitude)
    }))
    .filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lng))

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Rota Planlayıcı
        </h2>

        {/* Kategorilere göre gruplanmış öneriler */}
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition
                    ${
                      selected.some(s => s.external_id === p.external_id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Seçilen rota */}
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Rota Adımları ({selected.length})
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            {selected.map((p, i) => (
              <li key={p.external_id}>{p.name}</li>
            ))}
          </ol>
        </div>

        {/* Harita */}
        <div className="h-96 rounded-xl overflow-hidden border">
          <MapView coords={coords} />
        </div>
      </div>
    </div>
  )
}
