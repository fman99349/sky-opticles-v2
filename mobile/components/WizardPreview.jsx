import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { tintOverlayFor } from '../data/lensOptions';

// Parse a tint colour string like 'rgba(55,55,55,0.38)' into a solid RGB
// colour + opacity pair. React Native's Image tintColor behaves inconsistently
// across platforms with alpha in rgba(); using opacity separately is reliable.
function tintToColourAndOpacity(tint) {
  if (!tint) return null;
  const m = tint.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (m) {
    return {
      colour: `rgb(${m[1]},${m[2]},${m[3]})`,
      opacity: Number(m[4]),
    };
  }
  return { colour: tint, opacity: 1 };
}

export default function WizardPreview({
  imageUrl,
  lensLayerUrl,
  productType,
  config,
  height = 130,
}) {
  if (!imageUrl) return null;

  const tint = tintOverlayFor(productType, config);
  const tintPair = tintToColourAndOpacity(tint);

  return (
    <View style={[styles.wrap, { height }]}>
      {/* Frame photo */}
      <Image source={{ uri: imageUrl }} style={styles.fill} resizeMode="contain" />

      {/* Tint layer — masked when a lens layer exists, full-image otherwise */}
      {tintPair && (
        <View
          style={[styles.fill, { opacity: tintPair.opacity }]}
          pointerEvents="none"
        >
          {lensLayerUrl ? (
            <Image
              source={{ uri: lensLayerUrl }}
              style={[styles.fill, { tintColor: tintPair.colour }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.fill, { backgroundColor: tintPair.colour }]} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EDEAE4',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});