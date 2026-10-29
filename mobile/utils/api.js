// Single place where the mobile app talks to the backend.
// Keep this in sync with the desktop admin's admin/src/api/client.js base URL.

const fromEnv = process.env.EXPO_PUBLIC_API_URL;

// Use a reserved TLD for the fallback (RFC 2606). `localhost` on Android
// produces a confusing "cleartext not permitted" error that looks like a
// network policy issue. `.invalid` produces a clean DNS failure that points
// straight at the missing configuration.
const FALLBACK = 'http://MISSING_ENV_VAR.invalid/api';

if (!fromEnv) {
  console.error(
    '[api] FATAL: EXPO_PUBLIC_API_URL is not set.\n' +
    '      Fix: add to mobile/.env:\n' +
    '        EXPO_PUBLIC_API_URL=https://your-backend/api\n' +
    '      Then restart Metro: npx expo start --dev-client --clear\n' +
    '      Then kill and reopen the app on the phone.'
  );
}

export const API_URL = fromEnv || FALLBACK;

// Unconditional startup log so you can verify which URL the app is using.
// Look for this line in the Metro terminal or the app's console logs:
//   [api] API_URL = https://reprimand-oxidation-atlas.ngrok-free.dev/api
console.log('[api] API_URL =', API_URL);

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
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

export async function fetchProducts(currency = 'ZAR') {
  const result = await request(`/products?currency=${currency}`);
  if (!Array.isArray(result.data)) {
    throw new Error('Unexpected products response');
  }
  return result.data;
}

export async function fetchCategories() {
  const result = await request('/categories');
  if (!Array.isArray(result.data)) {
    throw new Error('Unexpected categories response');
  }
  return result.data;
}

// Fetch a single product by id, including its variants[] and images[].
// Both arrays are needed by the mobile detail screen to build the variant
// picker and to choose the correct preview image per colour.
export async function fetchProductDetail(id, currency = 'ZAR') {
  return request(`/products/${id}?currency=${currency}`);
}

export async function registerUser({ name, email, password }) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Upload a prescription file. Requires a customer JWT.
//
// Uses XMLHttpRequest rather than fetch. Expo SDK 57's WinterCG fetch rejects
// classic React Native { uri, name, type } file objects and cannot read
// Android content:// URIs through expo-file-system's File wrapper. The old
// React Native networking layer handles both natively, so we use it here —
// and only here. All other calls in this file continue to use fetch.
export function uploadPrescription(token, asset) {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error('Please sign in to upload a prescription.'));
    }
    if (!asset || !asset.uri) {
      return reject(new Error('No file selected.'));
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/prescriptions/upload`);

    // Auth header must be set before send().
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      let payload = null;
      const text = xhr.responseText;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        const message =
          (payload && payload.error) ||
          `Upload failed (HTTP ${xhr.status})`;
        const error = new Error(message);
        error.status = xhr.status;
        error.payload = payload;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error(
        'Network request failed. Check that the backend is running and your phone can reach your computer.'
      );
      error.status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Upload timed out.');
      error.status = 0;
      reject(error);
    };

    xhr.timeout = 60 * 1000; // 60 seconds

    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.name || 'prescription',
      type: asset.mimeType || 'application/octet-stream',
    });

    if (asset.name) {
      form.append('originalName', asset.name);
    }

    // Do NOT set Content-Type manually — XHR adds the multipart boundary.
    xhr.send(form);
  });
}

// --- Orders ---
// These three require a customer JWT. The backend rejects admin tokens on
// these endpoints with 403. Payload shape mirrors POST /api/orders:
//   { customer: { name, phone }, shipping: {...}, items: [{ productId, quantity, config }] }

export async function createOrder(token, payload) {
  if (!token) throw new Error('Please sign in to place an order.');
  return request('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function listMyOrders(token) {
  if (!token) throw new Error('Please sign in to view your orders.');
  return request('/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMyOrder(token, id) {
  if (!token) throw new Error('Please sign in to view this order.');
  return request(`/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Initiate a PayFast payment for an existing order.
// Returns { data: { redirect_url, order_id, order_number, amount, currency } }.
export async function initiatePayfastPayment(token, orderId) {
  if (!token) throw new Error('Please sign in to pay.');
  return request(`/orders/${orderId}/pay/payfast`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Account profile ---
// Updates any subset of { name, phone, email } on the signed-in customer's
// account. The backend validates each field independently and returns the
// updated user object. Phone can be cleared by passing null or ''.
export async function updateMyProfile(token, patch) {
  if (!token) throw new Error('Please sign in to update your profile.');
  return request('/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

// --- Saved Addresses ---
export async function listMyAddresses(token) {
  if (!token) throw new Error('Please sign in.');
  return request('/addresses', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createAddress(token, body) {
  if (!token) throw new Error('Please sign in.');
  return request('/addresses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function updateAddress(token, id, body) {
  if (!token) throw new Error('Please sign in.');
  return request(`/addresses/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function deleteAddress(token, id) {
  if (!token) throw new Error('Please sign in.');
  return request(`/addresses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteNotification(token, id) {
  if (!token) throw new Error('Please sign in.');
  return request(`/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function clearAllNotifications(token) {
  if (!token) throw new Error('Please sign in.');
  return request('/notifications', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLensOptions(currency = 'ZAR') {
  const result = await request(`/lens-options?currency=${currency}`);
  return result.data.groups;
}

// --- Password Reset ---
export async function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email, token, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

export async function fetchProduct3DModel(productId, variantId = null) {
  const qs = variantId ? `?variantId=${variantId}` : '';
  const result = await request(`/products/${productId}/3d-models${qs}`);
  return result.data?.[0] || null;
}

// --- Marketplace: shops ---
export async function fetchShopTypes() {
  const result = await request('/shops/meta/types');
  return result.data || [];
}

export async function fetchShops(params = {}) {
  const qs = new URLSearchParams();
  if (params.shop_type) qs.append('shop_type', params.shop_type);
  if (params.city) qs.append('city', params.city);
  if (params.product_type) qs.append('product_type', params.product_type);
  if (params.search) qs.append('search', params.search);
  if (params.page) qs.append('page', params.page);
  if (params.limit) qs.append('limit', params.limit);
  const q = qs.toString();
  const result = await request(`/shops${q ? '?' + q : ''}`);
  return { data: result.data || [], pagination: result.pagination };
}

export async function fetchShopDetail(slug) {
  const result = await request(`/shops/${encodeURIComponent(slug)}`);
  return result.data;
}

export async function fetchShopProducts(slug, currency = 'ZAR', filters = {}) {
  const qs = new URLSearchParams();
  qs.append('currency', currency);
  if (filters.categoryId) qs.append('categoryId', filters.categoryId);
  if (filters.type) qs.append('type', filters.type);
  if (filters.search) qs.append('search', filters.search);
  if (filters.page) qs.append('page', filters.page);
  if (filters.limit) qs.append('limit', filters.limit);
  const result = await request(`/shops/${encodeURIComponent(slug)}/products?${qs.toString()}`);
  return { data: result.data || [], pagination: result.pagination };
}