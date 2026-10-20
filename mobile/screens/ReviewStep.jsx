import React from 'react';
import { Text, View } from 'react-native';
import {
  ACTIVITIES,
  configTotalDelta,
  getGroupsForProductType,
  isPrescriptionEmpty,
} from '../data/lensOptions';
import { price } from '../utils/product';
import { lensWizardStyles as w } from './lensWizardStyles';

// Step 6 of the Lens Wizard — the review.
// Shows every chosen option, the running lens total, and the final price.
// No editing here; the customer can go BACK to any step and change a choice.

function Row({ label, value, last }) {
  return (
    <View style={[w.reviewRow, last && w.reviewRowLast]}>
      <Text style={w.reviewLabel}>{label}</Text>
      <Text style={w.reviewValue}>{value}</Text>
    </View>
  );
}

export default function ReviewStep({ product, config }) {
  const groups = getGroupsForProductType(product.product_type);
  const activity = ACTIVITIES.find((a) => a.id === config.activity);

  const rows = [];

  // Activity
  if (activity) {
    rows.push({ label: 'Activity', value: activity.label });
  }

  // Each option group with its selected value and price delta
  for (const group of groups) {
    const selected = config[group.id];
    const option = group.options.find((o) => o.id === selected);
    if (!option) continue;
    const priceLabel =
      option.priceDelta > 0 ? ` (+R ${option.priceDelta})` : '';
    rows.push({ label: group.label, value: option.label + priceLabel });
  }

  // Prescription
  if (!isPrescriptionEmpty(config.prescription)) {
    rows.push({ label: 'Prescription', value: 'Added — see cart for details' });
  } else {
    rows.push({ label: 'Prescription', value: 'Not provided' });
  }

  const lensDelta = configTotalDelta(product.product_type, config);
  const base = Number(product.price || 0);
  const total = base + lensDelta;

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>Review your order</Text>
      <Text style={w.stepSubtitle}>
        Check everything below. Use BACK to change any choice.
      </Text>

      <View style={w.reviewCard}>
        <View style={w.reviewRow}>
          <Text style={w.reviewLabel}>Frame</Text>
          <Text style={w.reviewValue}>{product.name}</Text>
        </View>

        {rows.map((r, i) => (
          <Row
            key={`${r.label}-${i}`}
            label={r.label}
            value={r.value}
            last={false}
          />
        ))}

        <Row
          label="Lens total"
          value={lensDelta > 0 ? `+R ${lensDelta}` : 'Included'}
          last
        />
      </View>

      <View style={w.reviewCard}>
        <View style={w.reviewRow}>
          <Text style={w.reviewLabel}>Frame price</Text>
          <Text style={w.reviewValue}>{price(base)}</Text>
        </View>
        <View style={w.reviewRow}>
          <Text style={w.reviewLabel}>Lens total</Text>
          <Text style={w.reviewValue}>
            {lensDelta > 0 ? `+ ${price(lensDelta)}` : 'Included'}
          </Text>
        </View>
        <View style={w.reviewTotalRow}>
          <Text style={w.reviewTotalLabel}>TOTAL</Text>
          <Text style={w.reviewTotalValue}>{price(total)}</Text>
        </View>
      </View>
    </View>
  );
}