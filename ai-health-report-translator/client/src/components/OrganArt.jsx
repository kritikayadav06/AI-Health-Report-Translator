import { ORGAN_SHAPES } from './BodyMap'
import { ORGAN_META } from '../lib/health'

// floating red blood cells for the blood illustration [x, y, r]
const CELLS = [[150, 200, 14], [118, 260, 9], [186, 280, 11], [140, 340, 8], [172, 390, 12], [110, 430, 7], [196, 180, 7], [92, 330, 8]]

const VIEW = {
  brain: '115 20 70 56',
  thyroid: '132 100 36 32',
  lungs: '100 122 100 122',
  heart: '134 170 52 62',
  liver: '100 230 78 46',
  pancreas: '138 252 58 30',
  kidneys: '110 272 80 42',
  bones: '50 120 200 480',
  blood: '40 100 220 500',
}

/** A large, glowing illustration of a single organ for the organ page. */
export default function OrganArt({ organ, color }) {
  const shape = ORGAN_SHAPES[organ]
  if (!shape) {
    const Icon = ORGAN_META[organ]?.icon || ORGAN_META.other.icon
    return <Icon size={110} strokeWidth={1.2} color={color} style={{ position: 'relative', filter: `drop-shadow(0 0 18px ${color})` }} />
  }
  const id = `art-${organ}`
  return (
    <svg viewBox={VIEW[organ]} preserveAspectRatio="xMidYMid meet" className="organ-float">
      <defs>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g filter={`url(#${id}-glow)`}>
        {shape.vessels?.map((d, i) => (
          <g key={`v${i}`}>
            <path d={d} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
            <path d={d} className="flow" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="3 14" strokeLinecap="round" />
          </g>
        ))}
        {shape.details?.map((d, i) => (
          <path key={`d${i}`} d={d} fill="none" stroke={color} strokeOpacity="0.7" strokeWidth={organ === 'bones' ? 2 : 0.6} strokeLinecap="round" />
        ))}
        {organ === 'blood' && CELLS.map(([x, y, r], i) => (
          <g key={`c${i}`} className="cell" style={{ animationDelay: `${i * 0.4}s` }}>
            <circle cx={x} cy={y} r={r} fill={color} fillOpacity="0.55" stroke={color} strokeWidth="1.2" />
            <circle cx={x} cy={y} r={r * 0.45} fill="#050914" fillOpacity="0.45" />
          </g>
        ))}
        {shape.paths.map((d, i) => (
          <path key={i} d={d} fill={`url(#${id}-fill)`} fillOpacity={organ === 'bones' ? 0.4 : 0.75} stroke={color} strokeWidth={organ === 'bones' || organ === 'blood' ? 1.5 : 0.6} />
        ))}
      </g>
    </svg>
  )
}
