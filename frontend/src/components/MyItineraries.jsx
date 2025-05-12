// src/components/MyItineraries.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Sayfa yönlendirmesi için
import { AuthContext } from '../AuthContext'; // Kullanıcı token'ını ve kimlik doğrulama durumunu almak için
import MapView from './MapView';
import PlaceDetailModal from './PlaceDetailModal';
import TravelTimeDisplay from './TravelTimeDisplay'; // Yeni komponenti import et
import { motion } from 'framer-motion';

function MyItineraries() {
  const [itineraries, setItineraries] = useState([]); // Backend'den gelen seyahat planlarını tutacak state
  const [loading, setLoading] = useState(true); // Yüklenme durumunu tutacak state (başlangıçta true)
  const [error, setError] = useState(null); // Hata mesajlarını tutacak state
  const { token } = useContext(AuthContext); // AuthContext'ten token'ı al
  const navigate = useNavigate(); // Programatik olarak sayfa yönlendirmesi için
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedItinerary, setSelectedItinerary] = useState(null); // Detaylı bilgi gösterilecek itinerary
  const [travelMode, setTravelMode] = useState('DRIVING'); // Seyahat modu seçimi için

  useEffect(() => {
    // Bu useEffect, component ilk render edildiğinde ve token (veya navigate) değiştiğinde çalışır
    const fetchItineraries = async () => {
      if (!token) {
        // Eğer token yoksa (kullanıcı giriş yapmamışsa)
        setError("Seyahat planlarınızı görmek için lütfen giriş yapın.");
        setLoading(false); // Yüklemeyi durdur
        // İsteğe bağlı: Kullanıcıyı login sayfasına yönlendir
        // navigate('/login');
        return; // Fonksiyondan çık
      }

      setLoading(true); // Yükleme başladı
      setError(null);   // Önceki hataları temizle
      setItineraries([]);
      try {
        // Backend'e GET isteği göndererek kullanıcının seyahat planlarını çek
        const response = await axios.get('/api/v1/itineraries/', { // Django backend endpoint'i
          headers: { 'Authorization': `Token ${token}` }, // Token'ı header'da gönder
        });

        // Gelen veri DRF pagination kullanıyorsa response.data.results içinde olur,
        // kullanmıyorsa doğrudan response.data içinde olur.
        setItineraries(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch itineraries:", err);
        if (err.response && err.response.status === 401) {
            // Token geçersiz veya süresi dolmuş olabilir
            setError("Giriş bilgileriniz geçersiz veya oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.");
            // navigate('/login'); // Kullanıcıyı login'e yönlendir
        } else {
            setError("Seyahat planları yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.");
        }
      } finally {
        setLoading(false); // Yükleme bitti (başarılı veya hatalı)
      }
    };

    fetchItineraries();
  }, [token, navigate]); // Bağımlılıklar: token veya navigate değişirse useEffect tekrar çalışır

  const handleDeleteItinerary = async (itineraryIdToDelete) => {
    console.log(token)
    if (!window.confirm("Bu seyahat planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return; // Kullanıcı iptal ederse bir şey yapma
    }

    setError(null); // Önceki hataları temizle

    try {
      await axios.delete(`/api/v1/itineraries/${itineraryIdToDelete}/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      // Başarıyla silindikten sonra seyahat planları listesini güncelle (silineni listeden çıkar)
      setItineraries(prevItineraries => prevItineraries.filter(it => it.id !== itineraryIdToDelete));
      // Kullanıcıya başarı mesajı gösterilebilir (örn: bir toast notification ile)
      alert("Seyahat planı başarıyla silindi.");
    } catch (err) {
      console.error("Failed to delete itinerary:", err);
      setError("Seyahat planı silinirken bir hata oluştu.");
      if (err.response && err.response.status === 401) {
        setError("Bu işlemi yapmak için yetkiniz yok veya oturumunuzun süresi dolmuş.");
      }
      // Hata mesajı alert ile de gösterilebilir
      // alert("Seyahat planı silinirken bir hata oluştu.");
    }
  };

  // --- RENDER KISMI ---

  if (loading) {
    // Yüklenme sırasında gösterilecek içerik
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"> {/* Yüksekliği ayarla */}
        <p className="text-xl text-gray-600">Seyahat planları yükleniyor...</p>
        {/* İsteğe bağlı: Spinner eklenebilir */}
      </div>
    );
  }

  if (error) {
    // Hata durumunda gösterilecek içerik
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="p-4 bg-red-100 text-red-700 rounded-md shadow">
          <p className="font-semibold">Hata!</p>
          <p>{error}</p>
          {(!token || (error.includes("giriş") || error.includes("oturum"))) && (
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Giriş Yap
            </button>
          )}
        </div>
      </div>
    );
  }

  if (itineraries.length === 0) {
    // Hiç seyahat planı yoksa gösterilecek içerik
    return (
      <div className="text-center p-10 min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25M18.25 12L19.5 11.25M18.25 12L19.5 12.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl text-gray-600 mb-6">Henüz kaydedilmiş bir seyahat planınız bulunmuyor.</p>
        <motion.button
          onClick={() => navigate('/planner')} // Yeni plan oluşturma sayfasına yönlendir
          className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          <span>Hemen Bir Plan Oluştur!</span>
        </motion.button>
      </div>
    );
  }

  // Seyahat planları varsa, bunları listele
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-gray-800 text-center">
        Kaydedilmiş Seyahat Planlarım
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
        {itineraries.map(itinerary => (
          <div
            key={itinerary.id}
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col"
          >
            <div className="p-6 flex-grow"> {/* flex-grow eklendi */}
              <h2 className="text-xl font-semibold text-blue-700 mb-2 truncate" title={itinerary.name || "İsimsiz Rota"}>
                {itinerary.name || "İsimsiz Rota"}
              </h2>
              <p className="text-xs text-gray-500 mb-1">
                Oluşturulma: {new Date(itinerary.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              {itinerary.updated_at && new Date(itinerary.created_at).getTime() !== new Date(itinerary.updated_at).getTime() && (
                 <p className="text-xs text-gray-500 mb-3">
                    Güncellenme: {new Date(itinerary.updated_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                 </p>
              )}

              {/* Rota Adımlarının Özeti (places_details kullanılarak) */}
              {itinerary.places_details && itinerary.places_details.length > 0 ? (
                <>
                  <div className="my-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Öne Çıkan Duraklar:</h4>
                    <ul className="list-none text-sm text-gray-600 space-y-1">
                      {[
                        // Start location 
                        itinerary.start_location && {
                          external_id: itinerary.start_location.external_id,
                          name: itinerary.start_location.name
                        },
                        // Regular waypoints
                        ...itinerary.places_details.map(p => ({
                          external_id: p.external_id,
                          name: p.name
                        })),
                        // End location
                        itinerary.end_location && {
                          external_id: itinerary.end_location.external_id,
                          name: itinerary.end_location.name
                        }
                      ].filter(Boolean).map((place, idx) => (
                        <li 
                          key={`${place.external_id}-${idx}`} 
                          className="truncate flex items-center p-1 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => setSelectedPlace(place)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="flex-1 truncate">{place.name}</span>
                          <span className="bg-gray-200 text-xs rounded-full px-2 py-0.5 ml-1 text-gray-700">
                            {itinerary.start_location && place.external_id === itinerary.start_location.external_id ? 'B' : 
                             itinerary.end_location && place.external_id === itinerary.end_location.external_id ? 'S' : 
                             idx === 0 ? 1 : idx}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 my-4">Bu rotada henüz durak tanımlanmamış.</p>
              )}
            </div>

            {/* Butonları ve haritayı en alta sabitlemek için mt-auto ile bir sarmalayıcı */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 mt-auto">
              {itinerary.places_details && itinerary.places_details.length > 0 && (
                <>
                  <div className="mb-3 h-40 border rounded overflow-hidden">
                    <MapView
                      coords={[
                        // Start location
                        itinerary.start_location && {
                          lat: parseFloat(itinerary.start_location.latitude),
                          lng: parseFloat(itinerary.start_location.longitude),
                          id: itinerary.start_location.external_id,
                          name: itinerary.start_location.name
                        },
                        // Regular waypoints
                        ...itinerary.places_details.map((p) => {
                          const lat = parseFloat(p.latitude);
                          const lng = parseFloat(p.longitude);
                          
                          return {
                            lat,
                            lng,
                            id: p.external_id,
                            name: p.name
                          };
                        }),
                        // End location
                        itinerary.end_location && {
                          lat: parseFloat(itinerary.end_location.latitude),
                          lng: parseFloat(itinerary.end_location.longitude),
                          id: itinerary.end_location.external_id,
                          name: itinerary.end_location.name
                        }
                      ].filter(Boolean)}
                      startLocationId={itinerary.start_location?.external_id}
                      endLocationId={itinerary.end_location?.external_id}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <button
                      onClick={() => setSelectedItinerary(itinerary)}
                      className="w-full text-sm flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      Rota Detaylarını Görüntüle
                    </button>
                  </div>
                </>
              )}
              
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <button
                  onClick={() => navigate(`/planner/${itinerary.id}/edit`)}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteItinerary(itinerary.id)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Yer detayı modalı */}
      {selectedPlace && (
        <PlaceDetailModal 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)} 
        />
      )}

      {/* Rota Detayları Modal */}
      {selectedItinerary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">{selectedItinerary.name} - Rota Detayları</h3>
                <button 
                  onClick={() => setSelectedItinerary(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-5">
              {/* Harita görünümü */}
              <div className="h-64 border rounded overflow-hidden mb-6">
                <MapView
                  coords={[
                    // Start location
                    selectedItinerary.start_location && {
                      lat: parseFloat(selectedItinerary.start_location.latitude),
                      lng: parseFloat(selectedItinerary.start_location.longitude),
                      id: selectedItinerary.start_location.external_id,
                      name: selectedItinerary.start_location.name
                    },
                    // Regular waypoints
                    ...selectedItinerary.places_details.map((p) => {
                      const lat = parseFloat(p.latitude);
                      const lng = parseFloat(p.longitude);
                      
                      return {
                        lat,
                        lng,
                        id: p.external_id,
                        name: p.name
                      };
                    }),
                    // End location
                    selectedItinerary.end_location && {
                      lat: parseFloat(selectedItinerary.end_location.latitude),
                      lng: parseFloat(selectedItinerary.end_location.longitude),
                      id: selectedItinerary.end_location.external_id,
                      name: selectedItinerary.end_location.name
                    }
                  ].filter(Boolean)}
                  startLocationId={selectedItinerary.start_location?.external_id}
                  endLocationId={selectedItinerary.end_location?.external_id}
                />
              </div>
              
              {/* Seyahat modu seçimi */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Seyahat Modu:</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTravelMode('DRIVING')}
                    className={`px-3 py-1.5 text-sm rounded-full ${travelMode === 'DRIVING' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 10H16M7 14H8M16 14H17M3.5 18V9C3.5 7.89543 4.39543 7 5.5 7H18.5C19.6046 7 20.5 7.89543 20.5 9V18M3.5 18H20.5M3.5 18C3.5 19.1046 4.39543 20 5.5 20H6.5M20.5 18C20.5 19.1046 19.6046 20 18.5 20H17.5M6.5 20V19C6.5 18.4477 6.94772 18 7.5 18H16.5C17.0523 18 17.5 18.4477 17.5 19V20M6.5 20H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Araç
                    </span>
                  </button>
                  <button
                    onClick={() => setTravelMode('WALKING')}
                    className={`px-3 py-1.5 text-sm rounded-full ${travelMode === 'WALKING' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 5.5C13.5 6.88071 12.3807 8 11 8C9.61929 8 8.5 6.88071 8.5 5.5C8.5 4.11929 9.61929 3 11 3C12.3807 3 13.5 4.11929 13.5 5.5Z" fill="currentColor"/>
                        <path d="M13 14.5L11 22M13 14.5L16 17.5M13 14.5L9 11M9 11L10 8.5M9 11L6 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Yürüyüş
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Seyahat süresi bilgisi */}
              <TravelTimeDisplay 
                coords={[
                  // Start location
                  selectedItinerary.start_location && {
                    lat: parseFloat(selectedItinerary.start_location.latitude),
                    lng: parseFloat(selectedItinerary.start_location.longitude),
                    id: selectedItinerary.start_location.external_id,
                    name: selectedItinerary.start_location.name
                  },
                  // Regular waypoints
                  ...selectedItinerary.places_details.map((p) => {
                    const lat = parseFloat(p.latitude);
                    const lng = parseFloat(p.longitude);
                    
                    return {
                      lat,
                      lng,
                      id: p.external_id,
                      name: p.name
                    };
                  }),
                  // End location
                  selectedItinerary.end_location && {
                    lat: parseFloat(selectedItinerary.end_location.latitude),
                    lng: parseFloat(selectedItinerary.end_location.longitude),
                    id: selectedItinerary.end_location.external_id,
                    name: selectedItinerary.end_location.name
                  }
                ].filter(Boolean)}
                travelMode={travelMode}
                startLocationId={selectedItinerary.start_location?.external_id}
                endLocationId={selectedItinerary.end_location?.external_id}
              />
              
              {/* Duraklar listesi */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Duraklar:</h4>
                <div className="space-y-2">
                  {[
                    // Start location
                    selectedItinerary.start_location && {
                      external_id: selectedItinerary.start_location.external_id,
                      name: selectedItinerary.start_location.name,
                      address: selectedItinerary.start_location.address
                    },
                    // Regular waypoints
                    ...selectedItinerary.places_details.map((p) => ({
                      external_id: p.external_id,
                      name: p.name,
                      address: p.address
                    })),
                    // End location
                    selectedItinerary.end_location && {
                      external_id: selectedItinerary.end_location.external_id,
                      name: selectedItinerary.end_location.name,
                      address: selectedItinerary.end_location.address
                    }
                  ].map((place, idx) => (
                    <div 
                      key={`${place.external_id}-${idx}`}
                      className="flex items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        selectedItinerary.start_location && place.external_id === selectedItinerary.start_location.external_id ? 'bg-green-500' : 
                        selectedItinerary.end_location && place.external_id === selectedItinerary.end_location.external_id ? 'bg-red-500' : 
                        'bg-blue-500'
                      } text-white font-medium`}>
                        {selectedItinerary.start_location && place.external_id === selectedItinerary.start_location.external_id ? 'B' : 
                         selectedItinerary.end_location && place.external_id === selectedItinerary.end_location.external_id ? 'S' : 
                         idx === 0 ? 1 : idx}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-gray-600">{place.address}</div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedItinerary(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyItineraries;