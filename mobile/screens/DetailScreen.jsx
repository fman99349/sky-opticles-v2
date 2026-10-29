import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import ProductImageCarousel from '../components/ProductImageCarousel';

const C = { navy: '#101D2C', gold: '#D7B987' };

export default function DetailScreen({ product, onBack, onAddToCart }) {
  const { count } = useCart();
  const { currency } = useCurrency();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Build the ordered gallery:
  //  - No variant selected → all images in stored order (primary first).
  //  - Variant selected    → that variant's images first, then product-wide.
  const galleryImages = (() => {
    if (!images || images.length === 0) return [];
    if (!selectedVariantId) return images;
    const variantImgs = images.filter(
      (img) => String(img.variant_id) === String(selectedVariantId)
    );
    const wideImgs = images.filter((img) => !img.variant_id);
    return [...variantImgs, ...wideImgs];
  })();

  const basePrice = Number(product.price || 0);
  const variantConfig = selectedVariantId ? { variantId: selectedVariantId, variantSku } : {};
  const needsConfigurator = product.has_configurator !== false;
    // Pick the 3D model to open: variant-specific if one exists,
  // otherwise the product-wide primary model, otherwise the first available.


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
        <ProductImageCarousel
          images={galleryImages}
          fallbackUri={imageFor(product)}
          height={250}
          imagesKey={selectedVariantId || 'all'}
        />

        <Text style={styles.detailEyebrow}>{category(product)}</Text>
        <Text style={styles.detailName}>{product.name}</Text>

        {product.shop_name ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
            <Text style={{ color: '#7C8792', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>SOLD BY </Text>
            <Text style={{ color: '#2E8D86', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>
              {product.shop_name.toUpperCase()}
            </Text>
          </View>
        ) : null}

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

    </SafeAreaView>
  );
}