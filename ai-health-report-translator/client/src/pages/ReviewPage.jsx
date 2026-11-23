import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Plus, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { Disclaimer, Loading, StatusPill } from '../components/ui'
import { ORGAN_META } from '../lib/health'
import { Steps } from './UploadPage'

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))

function previewStatus(r) {
  const v = num(r.value)
  if (v == null) return 'Not graded'
  const lo = num(r.refLow)
  const hi = num(r.refHigh)
  if (lo == null && hi == null) return 'No range'
  if (lo != null && v < lo) return 'Low'
  if (hi != null && v > hi) return 'High'
  return 'Normal'
}

const blank = () => ({ name: '', value: '', unit: '', refLow: '', refHigh: '', organ: 'other' })

export default function ReviewPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ title: '', reportDate: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) {
      setReport({ warnings: [], source: { type: 'manual' } })
      setRows([blank(), blank(), blank()])
      setMeta({ title: 'Manual entry', reportDate: new Date().toISOString().slice(0, 10) })
      return
    }
    api.report(id).then(({ report: r }) => {
      setReport(r)
      setRows(r.results.map((x) => ({ ...x, value: x.value ?? x.valueText ?? '', refLow: x.refLow ?? '', refHigh: x.refHigh ?? '', origLow: x.refLow, origHigh: x.refHigh })))
      setMeta({ title: r.title, reportDate: r.reportDate?.slice(0, 10) })
    }).catch((e) => setError(e.message))
  }, [id, isNew])

  const update = (i, k) => (e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))

  async function save() {
    setError('')
    const results = rows
      .filter((r) => String(r.name).trim())
      .map((r) => ({
        name: String(r.name).trim(),
        value: num(r.value) ?? (String(r.value).trim() || null),
        valueText: num(r.value) == null ? String(r.value ?? '').trim() : undefined,
        unit: r.unit || '',
        refLow: num(r.refLow),
        refHigh: num(r.refHigh),
        // keep the printed range text only if the user did not change the range
        refText: r.refText && num(r.refLow) === (r.origLow ?? null) && num(r.refHigh) === (r.origHigh ?? null) ? r.refText : undefined,
        organ: r.organ,
      }))
    if (!results.length) return setError('Add at least one test result.')
    setBusy(true)
    try {
      let saved
      if (isNew) saved = (await api.createManual({ ...meta, results })).report
      else saved = (await api.updateReport(id, { ...meta, results })).report
      await api.analyze(saved.id)
      navigate(`/reports/${saved.id}`)
    } catch (e) {
      setError(e.details?.[0] ? `${e.message}: ${e.details[0].path} ${e.details[0].message}` : e.message)
      setBusy(false)
    }
  }

  if (error && !report) return <div className="error-box">{error}</div>
  if (!report) return <Loading />
  const abnormal = rows.filter((r) => ['High', 'Low'].includes(previewStatus(r))).length

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Step 2 of 3</div>
          <h1>Check the values</h1>
          <p>Compare each row with your report and fix anything that was misread. Status updates as you type.</p>
        </div>
      </div>
      <Steps current={1} />

      {report.warnings?.map((w) => (
        <div key={w} className="warn-box" style={{ marginBottom: 10 }}><AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} /> {w}</div>
      ))}

      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: '1fr 200px', marginBottom: 12 }}>
          <div className="field"><label>Report name</label><input className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
          <div className="field"><label>Report date</label><input type="date" className="input" value={meta.reportDate || ''} onChange={(e) => setMeta({ ...meta, reportDate: e.target.value })} /></div>
        </div>
        <div className="table-wrap">
          <table className="review">
            <thead>
              <tr><th>Test</th><th style={{ width: 110 }}>Result</th><th style={{ width: 110 }}>Unit</th><th style={{ width: 90 }}>Range low</th><th style={{ width: 90 }}>Range high</th><th style={{ width: 120 }}>Status</th><th style={{ width: 44 }} /></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const st = previewStatus(r)
                const Icon = ORGAN_META[r.organ]?.icon
                return (
                  <tr key={r.id || i}>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {Icon && <Icon size={15} color={ORGAN_META[r.organ].hue} style={{ flex: 'none', marginLeft: 8 }} title={ORGAN_META[r.organ].label} />}
                        <input className="input" value={r.name} onChange={update(i, 'name')} placeholder="e.g. Hemoglobin" aria-label="Test name" />
                      </div>
                    </td>
                    <td><input className="input" value={r.value} onChange={update(i, 'value')} aria-label="Result" /></td>
                    <td><input className="input" value={r.unit} onChange={update(i, 'unit')} aria-label="Unit" /></td>
                    <td><input className="input" value={r.refLow} onChange={update(i, 'refLow')} aria-label="Range low" /></td>
                    <td><input className="input" value={r.refHigh} onChange={update(i, 'refHigh')} aria-label="Range high" /></td>
                    <td style={{ paddingLeft: 8 }}><StatusPill status={st} /></td>
                    <td><button className="btn btn-ghost icon-btn" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove row"><Trash2 size={15} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="row between wrap" style={{ marginTop: 14 }}>
          <button className="btn btn-sm" onClick={() => setRows((rs) => [...rs, blank()])}><Plus size={15} /> Add a test</button>
          <span className="muted" style={{ fontSize: 13 }}>{rows.length} tests · {abnormal} outside range</span>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
      <div className="row between wrap" style={{ marginTop: 18 }}>
        <Disclaimer text="Normal / High / Low is decided by comparing each value with the range printed on your report, not by AI." />
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          <Sparkles size={16} /> {busy ? 'Generating explanation…' : 'Confirm and explain my report'}
        </button>
      </div>
    </div>
  )
}
