// src/components/PlanView.jsx
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-800 text-center">
          1) Tercih ve Waypoint Gir
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ne tür yerler seversiniz?
          </label>
          <textarea
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lat #{i + 1}
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-xl p-2
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="38.461582"
                  value={wp.latitude}
                  onChange={e => updateWP(i, 'latitude', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lng #{i + 1}
                </label>
                <input
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
        </div>

        <button
          onClick={handlePlan}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600
                     hover:from-blue-600 hover:to-indigo-700 text-white
                     font-semibold py-3 rounded-xl shadow-lg transition"
        >
          {loading ? 'Planlanıyor…' : 'Planla & Önerileri Getir'}
        </button>
      </div>
    </div>
  )
}
