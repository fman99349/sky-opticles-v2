import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { styles } from '../styles';
import { useCart } from '../cart/CartContext';
import { fetchProductDetail } from '../utils/api';
import { imageFor, price, category } from '../utils/product';
import { defaultConfigForProductType } from '../data/lensOptions';
import Brand from '../components/Brand';
import { HomeIcon, CartIcon } from '../components/Icons';
import PrimaryButton from '../components/PrimaryButton';
import VariantPicker from '../components/VariantPicker';
import LensWizard from './LensWizard';
import ProductSpecs from '../components/ProductSpecs';

const C = { navy: '#101D2C', gold: '#D7B987' };

export default function DetailScreen({ product, onBack, onAddToCart }) {
  const { count } = useCart();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [currentImageUri, setCurrentImageUri] = useState(() => imageFor(product));
  const fade = useRef(new Animated.Value(1)).current;
  const [showFallbackCaption, setShowFallbackCaption] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchProductDetail(product.id);
        if (cancelled) return;
        setDetail(r.data);
        const variants = r.data?.variants || [];
        if (variants.length >= 2) setSelectedVariantId(variants[0].id);
        else if (variants.length === 1) setSelectedVariantId(variants[0].id);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [product.id]);

  const variants = detail?.variants || [];
  const images = detail?.images || [];
  const selectedVariant = variants.find((v) => String(v.id) === String(selectedVariantId));
  const variantSku = selectedVariant?.sku || null;

  const { displayImage, displayUri, isFallback } = (() => {
    if (selectedVariantId) {
      const variantImg = images.find((img) => String(img.variant_id) === String(selectedVariantId));
      if (variantImg) {
        return { displayImage: variantImg, displayUri: variantImg.image_url, isFallback: false };
      }
      const primary = images.find((img) => img.is_primary && !img.variant_id);
      const firstWide = images.find((img) => !img.variant_id);
      const fallbackImg = primary || firstWide || null;
      return {
        displayImage: fallbackImg,
        displayUri: fallbackImg?.image_url || imageFor(product),
        isFallback: true,
      };
    }
    const primary = images.find((img) => img.is_primary);
    const fallbackImg = primary || images[0] || null;
    return {
      displayImage: fallbackImg,
      displayUri: fallbackImg?.image_url || imageFor(product),
      isFallback: false,
    };
  })();

  useEffect(() => {
    if (!displayUri || displayUri === currentImageUri) {
      setShowFallbackCaption(isFallback);
      return;
    }
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setCurrentImageUri(displayUri);
      setShowFallbackCaption(isFallback);
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  }, [displayUri, currentImageUri, isFallback, fade]);

  const basePrice = Number(product.price || 0);
  const variantConfig = selectedVariantId ? { variantId: selectedVariantId, variantSku } : {};

  // This is the magic flag
  const needsConfigurator = product.has_configurator !== false;

  const handleFrameOnly = () => {
    const cfg = defaultConfigForProductType(product.product_type);
    cfg.frameOnly = true;
    Object.assign(cfg, variantConfig);
    onAddToCart(product, cfg);
  };

  const handleSimpleAdd = () => {
    onAddToCart(product, variantConfig);
  };

  const handleWizardComplete = (cfg) => {
    setWizardOpen(false);
    onAddToCart(product, cfg);
  };

  if (wizardOpen) {
    return (
      <LensWizard
        product={product}
        initialConfig={variantConfig}
        previewImage={displayImage}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.detailSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.detailHeader}>
        <View style={styles.catalogueTopRow}>
          <Pressable onPress={onBack} style={styles.headerBtnRow}>
            <HomeIcon color={C.gold} size={14} />
            <Text style={styles.backLinkText}>COLLECTION</Text>
          </Pressable>

          <Pressable onPress={onBack} hitSlop={10} style={styles.headerCartBtn}>
            <CartIcon color={C.gold} size={22} />
            {count > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>{count}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Brand />
      </View>

      <ScrollView contentContainerStyle={styles.detailBody}>
        <Animated.View style={[styles.detailImageBox, { opacity: fade }]}>
          {currentImageUri ? (
            <Image source={{ uri: currentImageUri }} style={styles.detailImage} resizeMode="contain" />
          ) : (
            <Text style={styles.detailPlaceholder}>SKY OPTICLES</Text>
          )}
        </Animated.View>

        {showFallbackCaption && (
          <Text style={styles.detailFallbackCaption}>Preview shown in another colour</Text>
        )}

        <Text style={styles.detailEyebrow}>{category(product)}</Text>
        <Text style={styles.detailName}>{product.name}</Text>

        {variants.length >= 2 && (
          <VariantPicker variants={variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} />
        )}

        <View style={styles.detailFromRow}>
          <Text style={styles.detailFromLabel}>PRICE</Text>
          <Text style={styles.detailFromValue}>{price(selectedVariant?.price_override || basePrice)}</Text>
        </View>

        <Text style={styles.detailDescription}>
          {product.description || 'Discover quality products from our collection.'}
        </Text>

        {/* Display Attributes for non-eyewear products */}
        {!needsConfigurator && selectedVariant?.attributes && (
          <ProductSpecs attributes={selectedVariant.attributes} />
        )}

        <View style={styles.detailNote}>
          <Text style={styles.detailNoteText}>
            A piece from the SKY OPTICLES collection.
          </Text>
        </View>

        {/* Dynamic Buttons based on has_configurator */}
        {needsConfigurator ? (
          <View style={styles.lensActionsRow}>
            <Pressable
              onPress={() => setWizardOpen(true)}
              style={({ pressed }) => [styles.lensActionPrimary, pressed && styles.buttonPressed]}
            >
              <Text style={styles.lensActionPrimaryText}>ADD LENSES</Text>
            </Pressable>

            <Pressable
              onPress={handleFrameOnly}
              style={({ pressed }) => [styles.lensActionOutline, pressed && styles.buttonPressed]}
            >
              <Text style={styles.lensActionOutlineText}>FRAME ONLY</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 24, marginBottom: 10 }}>
            <Pressable
              onPress={handleSimpleAdd}
              style={({ pressed }) => [
                {
                  backgroundColor: C.gold,
                  paddingVertical: 16,
                  borderRadius: 6,
                  alignItems: 'center',
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={{ color: C.navy, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }}>
                ADD TO CART
              </Text>
            </Pressable>
          </View>
        )}

        <PrimaryButton title="BACK TO COLLECTION" onPress={onBack} outline />
      </ScrollView>
    </SafeAreaView>
  );
}