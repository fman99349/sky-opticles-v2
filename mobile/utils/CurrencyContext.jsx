import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CurrencyContext = createContext(null);
const STORAGE_KEY = 'sky_opticles_currency';

export const CURRENCIES = [
  { code: 'ZAR', symbol: 'R', label: 'ZAR (R)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('ZAR');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && CURRENCIES.find((c) => c.code === saved)) {
        setCurrency(saved);
      }
    });
  }, []);

  const changeCurrency = async (newCode) => {
    setCurrency(newCode);
    await AsyncStorage.setItem(STORAGE_KEY, newCode);
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}