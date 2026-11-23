import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ChevronRight, MousePointerClick, Sparkles, UploadCloud } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import BodyMap, { ORGAN_SHAPES } from '../components/BodyMap'
import { Disclaimer, Loading, ScoreRing, StatusPill, TestCard } from '../components/ui'
import { ORGAN_META, STATUS_COLOR, STATUS_LABEL, fmtDate, fmtValue, isAbnormal } from '../lib/health'

const VIEW_W = 300
const VIEW_H = 660

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [hovered, setHovered] = useState(null)
  const [focus, setFocus] = useState(null)
  const stageRef = useRef(null)

  useEffect(() => {
    api.overview().then(setData).catch((e) => setError(e.message))
  }, [])

  const organs = useMemo(() => data?.organs || [], [data])
  const byKey = useMemo(() => Object.fromEntries(organs.map((o) => [o.key, o])), [organs])
  const bodyOrgans = organs.filter((o) => o.key !== 'other')
  const listed = [...organs].filter((o) => o.key !== 'other' || o.tests.length).sort((a, b) => rank(b) - rank(a))
  const active = hovered || focus || listed.find((o) => o.status === 'attention' || o.status === 'critical')?.key || listed[0]?.key
  const activeOrgan = byKey[active]
  const findings = organs.flatMap((o) => o.tests.filter((t) => isAbnormal(t.status)).map((t) => ({ ...t, organ: o.key })))
  const s = data?.summary

  if (error) return <div className="error-box">{error}</div>
  if (!data) return <Loading label="Loading your body overview…" />

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Body overview</div>
          <h1>Hello, {user?.name?.split(' ')[0]}</h1>
          <p>{s.lastReport ? `Latest report: ${s.lastReport.title}, ${fmtDate(s.lastReport.date)}` : 'Upload your first lab report to light up your body map.'}</p>
        </div>
        <div className="row">
          {s.pendingReview > 0 && <Link to="/reports" className="btn"><AlertTriangle size={16} color="var(--amber)" /> {s.pendingReview} awaiting review</Link>}
          <Link to="/upload" className="btn btn-primary"><UploadCloud size={18} /> Upload report</Link>
        </div>
      </div>

      <div className="dash">
        {/* ---------- left column ---------- */}
        <div className="grid">
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-title"><h3>Overall</h3><span className="faint" style={{ fontSize: 12 }}>latest values</span></div>
            <ScoreRing score={s.healthScore} sub={s.healthScore == null ? 'no data' : `${s.testCount - s.abnormalCount}/${s.testCount} in range`} />
            <div className="stat-grid" style={{ marginTop: 14 }}>
              <div className="stat"><b>{s.reportCount}</b><span>Reports</span></div>
              <div className="stat"><b>{s.testCount}</b><span>Tests tracked</span></div>
              <div className="stat"><b style={{ color: s.abnormalCount ? 'var(--amber)' : undefined }}>{s.abnormalCount}</b><span>Out of range</span></div>
              <div className="stat"><b style={{ color: s.criticalCount ? 'var(--red)' : undefined }}>{s.criticalCount}</b><span>Urgent flags</span></div>
            </div>
          </motion.div>

          {s.scoreHistory.length > 1 && (
            <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="card-title"><h3>Score over time</h3></div>
              <div style={{ height: 120, marginLeft: -10 }}>
                <ResponsiveContainer>
                  <AreaChart data={s.scoreHistory.map((p) => ({ ...p, label: fmtDate(p.date, { month: 'short', year: '2-digit' }) }))}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#38e1ff" stopOpacity={0.45} />
                        <stop offset="1" stopColor="#38e1ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: '#56617f', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip content={<ScoreTip />} cursor={{ stroke: 'rgba(56,225,255,.3)' }} />
                    <Area type="monotone" dataKey="score" stroke="#38e1ff" strokeWidth={2.5} fill="url(#scoreFill)" dot={{ r: 3, fill: '#38e1ff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {s.lastReport?.summary && (
            <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="card-title"><h3 className="row"><Sparkles size={16} color="var(--cyan)" /> AI summary</h3></div>
              <p className="explain" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.lastReport.summary}</p>
              <Link to={`/reports/${s.lastReport.id}`} className="btn btn-sm" style={{ marginTop: 12 }}>Open full report <ChevronRight size={14} /></Link>
            </motion.div>
          )}
        </div>

        {/* ---------- centre: body ---------- */}
        <div className="card stage-col" style={{ padding: 0 }}>
          <div className="stage" ref={stageRef}>
            <div className="stage-tip"><MousePointerClick size={14} /> Hover an organ, click to explore its tests</div>
            <BodyMap organs={bodyOrgans} hovered={hovered} selected={focus} onHover={setHovered} onSelect={(k) => navigate(`/organ/${k}`)} />
            <AnimatePresence>{hovered && byKey[hovered] && <HoverCard key={hovered} organ={byKey[hovered]} stageRef={stageRef} />}</AnimatePresence>
            <div className="legend">
              {['normal', 'attention', 'critical', 'no-data'].map((k) => (
                <span key={k}><span className="dot" style={{ color: STATUS_COLOR[k] }} />{STATUS_LABEL[k]}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- right column ---------- */}
        <div className="grid">
          <div className="card">
            <div className="card-title"><h3>Body systems</h3><span className="faint" style={{ fontSize: 12 }}>{listed.filter((o) => o.tests.length).length} with data</span></div>
            <div className="organ-list">
              {listed.map((o, i) => (
                <OrganRow key={o.key} organ={o} index={i} active={active === o.key}
                  onEnter={() => setHovered(o.key)} onLeave={() => setHovered(null)}
                  onClick={() => navigate(`/organ/${o.key}`)} onFocus={() => setFocus(o.key)} />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeOrgan && activeOrgan.tests.length > 0 && (
              <motion.div key={active} className="card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                <div className="card-title">
                  <h3>{ORGAN_META[active].label}</h3>
                  <StatusPill status={activeOrgan.status}>{STATUS_LABEL[activeOrgan.status]}</StatusPill>
                </div>
                {activeOrgan.note && <p className="explain" style={{ marginBottom: 10 }}>{activeOrgan.note}</p>}
                <div className="stack" style={{ gap: 6 }}>
                  {activeOrgan.tests.slice(0, 5).map((t) => (
                    <div key={t.key} className="row between" style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{t.name}</span>
                      <span className="row" style={{ gap: 8 }}>
                        <b style={{ color: isAbnormal(t.status) ? STATUS_COLOR[t.status] : undefined }}>{fmtValue(t)}</b>
                        <span className="faint" style={{ fontSize: 12 }}>{t.unit}</span>
                        <span className="dot" style={{ color: STATUS_COLOR[t.status] }} />
                      </span>
                    </div>
                  ))}
                </div>
                <Link to={`/organ/${active}`} className="btn btn-sm" style={{ marginTop: 12 }}>Explore {ORGAN_META[active].label} <ChevronRight size={14} /></Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {findings.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div className="row between">
            <h2 style={{ fontSize: 20 }}>Key findings</h2>
            <span className="muted" style={{ fontSize: 13 }}>Values outside the range printed on your latest report</span>
          </div>
          <div className="findings">
            {findings.map((t, i) => (
              <motion.div key={t.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                <TestCard test={t} showExplanation={false} onTrend={() => navigate(`/trends?key=${t.key}`)} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {s.lastReport?.doctorQuestions?.length > 0 && (
        <section className="card" style={{ marginTop: 22 }}>
          <div className="card-title"><h3>Questions to ask your doctor</h3><span className="faint" style={{ fontSize: 12 }}>from your latest report</span></div>
          <ol className="questions">{s.lastReport.doctorQuestions.slice(0, 4).map((q) => <li key={q}>{q}</li>)}</ol>
        </section>
      )}

      <Disclaimer className="no-print" text={data.disclaimer} />
    </div>
  )
}

function rank(o) {
  return { critical: 4, attention: 3, normal: 2, 'no-data': 0 }[o.status] + (o.tests.length ? 0.5 : 0)
}

function OrganRow({ organ, active, onEnter, onLeave, onClick, onFocus, index }) {
  const meta = ORGAN_META[organ.key]
  const Icon = meta.icon
  const color = STATUS_COLOR[organ.status]
  const pct = organ.tests.length ? ((organ.tests.length - organ.abnormalCount) / organ.tests.length) * 100 : 0
  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * index }}
      className={`organ-row ${active ? 'active' : ''}`} onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onFocus} onClick={onClick}
      style={{ '--c': meta.hue, opacity: organ.tests.length ? 1 : 0.55 }}
    >
      <span className="organ-icon"><Icon size={18} /></span>
      <span style={{ minWidth: 0 }}>
        <span className="name">{meta.label}</span>
        <span className="sub" style={{ display: 'block' }}>
          {organ.tests.length ? `${organ.tests.length} test${organ.tests.length === 1 ? '' : 's'} · ${organ.abnormalCount ? `${organ.abnormalCount} out of range` : 'all in range'}` : 'No tests yet'}
        </span>
        {organ.tests.length > 0 && <span className="bar"><i style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${meta.hue})` }} /></span>}
      </span>
      <span className="dot" style={{ color }} />
    </motion.button>
  )
}

function HoverCard({ organ, stageRef }) {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    const svg = stageRef.current?.querySelector('svg.bodymap')
    if (!svg) return
    const stage = stageRef.current.getBoundingClientRect()
    const r = svg.getBoundingClientRect()
    const scale = Math.min(r.width / VIEW_W, r.height / VIEW_H)
    const ox = r.left - stage.left + (r.width - VIEW_W * scale) / 2
    const oy = r.top - stage.top + (r.height - VIEW_H * scale) / 2
    const [px, py] = ORGAN_SHAPES[organ.key].pin
    const x = ox + px * scale
    const rightSide = px > 150
    setPos({ top: oy + py * scale - 30, left: rightSide ? x + 24 : undefined, right: rightSide ? undefined : stage.width - x + 24 })
  }, [organ.key, stageRef])
  if (!pos) return null
  const meta = ORGAN_META[organ.key]
  const top = organ.tests.filter((t) => isAbnormal(t.status)).slice(0, 3)
  return (
    <motion.div className="hover-card card" style={{ ...pos, padding: 14 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <b style={{ fontSize: 14 }}>{meta.label}</b>
        <span className="dot" style={{ color: STATUS_COLOR[organ.status] }} />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>{organ.tests.length ? `${organ.tests.length} tests, ${organ.abnormalCount} out of range` : 'No tests linked yet'}</div>
      {top.map((t) => (
        <div key={t.key} className="row between" style={{ fontSize: 12.5, marginTop: 6 }}>
          <span>{t.name}</span><b style={{ color: STATUS_COLOR[t.status] }}>{fmtValue(t)} {t.status === 'High' ? '↑' : '↓'}</b>
        </div>
      ))}
    </motion.div>
  )
}

function ScoreTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return <div className="chart-tip"><b>{p.score}</b> <span className="muted">on {fmtDate(p.date)}</span></div>
}
