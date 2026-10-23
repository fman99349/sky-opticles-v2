import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

export default function Brand({ dark = false }) {
  return (
    <View>
      <Text style={[styles.brand, dark && styles.brandDark]}>
        Diamond Dee💎Optics<Text style={styles.brandDot}>.</Text>
      </Text>
      <Text style={[styles.brandCaption, dark && styles.brandCaptionDark]}>
        YOUR EVERYDAY SHOPPING DESTINATION
      </Text>
    </View>
  );
}