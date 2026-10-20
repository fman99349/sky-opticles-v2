import { StyleSheet } from 'react-native';

// Styles for the sign-in and sign-up screens.
// Follows the checkout screen's visual language: compact navy header,
// cream body, clear field labels, one gold CTA.

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

export const authStyles = StyleSheet.create({
  // --- Shell ---
  shell: { flex: 1, backgroundColor: C.cream },

  // --- Compact navy header ---
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // balances the back button width for true centering
  },
  headerSpacer: { width: 40 },

  // --- Body ---
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },

  eyebrow: {
    color: C.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    color: C.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 26,
  },

  // --- Field ---
  field: {
    marginBottom: 16,
  },
  label: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
  },
  inputError: {
    borderColor: C.error,
  },
  fieldHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
    lineHeight: 15,
  },

  // --- Error banner ---
  errorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEE7E5',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    lineHeight: 17,
    fontWeight: '600',
  },

  // --- CTA ---
  cta: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
  },
  ctaPressed: { opacity: 0.85 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  // --- Secondary action ---
  crossLink: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 8,
  },
  crossLinkText: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  crossLinkAccent: {
    color: C.teal,
    fontWeight: '800',
  },

  // --- Footnote ---
  footnote: {
    marginTop: 24,
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    textAlign: 'center',
  },
});