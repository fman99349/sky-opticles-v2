import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { lensWizardStyles as w } from './lensWizardStyles';
import {
  defaultConfigForProductType,
  configTotalDelta,
} from '../data/lensOptions';
import { price } from '../utils/product';
import ActivityStep from './ActivityStep';
import UsageStep from './UsageStep';
import PrescriptionStep from './PrescriptionStep';
import TypeIndexStep from './TypeIndexStep';
import UpgradesStep from './UpgradesStep';
import ReviewStep from './ReviewStep';
import WizardPreview from '../components/WizardPreview';
import { fetchLensOptions } from '../utils/api';
// The Lens Wizard is a guided, 6-step flow that replaces the single-screen
// LensConfigurator for signed-in customers. Structure mirrors Lensmart:
//
//   Step 1 — Activity         (everyday / driving / sport / reading / ...)
//   Step 2 — Usage            (single vision / progressive / reading / ...)
//   Step 3 — Prescription     (SPH / CYL / Axis / PD per eye — or skip)
//   Step 4 — Type & Index     (material, thickness, progressive style)
//   Step 5 — Upgrades         (tint, coating, polarization)
//   Step 6 — Review           (summary + total + add to cart)
//
// This file (stage 6b) contains the OUTER SHELL only. Each step's content
// is a placeholder, replaced one by one in stages 6c–6e. The wizard is not
// visible in the app until stage 6f wires it into the detail screen.

const C = {
  navy: '#101D2C',
  gold: '#D7B987',
};

const STEPS = [
  { id: 'activity',     label: 'Activity' },
  { id: 'usage',        label: 'Usage' },
  { id: 'prescription', label: 'Prescription' },
  { id: 'typeIndex',    label: 'Type & Index' },
  { id: 'upgrades',     label: 'Upgrades' },
  { id: 'review',       label: 'Review' },
];

export default function LensWizard({
  product,
  onClose,
  onComplete,
  initialConfig,
  previewImage,
}) {
  const [stepIndex, setStepIndex] = useState(0);
    const [config, setConfig] = useState(() => ({
    ...defaultConfigForProductType(product.product_type),
    ...(initialConfig || {}),
  }));


  const [liveGroups, setLiveGroups] = useState(null);

  useEffect(() => {
    fetchLensOptions()
      .then((data) => setLiveGroups(data))
      .catch(() => {
        // If offline, it will fall back to the hardcoded lensOptions.js
      });
  }, []);




  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const progress = (stepIndex + 1) / STEPS.length;

  const delta = configTotalDelta(product.product_type, config);
  const basePrice = Number(product.price || 0);
  const runningTotal = basePrice + delta;

  const goBack = () => {
    if (isFirst) return onClose();
    setStepIndex((i) => i - 1);
  };

  const goNext = () => {
    if (isLast) return onComplete(config);
    setStepIndex((i) => i + 1);
  };


















   const renderStep = () => {
    if (step.id === 'activity') {
      return <ActivityStep config={config} onChange={setConfig} />;
    }
    if (step.id === 'usage') {
      return (
        <UsageStep
          product={product}
          config={config}
          onChange={setConfig}
        />
      );
    }
    if (step.id === 'prescription') {
      return <PrescriptionStep config={config} onChange={setConfig} />;
    }
    if (step.id === 'typeIndex') {
      return (
        <TypeIndexStep
          product={product}
          config={config}
          onChange={setConfig}
        />
      );
    }
    if (step.id === 'upgrades') {
      return (
        <UpgradesStep
          product={product}
          config={config}
          onChange={setConfig}
        />
      );
    }
    if (step.id === 'review') {
      return <ReviewStep product={product} config={config} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={w.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header: cancel/back, step counter, progress bar */}
      <View style={w.header}>
        <View style={w.headerRow}>
          <Pressable onPress={goBack} hitSlop={8}>
            <Text style={w.headerBack}>
              {isFirst ? '←  CANCEL' : '←  BACK'}
            </Text>
          </Pressable>
          <Text style={w.headerStep}>
            STEP {stepIndex + 1} OF {STEPS.length}
          </Text>
        </View>

        <View style={w.progressTrack}>
          <View style={[w.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Body: current step, scrollable */}
            <ScrollView style={w.body} contentContainerStyle={{ paddingBottom: 20 }}>
        {previewImage && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <WizardPreview
              imageUrl={previewImage.image_url}
              lensLayerUrl={previewImage.lens_layer_url}
              productType={product.product_type}
              config={config}
            />
          </View>
        )}
        {renderStep()}
      </ScrollView>

      {/* Footer: sticky CTA */}
      <View style={w.footer}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            w.continueBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={w.continueBtnText}>
            {isLast ? 'ADD TO CART' : 'CONTINUE'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}