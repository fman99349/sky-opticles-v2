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

export const shopStyles = StyleSheet.create({
  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1EDE5',
    padding: 4,
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: C.navy },
  segmentText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: C.muted,
  },
  segmentTextActive: { color: C.gold },

  // Shop list
  shopListWrap: { flex: 1 },
  shopSearchWrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  shopSearchBox: {
    height: 46,
    paddingHorizontal: 13,
    backgroundColor: C.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopSearchGlyph: { color: C.teal, fontSize: 22, marginRight: 8 },
  shopSearchInput: { flex: 1, fontSize: 12, color: C.ink, paddingVertical: 6 },
  shopSearchClear: { color: C.teal, fontSize: 9, fontWeight: '800' },

  // Filter chips
  filterRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  filterChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterChipText: { color: C.ink, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  filterChipTextActive: { color: C.gold },

  // Shop card grid
  shopGrid: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
  shopRow: { justifyContent: 'space-between', marginBottom: 13 },
  shopCard: {
    width: '48.5%',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shopCardPressed: { opacity: 0.85 },
  shopCardLogoBox: {
    height: 130,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCardLogo: { width: '70%', height: '70%' },
  shopCardMonogram: { color: C.navy, fontSize: 34, fontWeight: '900', letterSpacing: 1 },
  shopCardInfo: { padding: 10 },
  shopCardNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  shopCardName: {
    color: C.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    minHeight: 34,
    flex: 1,
  },
  verifiedBadge: {
    color: C.teal,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 17,
  },
  shopCardTagline: { color: C.muted, fontSize: 10, lineHeight: 14, marginTop: 3, minHeight: 28 },
  shopCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  shopCardCity: { color: C.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.4, flexShrink: 1 },
  shopCardCount: { color: C.muted, fontSize: 10, fontWeight: '700', marginLeft: 4 },

  // Shop detail
  detailWrap: { flex: 1, backgroundColor: C.cream },

  // Banner container — taller so the logo can breathe.
  bannerBox: { position: 'relative', height: 220, backgroundColor: C.navyLight },
  bannerImage: { width: '100%', height: '100%' },

  backBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,29,44,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backBtnText: { color: C.gold, fontSize: 22, fontWeight: '900', lineHeight: 24, marginTop: -2 },

  // Uploaded-logo display — WHITE background, larger area, minimal padding.
  logoBannerBgWhite: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  logoBannerImage: {
    width: '100%',
    height: '100%',
  },

  // Monogram fallback — dark container (inherited from bannerBox), big white letters.
  logoBannerBgDark: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBannerMonogram: {
    color: C.white,
    fontSize: 92,
    fontWeight: '900',
    letterSpacing: 10,
  },

  detailInfo: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 18 },
  detailNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detailName: { fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: -0.4 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(46,141,134,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,141,134,0.35)',
  },
  verifiedPillText: {
    color: C.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  detailTagline: { fontSize: 11, color: C.teal, marginTop: 4, fontWeight: '700', letterSpacing: 0.4 },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 12 },
  detailMeta: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  detailDescription: { fontSize: 12, lineHeight: 19, color: C.ink, marginTop: 12 },

  sectionRow: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: C.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sectionCount: { color: C.muted, fontSize: 10 },

  productsGrid: { paddingHorizontal: 17, paddingBottom: 24, flexGrow: 1 },
  productsRow: { justifyContent: 'space-between', marginBottom: 13 },

  // Shared state
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  stateTitle: { color: C.ink, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  stateText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.gold,
    borderRadius: 4,
  },
  retryBtnText: { color: C.navy, fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
});