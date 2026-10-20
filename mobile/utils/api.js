// Single place where the mobile app talks to the backend.
// Keep this in sync with the desktop admin's admin/src/api/client.js base URL.

export const API_URL = 'http://10.252.93.80:3000/api';

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

export async function fetchProducts() {
  const result = await request('/products');
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
export async function fetchProductDetail(id) {
  return request(`/products/${id}`);
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
//
// `asset` shape: { uri, name, mimeType } — from expo-document-picker.
// Returns: { data: { id, filename, original_name, mime_type, size_bytes, created_at } }
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