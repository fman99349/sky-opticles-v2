import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authStyles as a } from '../screens/authStyles';

export default function AddressModal({ visible, initialData, onClose, onSave }) {
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState(() => ({
    label: initialData?.label || '',
    recipientName: initialData?.recipient_name || '',
    phone: initialData?.phone || '',
    line1: initialData?.line1 || '',
    line2: initialData?.line2 || '',
    city: initialData?.city || '',
    postalCode: initialData?.postal_code || '',
    province: initialData?.province || '',
    country: initialData?.country || 'South Africa',
    isDefault: initialData?.is_default || false,
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const submit = async () => {
    setError('');
    if (!form.recipientName.trim()) return setError('Name is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');
    if (!form.line1.trim()) return setError('Street address is required.');
    if (!form.city.trim()) return setError('City is required.');
    if (!form.postalCode.trim()) return setError('Postal code is required.');
    if (!form.province.trim()) return setError('Province is required.');

    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F5EF' }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E7E3DC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#17283A' }}>
              {isEdit ? 'Edit Address' : 'New Address'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C8792' }}>CANCEL</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {error ? (
              <View style={a.errorBanner}><Text style={a.errorText}>{error}</Text></View>
            ) : null}

            <View style={a.field}>
              <Text style={a.label}>LABEL (OPTIONAL)</Text>
              <TextInput style={a.input} value={form.label} onChangeText={(v) => update('label', v)} placeholder="e.g. Home, Work" />
            </View>

            <View style={a.field}>
              <Text style={a.label}>FULL NAME</Text>
              <TextInput style={a.input} value={form.recipientName} onChangeText={(v) => update('recipientName', v)} />
            </View>

            <View style={a.field}>
              <Text style={a.label}>PHONE NUMBER</Text>
              <TextInput style={a.input} value={form.phone} onChangeText={(v) => update('phone', v)} keyboardType="phone-pad" />
            </View>

            <View style={a.field}>
              <Text style={a.label}>STREET ADDRESS</Text>
              <TextInput style={a.input} value={form.line1} onChangeText={(v) => update('line1', v)} />
            </View>

            <View style={a.field}>
              <Text style={a.label}>APARTMENT, SUITE, ETC. (OPTIONAL)</Text>
              <TextInput style={a.input} value={form.line2} onChangeText={(v) => update('line2', v)} />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[a.field, { flex: 1 }]}>
                <Text style={a.label}>CITY</Text>
                <TextInput style={a.input} value={form.city} onChangeText={(v) => update('city', v)} />
              </View>
              <View style={[a.field, { flex: 1 }]}>
                <Text style={a.label}>POSTAL CODE</Text>
                <TextInput style={a.input} value={form.postalCode} onChangeText={(v) => update('postalCode', v)} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[a.field, { flex: 1 }]}>
                <Text style={a.label}>PROVINCE</Text>
                <TextInput style={a.input} value={form.province} onChangeText={(v) => update('province', v)} />
              </View>
              <View style={[a.field, { flex: 1 }]}>
                <Text style={a.label}>COUNTRY</Text>
                <TextInput style={a.input} value={form.country} onChangeText={(v) => update('country', v)} />
              </View>
            </View>

            <Pressable onPress={() => update('isDefault', !form.isDefault)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: '#E7E3DC', borderRadius: 4, backgroundColor: form.isDefault ? '#D7B987' : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                {form.isDefault && <Text style={{ color: '#101D2C', fontSize: 12, fontWeight: '900' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 13, color: '#17283A', fontWeight: '600' }}>Set as default address</Text>
            </Pressable>

            <Pressable
              onPress={submit}
              disabled={saving}
              style={({ pressed }) => [a.cta, pressed && a.ctaPressed, saving && a.ctaDisabled, { marginTop: 24 }]}
            >
              {saving ? <ActivityIndicator color="#D7B987" /> : <Text style={a.ctaText}>SAVE ADDRESS</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}