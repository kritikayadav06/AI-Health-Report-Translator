import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LineChart as LineIcon, Search } from 'lucide-react'
import { api } from '../api/client'
import { Disclaimer, Loading, StatusPill } from '../components/ui'
import { ORGAN_META, STATUS_COLOR, fmtDate } from '../lib/health'

export default function TrendsPage() {
  const [params, setParams] = useSearchParams()
  const [list, setList] = useState(null)
  const [trend, setTrend] = useState(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const key = params.get('key')

  useEffect(() => {
    api.trends().then((d) => {
      setList(d.parameters)
      if (!key && d.parameters.length) setParams({ key: d.parameters[0].key }, { replace: true })
    }).catch((e) => setError(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!key) return
    setTrend(null)
    api.trend(key).then(setTrend).catch((e) => setError(e.message))
  }, [key])

  const filtered = useMemo(() => (list || []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [list, q])

  if (error) return <div className="error-box">{error}</div>
  if (!list) return <Loading />
  if (!list.length) return (
    <div className="card empty"><LineIcon size={40} color="var(--faint)" /><p style={{ marginTop: 10 }}>Trends appear after your first analysed report.</p><Link className="btn btn-primary" to="/upload" style={{ marginTop: 14 }}>Upload a report</Link></div>
  )

  return (
    <div>
      <div className="topbar"><div><div className="eyebrow">Health trends</div><h1>How your values change over time</h1><p>The shaded band is the reference range printed on your latest report.</p></div></div>
      <div className="trend-layout">
        <div className="card">
          <div className="row input" style={{ padding: '6px 10px', marginBottom: 10 }}>
            <Search size={15} color="var(--muted)" />
            <input style={{ background: 'none', border: 'none', outline: 'none', width: '100%' }} placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="param-list">
            {filtered.map((p) => {
              const M = ORGAN_META[p.organ] || ORGAN_META.other
              const I = M.icon
              return (
                <button key={p.key} className={`param ${p.key === key ? 'active' : ''}`} onClick={() => setParams({ key: p.key })}>
                  <span className="row" style={{ gap: 8 }}><I size={14} color={M.hue} /> {p.name}</span>
                  <span className="row" style={{ gap: 6 }}><span className="faint" style={{ fontSize: 12 }}>{p.count}</span><span className="dot" style={{ color: STATUS_COLOR[p.latest.status] }} /></span>
                </button>
              )
            })}
          </div>
        </div>
        <div>{trend ? <TrendDetail trend={trend} /> : <Loading />}</div>
      </div>
    </div>
  )
}

function TrendDetail({ trend }) {
  const pts = trend.points.filter((p) => p.value != null).map((p) => ({ ...p, label: fmtDate(p.date, { month: 'short', year: '2-digit' }) }))
  const values = pts.map((p) => p.value)
  const lo = Math.min(...values, trend.refLow ?? Infinity)
  const hi = Math.max(...values, trend.refHigh ?? -Infinity)
  const pad = (hi - lo) * 0.25 || 1
  const domain = [Math.max(0, +(lo - pad).toFixed(2)), +(hi + pad).toFixed(2)]
  const latest = pts[pts.length - 1]
  const first = pts[0]
  const delta = latest && first && pts.length > 1 ? latest.value - first.value : null
  const M = ORGAN_META[trend.organ] || ORGAN_META.other

  return (
    <motion.div key={trend.key} className="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 6 }}>
          <div>
            <Link to={`/organ/${trend.organ}`} className="eyebrow" style={{ color: M.hue }}>{M.label}</Link>
            <h2 style={{ fontSize: 24 }}>{trend.name}</h2>
          </div>
          {latest && <StatusPill status={latest.status}>Latest: {latest.status}</StatusPill>}
        </div>
        {trend.description && <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>{trend.description}</p>}
        <div style={{ height: 320, marginLeft: -12 }}>
          <ResponsiveContainer>
            <ComposedChart data={pts} margin={{ top: 16, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#38e1ff" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,255,.08)" vertical={false} />
              {(trend.refLow != null || trend.refHigh != null) && (
                <ReferenceArea y1={trend.refLow ?? domain[0]} y2={trend.refHigh ?? domain[1]} fill="#34d399" fillOpacity={0.08} stroke="#34d399" strokeOpacity={0.25} strokeDasharray="4 4" ifOverflow="extendDomain" />
              )}
              {trend.refLow != null && <ReferenceLine y={trend.refLow} stroke="#34d399" strokeOpacity={0.5} strokeDasharray="3 5" label={{ value: `low ${trend.refLow}`, fill: '#56617f', fontSize: 11, position: 'insideBottomRight' }} />}
              {trend.refHigh != null && <ReferenceLine y={trend.refHigh} stroke="#34d399" strokeOpacity={0.5} strokeDasharray="3 5" label={{ value: `high ${trend.refHigh}`, fill: '#56617f', fontSize: 11, position: 'insideTopRight' }} />}
              <XAxis dataKey="label" tick={{ fill: '#8b97b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={domain} tick={{ fill: '#8b97b8', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<Tip unit={trend.unit} />} cursor={{ stroke: 'rgba(56,225,255,.3)' }} />
              <Line type="monotone" dataKey="value" stroke="url(#trendLine)" strokeWidth={3} dot={<StatusDot />} activeDot={{ r: 7 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {trend.warnings?.map((w) => <div key={w} className="warn-box" style={{ marginTop: 10 }}>{w}</div>)}
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat"><b>{latest?.value ?? '—'} <small className="muted" style={{ fontSize: 13 }}>{trend.unit}</small></b><span>Latest ({fmtDate(latest?.date)})</span></div>
        <div className="stat"><b>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${+delta.toFixed(2)}`}</b><span>Change since first report</span></div>
        <div className="stat"><b>{Math.min(...values)}</b><span>Lowest</span></div>
        <div className="stat"><b>{Math.max(...values)}</b><span>Highest</span></div>
      </div>
      <div className="card">
        <div className="card-title"><h3>All results</h3></div>
        <div className="stack" style={{ gap: 0 }}>
          {[...trend.points].reverse().map((p) => (
            <Link key={p.reportId} to={`/reports/${p.reportId}`} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span>{fmtDate(p.date)} <span className="faint">· {p.reportTitle}</span></span>
              <span className="row"><b>{p.value} {p.unit}</b><StatusPill status={p.status} /></span>
            </Link>
          ))}
        </div>
      </div>
      <Disclaimer text="Trends compare values from different reports. Labs can use different methods and ranges, so discuss changes with your doctor." />
    </motion.div>
  )
}

function StatusDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  const c = STATUS_COLOR[payload.status] || '#38e1ff'
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={c} opacity={0.18} />
      <circle cx={cx} cy={cy} r={5} fill="#050914" stroke={c} strokeWidth={2.5} />
    </g>
  )
}

function Tip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tip">
      <div className="muted" style={{ fontSize: 12 }}>{fmtDate(p.date)}</div>
      <b>{p.value} {unit}</b> <span style={{ color: STATUS_COLOR[p.status] }}>· {p.status}</span>
    </div>
  )
}
