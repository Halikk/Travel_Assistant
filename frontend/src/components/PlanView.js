import React, { useState } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'
const AUTH_TOKEN = 'f4ebf106a00b0baa63bcbb392849b2e05c0d25e0'

export default function PlanView({ onPlan }) {
  const [text, setText] = useState('I love historical sites and local food')
  const [waypoints, setWaypoints] = useState([
    { latitude: '38.461582', longitude: '27.213045' },
    { latitude: '37.378123', longitude: '27.269757' }
  ])
  const [loading, setLoading] = useState(false)

  const addWaypointField = () =>
    setWaypoints(prev => [...prev, { latitude: '', longitude: '' }])

  const updateWP = (i, key, val) => {
    setWaypoints(prev => {
      const copy = [...prev]
      copy[i] = { ...copy[i], [key]: val }
      return copy
    })
  }

  const handlePlan = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API}/plan/`,
        { text, waypoints },
        { headers: { Authorization: `Token ${AUTH_TOKEN}` } }
      )
      const sugs = Array.isArray(data.suggestions) ? data.suggestions : []
      onPlan(sugs, waypoints[0], waypoints[waypoints.length - 1])
    } catch (err) {
      console.error(err)
      onPlan([], null, null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">1) Tercih ve Waypoint Gir</h2>
      <textarea
        className="w-full border p-2 mb-2"
        rows={2}
        placeholder="Ne tür yerler seversiniz?"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {waypoints.map((wp, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input
            type="number"
            step="any"
            placeholder="Lat"
            className="border p-1 flex-1"
            value={wp.latitude}
            onChange={e => updateWP(i, 'latitude', e.target.value)}
          />
          <input
            type="number"
            step="any"
            placeholder="Lng"
            className="border p-1 flex-1"
            value={wp.longitude}
            onChange={e => updateWP(i, 'longitude', e.target.value)}
          />
        </div>
      ))}
      <button
        className="text-sm text-blue-600 mb-4"
        onClick={addWaypointField}
      >
        + Başka waypoint ekle
      </button>
      <br/>
      <button
        className="bg-blue-500 text-white py-2 px-4 rounded"
        onClick={handlePlan}
        disabled={loading}
      >
        {loading ? 'Planlanıyor…' : 'Planla & Önerileri Getir'}
      </button>
    </div>
  )
}
