// src/App.js (veya ana router dosyanız)
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Signup from './components/Signup';
import Login from './components/Login';
import TravelPlanner from './components/TravelPlanner'; // Bu, PlanView ve ItineraryPlanner'ı içeriyor
import MyItineraries from './components/MyItineraries';
import EditItineraryPage from './components/EditItineraryPage';
import { AuthContext, AuthProvider } from './AuthContext'; // AuthProvider'ı da import edin
import axios from 'axios';

axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;
// Basit bir Navbar component'i
function Navbar() {
  const { token, setToken } = useContext(AuthContext);

  const handleLogout = () => {
    setToken(null); // Token'ı AuthContext'ten sil
    localStorage.removeItem('token'); // localStorage'dan sil
    // Kullanıcıyı login sayfasına yönlendirebilirsiniz (Navigate ile veya programatik olarak)
  };

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold hover:text-gray-300">Seyahat Planlayıcı</Link>
        <div>
          {token ? (
            <>
              <Link to="/planner" className="px-3 py-2 hover:bg-gray-700 rounded">Yeni Plan</Link>
              <Link to="/my-itineraries" className="px-3 py-2 hover:bg-gray-700 rounded">Planlarım</Link>
              <button onClick={handleLogout} className="ml-4 px-3 py-2 bg-red-500 hover:bg-red-600 rounded">Çıkış Yap</button>
            </>
          ) : (
            <>
              <Link to="/signup" className="px-3 py-2 hover:bg-gray-700 rounded">Kayıt Ol</Link>
              <Link to="/login" className="px-3 py-2 hover:bg-gray-700 rounded">Giriş Yap</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// Giriş yapmış kullanıcılar için korumalı route
function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="pt-4">
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            {/* Yeni Plan Oluşturma */}
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  {/* TravelPlanner, PlanView ve ItineraryPlanner'ı içeriyor */}
                  <TravelPlanner />
                </ProtectedRoute>
              }
            />

            {/* Kayıtlı Planları Listeleme */}
            <Route
              path="/my-itineraries"
              element={
                <ProtectedRoute>
                  <MyItineraries />
                </ProtectedRoute>
              }
            />

            {/* KAYITLI BİR PLANI DÜZENLEME/GÖRÜNTÜLEME */}
            <Route
              path="/planner/:itineraryId/edit" // DİKKAT: Bu URL yapısı MyItineraries'teki navigate ile eşleşmeli
              element={
                <ProtectedRoute>
                  <EditItineraryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/"
              element={<Home />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Basit bir Home component'i
function Home() {
  const { token } = useContext(AuthContext);
  return (
    <div className="text-center p-10">
      <h1 className="text-4xl font-bold mb-6">Seyahat Planlayıcıya Hoş Geldiniz!</h1>
      {token ? (
        <p>Harika seyahatler planlamaya başlayın!</p>
      ) : (
        <p>Lütfen <Link to="/login" className="text-blue-600 hover:underline">giriş yapın</Link> veya <Link to="/signup" className="text-blue-600 hover:underline">kayıt olun</Link>.</p>
      )}
    </div>
  );
}


export default App;