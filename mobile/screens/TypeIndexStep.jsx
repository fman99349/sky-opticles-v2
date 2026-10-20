import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupsForProductType } from '../data/lensOptions';
import { lensWizardStyles as w } from './lensWizardStyles';
import InfoPopup from '../components/InfoPopup';

// Step 4 of the Lens Wizard — lens index, edge finish, and progressive
// style (the last only if the customer chose Progressive in step 2).
// Each sub-group renders as a vertical list with a price on the right.

const SUBGROUPS = ['lensIndex', 'edgeThickness', 'progressiveStyle'];

export default function TypeIndexStep({ product, config, onChange }) {
  const [openHelp, setOpenHelp] = useState(null);

  const groups = getGroupsForProductType(product.product_type);
  const applicable = groups.filter((g) => SUBGROUPS.includes(g.id));

  const visible = applicable.filter((g) => {
    if (g.id === 'progressiveStyle' && config.lensType !== 'progressive') {
      return false;
    }
    return true;
  });

  if (visible.length === 0) {
    return (
      <View style={w.scrollBody}>
        <Text style={w.stepTitle}>Lens type & index</Text>
        <Text style={w.stepSubtitle}>
          This product does not require lens type or index selection.
        </Text>
      </View>
    );
  }

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>Choose your lens material</Text>
      <Text style={w.stepSubtitle}>
        Higher index lenses are thinner and lighter for stronger prescriptions.
      </Text>

      {visible.map((group) => (
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

          {group.options.map((opt) => {
            const active = config[group.id] === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange({ ...config, [group.id]: opt.id })}
                style={[w.indexRow, active && w.indexRowActive]}
              >
                <View style={[w.cardIcon, active && w.cardIconActive]}>
                  <Ionicons
                    name={active ? 'checkmark' : 'ellipse-outline'}
                    size={18}
                    color={active ? '#101D2C' : '#17283A'}
                  />
                </View>
                <View style={w.indexBody}>
                  <Text style={w.indexTitle}>{opt.label}</Text>
                </View>
                {opt.priceDelta > 0 ? (
                  <Text style={w.indexPrice}>+R {opt.priceDelta}</Text>
                ) : (
                  <Text style={w.indexBadge}>INCLUDED</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {openHelp && (
        <InfoPopup
          visible
          title={
            (visible.find((g) => g.id === openHelp)?.help || {}).title || ''
          }
          body={
            (visible.find((g) => g.id === openHelp)?.help || {}).body || ''
          }
          onClose={() => setOpenHelp(null)}
        />
      )}
    </View>
  );
}