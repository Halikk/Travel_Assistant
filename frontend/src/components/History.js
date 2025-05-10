import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function History() {
  const [its, setIts] = useState([])

  useEffect(() => {
    axios.get('/api/v1/itineraries/').then(r => setIts(r.data))
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Geçmiş Yolculuklarım</h2>
      <ul className="space-y-2">
        {its.map(i => (
          <li key={i.id} className="border p-3 rounded-lg">
            <div className="flex justify-between">
              <span>{i.name || new Date(i.created_at).toLocaleString()}</span>
              <Link to={`/itinerary/${i.id}`} className="text-blue-600 hover:underline">
                Görüntüle
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
