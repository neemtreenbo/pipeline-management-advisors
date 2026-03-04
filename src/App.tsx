import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/app/HomePage'
import ClientsPage from './pages/app/clients/ClientsPage'
import ClientDetailPage from './pages/app/clients/ClientDetailPage'
import PipelinePage from './pages/app/pipeline/PipelinePage'
import DealDetailPage from './pages/app/pipeline/DealDetailPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App routes */}
      <Route
        path="/app/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/clients"
        element={
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/clients/:clientId"
        element={
          <ProtectedRoute>
            <ClientDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/pipeline"
        element={
          <ProtectedRoute>
            <PipelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/deals/:dealId"
        element={
          <ProtectedRoute>
            <DealDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
