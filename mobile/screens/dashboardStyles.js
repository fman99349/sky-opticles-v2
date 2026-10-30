import { StyleSheet } from 'react-native';

// Dashboard-only styles. Kept separate from styles.ts so the guest flow
// is completely unaffected by anything the signed-in shell needs.
//
// The palette mirrors the guest app so the two experiences feel like
// one product: navy, cream, gold, teal.

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

export const dashStyles = StyleSheet.create({
  // --- Shell ---
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },
  topBar: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  greetingHi: {
    color: '#B5BFCA',
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  greetingName: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  iconBadge: {
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
  iconBadgeText: {
    color: C.navy,
    fontSize: 10,
    fontWeight: '900',
  },

  // --- Content area ---
  content: {
    flex: 1,
  },

  // --- Home tab ---
  homeScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  welcomeBanner: {
    backgroundColor: C.gold,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  welcomeBannerText: {
    color: C.navy,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionBlock: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: C.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  continueStrip: {
    paddingRight: 20,
  },
  continueItem: {
    width: 140,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  continueImageBox: {
    height: 110,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueImage: {
    width: '85%',
    height: '85%',
  },
  continuePlaceholder: {
    color: C.teal,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontSize: 12,
  },
  continueBody: {
    padding: 10,
  },
  continueName: {
    color: C.ink,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    minHeight: 30,
  },
  continuePrice: {
    color: C.navy,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
  },
  exploreBtn: {
    marginTop: 8,
  },

  // --- Account tab ---
  accountScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  accountCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 18,
    marginBottom: 18,
  },
  accountRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  accountRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  accountLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  accountValue: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  accountMutedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  accountMutedLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  accountMutedBadge: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  // --- Notifications tab ---
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyGlyph: {
    color: C.teal,
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },

  // --- Shop tab (slim catalogue inside dashboard) ---
  shopContainer: {
    flex: 1,
  },
  shopSearchWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
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
  shopSearchGlyph: {
    color: C.teal,
    fontSize: 22,
    marginRight: 8,
  },
  shopSearchInput: {
    flex: 1,
    fontSize: 12,
    color: C.ink,
    paddingVertical: 6,
  },
  shopClear: {
    color: C.teal,
    fontSize: 9,
    fontWeight: '800',
  },
  shopList: {
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  shopStateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  shopStateTitle: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  shopStateText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },

  // --- Cart tab (thin wrapper — reuses guest cart look) ---
  cartContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  cartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  cartEmptyTitle: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  cartEmptyText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },

  // --- Account edit mode (added) ---
  accountEditRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  accountEditInput: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    fontSize: 14,
    color: C.ink,
    backgroundColor: '#FAF7F1',
  },
  accountEditHint: {
    marginTop: 6,
    fontSize: 11,
    color: C.muted,
    lineHeight: 15,
  },
  accountEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  accountEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  accountEditBtnPrimary: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  accountEditBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: C.muted,
  },
  accountEditBtnTextPrimary: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: C.navy,
  },
  accountEditIcon: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountEditIconText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: C.teal,
  },
  accountEditError: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEE7E5',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 12,
    color: C.error,
    lineHeight: 17,
  },
  accountEditSuccess: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#E6F5F3',
    borderWidth: 1,
    borderColor: 'rgba(46,141,134,0.35)',
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 12,
    color: C.teal,
    lineHeight: 17,
    fontWeight: '700',
  },

  // --- Saved Addresses ---
  addressCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  addressDefaultBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FDF9F0',
    borderWidth: 1,
    borderColor: C.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addressDefaultText: {
    fontSize: 9,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: 0.5,
  },
  addressLabelText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.ink,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    paddingRight: 40,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
    gap: 16,
  },
  addressActionBtn: {
    fontSize: 11,
    fontWeight: '800',
    color: C.teal,
  },
  addressActionBtnDanger: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  addAddressBtn: {
    backgroundColor: '#FAF7F1',
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  addAddressBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: C.teal,
    letterSpacing: 0.5,
  },






});