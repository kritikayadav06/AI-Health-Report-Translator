import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, FileSearch, LineChart, Lock, MessageCircleQuestion } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BodyMap from '../components/BodyMap'
import { Disclaimer } from '../components/ui'

const DEMO_ORGANS = [
  { key: 'brain', status: 'normal' }, { key: 'thyroid', status: 'attention' }, { key: 'heart', status: 'attention' },
  { key: 'lungs', status: 'normal' }, { key: 'liver', status: 'normal' }, { key: 'pancreas', status: 'normal' },
  { key: 'kidneys', status: 'normal' }, { key: 'blood', status: 'normal' }, { key: 'bones', status: 'attention' },
]

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', acceptDisclaimer: false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isLogin) await login(form.email, form.password)
      else await register(form)
      navigate('/')
    } catch (err) {
      setError(err.details?.[0]?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth-art">
        <BodyMap organs={DEMO_ORGANS} />
        <div className="row" style={{ gap: 10, marginBottom: 28, position: 'relative' }}>
          <div className="brand-mark"><Activity size={20} strokeWidth={2.5} /></div>
          <b style={{ fontFamily: 'var(--display)' }}>AI Health Report Translator</b>
        </div>
        <h1>Understand your lab reports in <span>plain language</span>.</h1>
        <p>Upload a PDF or photo of your report. See every test on an interactive body map, what it means, and what to ask your doctor.</p>
        <div className="features">
          <div><FileSearch size={18} /> Reads PDFs and photos (OCR)</div>
          <div><Activity size={18} /> Normal, high and low values highlighted</div>
          <div><MessageCircleQuestion size={18} /> Simple explanations and doctor questions</div>
          <div><LineChart size={18} /> Trends across all your reports</div>
          <div><Lock size={18} /> Private: files are never stored, delete anytime</div>
        </div>
      </section>

      <section className="auth-form">
        <form className="card stack" style={{ gap: 16 }} onSubmit={submit}>
          <div>
            <div className="eyebrow">{isLogin ? 'Welcome back' : 'Get started'}</div>
            <h2 style={{ fontSize: 26, marginTop: 4 }}>{isLogin ? 'Log in' : 'Create your account'}</h2>
          </div>
          {!isLogin && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" value={form.name} onChange={set('name')} required autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={form.password} onChange={set('password')} required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} />
            {!isLogin && <span className="faint" style={{ fontSize: 12 }}>At least 8 characters, with a letter and a number.</span>}
          </div>
          {!isLogin && (
            <label className="check">
              <input type="checkbox" checked={form.acceptDisclaimer} onChange={set('acceptDisclaimer')} required />
              <span>I understand this app is an informational and educational tool. It does not diagnose, recommend treatment or replace a qualified doctor.</span>
            </label>
          )}
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
          <p className="muted" style={{ fontSize: 14, textAlign: 'center' }}>
            {isLogin ? <>New here? <Link to="/register" style={{ color: 'var(--cyan)' }}>Create an account</Link></> : <>Already have an account? <Link to="/login" style={{ color: 'var(--cyan)' }}>Log in</Link></>}
          </p>
          {isLogin && <p className="faint" style={{ fontSize: 12, textAlign: 'center' }}>Demo: demo@example.com / Demo12345 (after running the seed script)</p>}
          <Disclaimer />
        </form>
      </section>
    </div>
  )
}
