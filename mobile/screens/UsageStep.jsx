import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupsForProductType } from '../data/lensOptions';
import { lensWizardStyles as w } from './lensWizardStyles';
import InfoPopup from '../components/InfoPopup';

// Step 2 of the Lens Wizard.
// The customer picks the lens correction type from the lensType group
// (single vision / reading / bifocal / progressive / plano).
// For product types that do not have a lensType group (e.g. sunglasses),
// the step shows a friendly "not applicable" message.

const DESCRIPTIONS = {
  plano: 'No prescription. Cosmetic or fashion lenses.',
  single: 'Corrects one viewing distance. The most common choice.',
  reading: 'For close-up tasks like books, phones or needlework.',
  bifocal: 'Two zones: distance and reading, in one lens.',
  progressive: 'A smooth transition from distance to reading.',
};

export default function UsageStep({ product, config, onChange }) {
  const [helpOpen, setHelpOpen] = useState(false);

  const groups = getGroupsForProductType(product.product_type);
  const lensTypeGroup = groups.find((g) => g.id === 'lensType');

  if (!lensTypeGroup) {
    return (
      <View style={w.scrollBody}>
        <Text style={w.stepTitle}>Lens usage</Text>
        <Text style={w.stepSubtitle}>
          This product does not require a lens usage selection.
          Continue to customise the rest.
        </Text>
      </View>
    );
  }

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>What will you use these for?</Text>
      <Text style={w.stepSubtitle}>
        Choose the correction that matches your prescription.
        If you don't have a prescription yet, keep Plano.
      </Text>

      {lensTypeGroup.help && (
        <Pressable
          style={w.stepHelpRow}
          onPress={() => setHelpOpen(true)}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#17283A"
          />
          <Text style={w.stepHelpText}>What is lens usage?</Text>
        </Pressable>
      )}

      {lensTypeGroup.options.map((opt) => {
        const active = config.lensType === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange({ ...config, lensType: opt.id })}
            style={[w.card, active && w.cardActive]}
          >
            <View style={[w.cardIcon, active && w.cardIconActive]}>
              <Ionicons
                name={active ? 'checkmark' : 'ellipse-outline'}
                size={20}
                color={active ? '#101D2C' : '#17283A'}
              />
            </View>
            <View style={w.cardBody}>
              <Text style={w.cardTitle}>{opt.label}</Text>
              <Text style={w.cardSub}>{DESCRIPTIONS[opt.id] || ''}</Text>
            </View>
            {opt.priceDelta > 0 && (
              <Text style={w.indexPrice}>+R {opt.priceDelta}</Text>
            )}
          </Pressable>
        );
      })}

      {lensTypeGroup.help && (
        <InfoPopup
          visible={helpOpen}
          title={lensTypeGroup.help.title}
          body={lensTypeGroup.help.body}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </View>
  );
}