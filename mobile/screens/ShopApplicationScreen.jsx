import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { a } from './applicationStyles';
import { submitShopApplication } from '../utils/api';

const C = {
  navy: '#101D2C',
  gold: '#D7B987',
  teal: '#2E8D86',
  muted: '#7C8792',
  ink: '#17283A',
};

const STEPS = ['welcome', 'about', 'location', 'products', 'commitment', 'review', 'success'];
const FORM_STEP_COUNT = 5;

const SHOP_TYPES = [
  { key: 'optical_frame', label: 'Optical frames' },
  { key: 'sunglasses', label: 'Sunglasses' },
  { key: 'lenses', label: 'Lenses' },
  { key: 'contact_lenses', label: 'Contact lenses' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'other', label: 'Other' },
];

const CURRENCIES = [
  { key: 'ZAR', label: 'ZAR (R)' },
  { key: 'USD', label: 'USD ($)' },
  { key: 'GBP', label: 'GBP (£)' },
];

const TIME_FRAMES = [
  { key: 'trial_14d', label: '14-day free trial', sub: 'No card required' },
  { key: '3m', label: '3 months', sub: 'Best for a quick test run' },
  { key: '6m', label: '6 months', sub: 'Popular choice for growing shops' },
  { key: '1y', label: '1 year', sub: 'Best value' },
  { key: 'ongoing', label: 'Ongoing', sub: 'No fixed commitment' },
];

