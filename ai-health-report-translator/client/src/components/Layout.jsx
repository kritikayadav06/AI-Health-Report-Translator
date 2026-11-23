import { NavLink, Outlet } from 'react-router-dom'
import { Activity, FileText, LayoutDashboard, LineChart, LogOut, Settings, UploadCloud } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Body overview', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload report', icon: UploadCloud },
  { to: '/reports', label: 'My reports', icon: FileText },
  { to: '/trends', label: 'Trends', icon: LineChart },
  { to: '/settings', label: 'Privacy & account', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={20} strokeWidth={2.5} /></div>
          <div className="brand-name">Health Report<small>AI Translator</small></div>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={label}>
            <Icon size={18} /> <span>{label}</span>
          </NavLink>
        ))}
        <div className="spacer" />
        <div className="user-chip">
          <div className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div className="faint" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost icon-btn" onClick={logout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  )
}
