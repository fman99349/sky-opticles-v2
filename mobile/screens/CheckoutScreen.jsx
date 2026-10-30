import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { useCurrency } from '../utils/CurrencyContext';
import { createOrder, listMyAddresses } from '../utils/api';
import { configSummary, configTotalDelta } from '../data/lensOptions';
import { price } from '../utils/product';
import { checkoutStyles as s } from './checkoutStyles';


const C = { navy: '#101D2C', gold: '#D7B987' };

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function isNonEmpty(value, max) {
  const t = String(value || '').trim();
  return t.length > 0 && t.length <= max;
}


function formatDeliveryDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}








function SignInPrompt({ onBack, onSignIn }) {
  return (
    <SafeAreaView style={s.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={s.headerBack}>←  BACK</Text>
          </Pressable>
        </View>
        <Text style={s.headerTitle}>Checkout</Text>
        <Text style={s.headerSub}>Sign in to continue</Text>
      </View>
      <View style={s.successShell}>
        <View style={s.successIconWrap}>
          <Ionicons name="lock-closed-outline" size={32} color="#2E8D86" />
        </View>
        <Text style={s.successTitle}>Sign in to check out</Text>
        <Text style={s.successSubtitle}>Your cart is saved. Sign in or create an account to place your order and track its progress.</Text>
        <View style={s.successActions}>
          <Pressable onPress={onSignIn} style={s.successPrimaryBtn}><Text style={s.successPrimaryBtnText}>SIGN IN OR CREATE ACCOUNT</Text></Pressable>
          <Pressable onPress={onBack} style={s.successSecondaryBtn}><Text style={s.successSecondaryBtnText}>BACK TO CART</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SuccessScreen({ order, onContinue, onViewOrders }) {
  const deliveryDate = formatDeliveryDate(order.estimated_delivery_date);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F5EF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F5EF" />
      
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
        
        {/* Animated/Static Check Icon */}
        <View style={{ 
          width: 100, 
          height: 100, 
          borderRadius: 50, 
          backgroundColor: 'rgba(46, 141, 134, 0.1)', 
          justifyContent: 'center', 
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Ionicons name="checkmark" size={56} color="#2E8D86" />
        </View>

        {/* Header Text */}
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#101D2C', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 }}>
          Order Confirmed!
        </Text>
        <Text style={{ fontSize: 14, color: '#7C8792', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 }}>
          Thank you for your purchase. We've sent a confirmation email with your receipt and tracking details.
        </Text>

        {/* Receipt Card */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: 16, 
          padding: 24, 
          width: '100%', 
          marginBottom: 32,
          borderWidth: 1,
          borderColor: '#E7E3DC',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#7C8792', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Number</Text>
            <Text style={{ fontSize: 15, color: '#101D2C', fontWeight: '900' }}>{order.order_number}</Text>
          </View>
          
          <View style={{ height: 1, backgroundColor: '#F0EBE3', marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#7C8792', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Paid</Text>
            <Text style={{ fontSize: 16, color: '#101D2C', fontWeight: '900' }}>
              {order.currency === 'ZAR' ? 'R' : order.currency === 'USD' ? '$' : '£'} {Number(order.total).toFixed(2)}
            </Text>
          </View>

        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', marginTop: 'auto', marginBottom: 20 }}>
          <Pressable 
            onPress={onViewOrders} 
            style={({ pressed }) => ({
              backgroundColor: '#101D2C',
              width: '100%', 
              paddingVertical: 18, 
              borderRadius: 8, 
              alignItems: 'center', 
              marginBottom: 12,
              opacity: pressed ? 0.85 : 1
            })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>TRACK MY ORDER</Text>
          </Pressable>
          
          <Pressable 
            onPress={onContinue} 
            style={({ pressed }) => ({
              backgroundColor: 'transparent', 
              width: '100%', 
              paddingVertical: 16, 
              borderRadius: 8, 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#D7B987',
              opacity: pressed ? 0.7 : 1
            })}
          >
            <Text style={{ color: '#101D2C', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>CONTINUE SHOPPING</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

export default function CheckoutScreen({ onBack, onSignIn, onComplete }) {
  const { user, token } = useAuth();
  const { items, total, clear } = useCart();
  const { currency } = useCurrency(); // <-- GET CURRENCY HERE

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'South Africa',
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (!token) return;
    listMyAddresses(token).then((r) => setSavedAddresses(r.data || [])).catch(() => {});
  }, [token]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: null }));
    setSelectedAddressId(null);
  };

  const selectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setForm({
      name: addr.recipient_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      postalCode: addr.postal_code,
      province: addr.province,
      country: addr.country || 'South Africa',
    });
    setFieldErrors({});
  };

  if (placedOrder) {
    return <SuccessScreen order={placedOrder} onContinue={() => onComplete?.({ action: 'shop' })} onViewOrders={() => onComplete?.({ action: 'orders' })} />;
  }

  if (!user || !token) return <SignInPrompt onBack={onBack} onSignIn={onSignIn} />;

  if (items.length === 0) {
    return (
      <SafeAreaView style={s.shell}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.header}><View style={s.headerRow}><Pressable onPress={onBack} hitSlop={8}><Text style={s.headerBack}>←  BACK</Text></Pressable></View><Text style={s.headerTitle}>Checkout</Text></View>
        <View style={s.successShell}>
          <Text style={s.successTitle}>Your cart is empty</Text>
          <Text style={s.successSubtitle}>Add something from the shop before checking out.</Text>
          <View style={s.successActions}><Pressable onPress={() => onComplete?.({ action: 'shop' })} style={s.successPrimaryBtn}><Text style={s.successPrimaryBtnText}>OPEN SHOP</Text></Pressable></View>
        </View>
      </SafeAreaView>
    );
  }

  const validate = () => {
    const errors = {};
    if (!isNonEmpty(form.name, 120)) errors.name = 'Full name is required.';
    if (!isValidPhone(form.phone)) errors.phone = 'Enter a valid phone number.';
    if (!isNonEmpty(form.line1, 200)) errors.line1 = 'Street address is required.';
    if (form.line2 && form.line2.length > 200) errors.line2 = 'Too long.';
    if (!isNonEmpty(form.city, 100)) errors.city = 'City is required.';
    if (!isNonEmpty(form.postalCode, 20)) errors.postalCode = 'Postal code is required.';
    if (!isNonEmpty(form.province, 100)) errors.province = 'Province is required.';
    if (!isNonEmpty(form.country, 80)) errors.country = 'Country is required.';
    return errors;
  };

  const placeOrder = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors); setSubmitError('Please fix the highlighted fields.'); return;
    }

    setFieldErrors({}); setSubmitError(''); setSubmitting(true);

    try {
      const payload = {
        currency: currency, // <-- SENDING CURRENCY TO BACKEND
        customer: { name: form.name.trim(), phone: form.phone.trim() },
        shipping: {
          line1: form.line1.trim(),
          line2: form.line2.trim() || null,
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          province: form.province.trim(),
          country: form.country.trim(),
        },
        items: items.map((it) => ({
          productId: Number(it.product.id),
          quantity: it.quantity,
          variantId: it.config.variantId || null,
          config: it.config,
        })),
      };

      const result = await createOrder(token, payload);
      clear(); setPlacedOrder(result.data);
    } catch (err) {
      setSubmitError(err.message || 'Could not place your order. Please try again.');
    } finally { setSubmitting(false); }
  };

  const displaySubtotal = items.reduce((sum, it) => {
    const base = Number(it.product.price || 0);
    const delta = configTotalDelta(it.product.product_type, it.config);
    return sum + (base + delta) * it.quantity;
  }, 0);

  return (
    <SafeAreaView style={s.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={onBack} hitSlop={8}><Text style={s.headerBack}>←  BACK TO CART</Text></Pressable>
        </View>
        <Text style={s.headerTitle}>Checkout</Text>
        <Text style={s.headerSub}>{items.length} item{items.length === 1 ? '' : 's'} · {price(displaySubtotal, currency)}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollBody} keyboardShouldPersistTaps="handled">
          {submitError ? <View style={s.errorBanner}><Text style={s.errorText}>{submitError}</Text></View> : null}

          {savedAddresses.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={s.sectionTitle}>SAVED ADDRESSES</Text>
              <Text style={s.sectionHint}>Tap one to auto-fill the form below.</Text>
              {savedAddresses.map((addr) => (
                <Pressable key={addr.id} onPress={() => selectAddress(addr)} style={{ backgroundColor: selectedAddressId === addr.id ? '#F1F9F8' : '#FFFFFF', borderWidth: 1, borderColor: selectedAddressId === addr.id ? '#2E8D86' : '#E7E3DC', borderRadius: 6, padding: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#17283A', marginBottom: 2 }}>{addr.label || 'Address'} {addr.is_default && <Text style={{ color: '#2E8D86', fontSize: 10 }}> (Default)</Text>}</Text>
                  <Text style={{ fontSize: 11, color: '#7C8792', lineHeight: 16 }}>{addr.recipient_name} · {addr.line1}, {addr.city}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={s.sectionTitle}>CONTACT</Text>
          <Text style={s.sectionHint}>Signed in as {user.email}. We will use these details to reach you about this order.</Text>

          <Text style={s.label}>FULL NAME</Text>
          <TextInput value={form.name} onChangeText={(v) => update('name', v)} placeholder="Your full name" style={[s.input, fieldErrors.name && s.inputError]} editable={!submitting} />
          {fieldErrors.name && <Text style={s.fieldError}>{fieldErrors.name}</Text>}

          <Text style={s.label}>PHONE NUMBER</Text>
          <TextInput value={form.phone} onChangeText={(v) => update('phone', v)} placeholder="+27 82 123 4567" keyboardType="phone-pad" style={[s.input, fieldErrors.phone && s.inputError]} editable={!submitting} />
          {fieldErrors.phone && <Text style={s.fieldError}>{fieldErrors.phone}</Text>}

          <Text style={[s.sectionTitle, { marginTop: 28 }]}>SHIPPING ADDRESS</Text>
          <Text style={s.sectionHint}>Where should we deliver your order?</Text>

          <Text style={s.label}>STREET ADDRESS</Text>
          <TextInput value={form.line1} onChangeText={(v) => update('line1', v)} placeholder="1 Example Street" style={[s.input, fieldErrors.line1 && s.inputError]} editable={!submitting} />
          {fieldErrors.line1 && <Text style={s.fieldError}>{fieldErrors.line1}</Text>}

          <Text style={s.label}>APARTMENT / UNIT (OPTIONAL)</Text>
          <TextInput value={form.line2} onChangeText={(v) => update('line2', v)} placeholder="Unit 5" style={[s.input, fieldErrors.line2 && s.inputError]} editable={!submitting} />

          <View style={s.rowTwo}>
            <View style={s.colHalf}>
              <Text style={s.label}>CITY</Text>
              <TextInput value={form.city} onChangeText={(v) => update('city', v)} placeholder="Cape Town" style={[s.input, fieldErrors.city && s.inputError]} editable={!submitting} />
              {fieldErrors.city && <Text style={s.fieldError}>{fieldErrors.city}</Text>}
            </View>
            <View style={s.colHalf}>
              <Text style={s.label}>POSTAL CODE</Text>
              <TextInput value={form.postalCode} onChangeText={(v) => update('postalCode', v)} placeholder="8001" keyboardType="numbers-and-punctuation" style={[s.input, fieldErrors.postalCode && s.inputError]} editable={!submitting} />
              {fieldErrors.postalCode && <Text style={s.fieldError}>{fieldErrors.postalCode}</Text>}
            </View>
          </View>

          <View style={s.rowTwo}>
            <View style={s.colHalf}>
              <Text style={s.label}>PROVINCE</Text>
              <TextInput value={form.province} onChangeText={(v) => update('province', v)} placeholder="Western Cape" style={[s.input, fieldErrors.province && s.inputError]} editable={!submitting} />
              {fieldErrors.province && <Text style={s.fieldError}>{fieldErrors.province}</Text>}
            </View>
            <View style={s.colHalf}>
              <Text style={s.label}>COUNTRY</Text>
              <TextInput value={form.country} onChangeText={(v) => update('country', v)} placeholder="South Africa" style={[s.input, fieldErrors.country && s.inputError]} editable={!submitting} />
              {fieldErrors.country && <Text style={s.fieldError}>{fieldErrors.country}</Text>}
            </View>
          </View>

          <Text style={[s.sectionTitle, { marginTop: 28 }]}>YOUR ITEMS</Text>
          <View style={s.itemsCard}>
            {items.map((it, i) => {
              const base = Number(it.product.price || 0);
              const delta = configTotalDelta(it.product.product_type, it.config);
              const unit = base + delta;
              const lineTotal = unit * it.quantity;
              const summary = configSummary(it.product.product_type, it.config);

              return (
                <View key={it.key} style={[s.itemRow, i === items.length - 1 && s.itemRowLast]}>
                  <View style={s.itemMain}>
                    <Text style={s.itemName} numberOfLines={2}>{it.product.name}</Text>
                    {summary.length > 0 && <Text style={s.itemMeta} numberOfLines={2}>{summary.join(' · ')}</Text>}
                    {it.config.prescription?.uploadId && <Text style={s.itemMeta}>Prescription attached</Text>}
                    <Text style={s.itemQty}>{price(unit, currency)} × {it.quantity}</Text>
                  </View>
                  <Text style={s.itemTotal}>{price(lineTotal, currency)}</Text>
                </View>
              );
            })}
          </View>

          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Subtotal</Text>
              <Text style={s.summaryRowValue}>{price(displaySubtotal, currency)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Shipping</Text>
              <Text style={s.summaryRowValue}>Free</Text>
            </View>
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>TOTAL</Text>
              <Text style={s.summaryTotalValue}>{price(displaySubtotal, currency)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <Pressable onPress={placeOrder} disabled={submitting} style={[s.placeOrderBtn, submitting && s.placeOrderBtnDisabled]}>
          {submitting ? <ActivityIndicator color="#D7B987" /> : <Text style={s.placeOrderBtnText}>PLACE ORDER</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}