// src/components/PlanView.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Autocomplete } from '@react-google-maps/api';
import { ReactComponent as Logo } from '../assets/logo.svg';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Modern kategori seçenekleri
const CATEGORIES = [
  { id: 'museum', name: 'Müzeler', icon: '🏛️', color: 'from-blue-500 to-blue-600' },
  { id: 'restaurant', name: 'Restoranlar', icon: '🍽️', color: 'from-red-500 to-red-600' },
  { id: 'historical_site', name: 'Tarihi Yerler', icon: '🏰', color: 'from-amber-500 to-amber-600' },
  { id: 'nature_park', name: 'Doğal Parklar', icon: '🏞️', color: 'from-green-500 to-green-600' },
  { id: 'shopping', name: 'Alışveriş', icon: '🛍️', color: 'from-purple-500 to-purple-600' },
  { id: 'nightlife', name: 'Gece Hayatı', icon: '🌃', color: 'from-indigo-500 to-indigo-600' },
  { id: 'adventure', name: 'Macera', icon: '🧗', color: 'from-orange-500 to-orange-600' },
  { id: 'gastronomy', name: 'Yerel Lezzetler', icon: '🍲', color: 'from-rose-500 to-rose-600' },
  { id: 'family', name: 'Aile Aktiviteleri', icon: '👨‍👩‍👧‍👦', color: 'from-cyan-500 to-cyan-600' },
  { id: 'relaxation', name: 'Dinlenme Alanları', icon: '🧘', color: 'from-teal-500 to-teal-600' }
];

// Modern container variants for animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20
    }
  }
};

