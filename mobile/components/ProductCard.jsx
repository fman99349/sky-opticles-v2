import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { styles } from '../styles';
import { category, imageFor, price } from '../utils/product';

export default function ProductCard({ product, onPress, onAddToCart }) {
  const uri = imageFor(product);

  return (
    <Pressable
      onPress={() => onPress(product)}
      style={({ pressed }) => [
        styles.productCard,
        pressed && styles.productPressed,
      ]}
    >
      <View style={styles.productImageBox}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Text style={styles.placeholderGlasses}>◉</Text>
            <Text style={styles.placeholderCaption}>SKY OPTICS</Text>
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
          <Text style={styles.productPrice}>{price(product.price)}</Text>

          <Pressable
            onPress={() => onAddToCart(product)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.addCartBtn,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Text style={styles.addCartGlyph}>+</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}