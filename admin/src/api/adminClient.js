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

// Multipart uploads bypass the JSON `request()` wrapper because FormData
// needs to set its own Content-Type with the multipart boundary.
async function uploadMultipart(path, file) {
  const url = `${API_BASE_URL}${path}`;
  const token = (() => {
    try { return window.localStorage.getItem(ADMIN_TOKEN_KEY); } catch { return null; }
  })();

  const form = new FormData();
  form.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const error = new Error((payload && payload.error) || `HTTP ${response.status}`);
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

  // --- Shop + seller management (platform owner only) ---
  getMyShop: () =>
    request('/admin/me/shop'),

  getMyDashboardStats: () =>
    request('/admin/me/stats'),

  listShops: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.append('status', params.status);
    if (params.search) qs.append('search', params.search);
    if (params.page) qs.append('page', params.page);
    if (params.limit) qs.append('limit', params.limit);
    const q = qs.toString();
    return request(`/admin/shops${q ? '?' + q : ''}`);
  },

  getShop: (id) =>
    request(`/admin/shops/${id}`),

  approveShop: (id) =>
    request(`/admin/shops/${id}/approve`, { method: 'POST' }),

  rejectShop: (id, reason) =>
    request(`/admin/shops/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  suspendShop: (id) =>
    request(`/admin/shops/${id}/suspend`, { method: 'POST' }),

  unsuspendShop: (id) =>
    request(`/admin/shops/${id}/unsuspend`, { method: 'POST' }),

  updateShopBilling: (id, body) =>
    request(`/admin/shops/${id}/billing`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  markShopPaid: (id, plan) =>
    request(`/admin/shops/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  // --- Invites (platform owner only) ---
  listInvites: () =>
    request('/admin/invites'),

  createInvite: (email) =>
    request('/admin/invites', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  revokeInvite: (id) =>
    request(`/admin/invites/${id}`, {
      method: 'DELETE',
    }),

  // --- Seller shop endpoints (any authenticated admin may call, but the
  // backend resolves them to THEIR own shop only) ---
  createMyShop: (body) =>
    request('/admin/me/shop', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateMyShop: (body) =>
    request('/admin/me/shop', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  submitMyShop: () =>
    request('/admin/me/shop/submit', { method: 'POST' }),

  withdrawMyShop: () =>
    request('/admin/me/shop/withdraw', { method: 'POST' }),

  uploadShopLogo: (file) => uploadMultipart('/admin/me/shop/logo', file),

  uploadShopBanner: (file) => uploadMultipart('/admin/me/shop/banner', file),


  listShopTypes: () =>
    request('/admin/shop-types'),

  toggleShopType: (id, is_active) =>
    request(`/admin/shop-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),





};

export { API_BASE_URL };