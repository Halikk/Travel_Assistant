// src/App.js
import React, { useState, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { AuthContext, AuthProvider } from "./AuthContext";
import Signup from "./components/Signup";
import Login from "./components/Login";
import TravelPlanner from "./components/TravelPlanner";
import MyItineraries from "./components/MyItineraries";
import EditItineraryPage from "./components/EditItineraryPage";
import { ReactComponent as Logo } from "./assets/logo.svg"; // Kullanıcının kendi logosunu kullan

axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName   = "X-CSRFToken";
axios.defaults.withCredentials   = true;

function Navbar() {
  const { token, setToken } = useContext(AuthContext);
  const [open, setOpen]      = useState(false);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setOpen(false);
  };

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-md">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center space-x-2">
          <Logo className="h-10 w-10 text-indigo-600" />
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 text-transparent bg-clip-text">Seyahat Asistanı</span>
        </Link>

        <button
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <nav
          className={`flex-col md:flex-row md:flex items-center space-y-4 md:space-y-0 md:space-x-4
                      absolute md:static bg-white left-0 right-0 top-full md:top-auto px-6 py-4 md:p-0 shadow-md md:shadow-none
                      transition-transform transform ${
                        open ? "translate-y-0" : "-translate-y-full md:translate-y-0"
                      }`}
        >
          {token ? (
            <>
              <Link
                to="/planner"
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span>Yeni Plan</span>
                </div>
              </Link>
              <Link
                to="/my-itineraries"
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 rounded-lg border-2 border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  <span>Planlarım</span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full md:w-auto text-center px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 00-1-1H4V4h5v4h4v8h-9v-1h6a1 1 0 001-1V8z" clipRule="evenodd" />
                  </svg>
                  <span>Çıkış Yap</span>
                </div>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 rounded-lg border-2 border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  <span>Kayıt Ol</span>
                </div>
              </Link>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>Giriş Yap</span>
                </div>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/login" replace />;
}

function Home() {
  const { token } = useContext(AuthContext);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
    >
      <div className="bg-black/50 backdrop-blur-md rounded-2xl p-8 text-center max-w-lg mx-4 space-y-6">
        <Logo className="h-16 w-16 mx-auto text-white" />
        <h1 className="text-white text-4xl md:text-5xl font-extrabold">
          Seyahat Planlarınıza Hız Katın
        </h1>
        <p className="text-indigo-200 text-lg">
          Kişisel öneriler, interaktif harita ve kolay düzenleme özellikleriyle planınızı oluşturun.
        </p>
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          {token ? (
            <Link
              to="/planner"
              className="px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-full shadow-lg hover:bg-indigo-50 transition-all duration-300 hover:scale-105"
            >
              Plan Oluştur
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="px-6 py-3.5 bg-white text-indigo-600 font-semibold rounded-full shadow-lg hover:bg-indigo-50 transition-all duration-300 hover:scale-105"
              >
                Kayıt Ol
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-105"
              >
                Giriş Yap
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <TravelPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-itineraries"
              element={
                <ProtectedRoute>
                  <MyItineraries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner/:itineraryId/edit"
              element={
                <ProtectedRoute>
                  <EditItineraryPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}
