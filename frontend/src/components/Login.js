// Örnek Login.jsx içindeki login fonksiyonu
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext'; // AuthContext'i import edin

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const { setToken } = useContext(AuthContext); // setToken'ı AuthContext'ten al
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log("Login isteği gönderiliyor:", formData);
      const response = await axios.post('/api/v1/auth/login/', formData); // Login endpoint'iniz

      console.log("Login yanıtı alındı:", response); // YANITI KONTROL ET

      if (response.data && response.data.token) {
        const receivedToken = response.data.token;
        console.log("Alınan token:", receivedToken);

        // 1. localStorage'a KAYDET
        localStorage.setItem('token', receivedToken);
        console.log("Token localStorage'a kaydedildi. Kontrol edin!");

        // 2. AuthContext'i GÜNCELLE
        setToken(receivedToken);
        console.log("AuthContext güncellendi.");

        // 3. Kullanıcıyı yönlendir
        navigate('/planner'); // Veya MyItineraries veya ana sayfa
      } else {
        console.error("Login yanıtında token bulunamadı:", response.data);
        setError("Giriş başarısız. Token alınamadı.");
      }
    } catch (err) {
      console.error("Login hatası:", err.response || err.message);
      if (err.response && err.response.data) {
        // DRF'den gelen non_field_errors veya field hatalarını göster
        const errorDetail = err.response.data.non_field_errors || JSON.stringify(err.response.data);
        setError(`Giriş başarısız: ${errorDetail}`);
      } else {
        setError("Giriş başarısız. Sunucuyla iletişim kurulamadı veya beklenmedik bir hata oluştu.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Giriş Yap</h2>
        {error && <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
          <input
            type="text"
            name="username"
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
          <input
            type="password"
            name="password"
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Giriş Yap
        </button>
        <p className="text-center text-sm">
          Hesabın yok mu?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            Kayıt Ol
          </a>
        </p>
      </form>
    </div>
  );
}

export default Login;