export default function PlanView({ onPlan }) {
  const [text, setText] = useState('Yerel lezzetler ve tarihi yerler görmek istiyorum. Özellikle Ege mutfağının meşhur yemeklerini tatmak ve antik kentleri ziyaret etmek istiyorum.');
  const [waypoints, setWaypoints] = useState([
    { 
      id: 'start', 
      place: {
        name: 'Edremit, Balıkesir',
        latitude: 39.5961,
        longitude: 27.0244,
        address: 'Edremit, Balıkesir, Türkiye'
      }, 
      inputValue: 'Edremit, Balıkesir' 
    },
    { 
      id: 'end', 
      place: {
        name: 'İzmir',
        latitude: 38.4237,
        longitude: 27.1428,
        address: 'İzmir, Türkiye'
      }, 
      inputValue: 'İzmir' 
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const autocompleteRefs = useRef([]);
  const [useNlp, setUseNlp] = useState(true); // NLP kullanımını kontrol etmek için
  const [selectedCategories, setSelectedCategories] = useState([]); // Seçilen kategorileri takip etmek için

  useEffect(() => {
    autocompleteRefs.current = autocompleteRefs.current.slice(0, waypoints.length);
  }, [waypoints.length]);

  // NLP ve kategori seçimi arasında geçiş yapma
  const toggleInputMode = () => {
    setUseNlp(!useNlp);
  };

  // Kategori seçim işlevi
  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

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

    // Eğer NLP kullanmıyorsak ve kategori seçilmediyse uyarı ver
    if (!useNlp && selectedCategories.length === 0) {
      setErrorMsg('Lütfen en az bir kategori seçin veya metin açıklaması girin.');
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

      if (useNlp) {
        // NLP modu - Kullanıcı girdisi metni gönder
        const { data } = await axios.post(
          `${API_BASE_URL}/plan/`,
          { text, waypoints: wps },
          { headers: { Authorization: `Token ${token}` } }
        );
        console.log("NLP yanıtı:", data);
        
        const suggestions = Array.isArray(data.suggestions) ? data.suggestions : 
                    (Array.isArray(data.places) ? data.places : []);
        
        onPlan(
          suggestions,
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
      } else {
        // Kategori modu - Seçilen kategorileri doğrudan gönder
        // Kategorileri IDs şeklinde ve "Kategoriler: " prefixi ile metin olarak gönder
        const categoryText = `Kategoriler: ${selectedCategories.join(', ')}`;
        console.log("Kategori metni:", categoryText);
        
        const { data } = await axios.post(
          `${API_BASE_URL}/plan/`,
          { 
            text: categoryText, 
            waypoints: wps,
            use_nlp: false // Backend'e NLP kullanmamasını bildir
          },
          { headers: { Authorization: `Token ${token}` } }
        );
        console.log("Kategori yanıtı:", data);
        
        const places = Array.isArray(data.suggestions) ? data.suggestions : 
                    (Array.isArray(data.places) ? data.places : []);
        
        onPlan(
          places,
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
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Plan oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Utility function to convert selected categories to text prompt (not currently used)
  // This can be enabled if we want to generate text from categories automatically
  // const generateTextFromCategories = (categoryIds) => {
  //   const categoryTexts = {
  //     'historical': 'Tarihi yerler ve antik kentler görmek istiyorum. Müzeler ve eski yapılar ilgimi çekiyor.',
  //     'food': 'Yerel lezzetleri tatmak istiyorum. Meşhur restoranlar ve yöresel yemekler önerin.',
  //     'nature': 'Doğal güzellikler, parklar ve manzara noktaları görmek istiyorum.',
  //     'shopping': 'Alışveriş merkezleri, çarşılar ve hediyelik eşya dükkanları önerin.',
  //     'museum': 'Müzeler, sanat galerileri ve sergiler görmek istiyorum.',
  //     'beach': 'Plajlar ve deniz aktiviteleri yapmak istiyorum.',
  //     'entertainment': 'Eğlence mekanları, aktiviteler ve etkinlikler önerin.',
  //     'cultural': 'Kültürel etkinlikler, tiyatrolar ve festivaller ilgimi çekiyor.',
  //     'religious': 'Dini ve manevi öneme sahip yerler görmek istiyorum.',
  //     'adventure': 'Macera aktiviteleri, doğa sporları ve heyecan verici deneyimler yaşamak istiyorum.',
  //     'nightlife': 'Gece hayatı, barlar ve eğlence mekanları önerin.',
  //     'landmark': 'Şehrin simge yapılarını ve önemli noktalarını görmek istiyorum.'
  //   };
  // 
  //   if (categoryIds.length === 0) {
  //     return 'Genel öneriler istiyorum.';
  //   }
  // 
  //   // Seçilen her kategori için ilgili açıklamayı al
  //   const descriptions = categoryIds.map(id => categoryTexts[id] || `${id} kategorisinde yerler görmek istiyorum.`);
  //   
  //   // Açıklamaları birleştir, tekrarları önle
  //   return descriptions.join(' ');
  // };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-10 px-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 space-y-8 relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-60 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full opacity-60 blur-3xl"></div>

        <motion.div 
          className="flex justify-center relative z-10"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          variants={itemVariants}
        >
          <Logo className="h-20 w-auto text-indigo-600 drop-shadow-lg" />
        </motion.div>

        <motion.h2 
          className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 text-center"
          variants={itemVariants}
          style={{
            backgroundSize: "200% auto",
          }}
          animate={{ 
            backgroundPosition: ['0% center', '100% center'], 
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            repeatType: "reverse",
            ease: "linear"
          }}
        >
          Seyahat Planlayıcınıza Başlayın
        </motion.h2>

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tercih modu seçimi */}
        <motion.div className="flex justify-center" variants={itemVariants}>
          <div className="bg-gray-100 p-1.5 rounded-xl shadow-inner">
            <motion.div className="inline-flex rounded-xl relative">
              <motion.button
                onClick={toggleInputMode}
                className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative z-10 ${
                  useNlp ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {useNlp && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 rounded-xl shadow-md"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">Metin ile Açıklama</span>
              </motion.button>
              <motion.button
                onClick={toggleInputMode}
                className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative z-10 ${
                  !useNlp ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {!useNlp && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 rounded-xl shadow-md"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">Kategorilerden Seç</span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* NLP ile açıklama giriş alanı */}
        <AnimatePresence mode="wait">
          {useNlp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10"
              variants={itemVariants}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ne Tür Yerler Seversiniz?
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-4 h-36 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white shadow-inner"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Örn: Tarihi yerler, yerel lezzetler, doğa yürüyüşleri..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kategori seçim alanı */}
        <AnimatePresence mode="wait">
          {!useNlp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10"
              variants={itemVariants}
            >
              <label className="block text-sm font-medium text-gray-700 mb-4">
                İlgilendiğiniz Kategorileri Seçin
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {CATEGORIES.map((category, index) => (
                  <motion.button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
                      selectedCategories.includes(category.id)
                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.05 }
                    }}
                  >
                    <div className="p-4 flex flex-col items-center space-y-2">
                      <span className="text-2xl transition-transform duration-300 group-hover:scale-110">{category.icon}</span>
                      <span className="font-medium text-sm">{category.name}</span>
                    </div>
                    {selectedCategories.includes(category.id) && (
                      <motion.div
                        className="absolute top-2 right-2 bg-white bg-opacity-20 rounded-full p-0.5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waypoints */}
        <motion.div className="space-y-4 relative z-10" variants={itemVariants}>
          {waypoints.map((wp, idx) => (
            <motion.div
              key={wp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-gray-700">
                {idx === 0
                  ? '📍 Başlangıç Noktası'
                  : idx === waypoints.length - 1
                  ? '🎯 Bitiş Noktası'
                  : `🚩 Ara Durak #${idx}`}
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
                    className="flex-grow border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white shadow-inner"
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
                  <motion.button
                    type="button"
                    onClick={() => removeWaypointField(idx)}
                    className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
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
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="flex justify-center" variants={itemVariants}>
          <motion.button
            onClick={addWaypointField}
            disabled={waypoints.length >= 10}
            className="bg-white text-indigo-600 font-medium py-3 px-6 rounded-xl border-2 border-indigo-400 shadow-sm hover:shadow-md hover:bg-indigo-50 hover:border-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Ara Durak Ekle</span>
          </motion.button>
        </motion.div>

        <motion.button
          onClick={handlePlan}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 relative overflow-hidden group"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          variants={itemVariants}
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white to-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Planlanıyor...
            </div>
          ) : (
            'Planla & Önerileri Getir'
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
