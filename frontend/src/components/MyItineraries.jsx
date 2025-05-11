// src/components/MyItineraries.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Sayfa yönlendirmesi için
import { AuthContext } from '../AuthContext'; // Kullanıcı token'ını ve kimlik doğrulama durumunu almak için

function MyItineraries() {
  const [itineraries, setItineraries] = useState([]); // Backend'den gelen seyahat planlarını tutacak state
  const [loading, setLoading] = useState(true); // Yüklenme durumunu tutacak state (başlangıçta true)
  const [error, setError] = useState(null); // Hata mesajlarını tutacak state
  const { token } = useContext(AuthContext); // AuthContext'ten token'ı al
  const navigate = useNavigate(); // Programatik olarak sayfa yönlendirmesi için

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
        <button
          onClick={() => navigate('/planner')} // Yeni plan oluşturma sayfasına yönlendir
          className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md hover:shadow-lg"
        >
          Hemen Bir Plan Oluştur!
        </button>
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
                <div className="my-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Öne Çıkan Duraklar:</h4>
                  <ul className="list-none text-sm text-gray-600 space-y-1">
                    {itinerary.places_details.slice(0, 3).map(place => ( // İlk 3 durağı göster
                      <li key={place.external_id} className="truncate flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {place.name}
                      </li>
                    ))}
                    {itinerary.places_details.length > 3 && (
                      <li className="text-xs text-gray-500 mt-1">...ve {itinerary.places_details.length - 3} durak daha</li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 my-4">Bu rotada henüz durak tanımlanmamış.</p>
              )}
            </div>

            {/* Butonları en alta sabitlemek için mt-auto ile bir sarmalayıcı */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 mt-auto">
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <button
                  onClick={() => navigate(`/planner/${itinerary.id}/edit`)}
                  className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Görüntüle / Düzenle
                </button>
                <button
                  onClick={() => handleDeleteItinerary(itinerary.id)}
                  className="flex-1 bg-red-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyItineraries;