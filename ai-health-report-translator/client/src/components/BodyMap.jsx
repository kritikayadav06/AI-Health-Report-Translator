import { useMemo } from 'react'
import { STATUS_COLOR, ORGAN_META } from '../lib/health'

/* ------------------------------------------------------------------ geometry */

// Right half of the body outline as [dx from centre, y]. Mirrored for the left half.
const HALF = [
  [0, 14], [16, 17], [27, 30], [31, 50], [29, 70], [23, 86], [15, 98], [13, 108], [14, 120],
  [30, 128], [52, 134], [66, 142], [74, 158], [78, 185], [82, 215], [88, 250], [93, 285], [99, 318],
  [104, 345], [110, 360], [112, 378], [106, 392], [98, 390], [96, 372], [92, 352], [84, 322], [76, 288],
  [68, 252], [62, 222], [56, 200], [50, 188],
  [48, 215], [44, 245], [44, 268], [50, 295], [54, 320], [54, 350], [50, 395], [46, 440], [44, 462],
  [46, 490], [44, 530], [38, 570], [36, 590], [44, 604], [40, 614], [22, 614], [16, 600], [16, 580],
  [14, 540], [16, 495], [14, 462], [12, 430], [8, 380], [4, 348], [0, 340],
]
const CX = 150

function smoothClosedPath(points, tension = 0.5) {
  const n = points.length
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`
  }
  return d + 'Z'
}

const right = HALF.map(([dx, y]) => [CX + dx, y])
const left = HALF.slice(1, -1).reverse().map(([dx, y]) => [CX - dx, y])
const BODY_PATH = smoothClosedPath([...right, ...left], 0.55)

/* Organ shapes, drawn in the same 300 x 640 coordinate space. */
export const ORGAN_SHAPES = {
  brain: {
    pin: [150, 46],
    paths: [
      'M150 28 C131 26 121 38 123 51 C123 62 133 69 150 69 C167 69 177 62 177 51 C179 38 169 26 150 28 Z',
    ],
    details: [
      'M150 30 C147 40 153 50 150 67', 'M130 42 C138 40 140 48 134 52', 'M128 56 C136 54 142 60 138 64',
      'M170 42 C162 40 160 48 166 52', 'M172 56 C164 54 158 60 162 64', 'M140 33 C142 38 138 42 143 46', 'M160 33 C158 38 162 42 157 46',
    ],
  },
  thyroid: {
    pin: [150, 116],
    paths: [
      'M150 116 C147 108 139 106 138 113 C137 121 142 126 147 124 C149 122 150 119 150 116 Z',
      'M150 116 C153 108 161 106 162 113 C163 121 158 126 153 124 C151 122 150 119 150 116 Z',
    ],
  },
  lungs: {
    pin: [126, 192],
    paths: [
      'M145 150 C131 147 113 166 109 198 C106 222 111 238 124 238 C137 238 144 228 146 212 C147 192 147 168 145 150 Z',
      'M155 150 C169 147 187 166 191 198 C194 222 189 238 176 238 C168 238 163 232 160 224 C170 214 168 196 156 190 C155 176 154 162 155 150 Z',
    ],
    details: ['M150 128 L150 156 M150 156 C146 164 140 170 132 176 M150 156 C154 164 160 170 168 176'],
  },
  heart: {
    pin: [161, 205],
    paths: [
      'M161 226 C146 216 139 205 144 196 C148 189 156 190 160 197 C163 189 172 187 177 194 C183 203 176 215 161 226 Z',
    ],
    details: ['M156 192 C155 184 158 178 163 176', 'M166 190 C168 183 172 180 176 180'],
  },
  liver: {
    pin: [128, 252],
    paths: [
      'M106 247 C118 236 150 235 172 241 C165 252 151 263 128 269 C114 272 104 263 106 247 Z',
    ],
    details: ['M150 240 C146 250 140 258 132 264'],
  },
  pancreas: {
    pin: [171, 268],
    paths: [
      'M144 270 C154 262 176 258 190 262 C192 268 180 273 162 276 C150 278 142 276 144 270 Z',
    ],
  },
  kidneys: {
    pin: [174, 293],
    paths: [
      'M126 279 C118 279 116 290 118 298 C120 306 128 309 133 305 C129 300 129 290 134 285 C132 281 129 279 126 279 Z',
      'M174 279 C182 279 184 290 182 298 C180 306 172 309 167 305 C171 300 171 290 166 285 C168 281 171 279 174 279 Z',
    ],
  },
  bones: {
    pin: [122, 452],
    paths: [
      // pelvis
      'M122 312 C132 306 168 306 178 312 C184 326 176 340 164 344 L150 336 L136 344 C124 340 116 326 122 312 Z',
      // knee caps
      'M116 446 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0 Z',
      'M172 446 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0 Z',
    ],
    details: [
      'M150 124 L150 306', // spine
      'M136 344 L122 440 M164 344 L178 440', // femurs
      'M122 454 L120 580 M178 454 L180 580', // shins
      'M118 136 C132 132 140 134 150 136 C160 134 168 132 182 136', // clavicles
      'M132 160 C140 166 160 166 168 160 M128 172 C140 180 160 180 172 172 M126 186 C140 194 160 194 174 186', // ribs
      'M206 150 L224 250 L240 345 M94 150 L76 250 L60 345', // arms
    ],
  },
  blood: {
    pin: [237, 300],
    paths: [],
    vessels: [
      'M158 200 C156 170 152 140 150 112', // aorta up to neck
      'M150 120 C140 124 118 132 100 146 C92 190 82 250 70 300 C64 330 58 352 52 372',
      'M150 120 C160 124 182 132 200 146 C208 190 218 250 230 300 C236 330 242 352 248 372',
      'M160 224 C156 250 152 290 150 320 C146 340 138 380 134 430 C132 480 132 530 130 590',
      'M150 320 C154 340 162 380 166 430 C168 480 168 530 170 590',
    ],
  },
}

// Drawing order: whole-body systems first so organs sit on top of them and receive clicks.
export const ORGAN_ORDER = ['bones', 'blood', 'brain', 'thyroid', 'lungs', 'heart', 'liver', 'pancreas', 'kidneys']

/* --------------------------------------------------------------- component */

export default function BodyMap({ organs = [], selected, hovered, onHover, onSelect, compact = false }) {
  const byKey = useMemo(() => Object.fromEntries(organs.map((o) => [o.key, o])), [organs])

  const colorFor = (key) => STATUS_COLOR[byKey[key]?.status || 'no-data']

  return (
    <svg className={`bodymap ${compact ? 'compact' : ''}`} viewBox="0 0 300 660" role="img" aria-label="Interactive body map of your test results">
      <defs>
        <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38e1ff" stopOpacity="0.20" />
          <stop offset="0.55" stopColor="#6366f1" stopOpacity="0.10" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="bodyStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id="floorGlow">
          <stop offset="0" stopColor="#38e1ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#38e1ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38e1ff" stopOpacity="0" />
          <stop offset="0.9" stopColor="#38e1ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#a5f3fc" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 L0 0 0 10" fill="none" stroke="#38e1ff" strokeOpacity="0.08" strokeWidth="0.5" />
        </pattern>
        <clipPath id="bodyClip"><path d={BODY_PATH} /></clipPath>
      </defs>

      {/* floor rings */}
      <ellipse cx="150" cy="628" rx="110" ry="20" fill="url(#floorGlow)" />
      <g className="floor-rings">
        <ellipse cx="150" cy="628" rx="96" ry="15" fill="none" stroke="#38e1ff" strokeOpacity="0.5" strokeDasharray="4 6" />
        <ellipse cx="150" cy="628" rx="70" ry="10" fill="none" stroke="#8b5cf6" strokeOpacity="0.6" />
      </g>

      {/* body */}
      <path d={BODY_PATH} fill="#38e1ff" opacity="0.18" filter="url(#softGlow)" />
      <path d={BODY_PATH} fill="url(#bodyFill)" />
      <g clipPath="url(#bodyClip)">
        <rect x="0" y="0" width="300" height="640" fill="url(#grid)" />
        <rect className="scanline" x="0" y="-90" width="300" height="90" fill="url(#scan)" opacity="0.7" />
      </g>
      <path d={BODY_PATH} fill="none" stroke="url(#bodyStroke)" strokeWidth="1.4" strokeOpacity="0.9" />

      {/* organs */}
      {ORGAN_ORDER.map((key) => {
        const shape = ORGAN_SHAPES[key]
        const organ = byKey[key]
        const status = organ?.status || 'no-data'
        const color = colorFor(key)
        const active = selected === key || hovered === key
        const dim = (selected || hovered) && !active
        const handlers = {
          onMouseEnter: () => onHover?.(key),
          onMouseLeave: () => onHover?.(null),
          onClick: () => onSelect?.(key),
          onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(key),
          tabIndex: 0,
          role: 'button',
          'aria-label': `${ORGAN_META[key].label}: ${organ?.tests?.length || 0} tests`,
        }
        return (
          <g key={key} className={`organ organ-${key} status-${status} ${active ? 'active' : ''} ${dim ? 'dim' : ''}`} {...handlers}>
            {shape.details?.map((d, i) => (
              <path key={`d${i}`} d={d} pointerEvents="none" fill="none" stroke={key === 'bones' ? '#cbd5e1' : color} strokeOpacity={key === 'bones' ? (active ? 0.55 : 0.18) : 0.55} strokeWidth={key === 'bones' ? 1.6 : 0.9} strokeLinecap="round" />
            ))}
            {shape.vessels?.map((d, i) => (
              <g key={`v${i}`} pointerEvents="none">
                <path d={d} fill="none" stroke={color} strokeOpacity={active ? 0.5 : 0.22} strokeWidth="2.2" strokeLinecap="round" />
                <path d={d} className="flow" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 14" />
              </g>
            ))}
            {shape.paths.map((d, i) => (
              <path key={i} d={d} fill={color} fillOpacity={key === 'bones' ? (active ? 0.3 : 0.12) : active ? 0.6 : status === 'no-data' ? 0.12 : 0.32} stroke={color} strokeWidth="1.2" strokeOpacity={0.9} filter={active ? 'url(#glow)' : undefined} />
            ))}
            {/* hit area for small/thin organs */}
            <circle cx={shape.pin[0]} cy={shape.pin[1]} r="16" fill="transparent" />
          </g>
        )
      })}

      {/* pins */}
      {ORGAN_ORDER.map((key) => {
        const organ = byKey[key]
        if (!organ || organ.status === 'no-data') return null
        const [x, y] = ORGAN_SHAPES[key].pin
        const color = colorFor(key)
        const pulse = organ.status === 'attention' || organ.status === 'critical'
        return (
          <g key={`pin-${key}`} className="pin" pointerEvents="none">
            {pulse && <circle className="pin-pulse" cx={x} cy={y} r="5" fill="none" stroke={color} strokeWidth="1.5" />}
            <circle cx={x} cy={y} r="4.2" fill="#050914" stroke={color} strokeWidth="1.6" />
            <circle cx={x} cy={y} r="1.8" fill={color} />
          </g>
        )
      })}
    </svg>
  )
}
