import { Activity, Bone, Brain, Droplet, FlaskConical, HeartPulse, Shield, Wind, Zap, Bean } from 'lucide-react'

export const ORGAN_META = {
  brain: { label: 'Brain & Nerves', icon: Brain, hue: '#a78bfa' },
  thyroid: { label: 'Thyroid', icon: Zap, hue: '#f0abfc' },
  heart: { label: 'Heart & Vessels', icon: HeartPulse, hue: '#fb7185' },
  lungs: { label: 'Lungs', icon: Wind, hue: '#7dd3fc' },
  liver: { label: 'Liver', icon: Shield, hue: '#fdba74' },
  pancreas: { label: 'Pancreas & Sugar', icon: Activity, hue: '#fde047' },
  kidneys: { label: 'Kidneys', icon: Bean, hue: '#5eead4' },
  blood: { label: 'Blood', icon: Droplet, hue: '#f87171' },
  bones: { label: 'Bones & Minerals', icon: Bone, hue: '#e2e8f0' },
  other: { label: 'Other Tests', icon: FlaskConical, hue: '#94a3b8' },
}

export const STATUS_COLOR = {
  normal: '#34d399',
  attention: '#fbbf24',
  critical: '#fb7185',
  'no-data': '#475569',
  Normal: '#34d399',
  High: '#fbbf24',
  Low: '#60a5fa',
  'No range': '#94a3b8',
  'Not graded': '#94a3b8',
}

export const STATUS_LABEL = {
  normal: 'All in range',
  attention: 'Needs attention',
  critical: 'Contact a doctor',
  'no-data': 'No data yet',
}

export const isAbnormal = (s) => s === 'High' || s === 'Low'

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, opts)
}

export function fmtValue(t) {
  if (t.value == null) return t.valueText || '—'
  const v = Number(t.value)
  if (Math.abs(v) >= 10000) return v.toLocaleString()
  return String(+v.toFixed(2))
}

export function rangeText(t) {
  if (t.refText) return t.refText
  if (t.refLow != null && t.refHigh != null) return `${t.refLow} – ${t.refHigh}`
  if (t.refHigh != null) return `< ${t.refHigh}`
  if (t.refLow != null) return `> ${t.refLow}`
  return 'No range'
}

export function scoreColor(score) {
  if (score == null) return STATUS_COLOR['no-data']
  if (score >= 85) return STATUS_COLOR.normal
  if (score >= 50) return STATUS_COLOR.attention
  return STATUS_COLOR.critical
}

export const DISCLAIMER =
  'Informational and educational only. Not medical advice, diagnosis or treatment. Always discuss your results with a qualified healthcare professional.'
