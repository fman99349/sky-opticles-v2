import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';

const { width: W } = Dimensions.get('window');
const COUNTDOWN_SECONDS = 5;
const MOUNT_DELAY = 4000;      // wait 4s after mount before checking
const RELOAD_GRACE = 800;      // wait 800ms after countdown hits 0

export default function UpdateGate({ children }) {
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const mounted = useRef(true);
  const checkInFlight = useRef(false);
  const mountTime = useRef(Date.now());
  const lastReloadAttempt = useRef(0);

  const checkForUpdates = useCallback(async () => {
    if (!mounted.current || checkInFlight.current) return;
    checkInFlight.current = true;

    try {
      if (!Updates.isEnabled) {
        setPhase('idle');
        return;
      }

      setPhase('checking');
      const update = await Updates.checkForUpdateAsync();

      if (!mounted.current) return;

      if (!update.isAvailable) {
        setPhase('idle');
        return;
      }

      setPhase('downloading');
      await Updates.fetchUpdateAsync();

      if (!mounted.current) return;

      // Give the intro/screen time to settle before showing the overlay
      const elapsed = Date.now() - mountTime.current;
      if (elapsed < MOUNT_DELAY + 5000) {
        await new Promise((r) => setTimeout(r, MOUNT_DELAY + 5000 - elapsed));
      }

      if (!mounted.current) return;
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('countdown');
    } catch (err) {
      console.warn('[OTA] check failed:', err?.message);
      setPhase('idle');
    } finally {
      checkInFlight.current = false;
    }
  }, []);

  // Delay the first check so the intro renders cleanly
  useEffect(() => {
    mounted.current = true;
    const t = setTimeout(() => checkForUpdates(), MOUNT_DELAY);
    return () => {
      mounted.current = false;
      clearTimeout(t);
    };
  }, [checkForUpdates]);

  // Countdown → deferred reload via InteractionManager
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      // Debounce: don't retry reload more than once per 5s
      const sinceLast = Date.now() - lastReloadAttempt.current;
      if (sinceLast < 5000) return;
      lastReloadAttempt.current = Date.now();

      // 🎯 CRITICAL: wait for React to be idle before reloading
      InteractionManager.runAfterInteractions(() => {
        if (!mounted.current) return;
        setTimeout(() => {
          Updates.reloadAsync().catch((err) => {
            console.error('[OTA] reloadAsync failed:', err?.message);
            // Fallback: dismiss overlay so the app keeps working
            if (mounted.current) setPhase('idle');
          });
        }, RELOAD_GRACE);
      });
      return;
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  return (
    <>
      {children}

      {phase === 'countdown' && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <ActivityIndicator size="small" color="#D7B987" />
            </View>
            <Text style={styles.title}>Updating Diamond Dee</Text>
            <Text style={styles.sub}>
              A new version is ready. Restarting in {countdown}s to apply new features.
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%`,
                  },
                ]}
              />
            </View>
            <Pressable
              onPress={() => Updates.reloadAsync().catch(() => {})}
              style={styles.skipBtn}
              hitSlop={10}
            >
              <Text style={styles.skipBtnText}>Restart now</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(16,29,44,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
    paddingHorizontal: 32,
  },
  card: {
    width: Math.min(W - 64, 320),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#101D2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18, fontWeight: '900', color: '#101D2C',
    textAlign: 'center', letterSpacing: -0.3, marginBottom: 8,
  },
  sub: {
    fontSize: 13, color: '#7C8792', textAlign: 'center',
    lineHeight: 19, marginBottom: 20,
  },
  barTrack: {
    width: '100%', height: 4, backgroundColor: '#E7E3DC',
    borderRadius: 2, overflow: 'hidden', marginBottom: 16,
  },
  barFill: { height: '100%', backgroundColor: '#D7B987', borderRadius: 2 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  skipBtnText: { fontSize: 11, fontWeight: '800', color: '#7C8792', letterSpacing: 0.5 },
});