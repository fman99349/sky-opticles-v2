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
import { authStyles as a } from './authStyles';
import { useAuth } from '../auth/AuthContext';

const C = { navy: '#101D2C' };

export default function SignInScreen({ onBack, onGoToSignUp }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');

    if (!email.trim()) return setError('Please enter your email address.');
    if (!password) return setError('Please enter your password.');

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
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
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#B0B7C1"
              secureTextEntry
              style={a.input}
              editable={!submitting}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
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