const TOKEN_KEY = 'ahrt_token'

// Token lives in sessionStorage: it is cleared when the tab closes (privacy-friendly default).
export const tokenStore = {
  get: () => {
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t) => {
    try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data.error || 'Request failed', data.details)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  catalog: () => request('/catalog'),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/me', { method: 'PATCH', body }),
  deleteAccount: () => request('/auth/me', { method: 'DELETE' }),

  reports: () => request('/reports'),
  report: (id) => request(`/reports/${id}`),
  upload: (file, meta = {}) => {
    const form = new FormData()
    form.append('file', file)
    Object.entries(meta).forEach(([k, v]) => v && form.append(k, v))
    return request('/reports/upload', { method: 'POST', form })
  },
  createManual: (body) => request('/reports/manual', { method: 'POST', body }),
  updateReport: (id, body) => request(`/reports/${id}`, { method: 'PUT', body }),
  analyze: (id) => request(`/reports/${id}/analyze`, { method: 'POST' }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

  overview: () => request('/insights/overview'),
  trends: () => request('/insights/trends'),
  trend: (key) => request(`/insights/trends/${encodeURIComponent(key)}`),
}
