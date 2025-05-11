// src/components/PlanView.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Autocomplete } from '@react-google-maps/api';
import { ReactComponent as Logo } from '../assets/logo.svg';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export default function PlanView({ onPlan }) {
  const [text, setText] = useState('');
  const [waypoints, setWaypoints] = useState([
    { id: 'start', place: null, inputValue: '' },
    { id: 'end',   place: null, inputValue: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const autocompleteRefs = useRef([]);

  useEffect(() => {
    autocompleteRefs.current = autocompleteRefs.current.slice(0, waypoints.length);
  }, [waypoints.length]);

  const handlePlaceSelect = index => {
    const ref = autocompleteRefs.current[index];
    if (ref && window.google?.maps) {
      const place = ref.getPlace();
      if (place?.geometry?.location) {
        const newWps = [...waypoints];
        newWps[index] = {
          ...newWps[index],
          place: {
            name:      place.name || place.formatted_address,
            latitude:  place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            address:   place.formatted_address
          },
          inputValue: place.name || place.formatted_address
        };
        setWaypoints(newWps);
      }
    }
  };

  const handleInputChange = (index, value) => {
    const newWps = [...waypoints];
    newWps[index].inputValue = value;
    if (newWps[index].place && newWps[index].place.name !== value) {
      newWps[index].place = null;
    }
    setWaypoints(newWps);
  };

  const addWaypointField = () => {
    if (waypoints.length >= 10) return;
    const endIdx = waypoints.length - 1;
    setWaypoints([
      ...waypoints.slice(0, endIdx),
      { id: `waypoint-${Date.now()}`, place: null, inputValue: '' },
      waypoints[endIdx]
    ]);
  };

  const removeWaypointField = idx => {
    if (idx === 0 || idx === waypoints.length - 1) return;
    setWaypoints(waypoints.filter((_, i) => i !== idx));
  };

  const handlePlan = async () => {
    setErrorMsg('');
    if (waypoints.some(wp => !wp.place)) {
      setErrorMsg('Lütfen tüm noktalar için geçerli yer seçin.');
      return;
    }
    setLoading(true);
    try {
      const wps = waypoints.map(wp => ({
        latitude:  wp.place.latitude,
        longitude: wp.place.longitude
      }));
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Giriş yapmanız gerekiyor.');
      const { data } = await axios.post(
        `${API_BASE_URL}/plan/`,
        { text, waypoints: wps },
        { headers: { Authorization: `Token ${token}` } }
      );
      const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];
      onPlan(
        sugs,
        {
          latitude:  waypoints[0].place.latitude,
          longitude: waypoints[0].place.longitude,
          name:      waypoints[0].place.name
        },
        {
          latitude:  waypoints[waypoints.length - 1].place.latitude,
          longitude: waypoints[waypoints.length - 1].place.longitude,
          name:      waypoints[waypoints.length - 1].place.name
        }
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Plan oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/assets/map-background.jpg')",
      }}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-2xl p-8 space-y-8 mx-4">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto text-indigo-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 text-center">
          Seyahat Planlayıcınıza Başlayın
        </h2>
        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md text-center">
            {errorMsg}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ne Tür Yerler Seversiniz?
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Örn: Tarihi yerler, yerel lezzetler, doğa yürüyüşleri..."
          />
        </div>
        <div className="space-y-4">
          {waypoints.map((wp, idx) => (
            <div key={wp.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {idx === 0
                  ? 'Başlangıç Noktası'
                  : idx === waypoints.length - 1
                  ? 'Bitiş Noktası'
                  : `Ara Durak #${idx}`}
              </label>
              <div className="flex items-center space-x-2">
                <Autocomplete
                  onLoad={ref => (autocompleteRefs.current[idx] = ref)}
                  onPlaceChanged={() => handlePlaceSelect(idx)}
                  fields={['geometry', 'name', 'formatted_address']}
                  options={{ types: ['geocode', 'establishment'] }}
                >
                  <input
                    type="text"
                    className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder={
                      idx === 0
                        ? 'Başlangıç yerini yazın...'
                        : idx === waypoints.length - 1
                        ? 'Bitiş yerini yazın...'
                        : 'Ara durak ekleyin...'
                    }
                    value={wp.inputValue}
                    onChange={e => handleInputChange(idx, e.target.value)}
                  />
                </Autocomplete>
                {idx > 0 && idx < waypoints.length - 1 && (
                  <button
                    type="button"
                    onClick={() => removeWaypointField(idx)}
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Bu durağı sil"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button
            onClick={addWaypointField}
            disabled={waypoints.length >= 10}
            className="text-indigo-600 hover:text-indigo-700 font-medium py-2 px-4 rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50"
          >
            + Ara Durak Ekle
          </button>
        </div>
        <button
          onClick={handlePlan}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {loading ? 'Planlanıyor…' : 'Planla & Önerileri Getir'}
        </button>
      </div>
    </div>
  );
}
