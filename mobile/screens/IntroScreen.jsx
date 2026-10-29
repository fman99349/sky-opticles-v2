import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Image, Pressable,
  SafeAreaView, StatusBar, StyleSheet, Text, View,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════════════
//  TUNING — change these to adjust the intro
// ════════════════════════════════════════════════════════════════════
const TOTAL_DURATION   = 15000;   // auto-advance after 15 seconds
const SKIP_AFTER       = 2500;    // SKIP button appears at 2.5s
const TYPE_START_DELAY = 1000;    // typing starts at 1s
const TYPE_SPEED_MS    = 120;     // milliseconds per character
const SUBTITLE_DELAY   = 300;     // delay after typing finishes
const LOGO_ENTRANCE_MS = 700;

const C = {
  navy:      '#101D2C',
  navyLight: '#1D3044',
  gold:      '#D7B987',
  white:     '#FFFFFF',
  muted:     'rgba(255,255,255,0.65)',
};

const FULL_TEXT = 'DIAMOND DEE';
const SUBTITLE  = 'A shoping place for everything you love';

// Require the app logo. If this path is wrong Metro will fail to bundle —
// verify the file exists before saving this file.
const LOGO = require('../assets/V-IMAGE.jpg');

// Floating shopping emoji that drift upward throughout the intro.
const FLOATERS = [
  { icon: '🛍️', xFrac: 0.10, delayMs:    0, durationMs:  9000, size: 26 },
  { icon: '🛒', xFrac: 0.82, delayMs:  800, durationMs: 11000, size: 30 },
  { icon: '👓', xFrac: 0.22, delayMs: 1600, durationMs: 10000, size: 24 },
  { icon: '🏷️', xFrac: 0.72, delayMs: 2200, durationMs: 12000, size: 20 },
  { icon: '💎', xFrac: 0.45, delayMs: 3200, durationMs:  9500, size: 20 },
  { icon: '📦', xFrac: 0.60, delayMs: 4200, durationMs: 13000, size: 22 },
  { icon: '⌚', xFrac: 0.88, delayMs: 5200, durationMs: 11000, size: 20 },
  { icon: '👟', xFrac: 0.15, delayMs: 6000, durationMs: 14000, size: 22 },
];

