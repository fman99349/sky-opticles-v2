import { StyleSheet } from 'react-native';

// Styles for the mobile checkout flow.
// Kept separate from styles.ts so the guest flow is untouched.
// Palette matches the rest of the mobile app.

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

export const checkoutStyles = StyleSheet.create({
  // --- Shell ---
  shell: { flex: 1, backgroundColor: C.cream },

  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBack: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingVertical: 4,
  },
  headerTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  headerSub: {
    color: '#B5BFCA',
    fontSize: 11,
    marginTop: 2,
  },

  // --- Body ---
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: C.ink,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHint: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 12,
    lineHeight: 16,
  },

  // --- Form ---
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: C.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
    outlineStyle: 'none',
  },
  inputError: { borderColor: C.error },
  fieldError: {
    fontSize: 11,
    color: C.error,
    marginTop: 4,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: { flex: 1 },

  // --- Items preview ---
  itemsCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE3',
    gap: 12,
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 17,
  },
  itemMeta: {
    fontSize: 11,
    color: C.teal,
    marginTop: 3,
    fontWeight: '700',
    lineHeight: 15,
  },
  itemQty: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'right',
    minWidth: 80,
  },

  // --- Summary ---
  summaryCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 16,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    fontSize: 13,
    color: C.ink,
  },
  summaryRowLabel: { color: C.muted, fontSize: 12 },
  summaryRowValue: { color: C.ink, fontSize: 13, fontWeight: '700' },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: C.ink,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: C.ink,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
  },

  // --- Error banner ---
  errorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEE7E5',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 6,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    lineHeight: 17,
    fontWeight: '600',
  },

  // --- Footer CTA ---
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.white,
  },
  placeOrderBtn: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  placeOrderBtnDisabled: { opacity: 0.5 },
  placeOrderBtnText: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  // --- Success screen ---
  successShell: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  successOrderNumber: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  successOrderNumberLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: C.muted,
    textAlign: 'center',
  },
  successOrderNumberValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  successActions: {
    marginTop: 28,
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  successPrimaryBtn: {
    backgroundColor: C.gold,
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    color: C.navy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  successSecondaryBtn: {
    borderWidth: 1,
    borderColor: C.ink,
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  successSecondaryBtnText: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
});