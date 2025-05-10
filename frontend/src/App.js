import React, { useContext } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { AuthProvider, AuthContext } from './AuthContext'

import Signup         from './components/Signup'
import Login          from './components/Login'
import TravelPlanner  from './components/TravelPlanner'
import History        from './components/History'

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext)
  return token
    ? children
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* 1. Kök / kesinlikle login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 2. Açık yollar */}
          <Route path="/login"  element={<Login  />} />
          <Route path="/signup" element={<Signup />} />

          {/* 3. Korunan */}
          <Route
            path="/planner"
            element={
              <PrivateRoute>
                <TravelPlanner />
              </PrivateRoute>
            }
          />

          <Route
            path="/history"
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />

          {/* 4. Diğer tüm adresler */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
