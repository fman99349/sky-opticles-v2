import { StyleSheet } from 'react-native';

export const variantPickerStyles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#7C8792',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#E7E3DC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    backgroundColor: '#FFFFFF',
  },
  dotActive: {
    borderColor: '#D7B987',
  },
  dotPressed: {
    opacity: 0.7,
  },
  dotFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  currentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17283A',
    marginTop: 10,
  },
});