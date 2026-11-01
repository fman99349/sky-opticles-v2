import React, { useState } from 'react';
import {
  ActivityIndicator,
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
};

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
  { key: 'trial_14d', label: '14-day trial' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '1y', label: '1 year' },
  { key: 'ongoing', label: 'Ongoing' },
];

const BENEFITS = [
  { icon: '🌍', title: 'Global reach', sub: 'Customers across the world' },
  { icon: '💰', title: 'Zero setup fees', sub: '14-day free trial included' },
  { icon: '📊', title: 'Full dashboard', sub: 'Track sales & orders live' },
];

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[a.chip, active && a.chipActive]}
    >
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const toggleInList = (list, setList, key) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const submit = async () => {
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter your email.');
    if (!phone.trim()) return setError('Please enter your phone number.');
    if (!whatsapp.trim()) return setError('Please enter your WhatsApp number.');
    if (!city.trim()) return setError('Please enter your city.');
    if (!province.trim()) return setError('Please enter your province.');
    if (shopTypes.length === 0) return setError('Select at least one product type.');
    if (currencies.length === 0) return setError('Select at least one currency.');

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
    } catch (e) {
      setError(e.message || 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success view ────────────────────────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={a.shell}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={a.header}>
          <View style={a.headerRow}>
            <Pressable onPress={onBack} style={a.backBtn} hitSlop={8}>
              <Text style={a.backText}>←  BACK</Text>
            </Pressable>
            <Text style={a.headerTitle}>Application</Text>
            <View style={a.headerSpacer} />
          </View>
        </View>
        <View style={a.successWrap}>
          <View style={a.successCircle}>
            <Ionicons name="checkmark" size={48} color={C.gold} />
          </View>
          <Text style={a.successTitle}>Application received</Text>
          <Text style={a.successSub}>
            Our team will review your application within 48 hours. Check your inbox at{' '}
            <Text style={{ color: C.teal, fontWeight: '700' }}>{success.email}</Text>.
          </Text>
          <View style={a.referenceBox}>
            <Text style={a.referenceLabel}>YOUR REFERENCE NUMBER</Text>
            <Text style={a.referenceCode}>{success.reference_code}</Text>
            <Text style={a.referenceHint}>Save this to check your status</Text>
          </View>
          <Pressable onPress={onBack} style={a.ctaSecondary}>
            <Text style={a.ctaSecondaryText}>RETURN TO SIGN IN</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={a.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={a.header}>
        <View style={a.headerRow}>
          <Pressable onPress={onBack} style={a.backBtn} hitSlop={8}>
            <Text style={a.backText}>←  BACK</Text>
          </Pressable>
          <Text style={a.headerTitle}>Sell on DD</Text>
          <View style={a.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={a.scroll}
          contentContainerStyle={[a.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={a.hero}>
            <Text style={a.heroEyebrow}>JOIN THE MARKETPLACE</Text>
            <Text style={a.heroTitle}>Sell on Diamond Dee</Text>
            <Text style={a.heroSub}>
              Reach thousands of customers across the continent. Apply below — we review every application personally.
            </Text>
          </View>

          {/* Benefits */}
          <View style={a.benefitsRow}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={a.benefitCard}>
                <Text style={a.benefitIcon}>{b.icon}</Text>
                <Text style={a.benefitTitle}>{b.title}</Text>
                <Text style={a.benefitSub}>{b.sub}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={a.errorBanner}>
              <Text style={a.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* About you */}
          <Text style={a.sectionLabel}>ABOUT YOU</Text>

          <View style={a.field}>
            <Text style={a.label}>FULL NAME *</Text>
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
            <Text style={a.label}>EMAIL ADDRESS *</Text>
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
              <Text style={a.label}>PHONE *</Text>
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
              <Text style={a.label}>WHATSAPP *</Text>
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
            <Text style={a.label}>BUSINESS NAME (OPTIONAL)</Text>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Leave blank if undecided"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>

          {/* Location */}
          <Text style={a.sectionLabel}>WHERE ARE YOU?</Text>

          <View style={a.field}>
            <Text style={a.label}>CITY *</Text>
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
            <Text style={a.label}>PROVINCE / STATE *</Text>
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
            <Text style={a.label}>COUNTRY *</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="South Africa"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
            />
          </View>

          {/* What you'll sell */}
          <Text style={a.sectionLabel}>WHAT WILL YOU SELL? *</Text>
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

          {/* Currencies */}
          <Text style={a.sectionLabel}>WHICH CURRENCIES? *</Text>
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

          {/* Time frame */}
          <Text style={a.sectionLabel}>HOW LONG WILL YOU SELL?</Text>
          <View style={a.chipRow}>
            {TIME_FRAMES.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                active={timeFrame === t.key}
                onPress={() => setTimeFrame(t.key)}
              />
            ))}
          </View>

          {/* Free-text */}
          <Text style={a.sectionLabel}>ANYTHING ELSE? (OPTIONAL)</Text>
          <View style={a.field}>
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

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [a.cta, pressed && a.ctaPressed, submitting && a.ctaDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={C.gold} />
            ) : (
              <Text style={a.ctaText}>SUBMIT APPLICATION</Text>
            )}
          </Pressable>

          <Text style={a.footnote}>
            We review every application within 48 hours. If approved, you'll receive an invite link to set up your shop.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}