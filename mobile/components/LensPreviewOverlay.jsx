import React from 'react';
import { View } from 'react-native';
import { styles } from '../styles';
import { tintOverlayFor } from '../data/lensOptions';

// Applies a semi-transparent tint over the product photo.
// Tier A preview  approximate, honest, and driven entirely by the selected
// tint option's 'overlay' value in lensOptions.js.
export default function LensPreviewOverlay({ productType, config }) {
  const overlay = tintOverlayFor(productType, config);
  if (!overlay) return null;

  return (
    <View
      style={[styles.lensOverlay, { backgroundColor: overlay }]}
      pointerEvents="none"
    />
  );
}