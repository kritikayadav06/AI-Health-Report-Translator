import { ArrowDownRight, ArrowUpRight, Info, Minus, ShieldAlert } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { DISCLAIMER, STATUS_COLOR, fmtValue, rangeText, scoreColor, isAbnormal } from '../lib/health'

export function StatusPill({ status, children }) {
  const color = STATUS_COLOR[status] || STATUS_COLOR['No range']
  return (
    <span className="pill" style={{ color }}>
      <span className="dot" />
      {children || status}
    </span>
  )
}

export function Disclaimer({ text = DISCLAIMER, className = '' }) {
  return (
    <div className={`disclaimer ${className}`}>
      <Info size={16} style={{ flex: 'none', marginTop: 1 }} />
      <span>{text}</span>
    </div>
  )
}

export function ScoreRing({ score, size = 150, label = 'Health score', sub }) {
  const r = 62
  const c = 2 * Math.PI * r
  const pct = score == null ? 0 : score / 100
  const color = scoreColor(score)
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 150 150" width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(148,163,255,0.1)" strokeWidth="10" />
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(148,163,255,0.18)" strokeWidth="1" strokeDasharray="2 5" transform="scale(1.12) translate(-8 -8)" />
        <circle
          cx="75" cy="75" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 75 75)"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="val">
        <div>
          <b>{score ?? '—'}</b>
          <span className="muted" style={{ fontSize: 12 }}>{label}</span>
          {sub && <div className="faint" style={{ fontSize: 11 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export function Gauge({ test }) {
  const pos = test.gauge
  const color = STATUS_COLOR[test.status]
  const hasRange = test.refLow != null || test.refHigh != null
  return (
    <div>
      <div className="gauge" style={{ opacity: hasRange ? 1 : 0.35 }}>
        {pos != null && <span className="marker" style={{ left: `${pos}%`, color, borderColor: color }} />}
      </div>
      <div className="gauge-labels">
        <span>Low</span>
        <span>Range {rangeText(test)}</span>
        <span>High</span>
      </div>
    </div>
  )
}

export function Change({ change, previous, unit }) {
  if (!change) return null
  const Icon = change === 'up' ? ArrowUpRight : change === 'down' ? ArrowDownRight : Minus
  return (
    <span className="change">
      <Icon size={14} /> {change === 'flat' ? 'No change' : `from ${previous}`} {change !== 'flat' && unit}
    </span>
  )
}

export function Sparkline({ data, color = '#38e1ff', height = 42 }) {
  const points = (data || []).filter((d) => d.value != null)
  if (points.length < 2) return null
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TestCard({ test, onTrend, showExplanation = true }) {
  const color = STATUS_COLOR[test.status]
  return (
    <div className="card test-card" style={{ borderColor: isAbnormal(test.status) ? `color-mix(in srgb, ${color} 35%, transparent)` : undefined }}>
      <div className="row between">
        <h3 style={{ fontSize: 15 }}>{test.name}</h3>
        <StatusPill status={test.status} />
      </div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="test-value" style={{ color: isAbnormal(test.status) ? color : undefined }}>
          {fmtValue(test)}<small>{test.unit}</small>
        </div>
        <Change change={test.change} previous={test.previousValue} unit={test.unit} />
      </div>
      {test.critical && (
        <div className="warn-box" style={{ borderColor: 'rgba(251,113,133,.5)', color: '#fecdd3', background: 'rgba(251,113,133,.08)' }}>
          <ShieldAlert size={16} style={{ flex: 'none' }} /> This value is far outside the usual range. Please contact a doctor promptly.
        </div>
      )}
      <Gauge test={test} />
      {test.history && <Sparkline data={test.history} color={color} />}
      {showExplanation && test.explanation && <p className="explain">{test.explanation}</p>}
      {onTrend && (
        <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0, color: 'var(--cyan)' }} onClick={onTrend}>
          View trend →
        </button>
      )}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return <div className="center-screen">{label}</div>
}
