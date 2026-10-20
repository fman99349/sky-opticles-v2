import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { variantPickerStyles as v } from './variantPickerStyles';

// Colour inference map: when a variant has no color_hex, we map the
// colour *name* to a hex value so the swatch still reads as a colour.
// Unknown names fall back to neutral grey rather than guessing.
const COLOUR_BY_NAME = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  brown: '#6b4423',
  navy: '#1e3a5f',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
  grey: '#6b7280',
  gray: '#6b7280',
  silver: '#c0c0c0',
  gold: '#d4af37',
  pink: '#ec4899',
  rose: '#e11d48',
  purple: '#7c3aed',
  orange: '#f97316',
  yellow: '#eab308',
  tortoise: '#8b5a3c',
  clear: '#e5e7eb',
  transparent: '#e5e7eb',
};

export function variantColour(variant) {
  if (
    variant.color_hex &&
    /^#[0-9a-fA-F]{6}$/.test(variant.color_hex)
  ) {
    return variant.color_hex;
  }
  const name = String(variant.color || '').toLowerCase().trim();
  return COLOUR_BY_NAME[name] || '#9ca3af';
}

export default function VariantPicker({ variants, selectedId, onSelect }) {
  if (!variants || variants.length < 2) return null;

  const selected = variants.find(
    (x) => String(x.id) === String(selectedId)
  );

  return (
    <View style={v.wrap}>
      <Text style={v.label}>COLOUR</Text>
      <View style={v.row}>
        {variants.map((variant) => {
          const isActive = String(variant.id) === String(selectedId);
          const fill = variantColour(variant);
          return (
            <Pressable
              key={variant.id}
              onPress={() => onSelect(variant.id)}
              style={({ pressed }) => [
                v.dot,
                isActive && v.dotActive,
                pressed && v.dotPressed,
              ]}
              accessibilityLabel={`Select ${variant.color || variant.sku}`}
            >
              <View style={[v.dotFill, { backgroundColor: fill }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={v.currentName}>
        {selected?.color || selected?.sku || 'Select a colour'}
      </Text>
    </View>
  );
}