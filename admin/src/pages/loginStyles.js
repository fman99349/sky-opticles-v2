// Styling for the admin login page.
//
// This is a plain JavaScript object (React inline style) — not CSS.
// Kept separate from styles.css so the login screen can be restyled in
// isolation without touching the rest of the console.
//
// Palette matches the mobile app: navy, cream, gold, teal.

const C = {
  navy: '#101D2C',
  navyLight: '#1D3044',
  cream: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#D7B987',
  ink: '#17283A',
  muted: '#7C8792',
  border: '#E7E3DC',
  teal: '#2E8D86',
  error: '#F87171',
};

export const loginStyles = {
  // Whole-screen two-column layout.
  container: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: C.ink,
    backgroundColor: C.navy,
  },

  // --- Left pane: brand + hero image ---
  leftPane: {
    flex: '1 1 55%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: C.navy,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.white,
  },
  heroImage: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    transition: 'opacity 1.5s ease-in-out',
  },
  heroFallback: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 60%, ${C.teal} 130%)`,
  },
  leftOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(16,29,44,0.55) 0%, rgba(16,29,44,0.85) 100%)',
  },
  leftContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '48px 40px',
    textAlign: 'center',
  },
  brandTitle: {
    margin: 0,
    fontSize: 42,
    fontWeight: 900,
    letterSpacing: '0.16em',
    color: C.white,
    textShadow: '0 2px 20px rgba(0,0,0,0.35)',
  },
  brandCaption: {
    margin: '14px 0 0',
    fontSize: 11,
    letterSpacing: '0.32em',
    color: C.gold,
    fontWeight: 700,
  },
  leftFooter: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  leftFooterDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: C.gold,
  },
  leftFooterText: {
    fontSize: 10,
    letterSpacing: '0.28em',
    color: '#B5BFCA',
    fontWeight: 700,
  },

  // --- Right pane: login form ---
  rightPane: {
    flex: '1 1 45%',
    backgroundColor: C.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  formWrap: {
    width: '100%',
    maxWidth: 380,
  },
  formHead: {
    marginBottom: 30,
  },
  formTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    color: C.ink,
    letterSpacing: '-0.4px',
  },
  formSubtitle: {
    margin: '8px 0 0',
    fontSize: 12,
    color: C.muted,
    lineHeight: '18px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  labelText: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.16em',
    color: C.muted,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  error: {
    padding: '10px 12px',
    fontSize: 12,
    color: C.error,
    backgroundColor: 'rgba(248,113,113,0.08)',
    border: `1px solid rgba(248,113,113,0.25)`,
    borderRadius: 4,
  },
  button: {
    marginTop: 6,
    padding: '14px 16px',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.18em',
    color: C.navy,
    backgroundColor: C.gold,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footnote: {
    margin: '26px 0 0',
    fontSize: 11,
    lineHeight: '17px',
    color: C.muted,
    textAlign: 'center',
  },
};