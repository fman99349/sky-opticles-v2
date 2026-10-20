import React from 'react';
import { Pressable, Text } from 'react-native';
import { styles } from '../styles';

export default function PrimaryButton({ title, onPress, outline = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.buttonOutline : styles.buttonPrimary,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, outline && styles.buttonTextOutline]}>
        {title}
      </Text>
      <Text style={[styles.buttonArrow, outline && styles.buttonTextOutline]}>
        
      </Text>
    </Pressable>
  );
}