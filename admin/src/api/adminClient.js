// Admin API client for the desktop app.
// Talks only to the admin endpoints under /api/admin/auth/...
// The customer endpoints under /api/auth/... are for the mobile app only.

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

// Thin JSON fetch wrapper. Throws an Error with a `status` property on
// any non-2xx response so the UI can react to 401 vs 500 differently.
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, config);
  const text = await response.text();

  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      (payload && payload.error) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const adminApi = {
  baseUrl: API_BASE_URL,

  // POST /api/admin/auth/login
  // Body: { email, password }
  // Returns: { data: { admin, token } }
  login: ({ email, password }) =>
    request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // GET /api/admin/auth/me
  // Header: Authorization: Bearer <token>
  // Returns: { data: { admin } }
  me: (token) =>
    request('/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // --- Existing catalogue / inventory endpoints ---
  // These remain unchanged. The desktop app continues to use them via
  // the original admin/src/api/client.js for now; eventually they can
  // move into this file, but that is not part of Stage 5b.

  health: () => request('/health'),
  listCategories: () => request('/categories'),
  listBrands: () => request('/brands'),
  listProducts: (params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/products${suffix}`);
  },
};

export { API_BASE_URL };