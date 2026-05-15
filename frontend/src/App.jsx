import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import POS from './pages/POS'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  const token = localStorage.getItem('token')

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? '/pos' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={token ? '/pos' : '/login'} replace />} />
    </Routes>
  )
}

export default App