import React, { useState } from 'react';
import { useAdminAuth } from '../auth/AdminAuthContext';
import { loginStyles as s } from './loginStyles';

// Optional hero image. Vite's import.meta.glob returns an empty object when
// no matching file exists, so the page falls back gracefully to a solid
// navy background until you drop an image into admin/src/assets/.
//
// Drop any of these names and it will be picked up:
//   admin/src/assets/login-hero.jpg
//   admin/src/assets/login-hero.png
//   admin/src/assets/login-hero.webp
const heroModules = import.meta.glob('../assets/images/login-hero.*', { eager: true });
const heroImages = Object.values(heroModules);
const heroUrl = heroImages[0]?.default || null;

export default function LoginPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      // On success, the AuthContext flips `admin`, and App.jsx renders
      // the shell. No navigation is needed from this component.
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.container}>
      {/* Left pane — brand + optional hero image */}
      <div style={s.leftPane}>
        {heroUrl ? (
          <div style={{ ...s.heroImage, backgroundImage: `url(${heroUrl})` }} />
        ) : (
          <div style={s.heroFallback} />
        )}

        <div style={s.leftOverlay} />

        <div style={s.leftContent}>
          <h1 style={s.brandTitle}>THE SKY OPTICS</h1>
          <p style={s.brandCaption}>EYEWEAR • EXPRESSION • EXCELLENCE</p>

          <div style={s.leftFooter}>
            <span style={s.leftFooterDot} />
            <span style={s.leftFooterText}>ADMINISTRATOR CONSOLE</span>
          </div>
        </div>
      </div>

      {/* Right pane — the login form */}
      <div style={s.rightPane}>
        <div style={s.formWrap}>
          <div style={s.formHead}>
            <h2 style={s.formTitle}>Sign in</h2>
            <p style={s.formSubtitle}>
              Restricted access. Administrators only.
            </p>
          </div>

          <form onSubmit={submit} style={s.form}>
            <label style={s.label}>
              <span style={s.labelText}>EMAIL ADDRESS</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@skyopticles.com"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                disabled={submitting}
                style={s.input}
              />
            </label>

            <label style={s.label}>
              <span style={s.labelText}>PASSWORD</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={submitting}
                style={s.input}
              />
            </label>

            {error && <div style={s.error}>{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              style={submitting ? { ...s.button, ...s.buttonDisabled } : s.button}
            >
              {submitting ? 'SIGNING IN…' : 'SIGN IN'}
            </button>
          </form>

          <p style={s.footnote}>
            This console is for SKY OPTICLES administrators only. Customer
            accounts live in the mobile application and cannot be used here.
          </p>
        </div>
      </div>
    </div>
  );
}