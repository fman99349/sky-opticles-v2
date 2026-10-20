import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupsForProductType } from '../data/lensOptions';
import { lensWizardStyles as w } from './lensWizardStyles';
import InfoPopup from '../components/InfoPopup';

// Step 5 of the Lens Wizard — upgrades as chips.
// Tint, coating, polarization, and (for contact lenses / accessories) their
// respective finishing options. These are all single-select chip groups.

const CHIP_GROUPS = [
  'tint',
  'polarization',
  'coating',
  'contactSchedule',
  'contactType',
  'accessoryFinish',
];

export default function UpgradesStep({ product, config, onChange }) {
  const [openHelp, setOpenHelp] = useState(null);

  const groups = getGroupsForProductType(product.product_type).filter((g) =>
    CHIP_GROUPS.includes(g.id)
  );

  if (groups.length === 0) {
    return (
      <View style={w.scrollBody}>
        <Text style={w.stepTitle}>Upgrades</Text>
        <Text style={w.stepSubtitle}>
          No additional upgrades for this product.
        </Text>
      </View>
    );
  }

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>Customise your lens</Text>
      <Text style={w.stepSubtitle}>
        Tints, coatings and finishes. Each option adds to the total.
      </Text>

      {groups.map((group) => (
        <View key={group.id} style={{ marginBottom: 18 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text style={w.upgradeSectionLabel}>{group.label.toUpperCase()}</Text>
            {group.help && (
              <Pressable
                onPress={() => setOpenHelp(group.id)}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#7C8792"
                />
                <Text style={{ fontSize: 11, color: '#7C8792', fontWeight: '700' }}>
                  Learn
                </Text>
              </Pressable>
            )}
          </View>

          <View style={w.chipRow}>
            {group.options.map((opt) => {
              const active = config[group.id] === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => onChange({ ...config, [group.id]: opt.id })}
                  style={[w.chip, active && w.chipActive]}
                >
                  <Text style={[w.chipText, active && w.chipTextActive]}>
                    {opt.label}
                    {opt.priceDelta > 0 ? `  +R${opt.priceDelta}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {openHelp && (
        <InfoPopup
          visible
          title={
            (groups.find((g) => g.id === openHelp)?.help || {}).title || ''
          }
          body={(groups.find((g) => g.id === openHelp)?.help || {}).body || ''}
          onClose={() => setOpenHelp(null)}
        />
      )}
    </View>
  );
}