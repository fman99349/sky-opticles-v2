import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../auth/AdminAuthContext';
import { loginStyles as s } from './loginStyles';
import Typewriter from '../components/Typewriter';

// Marketplace showcase images and their corresponding typing text
const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85',
    text: 'Manage your global marketplace.',
  },
  {
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
    text: 'Curate products from anywhere.',
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85',
    text: 'Track orders in real-time.',
  },
];

const LAST_LOGIN_KEY = 'dmd_admin_last_login';

export default function LoginPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Slideshow state
  const [slideIndex, setSlideIndex] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(1);

  // 1. Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_LOGIN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setEmail(parsed.email || '');
        setPassword(parsed.password || '');
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setImageOpacity(0);
      
      setTimeout(() => {
        setSlideIndex((current) => (current + 1) % SLIDES.length);
        setImageOpacity(1);
      }, 800);

    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
      
      // 2. Save credentials on successful login
      // Note: For production, consider removing the password from this save.
      window.localStorage.setItem(
        LAST_LOGIN_KEY, 
        JSON.stringify({ email: email.trim(), password })
      );

    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentSlide = SLIDES[slideIndex];

  return (
    <div style={s.container}>
      {/* Left pane — auto-sliding images + brand */}
      <div style={s.leftPane}>
        <div
          style={{
            ...s.heroImage,
            backgroundImage: `url(${currentSlide.image})`,
            opacity: imageOpacity,
          }}
        />

        <div style={s.leftOverlay} />

        <div style={s.leftContent}>
          <h1 style={s.brandTitle}>Diamond Dee💎</h1>
          <p style={s.brandCaption}>GLOBAL MARKETPLACE • MANAGEMENT SYSTEM</p>

          {/* Typewriter Effect */}
          <div style={{ height: 40, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ ...s.brandTitle, fontSize: 18, letterSpacing: '0.05em', fontWeight: 600 }}>
              <Typewriter text={currentSlide.text} speed={60} />
            </p>
          </div>

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
                placeholder="admin@dmdoptics.com"
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
            This console is for DMD dministrators only. Customer
            accounts live in the mobile application and cannot be used here.
          </p>
        </div>
      </div>
    </div>
  );
}