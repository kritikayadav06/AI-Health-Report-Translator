import { useState } from 'react'
import { Database, EyeOff, FileX, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Disclaimer } from '../components/ui'

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState('')

  async function save(e) {
    e.preventDefault()
    const d = await api.updateProfile({ name })
    setUser(d.user)
    setMsg('Saved')
    setTimeout(() => setMsg(''), 2000)
  }

  async function deleteAll() {
    await api.deleteAccount()
    logout()
  }

  const points = [
    [ShieldCheck, 'Passwords are stored only as salted hashes', 'Logins use short-lived tokens that expire automatically.'],
    [FileX, 'Uploaded files are never stored', 'Your PDF or photo is read in memory and discarded. Only the test values are saved.'],
    [EyeOff, 'No personal details are sent to the AI', 'Only test names, values, units and ranges are shared with the AI service.'],
    [Database, 'Only you can see your reports', 'Every request is checked against your account.'],
  ]

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="topbar"><div><div className="eyebrow">Settings</div><h1>Privacy & account</h1></div></div>
      <div className="grid">
        <form className="card stack" onSubmit={save}>
          <div className="card-title"><h3>Profile</h3></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Email</label><input className="input" value={user?.email} disabled /></div>
          </div>
          <div className="row"><button className="btn btn-primary btn-sm">Save</button>{msg && <span className="muted">{msg}</span>}</div>
        </form>

        <div className="card">
          <div className="card-title"><h3 className="row"><KeyRound size={16} color="var(--cyan)" /> How your data is protected</h3></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {points.map(([Icon, t, d]) => (
              <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Icon size={18} color="var(--green)" style={{ flex: 'none', marginTop: 2 }} />
                <div><b style={{ fontSize: 14 }}>{t}</b><p className="muted" style={{ fontSize: 13 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderColor: 'rgba(251,113,133,.3)' }}>
          <div className="card-title"><h3 style={{ color: 'var(--red)' }}>Delete account and all data</h3></div>
          <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>This permanently deletes your account and every report, result and explanation. It cannot be undone.</p>
          <div className="row wrap">
            <input className="input" style={{ maxWidth: 260 }} placeholder='Type "DELETE" to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button className="btn btn-danger" disabled={confirm !== 'DELETE'} onClick={deleteAll}><Trash2 size={16} /> Delete everything</button>
          </div>
        </div>
        <Disclaimer />
      </div>
    </div>
  )
}
