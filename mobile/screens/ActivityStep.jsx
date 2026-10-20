import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACTIVITIES, applyActivitySuggestions } from '../data/lensOptions';
import { lensWizardStyles as w } from './lensWizardStyles';

// Step 1 of the Lens Wizard.
// The customer picks an activity (driving, sport, reading, etc.).
// Each activity pre-selects sensible defaults for later steps
// (see ACTIVITIES in data/lensOptions.js). The customer can always
// change every option in subsequent steps.

const ICONS = {
  everyday: 'sunny-outline',
  driving: 'car-outline',
  sport: 'fitness-outline',
  reading: 'book-outline',
  screen: 'laptop-outline',
  sun: 'sunny',
};

export default function ActivityStep({ config, onChange }) {
  const current = config.activity || 'everyday';

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>How will you use these glasses?</Text>
      <Text style={w.stepSubtitle}>
        We will pre-select sensible lens choices. Every option can be changed
        in the next steps.
      </Text>

      {ACTIVITIES.map((activity) => {
        const active = current === activity.id;
        return (
          <Pressable
            key={activity.id}
            onPress={() =>
              onChange(applyActivitySuggestions(config, activity.id))
            }
            style={[w.card, active && w.cardActive]}
          >
            <View style={[w.cardIcon, active && w.cardIconActive]}>
              <Ionicons
                name={ICONS[activity.id] || 'ellipse-outline'}
                size={20}
                color={active ? '#101D2C' : '#17283A'}
              />
            </View>
            <View style={w.cardBody}>
              <Text style={w.cardTitle}>{activity.label}</Text>
              <Text style={w.cardSub}>{activity.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}