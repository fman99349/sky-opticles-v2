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
import { Feather } from '@expo/vector-icons';
import { authStyles as a } from './authStyles';
import { useAuth } from '../auth/AuthContext';

const C = { navy: '#101D2C' };
const PASSWORD_MIN = 8;

export default function SignUpScreen({ onBack, onGoToSignIn }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  // New state for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');

    if (!name.trim()) return setError('Please enter your name.');
    if (name.trim().length > 120) return setError('Name is too long.');
    if (!email.trim()) return setError('Please enter your email address.');
    if (password.length < PASSWORD_MIN) {
      return setError(`Password must be at least ${PASSWORD_MIN} characters.`);
    }
    if (password.length > 72) {
      return setError('Password must be 72 characters or fewer.');
    }
    if (password !== confirm) {
      return setError('The two passwords do not match.');
    }

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // App.js detects the auth state change and routes to the dashboard.
    } catch (err) {
      setError(
        err.message || 'Could not create your account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={a.shell}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={a.header}>
        <View style={a.headerRow}>
          <Pressable onPress={onBack} style={a.backBtn} hitSlop={8}>
            <Text style={a.backText}>←  BACK</Text>
          </Pressable>
          <Text style={a.headerTitle}>Create account</Text>
          <View style={a.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={a.scroll}
          contentContainerStyle={a.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={a.eyebrow}>JOIN DIAMOND DEE</Text>
          <Text style={a.title}>Create your account</Text>
          <Text style={a.subtitle}>
            Save your details for a faster checkout and to track your orders.
          </Text>

          {error ? (
            <View style={a.errorBanner}>
              <Text style={a.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={a.field}>
            <Text style={a.label}>FULL NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#B0B7C1"
              style={a.input}
              editable={!submitting}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

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
              returnKeyType="next"
            />
          </View>

          <View style={a.field}>
            <Text style={a.label}>PASSWORD</Text>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              borderWidth: 1, 
              borderColor: '#E7E3DC', 
              borderRadius: 6, 
              backgroundColor: '#FFFFFF', 
              marginBottom: 8 
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={`At least ${PASSWORD_MIN} characters`}
                placeholderTextColor="#B0B7C1"
                secureTextEntry={!showPassword}
                style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#17283A' }}
                editable={!submitting}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }} hitSlop={8}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#7C8792" />
              </Pressable>
            </View>
            <Text style={a.fieldHint}>
              Use at least {PASSWORD_MIN} characters.
            </Text>
          </View>

          <View style={a.field}>
            <Text style={a.label}>CONFIRM PASSWORD</Text>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              borderWidth: 1, 
              borderColor: '#E7E3DC', 
              borderRadius: 6, 
              backgroundColor: '#FFFFFF', 
              marginBottom: 8 
            }}>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your password"
                placeholderTextColor="#B0B7C1"
                secureTextEntry={!showConfirmPassword}
                style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#17283A' }}
                editable={!submitting}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 10 }} hitSlop={8}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#7C8792" />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [
              a.cta,
              pressed && a.ctaPressed,
              submitting && a.ctaDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#D7B987" />
            ) : (
              <Text style={a.ctaText}>CREATE ACCOUNT</Text>
            )}
          </Pressable>

          <Pressable style={a.crossLink} onPress={onGoToSignIn}>
            <Text style={a.crossLinkText}>
              Already have an account?{' '}
              <Text style={a.crossLinkAccent}>Sign in</Text>
            </Text>
          </Pressable>

          <Text style={a.footnote}>
            By creating an account, you agree to be contacted about your orders
            only. No marketing without your consent.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}