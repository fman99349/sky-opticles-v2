import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from 'react-native';
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

const C = { navy: '#101D2C' };

export default function CartScreen({ onBack, onCheckout }) {
  const { items, setQuantity, removeItem, clear, count, total } = useCart();

  return (
    <SafeAreaView style={styles.catalogueSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.catalogueHeader}>
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>  COLLECTION</Text>
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
          <Text style={styles.stateTitle}>Your cart is empty</Text>
          <Text style={styles.stateDescription}>
            Add something from the collection to get started.
          </Text>
          <PrimaryButton title="BACK TO COLLECTION" onPress={onBack} />
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
                  <View style={styles.cartImageBox}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={styles.cartImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.cartImagePlaceholder}>SO</Text>
                    )}
                  </View>

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
                    <Text style={styles.cartUnit}>{price(unitPrice)} each</Text>

                    <View style={styles.cartQtyRow}>
                      <Pressable
                        onPress={() => setQuantity(item.key, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}></Text>
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

                  <Text style={styles.cartLineTotal}>{price(linePrice)}</Text>
                </View>
              );
            }}
          />

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>TOTAL</Text>
              <Text style={styles.cartTotalValue}>{price(total)}</Text>
            </View>

            <PrimaryButton title="CHECKOUT" onPress={onCheckout} />

            <Pressable onPress={clear} style={styles.cartClear}>
              <Text style={styles.cartClearText}>CLEAR CART</Text>
            </Pressable>

            <Text style={styles.cartFootnote}>
              Checkout is not connected yet  this is a preview cart.
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}