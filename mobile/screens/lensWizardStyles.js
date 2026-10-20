import { StyleSheet } from 'react-native';

// Styles for the Lens Wizard and the education popups.
// Kept separate from styles.ts so the guest flow is untouched.

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

export const lensWizardStyles = StyleSheet.create({
  // --- Education popup ---
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,29,44,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 20,
    maxWidth: 420,
    width: '100%',
    maxHeight: '80%',
  },
  popupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: C.ink,
    flex: 1,
    paddingRight: 12,
  },
  popupBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5A6A',
  },

  // --- Wizard shell ---
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
    marginBottom: 14,
  },
  headerBack: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingVertical: 4,
  },
  headerStep: {
    color: '#B5BFCA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: C.navyLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: C.gold,
    borderRadius: 2,
  },

  // --- Body ---
  body: { flex: 1 },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 20,
  },
  stepHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#ECE6DA',
    borderRadius: 999,
    marginBottom: 18,
  },
  stepHelpText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ink,
  },

  // --- Cards (activity, usage) ---
  card: {
    padding: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardActive: {
    borderColor: C.gold,
    backgroundColor: '#FDF9F0',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECE6DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: C.gold },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  cardSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    lineHeight: 15,
  },

  // --- Prescription grid ---
  rxGrid: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rxHeaderEye: {
    width: 60,
    fontSize: 11,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: 1,
  },
  rxHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: C.muted,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  rxEyeLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '700',
    color: C.ink,
  },
  rxInput: {
    flex: 1,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: C.ink,
    textAlign: 'center',
  },
  rxInputError: { borderColor: C.error },
  rxNote: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    marginTop: 6,
  },
  rxSkipRow: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  rxSkipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },

  // --- Index list ---
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    marginBottom: 10,
  },
  indexRowActive: {
    borderColor: C.gold,
    backgroundColor: '#FDF9F0',
  },
  indexBody: { flex: 1 },
  indexTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  indexSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  indexPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
    marginLeft: 8,
  },
  indexBadge: {
    marginLeft: 8,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: C.teal,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(46,141,134,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },

  // --- Upgrades (chips) ---
  upgradeSectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: C.muted,
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  chipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink,
  },
  chipTextActive: { color: C.gold },

  // --- Review ---
  reviewCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE3',
    gap: 12,
  },
  reviewRowLast: { borderBottomWidth: 0 },
  reviewLabel: { fontSize: 12, color: C.muted, flex: 1 },
  reviewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink,
    maxWidth: '60%',
    textAlign: 'right',
  },
  reviewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: C.ink,
  },
  reviewTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: C.muted,
  },
  reviewTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: C.ink,
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
  continueBtn: {
    backgroundColor: C.ink,
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },


  // --- Prescription upload (added) ---
  uploadBox: {
    backgroundColor: '#ECE6DA',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ink,
    paddingVertical: 14,
    borderRadius: 6,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  uploadHint: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  uploadStatusText: {
    flex: 1,
    fontSize: 12,
    color: C.ink,
    fontWeight: '700',
  },
  uploadStatusSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  uploadRemove: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.muted,
  },
  uploadRemoveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.muted,
  },
  uploadError: {
    fontSize: 11,
    color: C.error,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
  uploadSignInHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },























});