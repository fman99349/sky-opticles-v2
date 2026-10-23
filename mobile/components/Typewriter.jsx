import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

export default function Typewriter({ text, style, delay = 50 }) {
  const [currentText, setCurrentText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [index, text, delay]);

  return <Text style={style}>{currentText}</Text>;
}