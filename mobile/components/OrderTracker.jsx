// mobile/components/OrderTracker.jsx
//
// Horizontal fulfillment tracker used inside the order detail modal.
// Shows the four fulfillment stages in order, from "Pending" through
// "Delivered", with the customer's current stage highlighted.
//
// Cancelled orders bypass the linear flow and render a distinct card.
//
// Props:
//   status — one of: pending | processing | shipped | delivered | cancelled
//            (matches orders.fulfillment_status from migration 006)

import React from 'react';
import { View, Text } from 'react-native';

const NAVY   = '#101D2C';
const GOLD   = '#D7B987';
const TEAL   = '#2E8D86';
const INK    = '#17283A';
const MUTED  = '#7C8792';
const BORDER = '#E7E3DC';
const WHITE  = '#FFFFFF';
const RED    = '#C0392B';

const STEPS = [
  { key: 'pending',    label: 'Pending',    blurb: 'Order received. We will start preparing it soon.' },
  { key: 'processing', label: 'Processing', blurb: 'Your order is being prepared for shipping.' },
  { key: 'shipped',    label: 'Shipped',    blurb: 'Your order is on the way.' },
  { key: 'delivered',  label: 'Delivered',  blurb: 'Your order has been delivered.' },
];

const INDEX_BY_KEY = STEPS.reduce((acc, s, i) => {
  acc[s.key] = i;
  return acc;
}, {});

export default function OrderTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <View style={card}>
        <Text style={cardTitle}>ORDER TRACKING</Text>
        <View style={cancelledBox}>
          <Text style={cancelledIcon}>×</Text>
          <View style={{ flex: 1 }}>
            <Text style={cancelledTitle}>CANCELLED</Text>
            <Text style={cancelledBlurb}>
              This order was cancelled. Contact support if you have questions.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const currentIndex = INDEX_BY_KEY[status] ?? 0;
  const current = STEPS[currentIndex];

  return (
    <View style={card}>
      <Text style={cardTitle}>ORDER TRACKING</Text>

      <View style={trackRow}>
        {STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isActive = i === currentIndex;

          return (
            <React.Fragment key={step.key}>
              <View style={stepCol}>
                <View
                  style={[
                    dot,
                    isComplete && dotComplete,
                    isActive && dotActive,
                  ]}
                >
                  {isComplete && <Text style={checkMark}>✓</Text>}
                  {isActive && <View style={activeInner} />}
                </View>
                <Text
                  style={[
                    stepLabel,
                    (isComplete || isActive) && stepLabelLit,
                  ]}
                  numberOfLines={1}
                >
                  {step.label.toUpperCase()}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={[
                    connector,
                    i < currentIndex && connectorComplete,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={blurb}>{current.blurb}</Text>
    </View>
  );
}

// ---- styles ----

const card = {
  backgroundColor: WHITE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 6,
  padding: 16,
  marginBottom: 20,
};

const cardTitle = {
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 1.4,
  color: INK,
};

const trackRow = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 14,
};

const stepCol = {
  alignItems: 'center',
  width: 48,
};

const dot = {
  width: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: WHITE,
  borderWidth: 2,
  borderColor: BORDER,
  alignItems: 'center',
  justifyContent: 'center',
};

const dotComplete = {
  backgroundColor: TEAL,
  borderColor: TEAL,
};

const dotActive = {
  backgroundColor: GOLD,
  borderColor: GOLD,
};

const checkMark = {
  color: WHITE,
  fontSize: 9,
  fontWeight: '900',
  lineHeight: 11,
};

const activeInner = {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: NAVY,
};

const stepLabel = {
  fontSize: 8,
  fontWeight: '600',
  color: MUTED,
  marginTop: 5,
  textAlign: 'center',
  letterSpacing: 0.3,
};

const stepLabelLit = {
  fontWeight: '900',
  color: INK,
};

const connector = {
  flex: 1,
  height: 2,
  backgroundColor: BORDER,
  marginTop: 7,
  marginHorizontal: 2,
};

const connectorComplete = {
  backgroundColor: TEAL,
};

const blurb = {
  fontSize: 11,
  color: MUTED,
  lineHeight: 16,
  marginTop: 12,
  textAlign: 'center',
};

const cancelledBox = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(192,57,43,0.08)',
  borderWidth: 1,
  borderColor: 'rgba(192,57,43,0.3)',
  borderRadius: 6,
  padding: 14,
  marginTop: 12,
};

const cancelledIcon = {
  color: RED,
  fontSize: 22,
  fontWeight: '900',
  marginRight: 12,
};

const cancelledTitle = {
  color: RED,
  fontSize: 13,
  fontWeight: '900',
  letterSpacing: 0.6,
};

const cancelledBlurb = {
  color: MUTED,
  fontSize: 11,
  lineHeight: 15,
  marginTop: 2,
};