import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartLineKey, configTotalDelta } from '../data/lensOptions';

// Cart persistence
// -----------------
// The cart is saved to AsyncStorage under CART_KEY after every mutation.
// On mount, we load any previously saved cart before applying updates, so
// closing the app does not lose the customer's selections.
//
// Line key = product id + hash of the lens config. Two entries of the same
// product with different lens choices become separate lines, and this is
// preserved across restarts because the key is deterministic.

const CART_KEY = 'sky_opticles_cart_v1';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // --- Load saved cart on first mount ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {
        // Corrupt JSON or storage read failure — start fresh rather than
        // blocking the app. The user loses an unsaved cart, which is the
        // same outcome as a crash before this feature existed.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Persist cart on every change, after hydration only ---
  // The `hydrated` guard prevents us from overwriting a saved cart with
  // the initial empty array during the load phase.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => {
      // Storage failure is non-fatal — the in-memory cart still works.
    });
  }, [items, hydrated]);

  const addItem = useCallback((product, config = {}, quantity = 1) => {
    const key = cartLineKey(product.id, config);
    setItems((current) => {
      const existing = current.find((it) => it.key === key);
      if (existing) {
        return current.map((it) =>
          it.key === key ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [...current, { key, product, config, quantity }];
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((it) => it.key !== key));
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((current) => {
      if (quantity <= 0) return current.filter((it) => it.key !== key);
      return current.map((it) => (it.key === key ? { ...it, quantity } : it));
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, it) => sum + it.quantity, 0);
    const total = items.reduce((sum, it) => {
      const base = Number(it.product.price || 0);
      const delta = configTotalDelta(it.product.product_type, it.config);
      return sum + (base + delta) * it.quantity;
    }, 0);
    return { items, addItem, removeItem, setQuantity, clear, count, total };
  }, [items, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}