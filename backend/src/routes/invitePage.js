// backend/src/routes/invitePage.js
//
// Serves the public /accept-invite/:token page.
// The page validates the token, shows a small form, then POSTs to
// /api/invites/:token/accept to create the seller admin account.

const express = require('express');
const router = express.Router();

function renderPage(token) {
  const safeToken = JSON.stringify(String(token));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Accept seller invite — SKY OPTICLES</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#101D2C;color:#E6E1D6;display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:20px}
    .card{background:#1A2A3D;border:1px solid #2E4157;border-radius:10px;padding:28px;
          max-width:420px;width:100%}
    h1{margin:0 0 8px 0;font-size:20px;color:#D7B987;letter-spacing:0.05em}
    .sub{margin:0 0 20px 0;color:#9EAAB8;font-size:13px}
    label{display:block;margin-bottom:14px;font-size:12px;color:#B8C2CD;letter-spacing:0.04em;
          text-transform:uppercase}
    input{display:block;width:100%;margin-top:6px;padding:10px 12px;border-radius:6px;
          border:1px solid #324760;background:#0F1B2A;color:#E6E1D6;font-size:14px}
    input:read-only{opacity:0.6}
    button{width:100%;padding:12px;border:0;border-radius:6px;background:#D7B987;
           color:#101D2C;font-weight:700;font-size:13px;letter-spacing:0.08em;
           cursor:pointer;text-transform:uppercase}
    button:disabled{opacity:0.6;cursor:wait}
    .err{color:#F28B8B;margin-top:12px;font-size:13px;min-height:18px}
    .ok{color:#8BD4A0}
  </style>
</head>
<body>
  <div class="card">
    <h1>Join SKY OPTICLES</h1>
    <p class="sub" id="status">Verifying your invite…</p>

    <form id="f" style="display:none">
      <label>Email
        <input type="email" id="email" readonly>
      </label>
      <label>Your name
        <input type="text" id="name" maxlength="120" required>
      </label>
      <label>Password (min 8 chars)
        <input type="password" id="password" minlength="8" maxlength="72" required>
      </label>
      <button type="submit" id="submit">Create account</button>
    </form>

    <div class="err" id="error"></div>
  </div>

  <script>
    const TOKEN = ${safeToken};
    const statusEl = document.getElementById('status');
    const formEl   = document.getElementById('f');
    const emailEl  = document.getElementById('email');
    const nameEl   = document.getElementById('name');
    const pwdEl    = document.getElementById('password');
    const submitEl = document.getElementById('submit');
    const errorEl  = document.getElementById('error');

    (async () => {
      try {
        const r = await fetch('/api/invites/' + encodeURIComponent(TOKEN) + '/validate');
        const body = await r.json();
        if (!r.ok || !body.valid) {
          statusEl.textContent = body.error || 'This invite is invalid or has expired.';
          return;
        }
        statusEl.style.display = 'none';
        emailEl.value = body.email;
        formEl.style.display = 'block';
        nameEl.focus();
      } catch (e) {
        statusEl.textContent = 'Network error. Please try again.';
      }
    })();

    formEl.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errorEl.textContent = '';
      submitEl.disabled = true;
      submitEl.textContent = 'Creating account…';
      try {
        const r = await fetch('/api/invites/' + encodeURIComponent(TOKEN) + '/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameEl.value.trim(),
            password: pwdEl.value,
          }),
        });
        const body = await r.json();
        if (!r.ok) {
          errorEl.textContent = body.error || 'Could not create account.';
          submitEl.disabled = false;
          submitEl.textContent = 'Create account';
          return;
        }
        document.querySelector('.card').innerHTML =
          '<h1 class="ok">Account created</h1>' +
          '<p class="sub">You can now sign in to the SKY OPTICLES seller app ' +
          'with <strong>' + body.data.admin.email + '</strong> and the password you chose.</p>';
      } catch (e) {
        errorEl.textContent = 'Network error. Please try again.';
        submitEl.disabled = false;
        submitEl.textContent = 'Create account';
      }
    });
  </script>
</body>
</html>`;
}

router.get('/accept-invite/:token', (req, res) => {
  res.type('html').send(renderPage(req.params.token));
});

module.exports = router;