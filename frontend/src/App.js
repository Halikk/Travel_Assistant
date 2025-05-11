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
import { ReactComponent as Logo } from "./assets/logo.svg"; // your SVG logo

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
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center space-x-2">
          <Logo className="h-8 w-8 text-indigo-600" />
          <span className="text-xl md:text-2xl font-bold text-indigo-600">PlanGo</span>
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
          className={`flex-col md:flex-row md:flex items-center space-y-4 md:space-y-0 md:space-x-6
                      absolute md:static bg-white left-0 right-0 top-full md:top-auto px-6 py-4 md:p-0
                      transition-transform transform ${
                        open ? "translate-y-0" : "-translate-y-full md:translate-y-0"
                      }`}
        >
          {token ? (
            <>
              <Link
                to="/planner"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded-md text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Yeni Plan
              </Link>
              <Link
                to="/my-itineraries"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded-md text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Planlarım
              </Link>
              <button
                onClick={handleLogout}
                className="w-full md:w-auto block text-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded-md text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Kayıt Ol
              </Link>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                Giriş Yap
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
        <Logo className="h-12 w-auto mx-auto text-white" />
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
              className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-full shadow-lg hover:bg-indigo-50 transition"
            >
              Plan Oluştur
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-full shadow-lg hover:bg-indigo-50 transition"
              >
                Kayıt Ol
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 bg-indigo-700 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-800 transition"
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
