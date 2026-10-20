import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';
import { getGroupsForProductType } from '../data/lensOptions';
import Dropdown from './Dropdown';

export default function LensConfigurator({ product, config, onChange }) {
  const groups = getGroupsForProductType(product.product_type);
  if (groups.length === 0) return null;

  return (
    <View style={styles.configurator}>
      <Text style={styles.configuratorTitle}>CUSTOMISE YOUR LENSES</Text>
      <Text style={styles.configuratorSubtitle}>
        Tap a row to change your selection. The price updates live.
      </Text>

      {groups.map((g) => (
        <Dropdown
          key={g.id}
          label={g.label}
          value={config[g.id]}
          options={g.options}
          onChange={(v) => onChange(g.id, v)}
        />
      ))}
    </View>
  );
}