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
import { Ionicons } from '@expo/vector-icons';
import { authStyles as a } from './authStyles';
import { requestPasswordReset, resetPassword } from '../utils/api';

const C = { navy: '#101D2C', muted: '#7C8792', teal: '#2E8D86' };

export default function ForgotPasswordScreen({ onBack }) {
  const [step, setStep] = useState(1); // 1 = Request, 2 = Reset, 3 = Success
  
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async () => {
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');

    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setStep(2); // Move to reset step
    } catch (err) {
      setError(err.message || 'Could not request reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (!token.trim()) return setError('Please enter the 6-character code.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      await resetPassword(email.trim(), token.trim(), newPassword);
      setStep(3); // Success
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={a.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={a.header}>
        <View style={a.headerRow}>
          <Pressable onPress={step === 1 ? onBack : () => setStep(1)} style={a.backBtn} hitSlop={8}>
            <Text style={a.backText}>←  {step === 1 ? 'BACK' : 'BACK'}</Text>
          </Pressable>
          <Text style={a.headerTitle}>Reset Password</Text>
          <View style={a.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={a.scroll} contentContainerStyle={a.scrollContent} keyboardShouldPersistTaps="handled">
          
          {error ? (
            <View style={a.errorBanner}>
              <Text style={a.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* STEP 1: Request Code */}
          {step === 1 && (
            <>
              <Text style={a.eyebrow}>FORGOT PASSWORD</Text>
              <Text style={a.title}>Find your account</Text>
              <Text style={a.subtitle}>
                Enter the email address associated with your account. We'll send you a 6-character code to reset your password.
              </Text>

              <View style={a.field}>
                <Text style={a.label}>EMAIL ADDRESS</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#B0B7C1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={a.input}
                  editable={!submitting}
                />
              </View>

              <Pressable
                onPress={handleRequest}
                disabled={submitting}
                style={({ pressed }) => [a.cta, pressed && a.ctaPressed, submitting && a.ctaDisabled]}
              >
                {submitting ? <ActivityIndicator color="#D7B987" /> : <Text style={a.ctaText}>SEND RESET CODE</Text>}
              </Pressable>
            </>
          )}

          {/* STEP 2: Enter Code & New Password */}
          {step === 2 && (
            <>
              <Text style={a.eyebrow}>CHECK YOUR EMAIL</Text>
              <Text style={a.title}>Enter reset code</Text>
              <Text style={a.subtitle}>
                We sent a 6-character code to {email}. Enter it below along with your new password.
              </Text>

              <View style={a.field}>
                <Text style={a.label}>RESET CODE</Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="e.g. 4A9F1B"
                  placeholderTextColor="#B0B7C1"
                  autoCapitalize="characters"
                  style={[a.input, { letterSpacing: 2, fontWeight: '800', textAlign: 'center' }]}
                  maxLength={6}
                  editable={!submitting}
                />
              </View>

              <View style={a.field}>
                <Text style={a.label}>NEW PASSWORD</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3DC', borderRadius: 6 }}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#B0B7C1"
                    secureTextEntry={!showPassword}
                    style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: '#17283A' }}
                    editable={!submitting}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={{ paddingHorizontal: 14 }}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={C.muted} />
                  </Pressable>
                </View>
              </View>

              <View style={a.field}>
                <Text style={a.label}>CONFIRM NEW PASSWORD</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor="#B0B7C1"
                  secureTextEntry={!showPassword}
                  style={a.input}
                  editable={!submitting}
                />
              </View>

              <Pressable
                onPress={handleReset}
                disabled={submitting}
                style={({ pressed }) => [a.cta, pressed && a.ctaPressed, submitting && a.ctaDisabled]}
              >
                {submitting ? <ActivityIndicator color="#D7B987" /> : <Text style={a.ctaText}>UPDATE PASSWORD</Text>}
              </Pressable>
            </>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="checkmark-circle" size={64} color={C.teal} />
              <Text style={[a.title, { marginTop: 20, textAlign: 'center' }]}>Password updated!</Text>
              <Text style={[a.subtitle, { textAlign: 'center' }]}>
                Your password has been successfully reset. You can now sign in with your new password.
              </Text>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [a.cta, { width: '100%', marginTop: 20 }, pressed && a.ctaPressed]}
              >
                <Text style={a.ctaText}>BACK TO SIGN IN</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}