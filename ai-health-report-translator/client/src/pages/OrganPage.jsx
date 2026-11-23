import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, UploadCloud } from 'lucide-react'
import { api } from '../api/client'
import OrganArt from '../components/OrganArt'
import { Disclaimer, Loading, ScoreRing, StatusPill, TestCard } from '../components/ui'
import { ORGAN_META, STATUS_COLOR, STATUS_LABEL, fmtDate } from '../lib/health'

export default function OrganPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.overview().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="error-box">{error}</div>
  if (!data) return <Loading />
  const organ = data.organs.find((o) => o.key === key)
  if (!organ) return <div className="empty">Unknown body area. <Link to="/">Back to overview</Link></div>

  const meta = ORGAN_META[key]
  const color = organ.status === 'no-data' ? meta.hue : STATUS_COLOR[organ.status]
  const tabs = data.organs.filter((o) => o.tests.length || o.key === key)
  const latestDate = organ.tests.reduce((d, t) => (!d || new Date(t.date) > new Date(d) ? t.date : d), null)

  return (
    <div>
      <div className="topbar">
        <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> Body overview</Link>
      </div>

      <div className="organ-tabs">
        {tabs.map((o) => {
          const m = ORGAN_META[o.key]
          const Icon = m.icon
          return (
            <Link key={o.key} to={`/organ/${o.key}`} className={`organ-tab ${o.key === key ? 'active' : ''}`} style={{ '--c': m.hue }}>
              <Icon size={15} color={m.hue} /> {m.label}
              {o.abnormalCount > 0 && <span className="dot" style={{ color: STATUS_COLOR[o.status] }} />}
            </Link>
          )
        })}
      </div>

      <motion.section key={key} className="card organ-hero" style={{ '--c': color }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="organ-art" style={{ '--c': color }}><OrganArt organ={key} color={color} /></div>
        <div className="stack" style={{ gap: 14 }}>
          <div className="row wrap">
            <span className="eyebrow">Body system</span>
            <StatusPill status={organ.status}>{STATUS_LABEL[organ.status]}</StatusPill>
          </div>
          <h1 style={{ fontSize: 38 }}>{meta.label}</h1>
          <p className="muted" style={{ maxWidth: 620 }}>{organ.description}</p>
          {organ.note && (
            <div className="row" style={{ alignItems: 'flex-start', gap: 10, maxWidth: 640 }}>
              <Sparkles size={16} color="var(--cyan)" style={{ marginTop: 3, flex: 'none' }} />
              <p className="explain"><span className="muted">Latest report: </span>{organ.note}</p>
            </div>
          )}
          <div className="row wrap" style={{ gap: 18 }}>
            <ScoreRing score={organ.score} size={110} label="area score" />
            <div className="stat-grid" style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
              <div className="stat"><b>{organ.tests.length}</b><span>Tests linked</span></div>
              <div className="stat"><b style={{ color: organ.abnormalCount ? 'var(--amber)' : undefined }}>{organ.abnormalCount}</b><span>Out of range</span></div>
              <div className="stat" style={{ gridColumn: '1 / -1' }}><b style={{ fontSize: 16 }}>{latestDate ? fmtDate(latestDate) : '—'}</b><span>Most recent result</span></div>
            </div>
          </div>
        </div>
      </motion.section>

      {organ.tests.length === 0 ? (
        <div className="card empty" style={{ marginTop: 18 }}>
          <p>No tests from your reports are linked to this body area yet.</p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: 14 }}><UploadCloud size={16} /> Upload a report</Link>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 20, margin: '26px 0 14px' }}>Tests for this area</h2>
          <div className="test-grid">
            {organ.tests.map((t, i) => (
              <motion.div key={t.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                <TestCard test={t} onTrend={() => navigate(`/trends?key=${t.key}`)} />
              </motion.div>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: 22 }}><Disclaimer text={data.disclaimer} /></div>
    </div>
  )
}
