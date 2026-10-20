import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';
import { price } from '../utils/product';

export default function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) || options[0];

  return (
    <View style={styles.dropdown}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.dropdownHeader, pressed && styles.buttonPressed]}
      >
        <Text style={styles.dropdownLabel}>{label}</Text>
        <Text style={styles.dropdownValue} numberOfLines={1}>{current.label}</Text>
        <Text style={styles.dropdownChevron}>{open ? '' : ''}</Text>
      </Pressable>

      {open && (
        <View style={styles.dropdownBody}>
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <Pressable
                key={opt.id}
                onPress={() => { onChange(opt.id); setOpen(false); }}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selected && styles.dropdownOptionSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionLabel,
                    selected && styles.dropdownOptionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.dropdownOptionPrice,
                    selected && styles.dropdownOptionPriceSelected,
                  ]}
                >
                  {opt.priceDelta > 0 ? `+${price(opt.priceDelta)}` : 'Included'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}