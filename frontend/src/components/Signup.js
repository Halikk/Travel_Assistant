// src/components/Signup.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { ReactComponent as Logo } from '../assets/logo.svg';

export default function Signup() {
  const { setToken } = useContext(AuthContext);
  const [form, setForm]   = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate          = useNavigate();

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/v1/auth/signup/', form);
      if (!data.token) throw new Error('Token yok');
      localStorage.setItem('token', data.token);
      setToken(data.token);
      navigate('/planner', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="flex justify-center mb-6">
          <Logo className="h-12 w-auto text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
          Kayıt Ol
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/50 placeholder-white text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/70"
              placeholder="Kullanıcı adınızı girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/50 placeholder-white text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/70"
              placeholder="E-posta adresinizi girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Şifre
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/50 placeholder-white text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/70"
              placeholder="Güçlü bir şifre seçin"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow hover:bg-indigo-50 transition"
          >
            Kayıt Ol
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/80">
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="text-white font-medium hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