export default function IntroScreen({ onDone }) {
  const [typedText, setTypedText]     = useState('');
  const [typingDone, setTypingDone]   = useState(false);
  const [showCursor, setShowCursor]   = useState(true);
  const [dotIndex, setDotIndex]       = useState(0);
  const [showDots, setShowDots]       = useState(false);
  const [showSkip, setShowSkip]       = useState(false);

  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.7)).current;
  const logoBreath   = useRef(new Animated.Value(1)).current;
  const subtitleOp   = useRef(new Animated.Value(0)).current;
  const floaterAnims = useRef(FLOATERS.map(() => new Animated.Value(0))).current;

  // ── Logo entrance + breathing pulse ──────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, friction: 6, tension: 40, useNativeDriver: true,
      }),
    ]).start();

    const breathe = () => {
      Animated.sequence([
        Animated.timing(logoBreath, {
          toValue: 0.94, duration: 1400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(logoBreath, {
          toValue: 1.00, duration: 1400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) breathe(); });
    };
    const t = setTimeout(breathe, LOGO_ENTRANCE_MS + 400);
    return () => clearTimeout(t);
  }, []);

  // ── Typewriter for "DIAMOND DEE" ─────────────────────────────────
  useEffect(() => {
    let i = 0;
    const startT = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTypedText(FULL_TEXT.slice(0, i));
        if (i >= FULL_TEXT.length) {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, TYPE_SPEED_MS);
    }, TYPE_START_DELAY);
    return () => clearTimeout(startT);
  }, []);

  // ── Cursor blink (stops when typing done) ────────────────────────
  useEffect(() => {
    if (typingDone) { setShowCursor(false); return; }
    const t = setInterval(() => setShowCursor((s) => !s), 500);
    return () => clearInterval(t);
  }, [typingDone]);

  // ── Subtitle fade-in after typing ────────────────────────────────
  useEffect(() => {
    if (!typingDone) return;
    Animated.timing(subtitleOp, {
      toValue: 1, duration: 600, delay: SUBTITLE_DELAY, useNativeDriver: true,
    }).start();
  }, [typingDone]);

  // ── Dots appear shortly after subtitle ───────────────────────────
  useEffect(() => {
    if (!typingDone) return;
    const t = setTimeout(() => setShowDots(true), SUBTITLE_DELAY + 800);
    return () => clearTimeout(t);
  }, [typingDone]);

  // ── Dots animate ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showDots) return;
    const t = setInterval(() => setDotIndex((i) => (i + 1) % 3), 450);
    return () => clearInterval(t);
  }, [showDots]);

  // ── SKIP button appears ──────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), SKIP_AFTER);
    return () => clearTimeout(t);
  }, []);

  // ── Auto-advance after 15s ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), TOTAL_DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  // ── Floating emoji drift upward, loop forever ────────────────────
  useEffect(() => {
    const timers = [];
    FLOATERS.forEach((f, idx) => {
      const loop = () => {
        floaterAnims[idx].setValue(0);
        Animated.timing(floaterAnims[idx], {
          toValue: 1,
          duration: f.durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished) loop(); });
      };
      timers.push(setTimeout(loop, f.delayMs));
    });
    return () => {
      timers.forEach((t) => clearTimeout(t));
      floaterAnims.forEach((a) => a.stopAnimation());
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Background spotlights */}
      <View style={[styles.spotlight, styles.spotlightTopLeft]} />
      <View style={[styles.spotlight, styles.spotlightBottomRight]} />

      {/* Floating shopping emoji */}
      {FLOATERS.map((f, idx) => (
        <Animated.View
          key={`floater-${idx}`}
          pointerEvents="none"
          style={[
            styles.floater,
            {
              left: W * f.xFrac,
              opacity: floaterAnims[idx].interpolate({
                inputRange: [0, 0.12, 0.82, 1],
                outputRange: [0, 0.55, 0.55, 0],
              }),
              transform: [{
                translateY: floaterAnims[idx].interpolate({
                  inputRange: [0, 1],
                  outputRange: [H, -120],
                }),
              }],
            },
          ]}
        >
          <Text style={{ fontSize: f.size }}>{f.icon}</Text>
        </Animated.View>
      ))}

      {/* Center — logo, title, subtitle, dots */}
      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Animated.View style={{ transform: [{ scale: logoBreath }] }}>
            <View style={styles.logoRingOuter}>
              <View style={styles.logoRingInner}>
                <Image source={LOGO} style={styles.logo} resizeMode="cover" />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{typedText}</Text>
          {showCursor && <Text style={styles.cursor}>|</Text>}
        </View>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleOp }]}>
          {SUBTITLE}
        </Animated.Text>

        {showDots && (
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === dotIndex && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      {/* SKIP button */}
      {showSkip && (
        <Pressable onPress={() => onDone?.()} style={styles.skipBtn} hitSlop={12}>
          <Text style={styles.skipText}>SKIP</Text>
          <Text style={styles.skipArrow}>›</Text>
        </Pressable>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY DMD SYSTEMS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy, overflow: 'hidden' },

  spotlight: { position: 'absolute', backgroundColor: C.navyLight, opacity: 0.35 },
  spotlightTopLeft:    { top: -220, left: -180,    width: 520, height: 520, borderRadius: 260 },
  spotlightBottomRight: { bottom: -280, right: -240, width: 640, height: 640, borderRadius: 320 },

  floater: { position: 'absolute', top: 0 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  logoRingOuter: {
    padding: 4, borderRadius: 82,
    backgroundColor: 'rgba(215,185,135,0.08)',
    shadowColor: C.gold, shadowOpacity: 0.35, shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  logoRingInner: {
    width: 152, height: 152, borderRadius: 76,
    borderWidth: 2, borderColor: C.gold,
    overflow: 'hidden', backgroundColor: C.navyLight,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: '100%', height: '100%' },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 36, minHeight: 46 },
  title: {
    fontSize: 30, fontWeight: '900', letterSpacing: 6, color: C.gold,
    textShadowColor: 'rgba(215,185,135,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  cursor: { fontSize: 30, fontWeight: '300', color: C.gold, marginLeft: 2 },

  subtitle: {
    marginTop: 14, fontSize: 12, letterSpacing: 1.2,
    color: C.muted, textAlign: 'center',
  },

  dotsRow: { flexDirection: 'row', marginTop: 32, gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(215,185,135,0.3)' },
  dotActive: { backgroundColor: C.gold, width: 22, borderRadius: 4 },

  skipBtn: {
    position: 'absolute', right: 22, bottom: 60,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1,
    borderColor: 'rgba(215,185,135,0.4)',
    backgroundColor: 'rgba(215,185,135,0.08)',
  },
  skipText: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: C.gold },
  skipArrow: { fontSize: 16, fontWeight: '900', color: C.gold, marginLeft: 6 },

  footer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  footerText: { fontSize: 9, letterSpacing: 3, fontWeight: '800', color: 'rgba(255,255,255,0.3)' },
});