import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, FileText, UploadCloud } from 'lucide-react'
import { api } from '../api/client'
import { Loading, StatusPill } from '../components/ui'
import { ORGAN_META, fmtDate, scoreColor } from '../lib/health'

export default function ReportsPage() {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.reports().then((d) => setReports(d.reports)).catch((e) => setError(e.message)) }, [])

  if (error) return <div className="error-box">{error}</div>
  if (!reports) return <Loading />
  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="topbar">
        <div><div className="eyebrow">History</div><h1>My reports</h1><p>{reports.length} report{reports.length === 1 ? '' : 's'} saved</p></div>
        <Link to="/upload" className="btn btn-primary"><UploadCloud size={18} /> Upload report</Link>
      </div>
      {!reports.length && (
        <div className="card empty"><FileText size={40} color="var(--faint)" /><p style={{ marginTop: 10 }}>No reports yet. Upload one to get started.</p></div>
      )}
      <div className="report-list">
        {reports.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
            <Link to={r.state === 'pending_review' ? `/reports/${r.id}/review` : `/reports/${r.id}`} className="card report-item">
              <div className="mini-score" style={{ color: scoreColor(r.healthScore) }}>{r.healthScore ?? '–'}</div>
              <div style={{ minWidth: 0 }}>
                <b>{r.title}</b>
                <div className="muted" style={{ fontSize: 13 }}>{fmtDate(r.reportDate)} · {r.testCount} tests · {r.abnormalCount} outside range</div>
              </div>
              <div className="chip-row">
                {r.organs.map((o) => { const M = ORGAN_META[o]; const I = M.icon; return <span key={o} className="chip" style={{ '--c': M.hue }} title={M.label}><I size={14} /></span> })}
              </div>
              <div className="row">
                {r.state === 'pending_review' ? <StatusPill status="High">Needs review</StatusPill> : <ChevronRight size={18} color="var(--muted)" />}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
