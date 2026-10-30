// backend/src/utils/expoPush.js
//
// Sends push notifications via the Expo Push API.
// Uses the built-in `fetch` (Node 18+) — no external SDK required.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isValidExpoPushToken(token) {
  if (typeof token !== 'string') return false;
  return /^ExponentPushToken\[[^\]]+\]$/.test(token);
}

async function sendExpoPush(pushToken, title, body, data = {}) {
  // Skip silently when the user has no push token (e.g. blocked permissions).
  // Without this guard, the backend would try to POST a null token to Expo
  // and log noisy errors on every request.
  if (!isValidExpoPushToken(pushToken)) {
    return { ok: false, reason: 'no_valid_token' };
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    });

    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

    if (!response.ok) {
      console.warn('Expo push failed:', response.status, payload);
      return { ok: false, status: response.status, payload };
    }

    // Expo returns a per-message "ticket" — either { status: 'ok', id } or
    // { status: 'error', message, details }.
    const ticket = payload?.data?.[0];
    if (ticket?.status === 'error') {
      console.warn('Expo push ticket error:', ticket);
      return { ok: false, ticket };
    }

    return { ok: true, ticket };
  } catch (err) {
    console.error('sendExpoPush failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendExpoPush };