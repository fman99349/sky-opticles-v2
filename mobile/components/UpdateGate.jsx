import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';

const { width: W } = Dimensions.get('window');

const COUNTDOWN_SECONDS = 5;

export default function UpdateGate({ children }) {
  const [phase, setPhase] = useState('idle'); // idle | checking | downloading | countdown
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const checkInFlight = useRef(false);
  const mounted = useRef(true);

  const checkForUpdates = useCallback(async () => {
    if (!Updates.isEnabled) {
      console.log('[OTA] Updates not enabled — skipping');
      return;
    }
    if (checkInFlight.current) return;
    checkInFlight.current = true;

    try {
      setPhase('checking');
      const update = await Updates.checkForUpdateAsync();

      if (!mounted.current) return;

      if (!update.isAvailable) {
        console.log('[OTA] No update available');
        setPhase('idle');
        return;
      }

      console.log('[OTA] Update found — downloading…');
      setPhase('downloading');
      await Updates.fetchUpdateAsync();

      if (!mounted.current) return;

      console.log('[OTA] Update downloaded — starting countdown');
      // Tiny delay ensures the download is fully finalized to disk
      await new Promise((r) => setTimeout(r, 600));

      if (!mounted.current) return;
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('countdown');
    } catch (err) {
      console.warn('[OTA] Update check failed:', err?.message || err);
      setPhase('idle');
    } finally {
      checkInFlight.current = false;
    }
  }, []);

  // First mount — check immediately
  useEffect(() => {
    mounted.current = true;
    checkForUpdates();
    return () => {
      mounted.current = false;
    };
  }, [checkForUpdates]);

  // Re-check every time the app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && phase === 'idle') {
        checkForUpdates();
      }
    });
    return () => sub.remove();
  }, [phase, checkForUpdates]);

  // Countdown → reload
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      console.log('[OTA] Reloading to apply update…');
      Updates.reloadAsync().catch((err) => {
        console.error('[OTA] reloadAsync failed:', err?.message || err);
        setPhase('idle');
      });
      return;
    }

    const t = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
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
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#101D2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#101D2C',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: '#7C8792',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E7E3DC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#D7B987',
    borderRadius: 2,
  },
});