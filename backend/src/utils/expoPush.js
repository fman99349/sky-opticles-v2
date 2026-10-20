// Send a push notification to a specific Expo Push Token.
// If the token is missing, it fails silently (the in-app DB notification still works).
async function sendExpoPush(token, title, body) {
  if (!token) return;

  // We only want to send to tokens that look like Expo tokens
  if (!token.startsWith('ExponentPushToken[')) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: { someData: 'goes here' },
      }),
    });
    
    const result = await response.json();
    if (result.data && result.data.status === 'error') {
      console.error('Expo Push Error:', result.data.message);
    }
  } catch (error) {
    console.error('Network error sending push:', error.message);
  }
}

module.exports = { sendExpoPush };