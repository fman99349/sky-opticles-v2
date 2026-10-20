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

export const styles = StyleSheet.create({
  welcomeSafe: { flex: 1, backgroundColor: C.navy },
  welcomeTop: {
    height: 76,
    paddingHorizontal: 23,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },


heroEyebrowDark: {
  color: '#183451',
},
heroTitleDark: {
  color: '#102A43',
},
heroDescriptionDark: {
  color: '#243F59',
},
heroLabelDark: {
  color: '#183451',
},
















































  // --- Detail screen: Add Lenses / Frame Only actions (added) ---
  detailFromRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
  },
  detailFromLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: C.muted,
  },
  detailFromValue: {
    fontSize: 24,
    fontWeight: '900',
    color: C.navy,
  },
  detailFromNote: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  lensActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  lensActionPrimary: {
    flex: 1,
    backgroundColor: C.gold,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  lensActionPrimaryText: {
    color: C.navy,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  lensActionOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.navy,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  lensActionOutlineText: {
    color: C.navy,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },



    cartRxBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: C.muted,
    marginTop: 4,
  },







  brand: {
    color: C.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  brandDark: { color: C.navy },
  brandDot: { color: C.gold },
  brandCaption: {
    color: '#AAB4C0',
    fontSize: 7,
    letterSpacing: 1.35,
    marginTop: 5,
  },
  brandCaptionDark: { color: C.muted },
  topSignIn: {
    color: C.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingVertical: 10,
  },
  hero: {
    flex: 1,
    minHeight: 300,
    marginHorizontal: 13,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: C.navyLight,
  },
  heroImageWrap: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 19, 31, 0.48)',
  },
  heroTopLabel: {
    position: 'absolute',
    top: 20,
    left: 19,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
    marginRight: 8,
  },
  heroTopLabelText: {
    color: C.white,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  heroContent: {
    position: 'absolute',
    left: 22,
    right: 18,
    bottom: 25,
  },
  heroEyebrow: {
    color: C.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 13,
  },
  heroTitle: {
    color: C.white,
    fontSize: 37,
    lineHeight: 43,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  heroDescription: {
    color: '#F0F1F2',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: 280,
  },
  dots: { flexDirection: 'row', alignItems: 'center', marginTop: 23 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A5ADB6',
    marginRight: 8,
  },
  dotActive: { width: 24, backgroundColor: C.gold },
  slideNumber: {
    color: C.white,
    fontSize: 9,
    letterSpacing: 1.2,
    marginLeft: 'auto',
  },
  welcomeBottom: {
    paddingHorizontal: 23,
    paddingTop: 22,
    paddingBottom: 12,
  },
  welcomeHeadline: {
    color: C.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  welcomeHeadlineAccent: { color: C.gold },
  welcomeCopy: {
    color: '#B5BFCA',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 16,
  },
  button: {
    minHeight: 51,
    borderRadius: 3,
    paddingHorizontal: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: C.gold },
  buttonOutline: { borderWidth: 1, borderColor: C.gold },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: C.navy,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  buttonTextOutline: { color: C.gold },
  buttonArrow: { color: C.navy, fontSize: 20 },
  secondaryLink: { alignItems: 'center', paddingVertical: 13 },
  secondaryLinkText: { color: '#C5CDD5', fontSize: 11 },
  goldText: { color: C.gold, fontWeight: '800' },
  legalText: {
    color: '#758494',
    fontSize: 7,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 3,
  },
















  catalogueSafe: { flex: 1, backgroundColor: C.cream },
    catalogueHeaderCompact: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingTop: 22,      // was 13 — icons sit lower, matching the taller brand block
    paddingBottom: 45,   // was 32 — compensates for the removed title/subtitle, pushes search down
  },
  backLink: { marginBottom: 17, alignSelf: 'flex-start' },
  backLinkText: {
    color: C.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    paddingVertical: 5,
  },
  catalogueTitle: {
    color: C.white,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 23,
  },
  catalogueSubtitle: { color: '#B6C2CD', fontSize: 11, marginTop: 7 },
  searchBox: {
    marginHorizontal: 18,
    marginTop: -16,
    height: 50,
    paddingHorizontal: 13,
    backgroundColor: C.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchGlyph: { color: C.teal, fontSize: 26, marginRight: 9 },
  searchInput: { flex: 1, fontSize: 12, color: C.ink, paddingVertical: 8 },
  clearText: { color: C.teal, fontSize: 9, fontWeight: '800' },
  collectionHeader: {
    paddingHorizontal: 19,
    paddingTop: 23,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionTitle: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  collectionSubtitle: { color: C.muted, fontSize: 10, marginTop: 5 },
  collectionMark: { color: C.gold, fontWeight: '900', letterSpacing: 1.5 },
  productList: { paddingHorizontal: 17, paddingBottom: 22, flexGrow: 1 },
  productRow: { justifyContent: 'space-between', marginBottom: 13 },
  productCard: {
    width: '48.5%',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  productPressed: { opacity: 0.8 },
  productImageBox: {
    height: 145,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: { width: '88%', height: '84%' },
  productPlaceholder: { alignItems: 'center' },
  placeholderGlasses: { fontSize: 46, color: C.teal },
  placeholderCaption: {
    color: C.muted,
    fontSize: 7,
    letterSpacing: 1.4,
    marginTop: 4,
  },
  categoryPill: {
    position: 'absolute',
    left: 7,
    top: 8,
    backgroundColor: C.white,
    color: C.navy,
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 7,
    fontWeight: '800',
    maxWidth: '90%',
  },
  productInfo: { padding: 10 },
  productName: { color: C.ink, fontSize: 12, lineHeight: 17, fontWeight: '800', minHeight: 34 },
  productDescription: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 6, minHeight: 28 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  productPrice: { color: C.navy, fontSize: 11, fontWeight: '900', flexShrink: 1 },
  smallArrow: { width: 23, height: 23, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  smallArrowText: { color: C.gold, fontSize: 13 },
  stateBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  stateTitle: { color: C.ink, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  stateDescription: { color: C.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginVertical: 13 },
  listFooter: { color: C.muted, textAlign: 'center', fontSize: 8, letterSpacing: 1.4, paddingVertical: 22 },

  detailSafe: { flex: 1, backgroundColor: C.cream },
  detailHeader: { backgroundColor: C.navy, paddingHorizontal: 20, paddingVertical: 17, gap: 18 },
  detailBody: { padding: 21, paddingBottom: 35 },
  detailImageBox: { height: 250, backgroundColor: '#EDEAE4', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  detailImage: { width: '90%', height: '90%' },
  detailPlaceholder: { color: C.teal, fontWeight: '900', letterSpacing: 2 },
  detailEyebrow: { color: C.teal, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  detailName: { color: C.ink, fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 10 },
  detailPrice: { color: C.navy, fontSize: 22, fontWeight: '900', marginTop: 16 },
  detailDescription: { color: C.muted, fontSize: 13, lineHeight: 21, marginTop: 14 },
  detailNote: { backgroundColor: '#ECE6DA', padding: 14, marginVertical: 20 },
  detailNoteText: { color: C.navy, fontSize: 11, lineHeight: 18 },

  authSafe: { flex: 1, backgroundColor: C.navy },
  authHeader: { padding: 22, gap: 26 },
  authBody: { paddingHorizontal: 24, paddingTop: 35 },
  authEyebrow: { color: C.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  authTitle: { color: C.white, fontSize: 39, lineHeight: 45, fontWeight: '900', marginTop: 15 },
  authDescription: { color: '#BBC6D0', fontSize: 12, lineHeight: 20, marginTop: 12, marginBottom: 28 },
  fieldLabel: { color: C.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 15, marginBottom: 8 },
  authInput: { borderBottomWidth: 1, borderBottomColor: '#516071', color: C.white, paddingVertical: 12, fontSize: 13 },
  authFootnote: { color: '#AAB5C1', fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 20 },
  // --- Filter tabs (added) ---
  filterBar: {
    paddingTop: 14,
    paddingBottom: 2,
  },
  filterContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  filterTabText: {
    color: C.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterTabTextActive: {
    color: C.gold,
  },



  // --- Lens configurator (added) ---
  configurator: {
    marginTop: 20,
    marginBottom: 6,
  },
  configuratorTitle: {
    color: C.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  configuratorSubtitle: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    marginBottom: 10,
  },

  dropdown: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  dropdownLabel: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '800',
    width: 120,
  },
  dropdownValue: {
    color: C.teal,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  },
  dropdownChevron: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    width: 12,
    textAlign: 'center',
  },
  dropdownBody: {
    paddingBottom: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#F4F1EA',
  },
  dropdownOptionSelected: {
    backgroundColor: C.navy,
  },
  dropdownOptionLabel: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  dropdownOptionLabelSelected: {
    color: C.white,
  },
  dropdownOptionPrice: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  dropdownOptionPriceSelected: {
    color: C.gold,
  },

  // --- Preview overlay on detail image (added) ---
  lensOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // --- Add button floating on the detail image (added) ---
  imageAddBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.gold,
  },
  imageAddGlyph: {
    color: C.gold,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: -2,
  },

  // --- Live total row under the configurator (added) ---
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECE6DA',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginTop: 18,
    marginBottom: 18,
  },
  detailTotalLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  detailTotalValue: {
    color: C.navy,
    fontSize: 20,
    fontWeight: '900',
  },

  // --- Cart line lens summary (added) ---
  cartLensSummary: {
    color: C.teal,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    fontWeight: '700',
  },





  authError: {
    color: '#F87171',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },

























  // --- Fallback caption when the selected variant has no image of its own ---
  detailFallbackCaption: {
    fontSize: 11,
    color: C.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },









  // --- Header cart button + badge (added) ---
    catalogueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
    marginHorizontal: 8,  // pulls the HOME and cart icons ~8px toward the center each
  },

















  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },

  headerCartBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerCartGlyph: {
    fontSize: 22,
  },
  headerCartBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerCartBadgeText: {
    color: C.navy,
    fontSize: 10,
    fontWeight: '900',
  },

  // --- Card actions: small cart button next to arrow (added) ---
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartGlyph: {
    color: C.gold,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },

  // --- Cart screen (added) ---
  cartList: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  cartImageBox: {
    width: 64,
    height: 64,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  cartImage: { width: '88%', height: '88%' },
  cartImagePlaceholder: {
    color: C.teal,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  cartInfo: { flex: 1, paddingHorizontal: 12 },
  cartName: { color: C.ink, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  cartUnit: { color: C.muted, fontSize: 10, marginTop: 3 },
  cartQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    gap: 8,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  qtyBtnText: { color: C.navy, fontSize: 15, fontWeight: '900', lineHeight: 17 },
  qtyValue: {
    minWidth: 22,
    textAlign: 'center',
    color: C.ink,
    fontWeight: '900',
    fontSize: 12,
  },
  removeBtn: { marginLeft: 'auto' },
  removeBtnText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cartLineTotal: {
    color: C.navy,
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 8,
  },

  cartFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.cream,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cartTotalLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cartTotalValue: {
    color: C.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  cartClear: { alignItems: 'center', paddingVertical: 12 },
  cartClearText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cartFootnote: {
    color: C.muted,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});