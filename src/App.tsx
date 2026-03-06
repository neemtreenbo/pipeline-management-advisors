import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/app/HomePage'
import ClientsPage from './pages/app/clients/ClientsPage'
import ClientDetailPage from './pages/app/clients/ClientDetailPage'
import PipelinePage from './pages/app/pipeline/PipelinePage'
import TasksPage from './pages/app/tasks/TasksPage'
import NotesPage from './pages/app/notes/NotesPage'
import NoteDetailPage from './pages/app/notes/NoteDetailPage'
import RulesPage from './pages/app/settings/RulesPage'
import NetworkPage from './pages/app/network/NetworkPage'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<HomePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:clientId" element={<ClientDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notes/:noteId" element={<NoteDetailPage />} />
        <Route path="network" element={<NetworkPage />} />
        <Route path="settings/rules" element={<RulesPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
