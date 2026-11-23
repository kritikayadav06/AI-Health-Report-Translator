import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileUp, Keyboard, Lock, ScanText } from 'lucide-react'
import { api } from '../api/client'
import { Disclaimer } from '../components/ui'

const STAGES = ['Uploading securely', 'Reading text (PDF / OCR)', 'Finding tests, values and ranges', 'Preparing your review']

export function Steps({ current }) {
  const labels = ['Upload', 'Review values', 'AI explanation']
  return (
    <div className="steps">
      {labels.map((l, i) => (
        <span key={l} className={`step ${i < current ? 'done' : i === current ? 'current' : ''}`}>{i < current ? '✓' : `${i + 1}.`} {l}</span>
      ))}
    </div>
  )
}

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ title: '', reportDate: '' })

  async function handleFile(file) {
    if (!file) return
    setError('')
    if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(file.type)) return setError('Please choose a PDF, PNG, JPG or WEBP file.')
    if (file.size > 10 * 1024 * 1024) return setError('The file is larger than 10 MB.')
    setBusy(true)
    setStage(0)
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1100)
    try {
      const { report } = await api.upload(file, meta)
      navigate(`/reports/${report.id}/review`)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(timer)
      setBusy(false)
    }
  }

  async function manual() {
    navigate('/reports/new/review')
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="topbar">
        <div>
          <div className="eyebrow">New report</div>
          <h1>Upload a lab report</h1>
          <p>PDF or a clear photo. You will check every value before anything is analysed.</p>
        </div>
      </div>
      <Steps current={0} />

      <div className="card">
        {busy ? (
          <div className="processing">
            <div className="orb" />
            <h3>{STAGES[stage]}…</h3>
            <p className="muted" style={{ marginTop: 6 }}>Scanned reports and photos can take up to a minute.</p>
          </div>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: '1fr 200px', marginBottom: 16 }}>
              <div className="field">
                <label htmlFor="title">Report name (optional)</label>
                <input id="title" className="input" placeholder="e.g. Annual health check" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="date">Report date (optional)</label>
                <input id="date" type="date" className="input" value={meta.reportDate} onChange={(e) => setMeta({ ...meta, reportDate: e.target.value })} />
              </div>
            </div>
            <motion.div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
              whileHover={{ scale: 1.005 }}
              role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
              <div className="big-icon"><FileUp size={30} /></div>
              <h3>Drop your report here or click to browse</h3>
              <p className="muted" style={{ marginTop: 6 }}>PDF, PNG, JPG or WEBP, up to 10 MB</p>
              <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(e) => handleFile(e.target.files[0])} />
            </motion.div>
            {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
            <div className="row between wrap" style={{ marginTop: 16 }}>
              <span className="row muted" style={{ fontSize: 13 }}><Lock size={14} /> The file is processed in memory and never stored. Only the test values are saved.</span>
              <button className="btn" onClick={manual}><Keyboard size={16} /> Enter values manually</button>
            </div>
          </>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 18 }}>
        {[
          [ScanText, 'Clear photos work best', 'Lay the report flat, in good light, and keep the table straight.'],
          [Lock, 'Personal details stay private', 'Names and contact details are never sent to the AI service.'],
        ].map(([Icon, t, d]) => (
          <div key={t} className="card row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <Icon size={20} color="var(--cyan)" style={{ flex: 'none', marginTop: 2 }} />
            <div><b style={{ fontSize: 14 }}>{t}</b><p className="muted" style={{ fontSize: 13 }}>{d}</p></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}><Disclaimer /></div>
    </div>
  )
}
