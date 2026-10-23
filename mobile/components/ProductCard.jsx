import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { styles } from '../styles';
import { category, imageFor, price } from '../utils/product';
import { useCurrency } from '../utils/CurrencyContext';

export default function ProductCard({ product, onPress, onAddToCart, currency }) {
  const { currency: globalCurrency } = useCurrency();
  const activeCurrency = currency || globalCurrency || 'ZAR';
  const uri = imageFor(product);

  return (
    <Pressable
      onPress={() => onPress(product)}
      style={({ pressed }) => [styles.productCard, pressed && styles.productPressed]}
    >
      <View style={styles.productImageBox}>
        {uri ? (
          <Image source={{ uri }} style={styles.productImage} resizeMode="contain" />
        ) : (
          <View style={styles.productPlaceholder}>
            <Text style={styles.placeholderGlasses}>◉</Text>
            <Text style={styles.placeholderCaption}>SKY OPTICLES</Text>
          </View>
        )}
        <Text style={styles.categoryPill}>{category(product)}</Text>
      </View>

      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <Text numberOfLines={2} style={styles.productDescription}>
          {product.description || 'Discover this piece from our collection.'}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{price(product.price, activeCurrency)}</Text>

          <Pressable
            onPress={() => onAddToCart(product)}
            hitSlop={8}
            style={({ pressed }) => [styles.addCartBtn, pressed && styles.buttonPressed]}
          >
            <Text style={styles.addCartGlyph}>+</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}