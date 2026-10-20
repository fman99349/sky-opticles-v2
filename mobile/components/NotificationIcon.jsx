import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useNotifications } from '../notifications/NotificationContext';

export default function NotificationIcon({ color = '#D7B987', size = 22 }) {
  const { unreadCount } = useNotifications();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    if (unreadCount > 0) {
      // Sequence: rotate right, rotate left, rotate right, rotate left, stop
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.delay(1500), // Wait 1.5s before shaking again
        ])
      );
      loop.start();
    } else {
      shakeAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [unreadCount, shakeAnim]);

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const capWidth = Math.round(size * 0.28);
  const capHeight = Math.round(size * 0.16);
  const bodyWidth = Math.round(size * 0.72);
  const bodyHeight = Math.round(size * 0.58);
  const clapperSize = Math.round(size * 0.16);

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ width: capWidth, height: capHeight, backgroundColor: color, borderTopLeftRadius: capWidth, borderTopRightRadius: capWidth }} />
        <View style={{ width: bodyWidth, height: bodyHeight, backgroundColor: color, borderTopLeftRadius: bodyWidth, borderTopRightRadius: bodyWidth, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: -2 }} />
        <View style={{ width: clapperSize, height: clapperSize, borderRadius: clapperSize / 2, backgroundColor: color, marginTop: 2 }} />
      </View>
    </Animated.View>
  );
}