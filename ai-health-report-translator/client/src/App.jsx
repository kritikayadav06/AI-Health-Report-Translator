import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import OrganPage from './pages/OrganPage'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import ReportPage from './pages/ReportPage'
import ReportsPage from './pages/ReportsPage'
import TrendsPage from './pages/TrendsPage'
import SettingsPage from './pages/SettingsPage'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? children : <Navigate to="/login" replace />
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><AuthPage mode="register" /></PublicOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="organ/:key" element={<OrganPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportPage />} />
        <Route path="reports/:id/review" element={<ReviewPage />} />
        <Route path="trends" element={<TrendsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