const BENEFITS = [
  { icon: 'globe-outline', title: 'Global reach', sub: 'Customers across the continent' },
  { icon: 'sparkles-outline', title: 'Zero setup fees', sub: 'Start with a 14-day free trial' },
  { icon: 'analytics-outline', title: 'Full dashboard', sub: 'Track orders and sales in real time' },
];

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[a.chip, active && a.chipActive]}>
      <Text style={[a.chipText, active && a.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ShopApplicationScreen({ onBack }) {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [shopTypes, setShopTypes] = useState([]);
  const [currencies, setCurrencies] = useState(['ZAR']);
  const [timeFrame, setTimeFrame] = useState('trial_14d');
  const [description, setDescription] = useState('');

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [success, setSuccess] = useState(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const toggleInList = (list, setList, key) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  function validateStep(s) {
    if (s === 1) {
      if (!fullName.trim()) return 'Please enter your full name.';
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return 'Please enter a valid email address.';
      if (!phone.trim()) return 'Please enter your phone number.';
      if (!whatsapp.trim()) return 'Please enter your WhatsApp number.';
    }
    if (s === 2) {
      if (!city.trim()) return 'Please enter your city.';
      if (!province.trim()) return 'Please enter your province.';
      if (!country.trim()) return 'Please enter your country.';
    }
    if (s === 3) {
      if (shopTypes.length === 0) return 'Select at least one product type.';
      if (currencies.length === 0) return 'Select at least one currency.';
    }
    return null;
  }

  function animateTo(newStep, direction) {
    if (transitioning) return;
    setTransitioning(true);
    Animated.parallel([
      Animated.timing(translateX, { toValue: -direction * 60, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      translateX.setValue(direction * 60);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => setTransitioning(false));
    });
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    animateTo(step + 1, 1);
  }

  function goBack() {
    setError('');
    if (step === 0) {
      onBack?.();
      return;
    }
    animateTo(step - 1, -1);
  }

  function jumpTo(stepIndex) {
    setError('');
    animateTo(stepIndex, -1);
  }

  async function submit() {
    setError('');
    if (shopTypes.length === 0) return setError('Please select at least one product type.');
    if (currencies.length === 0) return setError('Please select at least one currency.');

    setSubmitting(true);
    try {
      const res = await submitShopApplication({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        business_name: businessName.trim() || null,
        city: city.trim(),
        province: province.trim(),
        country: country.trim(),
        shop_types: shopTypes,
        currencies,
        time_frame: timeFrame,
        description: description.trim() || null,
      });
      setSuccess(res);
      setStep(6);
      checkScale.setValue(0);
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      setError(e.message || 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderStep() {
    const current = STEPS[step];

    if (current === 'welcome') {
      return (
        <View>
          <Text style={a.stepEyebrow}>Join the marketplace</Text>
          <Text style={a.stepHeading}>Sell on{'\n'}Diamond Dee</Text>
          <Text style={a.stepSub}>
            Reach thousands of customers across the continent. We personally review every application.
          </Text>

          <View style={{ marginTop: 20 }}>
            {BENEFITS.map((b, i) => (
              <View
                key={b.title}
                style={[a.benefitRow, i === BENEFITS.length - 1 && a.benefitRowLast]}
              >
                <View style={a.benefitIconWrap}>
                  <Ionicons name={b.icon} size={22} color={C.navy} />
                </View>
                <View style={a.benefitTitleWrap}>
                  <Text style={a.benefitTitle}>{b.title}</Text>
                  <Text style={a.benefitSub}>{b.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (current === 'about') {
      return (
        <View>
          <Text style={a.stepEyebrow}>Step 1 — About you</Text>
          <Text style={a.stepHeading}>Let's start{'\n'}with the basics</Text>
          <Text style={a.stepSub}>We'll use these details to contact you about your application.</Text>

          <View style={a.field}>
            <Text style={a.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
              autoCapitalize="words"
            />
          </View>

          <View style={a.field}>
            <Text style={a.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={a.twoCol}>
            <View style={[a.field, a.flex1]}>
              <Text style={a.label}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+27 ..."
                placeholderTextColor="#B0B7C1"
                style={a.input}
                editable={!submitting}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[a.field, a.flex1]}>
              <Text style={a.label}>WhatsApp</Text>
              <TextInput
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="+27 ..."
                placeholderTextColor="#B0B7C1"
                style={a.input}
                editable={!submitting}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={a.field}>
            <Text style={a.label}>Business name (optional)</Text>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Leave blank if undecided"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>
        </View>
      );
    }

    if (current === 'location') {
      return (
        <View>
          <Text style={a.stepEyebrow}>Step 2 — Location</Text>
          <Text style={a.stepHeading}>Where are{'\n'}you based?</Text>
          <Text style={a.stepSub}>Customers will see your city when they browse your shop.</Text>

          <View style={a.field}>
            <Text style={a.label}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Johannesburg"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>

          <View style={a.field}>
            <Text style={a.label}>Province / State</Text>
            <TextInput
              value={province}
              onChangeText={setProvince}
              placeholder="e.g. Gauteng"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>

          <View style={a.field}>
            <Text style={a.label}>Country</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="South Africa"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>
        </View>
      );
    }

    if (current === 'products') {
      return (
        <View>
          <Text style={a.stepEyebrow}>Step 3 — Your catalogue</Text>
          <Text style={a.stepHeading}>What will{'\n'}you sell?</Text>
          <Text style={a.stepSub}>Select all the categories that describe your shop.</Text>

          <View style={a.chipRow}>
            {SHOP_TYPES.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                active={shopTypes.includes(t.key)}
                onPress={() => toggleInList(shopTypes, setShopTypes, t.key)}
              />
            ))}
          </View>

          <Text style={a.stepEyebrow}>Currencies</Text>
          <Text style={a.stepHeading}>How do you want{'\n'}to be paid?</Text>
          <Text style={a.stepSub}>Choose the currencies customers can pay in.</Text>

          <View style={a.chipRow}>
            {CURRENCIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                active={currencies.includes(c.key)}
                onPress={() => toggleInList(currencies, setCurrencies, c.key)}
              />
            ))}
          </View>
        </View>
      );
    }

    if (current === 'commitment') {
      return (
        <View>
          <Text style={a.stepEyebrow}>Step 4 — Commitment</Text>
          <Text style={a.stepHeading}>How long{'\n'}will you sell?</Text>
          <Text style={a.stepSub}>Choose what works for you. You can change plans anytime.</Text>

          <View style={{ marginTop: 8 }}>
            {TIME_FRAMES.map((t) => {
              const active = timeFrame === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTimeFrame(t.key)}
                  style={[a.timeCard, active && a.timeCardActive]}
                >
                  <View style={[a.timeRadio, active && a.timeRadioActive]}>
                    {active && <View style={a.timeRadioDot} />}
                  </View>
                  <View style={a.timeTextWrap}>
                    <Text style={a.timeTitle}>{t.label}</Text>
                    <Text style={a.timeSub}>{t.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={[a.field, { marginTop: 20 }]}>
            <Text style={a.label}>Anything else? (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us about your business, experience, or what makes you unique…"
              placeholderTextColor="#B0B7C1"
              style={[a.input, a.textarea]}
              editable={!submitting}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>
        </View>
      );
    }

    if (current === 'review') {
      const timeframeLabel = TIME_FRAMES.find((t) => t.key === timeFrame)?.label || timeFrame;
      const shopTypeLabel = shopTypes
        .map((k) => SHOP_TYPES.find((t) => t.key === k)?.label || k)
        .join(', ');

      const rows = [
        { label: 'Name', value: fullName, editStep: 1 },
        { label: 'Email', value: email, editStep: 1 },
        { label: 'Phone', value: phone, editStep: 1 },
        { label: 'WhatsApp', value: whatsapp, editStep: 1 },
        { label: 'Business', value: businessName || '—', editStep: 1 },
        { label: 'Location', value: `${city}, ${province}, ${country}`, editStep: 2 },
        { label: 'Selling', value: shopTypeLabel, editStep: 3 },
        { label: 'Currencies', value: currencies.join(', '), editStep: 3 },
        { label: 'Time frame', value: timeframeLabel, editStep: 4 },
      ];

      return (
        <View>
          <Text style={a.stepEyebrow}>Step 5 — Review</Text>
          <Text style={a.stepHeading}>Almost there.{'\n'}Look good?</Text>
          <Text style={a.stepSub}>Review your details before submitting. Tap any row to edit.</Text>

          <View style={a.reviewCard}>
            {rows.map((r, i) => (
              <Pressable
                key={r.label}
                onPress={() => jumpTo(r.editStep)}
                style={[a.reviewRow, i === rows.length - 1 && a.reviewRowLast]}
              >
                <Text style={a.reviewLabel}>{r.label}</Text>
                <Text style={a.reviewValue} numberOfLines={2}>{r.value}</Text>
                <View style={a.reviewEditBtn}>
                  <Ionicons name="pencil" size={14} color={C.muted} />
                </View>
              </Pressable>
            ))}
          </View>

          {description ? (
            <View style={a.reviewCard}>
              <View style={[a.reviewRow, a.reviewRowLast, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[a.reviewLabel, { marginBottom: 8 }]}>Extra notes</Text>
                <Text style={a.reviewValue}>{description}</Text>
              </View>
            </View>
          ) : null}

          <Text style={a.footnote}>
            By submitting, you agree to our marketplace seller terms.
          </Text>
        </View>
      );
    }

    if (current === 'success') {
      return (
        <View style={a.successWrap}>
          <Animated.View style={[a.successIconWrap, { transform: [{ scale: checkScale }] }]}>
            <Ionicons name="checkmark" size={52} color={C.gold} />
          </Animated.View>

          <Text style={a.successTitle}>Application received</Text>
          <Text style={a.successSub}>
            Our team will review your application within 48 hours. Check your inbox at{' '}
            <Text style={{ color: C.teal, fontWeight: '700' }}>{success?.email}</Text>.
          </Text>

          <View style={a.referenceBox}>
            <Text style={a.referenceLabel}>YOUR REFERENCE NUMBER</Text>
            <Text style={a.referenceCode}>{success?.reference_code}</Text>
            <Text style={a.referenceHint}>Save this to check your status anytime</Text>
          </View>

          <Pressable onPress={onBack} style={a.ctaSecondary}>
            <Text style={a.ctaSecondaryText}>RETURN TO SIGN IN</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  }

  const showFooter = step > 0 && step < STEPS.length - 1;
  const isReviewStep = STEPS[step] === 'review';
  const isSuccess = STEPS[step] === 'success';
  const progressPercent = step === 0 ? 0 : (step / FORM_STEP_COUNT) * 100;

  return (
    <SafeAreaView style={a.shell}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      {step > 0 && !isSuccess && (
        <>
          <View style={a.header}>
            <View style={a.headerRow}>
              <Pressable onPress={goBack} style={a.backBtn} hitSlop={10}>
                <Ionicons name="arrow-back" size={22} color={C.ink} />
              </Pressable>
              <Text style={a.stepLabel}>
                Step {Math.min(step, FORM_STEP_COUNT)} of {FORM_STEP_COUNT}
              </Text>
              <View style={a.backBtnGhost} />
            </View>
          </View>
          <View style={a.progressTrack}>
            <View style={[a.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </>
      )}

      {step === 0 && (
        <View style={a.header}>
          <View style={a.headerRow}>
            <Pressable onPress={goBack} style={a.backBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color={C.ink} />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[a.content, { opacity, transform: [{ translateX }] }]}>
            {renderStep()}
            {error ? <Text style={a.errorText}>{error}</Text> : null}
          </Animated.View>
        </ScrollView>

        {(step === 0 || showFooter) && (
          <View style={[a.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
            <Pressable
              onPress={isReviewStep ? submit : goNext}
              disabled={submitting || transitioning}
              style={({ pressed }) => [
                a.primaryBtn,
                pressed && a.primaryBtnPressed,
                (submitting || transitioning) && a.primaryBtnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={C.gold} />
              ) : (
                <Text style={a.primaryBtnText}>
                  {step === 0 ? 'GET STARTED' : isReviewStep ? 'SUBMIT APPLICATION' : 'CONTINUE'}
                </Text>
              )}
            </Pressable>
            {step === 0 && (
              <Text style={a.footnote}>
                Takes about 3 minutes · All information is kept confidential
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}