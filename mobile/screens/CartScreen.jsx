import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from '../styles';
import { useCart } from '../cart/CartContext';
import { imageFor, price } from '../utils/product';
import {
  configSummary,
  configTotalDelta,
  prescriptionLabel,
} from '../data/lensOptions';
import Brand from '../components/Brand';
import PrimaryButton from '../components/PrimaryButton';
import { useCurrency } from '../utils/CurrencyContext';

const C = { navy: '#101D2C', gold: '#D7B987', muted: '#7C8792' };

export default function CartScreen({ onBack, onCheckout }) {
  const { items, setQuantity, removeItem, clear, count, total } = useCart();
  const { currency } = useCurrency();

  // Animation for the empty cart icon
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (items.length === 0) {
      // Floating up and down loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Gentle pulsing loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [items.length]);

  return (
    <SafeAreaView style={styles.catalogueSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.catalogueHeader}>
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>← COLLECTION</Text>
        </Pressable>
        <Brand />
        <Text style={styles.catalogueTitle}>Your cart.</Text>
        <Text style={styles.catalogueSubtitle}>
          {count === 0
            ? 'Nothing here yet.'
            : `${count} item${count === 1 ? '' : 's'} ready to checkout.`}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.stateBox}>
          
          {/* Animated Empty Cart Icon */}
          <Animated.View
            style={{
              transform: [
                { translateY: floatAnim },
                { scale: pulseAnim }
              ],
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(215, 185, 135, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: 'rgba(215, 185, 135, 0.35)',
                borderStyle: 'dashed',
              }}
            >
              <Feather name="shopping-bag" size={56} color={C.gold} />
            </View>
          </Animated.View>

          <Text style={styles.stateTitle}>Your cart is empty</Text>
          <Text style={styles.stateDescription}>
            Add something from the collection to get started.
          </Text>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title="BACK TO COLLECTION" onPress={onBack} />
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(it) => it.key}
            contentContainerStyle={styles.cartList}
            renderItem={({ item }) => {
              const uri = imageFor(item.product);
              const summary = configSummary(item.product.product_type, item.config);
              const delta = configTotalDelta(item.product.product_type, item.config);
              const unitPrice = Number(item.product.price || 0) + delta;
              const linePrice = unitPrice * item.quantity;

              return (
                <View style={styles.cartRow}>

                  <View style={styles.cartInfo}>
                    <Text numberOfLines={2} style={styles.cartName}>
                      {item.product.name}
                    </Text>

                    {summary.length > 0 && (
                      <Text numberOfLines={2} style={styles.cartLensSummary}>
                        {summary.join(' · ')}
                      </Text>
                    )}

                    {prescriptionLabel(item.config.prescription) && (
                      <Text style={styles.cartRxBadge}>
                        {prescriptionLabel(item.config.prescription)}
                      </Text>
                    )}
                    <Text style={styles.cartUnit}>{price(unitPrice, currency)} each</Text>

                    <View style={styles.cartQtyRow}>
                      <Pressable
                        onPress={() => setQuantity(item.key, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyValue}>{item.quantity}</Text>

                      <Pressable
                        onPress={() => setQuantity(item.key, item.quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => removeItem(item.key)}
                        style={styles.removeBtn}
                      >
                        <Text style={styles.removeBtnText}>REMOVE</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.cartLineTotal}>{price(linePrice, currency)}</Text>
                </View>
              );
            }}
          />

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>TOTAL</Text>
              <Text style={styles.cartTotalValue}>{price(total, currency)}</Text>
            </View>

            <PrimaryButton title="CHECKOUT" onPress={onCheckout} />

            <Pressable onPress={clear} style={styles.cartClear}>
              <Text style={styles.cartClearText}>CLEAR CART</Text>
            </Pressable>

            <Text style={styles.cartFootnote}>
              Checkout is not connected yet — this is a preview cart.
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}