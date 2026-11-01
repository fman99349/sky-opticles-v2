import { StyleSheet } from 'react-native';

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
};

export const a = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.cream },

  // Header
  header: { backgroundColor: C.navy, paddingTop: 8, paddingBottom: 14 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 40,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: C.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: C.white, fontSize: 15, fontWeight: '900', letterSpacing: 2,
  },
  headerSpacer: { width: 60 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40 },

  // Hero
  hero: { marginBottom: 20 },
  heroEyebrow: {
    fontSize: 10, fontWeight: '900', letterSpacing: 3,
    color: C.teal, marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '900', color: C.ink,
    letterSpacing: -0.5, marginBottom: 8,
  },
  heroSub: {
    fontSize: 13, lineHeight: 20, color: C.muted,
  },

  // Benefits row
  benefitsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 24,
  },
  benefitCard: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, padding: 10,
  },
  benefitIcon: { fontSize: 20, marginBottom: 6 },
  benefitTitle: {
    fontSize: 11, fontWeight: '900', color: C.ink,
    letterSpacing: 0.3, marginBottom: 2,
  },
  benefitSub: { fontSize: 9, color: C.muted, lineHeight: 12 },

  // Section label
  sectionLabel: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
    color: C.teal, marginTop: 20, marginBottom: 12,
  },

  // Field
  field: { marginBottom: 14 },
  label: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1.2,
    color: C.muted, marginBottom: 6,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: C.ink,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  twoCol: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },

  // Chips
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontSize: 11, fontWeight: '800', color: C.ink, letterSpacing: 0.3 },
  chipTextActive: { color: C.gold },

  // CTA
  cta: {
    backgroundColor: C.navy,
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaPressed: { opacity: 0.85 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: C.gold, fontSize: 12, fontWeight: '900', letterSpacing: 2,
  },

  ctaSecondary: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: C.ink,
  },

  footnote: {
    marginTop: 18, fontSize: 11, lineHeight: 17,
    color: C.muted, textAlign: 'center',
  },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: 6, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },

  // Success
  successWrap: { flex: 1, alignItems: 'center', padding: 32, paddingTop: 60 },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.navy,
    borderWidth: 2, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24, fontWeight: '900', color: C.ink,
    letterSpacing: -0.5, marginBottom: 12, textAlign: 'center',
  },
  successSub: {
    fontSize: 14, lineHeight: 21, color: C.muted,
    textAlign: 'center', marginBottom: 28,
  },
  referenceBox: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 4, borderLeftColor: C.gold,
    borderRadius: 6, padding: 18,
    width: '100%', alignItems: 'center',
  },
  referenceLabel: {
    fontSize: 10, fontWeight: '900', letterSpacing: 2,
    color: C.muted, marginBottom: 8,
  },
  referenceCode: {
    fontSize: 22, fontWeight: '900', letterSpacing: 3,
    color: C.navy, marginBottom: 4,
  },
  referenceHint: { fontSize: 10, color: C.muted },
});