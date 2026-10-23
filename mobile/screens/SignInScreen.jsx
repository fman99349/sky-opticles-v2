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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStyles as a } from './authStyles';
import { useAuth } from '../auth/AuthContext';

const C = { navy: '#101D2C', muted: '#7C8792' };

// Key used to store the last successful login
const LAST_LOGIN_KEY = 'sky_last_login';

export default function SignInScreen({ onBack, onGoToSignUp, onForgotPassword }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Load saved credentials on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_LOGIN_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setEmail(parsed.email || '');
          setPassword(parsed.password || '');
        }
      } catch (e) {
        // Ignore storage read errors
      }
    };
    loadSaved();
  }, []);

  const submit = async () => {
    setError('');

    if (!email.trim()) return setError('Please enter your email address.');
    if (!password) return setError('Please enter your password.');

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      
      // 2. Save credentials on successful login
      // Note: For production, consider removing the password from this save.
      await AsyncStorage.setItem(
        LAST_LOGIN_KEY, 
        JSON.stringify({ email: email.trim(), password })
      );

      // App.js detects the auth state change and routes to the dashboard.
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.');
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
          <Text style={a.headerTitle}>Sign in</Text>
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
          <Text style={a.eyebrow}>WELCOME BACK</Text>
          <Text style={a.title}>Sign in to your account</Text>
          <Text style={a.subtitle}>
            Access your cart, orders, and saved details.
          </Text>

          {error ? (
            <View style={a.errorBanner}>
              <Text style={a.errorText}>{error}</Text>
            </View>
          ) : null}

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
            {/* Custom wrapper for the password field to hold the eye icon */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E7E3DC',
              borderRadius: 6,
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#B0B7C1"
                secureTextEntry={!showPassword}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  fontSize: 14,
                  color: '#17283A',
                }}
                editable={!submitting}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={{ paddingHorizontal: 14 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={C.muted}
                />
              </Pressable>
            </View>
          </View>
                    <Pressable onPress={onForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: C.teal, fontWeight: '700' }}>Forgot password?</Text>
          </Pressable>

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
              <Text style={a.ctaText}>SIGN IN</Text>
            )}
          </Pressable>

          <Pressable style={a.crossLink} onPress={onGoToSignUp}>
            <Text style={a.crossLinkText}>
              New here?{' '}
              <Text style={a.crossLinkAccent}>Create an account</Text>
            </Text>
          </Pressable>

          <Text style={a.footnote}>
            Your account is used to identify you at checkout. You can browse
            and build a cart without signing in.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}