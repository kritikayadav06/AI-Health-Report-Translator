import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Pencil, Printer, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { Disclaimer, Loading, ScoreRing, TestCard } from '../components/ui'
import { ORGAN_META, fmtDate, isAbnormal } from '../lib/health'
import { Steps } from './UploadPage'

const ORDER = ['heart', 'pancreas', 'liver', 'kidneys', 'thyroid', 'blood', 'bones', 'brain', 'lungs', 'other']

export default function ReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.report(id).then((d) => {
      if (d.report.state === 'pending_review') navigate(`/reports/${id}/review`, { replace: true })
      else setReport(d.report)
    }).catch((e) => setError(e.message))
  }, [id, navigate])

  const groups = useMemo(() => {
    if (!report) return []
    const rows = report.results.filter((r) => filter === 'all' || isAbnormal(r.status))
    return ORDER.map((k) => ({ key: k, rows: rows.filter((r) => r.organ === k) })).filter((g) => g.rows.length)
  }, [report, filter])

  async function remove() {
    if (!window.confirm('Delete this report permanently? This cannot be undone.')) return
    await api.deleteReport(id)
    navigate('/reports')
  }

  if (error) return <div className="error-box">{error}</div>
  if (!report) return <Loading />
  const abnormal = report.results.filter((r) => isAbnormal(r.status)).length
  const critical = report.results.filter((r) => r.critical)

  return (
    <div>
      <div className="topbar no-print">
        <Link to="/reports" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> All reports</Link>
        <div className="row">
          <button className="btn btn-sm" onClick={() => window.print()}><Printer size={15} /> Print / save PDF</button>
          <Link className="btn btn-sm" to={`/reports/${id}/review`}><Pencil size={15} /> Edit values</Link>
          <button className="btn btn-sm btn-danger" onClick={remove}><Trash2 size={15} /> Delete</button>
        </div>
      </div>
      <div className="no-print"><Steps current={3} /></div>

      <motion.section className="card report-head" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="stack">
          <span className="eyebrow">{fmtDate(report.reportDate)} · {report.source?.type === 'manual' ? 'Entered manually' : `From ${report.source?.type?.toUpperCase()}`}</span>
          <h1 style={{ fontSize: 32 }}>{report.title}</h1>
          <div className="row wrap">
            <span className="pill" style={{ color: 'var(--cyan)' }}>{report.results.length} tests</span>
            <span className="pill" style={{ color: abnormal ? 'var(--amber)' : 'var(--green)' }}>{abnormal} outside range</span>
            <span className="pill" style={{ color: '#a78bfa' }}><Sparkles size={12} /> {report.analysis?.provider === 'claude' ? 'AI explanation' : 'Basic explanation (AI offline)'}</span>
          </div>
        </div>
        <ScoreRing score={report.healthScore} size={130} label="report score" />
      </motion.section>

      {critical.length > 0 && (
        <div className="warn-box" style={{ marginTop: 14, borderColor: 'rgba(251,113,133,.5)', background: 'rgba(251,113,133,.08)', color: '#fecdd3' }}>
          <AlertTriangle size={18} style={{ flex: 'none' }} />
          <span><b>{critical.map((c) => c.name).join(', ')}</b> {critical.length > 1 ? 'are' : 'is'} far outside the usual range. Please contact a doctor promptly. If you feel unwell, seek urgent medical care.</span>
        </div>
      )}
      {report.warnings?.filter((w) => w.startsWith('The AI')).map((w) => <div key={w} className="warn-box" style={{ marginTop: 14 }}>{w}</div>)}

      <div className="grid report-cols" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', marginTop: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title"><h3 className="row"><Sparkles size={16} color="var(--cyan)" /> Summary in plain language</h3></div>
          <p className="summary-text">{report.analysis?.summary}</p>
        </div>
        <div className="card">
          <div className="card-title"><h3>Questions for your doctor</h3></div>
          <ol className="questions">{report.analysis?.doctorQuestions?.map((q) => <li key={q}>{q}</li>)}</ol>
        </div>
      </div>

      <div className="row between wrap no-print" style={{ margin: '26px 0 12px' }}>
        <h2 style={{ fontSize: 20 }}>Results by body area</h2>
        <div className="row">
          <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`btn btn-sm ${filter === 'abnormal' ? 'btn-primary' : ''}`} onClick={() => setFilter('abnormal')}>Outside range</button>
        </div>
      </div>

      {groups.map((g) => {
        const meta = ORGAN_META[g.key]
        const Icon = meta.icon
        const note = report.analysis?.organNotes?.find((n) => n.organ === g.key)?.note
        return (
          <section key={g.key} style={{ marginBottom: 22 }}>
            <div className="row" style={{ marginBottom: 10, gap: 12 }}>
              <span className="organ-icon" style={{ '--c': meta.hue }}><Icon size={18} /></span>
              <div>
                <Link to={`/organ/${g.key}`}><h3 style={{ fontSize: 17 }}>{meta.label}</h3></Link>
                {note && <p className="muted" style={{ fontSize: 13 }}>{note}</p>}
              </div>
            </div>
            <div className="test-grid">
              {g.rows.map((t) => <TestCard key={t.id} test={t} onTrend={() => navigate(`/trends?key=${t.key}`)} />)}
            </div>
          </section>
        )
      })}
      {!groups.length && <div className="card empty">All values in this report are within range.</div>}
      <Disclaimer text={report.disclaimer} />
    </div>
  )
}
