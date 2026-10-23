// The desktop admin talks to the same shared backend as the mobile app.
// If the desktop ever runs on a different machine, change this to that
// machine's reachable address (e.g. http://10.252.93.85:3000/api).
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

// Reads the admin JWT from localStorage. Returns an empty object if no
// token is stored — the backend will 401 with a clear message in that case.
const ADMIN_TOKEN_KEY = 'sky_opticles_admin_token';

function authHeaders() {
  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // localStorage unavailable — ignore; the request will 401.
  }
  return {};
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const text = await response.text();
  
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    const message =
      (payload && payload.error) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

// Multipart helper for file uploads.
// The browser must set Content-Type with the multipart boundary, so we do
// NOT forward the default JSON header here.
async function uploadRequest(path, formData, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
    body: formData,
  });

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
      (payload && payload.error) || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

// Binary fetch helper for downloads that require an auth header.
// Same token handling as request(), but returns a Blob instead of JSON.
async function fetchBlob(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    const message = (payload && payload.error) || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export const api = {
  baseUrl: API_BASE_URL,

  health: () => request('/health'),

  listCategories: () => request('/categories'),
  createCategory: (body) =>
    request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) =>
    request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCategory: (id) =>
    request(`/categories/${id}`, { method: 'DELETE' }),

  listBrands: () => request('/brands'),
  createBrand: (body) =>
    request('/brands', { method: 'POST', body: JSON.stringify(body) }),
  updateBrand: (id, body) =>
    request(`/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteBrand: (id) =>
    request(`/brands/${id}`, { method: 'DELETE' }),

  // --- Product types ---
  listProductTypes: () => request('/product-types'),
  createProductType: (body) =>
    request('/product-types', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateProductType: (id, body) =>
    request(`/product-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteProductType: (id) =>
    request(`/product-types/${id}`, { method: 'DELETE' }),

  listProducts: (params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/products${suffix}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (body) =>
    request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteProduct: (id) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  listVariants: (productId) => request(`/products/${productId}/variants`),
  createVariant: (productId, body) =>
    request(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateVariant: (variantId, body) =>
    request(`/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteVariant: (variantId) =>
    request(`/variants/${variantId}`, { method: 'DELETE' }),
  updateStock: (variantId, stockQuantity) =>
    request(`/variants/${variantId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stockQuantity }),
    }),

  listImages: (productId) => request(`/products/${productId}/images`),
  createImage: (productId, body) =>
    request(`/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateImage: (productId, imageId, body) =>
    request(`/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteImage: (productId, imageId) =>
    request(`/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    }),
    
  // Upload a file to the product images endpoint.
  uploadImage: (
    productId,
    file,
    { altText = '', isPrimary = false, sortOrder = 0, variantId = null, lensLayerFile = null } = {}
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (lensLayerFile) form.append('lensLayer', lensLayerFile);
    if (altText) form.append('altText', altText);
    form.append('isPrimary', String(isPrimary));
    form.append('sortOrder', String(sortOrder));
    if (variantId !== null && variantId !== undefined && variantId !== '') {
      form.append('variantId', String(variantId));
    }
    return uploadRequest(`/products/${productId}/images/upload`, form);
  },

  // Upload a lens-mask PNG for an existing image.
  uploadLensLayerForImage: (productId, imageId, file) => {
    const form = new FormData();
    form.append('lensLayer', file);
    return uploadRequest(
      `/products/${productId}/images/${imageId}/lens-layer`,
      form
    );
  },
  // --- 3D Models ---
  list3DModels: (productId) => request(`/products/${productId}/3d-models`),

  upload3DModel: (productId, file, { variantId = null, isPrimary = true } = {}) => {
    const form = new FormData();
    form.append('model', file);
    form.append('isPrimary', String(isPrimary));
    if (variantId !== null && variantId !== undefined && variantId !== '') {
      form.append('variantId', String(variantId));
    }
    return uploadRequest(`/products/${productId}/3d-models`, form);
  },

  delete3DModel: (modelId) =>
    request(`/3d-models/${modelId}`, { method: 'DELETE' }),



  // --- Admin Lens Options ---
  createLensGroup: (body) =>
    request('/admin/lens-groups', { method: 'POST', body: JSON.stringify(body) }),
  updateLensGroup: (id, body) =>
    request(`/admin/lens-groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteLensGroup: (id) =>
    request(`/admin/lens-groups/${id}`, { method: 'DELETE' }),

  createLensOption: (body) =>
    request('/admin/lens-options', { method: 'POST', body: JSON.stringify(body) }),
  updateLensOption: (id, body) =>
    request(`/admin/lens-options/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteLensOption: (id) =>
    request(`/admin/lens-options/${id}`, { method: 'DELETE' }),



  // --- Orders ---
  listOrders: (params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/admin/orders${suffix}`);
  },
  getOrder: (id) => request(`/admin/orders/${id}`),
  updateOrder: (id, body) =>
    request(`/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteOrder: (id) =>
    request(`/admin/orders/${id}`, { method: 'DELETE' }),
  markOrderPaid: (id) =>
    request(`/admin/orders/${id}/mark-paid`, { method: 'POST' }),

  // Fetch a prescription file as a Blob.
  downloadPrescription: (id) => fetchBlob(`/admin/prescriptions/${id}`),
  
  // Public read-only endpoint serving lens option groups + options.
  listLensOptions: () => request('/lens-options'),

  // --- Admin Notifications ---
  listAdminNotifications: () => request('/admin/notifications'),
    // --- Admin Stats ---
  getDashboardStats: () => request('/admin/stats'),
  markAdminNotificationRead: (id) =>
    request(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAdminNotificationsRead: () =>
    request('/admin/notifications/read-all', { method: 'PATCH' }),
};







export { API_BASE_URL };