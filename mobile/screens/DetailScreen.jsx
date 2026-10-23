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
import { useCurrency } from '../utils/CurrencyContext';
import Brand from '../components/Brand';
import { HomeIcon, CartIcon } from '../components/Icons';
import PrimaryButton from '../components/PrimaryButton';
import VariantPicker from '../components/VariantPicker';
import LensWizard from './LensWizard';
import ProductSpecs from '../components/ProductSpecs';
import Product3DViewer from '../components/Product3DViewer';

const C = { navy: '#101D2C', gold: '#D7B987' };

export default function DetailScreen({ product, onBack, onAddToCart }) {
  const { count } = useCart();
  const { currency } = useCurrency();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [currentImageUri, setCurrentImageUri] = useState(() => imageFor(product));
  const fade = useRef(new Animated.Value(1)).current;
  const [showFallbackCaption, setShowFallbackCaption] = useState(false);
  const [loading, setLoading] = useState(true);
    const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchProductDetail(product.id, currency);
        if (cancelled) return;
        setDetail(r.data);
        const variants = r.data?.variants || [];
        if (variants.length >= 1) {
          setSelectedVariantId(variants[0].id);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [product.id, currency]);

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
  const needsConfigurator = product.has_configurator !== false;
    // Pick the 3D model to open: variant-specific if one exists,
  // otherwise the product-wide primary model, otherwise the first available.
  const models3D = detail?.models_3d || [];
  const model3D = (() => {
    if (models3D.length === 0) return null;
    if (selectedVariantId) {
      const variantModel = models3D.find(
        (m) => String(m.variant_id) === String(selectedVariantId)
      );
      if (variantModel) return variantModel;
    }
    return models3D.find((m) => m.is_primary) || models3D[0];
  })();

  const variantAttrs = selectedVariant?.attributes || {};
  const attrText = Object.entries(variantAttrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

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
        <Pressable
          onPress={model3D ? () => setShow3D(true) : undefined}
          disabled={!model3D}
          style={({ pressed }) => [pressed && model3D && { opacity: 0.9 }]}
        >
          <Animated.View style={[styles.detailImageBox, { opacity: fade }]}>
            {currentImageUri ? (
              <Image source={{ uri: currentImageUri }} style={styles.detailImage} resizeMode="contain" />
            ) : (
              <Text style={styles.detailPlaceholder}>SKY OPTICLES</Text>
            )}

            {model3D && (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: C.navy,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: C.gold,
                }}
              >
                <Text style={{ color: C.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>
                  3D
                </Text>
                <Text style={{ color: C.gold, fontSize: 12, fontWeight: '900' }}>
                  ↻
                </Text>
              </View>
            )}
          </Animated.View>
        </Pressable>

        {showFallbackCaption && <Text style={styles.detailFallbackCaption}>Preview shown in another colour</Text>}

        <Text style={styles.detailEyebrow}>{category(product)}</Text>
        <Text style={styles.detailName}>{product.name}</Text>

        {variants.length >= 2 && (
          <VariantPicker variants={variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} />
        )}

        <View style={styles.detailFromRow}>
          <Text style={styles.detailFromLabel}>PRICE</Text>
          <Text style={styles.detailFromValue}>{price(selectedVariant?.price_override || basePrice, currency)}</Text>
        </View>

        {!needsConfigurator && attrText ? (
          <Text style={{ fontSize: 11, color: '#2E8D86', fontWeight: '700', marginTop: 6, lineHeight: 16 }}>
            {attrText}
          </Text>
        ) : null}

        <Text style={styles.detailDescription}>
          {product.description || 'Discover quality products from our collection.'}
        </Text>

        {!needsConfigurator && selectedVariant?.attributes && (
          <ProductSpecs attributes={selectedVariant.attributes} />
        )}

        

        {needsConfigurator ? (
          <View style={styles.lensActionsRow}>
            <Pressable onPress={() => setWizardOpen(true)} style={({ pressed }) => [styles.lensActionPrimary, pressed && styles.buttonPressed]}>
              <Text style={styles.lensActionPrimaryText}>ADD LENSES</Text>
            </Pressable>
            <Pressable onPress={handleFrameOnly} style={({ pressed }) => [styles.lensActionOutline, pressed && styles.buttonPressed]}>
              <Text style={styles.lensActionOutlineText}>FRAME ONLY</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 24, marginBottom: 10 }}>
            <Pressable onPress={handleSimpleAdd} style={({ pressed }) => [{ backgroundColor: C.gold, paddingVertical: 16, borderRadius: 6, alignItems: 'center' }, pressed && styles.buttonPressed]}>
              <Text style={{ color: C.navy, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }}>ADD TO CART</Text>
            </Pressable>
          </View>
        )}

        <PrimaryButton title="BACK TO COLLECTION" onPress={onBack} outline />
      </ScrollView>

      {model3D && (
        <Product3DViewer
          visible={show3D}
          modelUrl={model3D.model_url}
          posterUrl={model3D.poster_url || currentImageUri}
          title={product.name}
          onClose={() => setShow3D(false)}
        />
      )}
    </SafeAreaView>
  );
}