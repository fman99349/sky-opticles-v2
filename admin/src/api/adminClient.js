// Admin API client for the desktop app.
// Talks only to the admin endpoints under /api/admin/auth/...
// The customer endpoints under /api/auth/... are for the mobile app only.

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

const ADMIN_TOKEN_KEY = 'sky_opticles_admin_token';

function authHeaders() {
  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // localStorage unavailable
  }
  return {};
}

// Thin JSON fetch wrapper. Throws an Error with a `status` property on
// any non-2xx response so the UI can react to 401 vs 500 differently.
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(), // <--- THIS ATTACHES THE TOKEN
      ...(options.headers || {}),
    },
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

  login: ({ email, password }) =>
    request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: (token) =>
    request('/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    
  updateProfile: (body) => 
    request('/admin/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
};

export { API_BASE_URL };