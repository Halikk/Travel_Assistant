// src/components/Login.jsx
import React, { useState, useContext } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthContext'

export default function Login() {
  const { setToken } = useContext(AuthContext)
  const [form, setForm] = useState({ username: '', password: '' })
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/v1/auth/login/', form)
      setToken(data.token)
      navigate('/planner', { replace: true })
    } catch (err) {
      console.error(err)
      alert('Giriş başarısız')
    }
  }

  return (
    <form onSubmit={submit} className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Giriş Yap</h2>
        {['username','password'].map(f => (
          <div key={f}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f}</label>
            <input
              type={f === 'password' ? 'password' : 'text'}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
              value={form[f]}
              onChange={e => setForm({ ...form, [f]: e.target.value })}
              required
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Giriş
        </button>
        <p className="text-center text-sm">
          Hesabın yok mu?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            Kayıt Ol
          </a>
        </p>
      </div>
    </form>
  )
}
