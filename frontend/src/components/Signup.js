// src/components/Signup.jsx
import React, { useState, useContext } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../AuthContext'

export default function Signup() {
  const { setToken } = useContext(AuthContext)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/v1/auth/signup/', form)
      setToken(data.token)
      navigate('/planner', { replace: true })
    } catch (err) {
      console.error(err)
      alert('Kayıt başarısız')
    }
  }

  return (
    <form onSubmit={submit} className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Kayıt Ol</h2>
        {['username','email','password'].map(f => (
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
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Kayıt Ol
        </button>
        <p className="text-center text-sm">
          Zaten hesabın var mı?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Giriş Yap
          </a>
        </p>
      </div>
    </form>
  )
}
