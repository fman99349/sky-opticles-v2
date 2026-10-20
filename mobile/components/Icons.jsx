import React from 'react';
import { View } from 'react-native';

// Simple vector-style icons built from Views.
// No emoji, no external icon library — safe on every device.

export function HomeIcon({ color = '#D7B987', size = 14 }) {
  const roofHeight = Math.round(size * 0.5);
  const bodyWidth = Math.round(size * 0.66);
  const bodyHeight = Math.round(size * 0.5);
  const halfWidth = Math.round(size * 0.5);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: halfWidth,
          borderRightWidth: halfWidth,
          borderBottomWidth: roofHeight,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          backgroundColor: color,
          marginLeft: Math.round((size - bodyWidth) / 2),
        }}
      />
    </View>
  );
}

export function CartIcon({ color = '#D7B987', size = 20 }) {
  const handleWidth = Math.round(size * 0.5);
  const handleHeight = Math.round(size * 0.45);
  const bodyWidth = size;
  const bodyHeight = Math.round(size * 0.6);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: handleWidth,
          height: handleHeight,
          borderTopLeftRadius: handleWidth,
          borderTopRightRadius: handleWidth,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </View>
  );
}