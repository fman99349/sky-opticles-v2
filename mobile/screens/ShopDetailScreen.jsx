import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { fetchShopDetail, fetchShopProducts } from '../utils/api';
import { useCurrency } from '../utils/CurrencyContext';
import ProductCard from '../components/ProductCard';
import { shopStyles as s } from './shopStyles';

function monogram(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function ShopDetailScreen({ slug, onBack, onOpenProduct, onAddToCart }) {
  const { currency } = useCurrency();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, prods] = await Promise.all([
        fetchShopDetail(slug),
        fetchShopProducts(slug, currency),
      ]);
      setShop(detail);
      setProducts(prods.data || []);
    } catch (e) {
      setError(e.message || 'Could not load this shop.');
    } finally {
      setLoading(false);
    }
  }, [slug, currency]);

  useEffect(() => { load(); }, [load]);

  const handleProductPress = (product) => {
    onOpenProduct({
      ...product,
      shop_id: shop?.id,
      shop_name: shop?.name,
      shop_slug: shop?.slug,
    });
  };

  if (loading) {
    return (
      <View style={s.detailWrap}>
        <View style={s.stateBox}>
          <ActivityIndicator size="large" color="#2E8D86" />
          <Text style={s.stateTitle}>Opening shop…</Text>
        </View>
      </View>
    );
  }

  if (error || !shop) {
    return (
      <View style={s.detailWrap}>
        <View style={s.bannerBox}>
          <Pressable onPress={onBack} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </Pressable>
        </View>
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>Shop unavailable</Text>
          <Text style={s.stateText}>{error || 'This shop is not available.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.detailWrap}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        ListHeaderComponent={
          <>
            <View style={s.bannerBox}>
              {shop.banner_url ? (
                <Image source={{ uri: shop.banner_url }} style={s.bannerImage} resizeMode="cover" />
              ) : shop.logo_url ? (
                <View style={s.logoBannerBgWhite}>
                  <Image
                    source={{ uri: shop.logo_url }}
                    style={s.logoBannerImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={s.logoBannerBgDark}>
                  <Text style={s.logoBannerMonogram}>{monogram(shop.name)}</Text>
                </View>
              )}
              <Pressable onPress={onBack} style={s.backBtn} hitSlop={8}>
                <Text style={s.backBtnText}>‹</Text>
              </Pressable>
            </View>

            <View style={s.detailInfo}>
              <View style={s.detailNameRow}>
                <Text style={s.detailName}>{shop.name}</Text>
                {shop.is_verified ? (
                  <View style={s.verifiedPill}>
                    <Text style={s.verifiedPillText}>✓ VERIFIED</Text>
                  </View>
                ) : null}
              </View>
              {shop.tagline ? <Text style={s.detailTagline}>{shop.tagline}</Text> : null}

              <View style={s.detailMetaRow}>
                <Text style={s.detailMeta}>📍 {shop.city}, {shop.province}</Text>
                <Text style={s.detailMeta}>🏬 {shop.shop_type.toUpperCase()}</Text>
                <Text style={s.detailMeta}>📦 {shop.product_count} item{shop.product_count === 1 ? '' : 's'}</Text>
              </View>

              {shop.description ? (
                <Text style={s.detailDescription}>{shop.description}</Text>
              ) : null}
            </View>

            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>SHOP PRODUCTS</Text>
              <Text style={s.sectionCount}>{shop.product_count} item{shop.product_count === 1 ? '' : 's'}</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={handleProductPress} onAddToCart={onAddToCart} />
        )}
        columnWrapperStyle={s.productsRow}
        contentContainerStyle={s.productsGrid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.stateBox}>
            <Text style={s.stateTitle}>No products yet</Text>
            <Text style={s.stateText}>This shop hasn't listed anything for sale.</Text>
          </View>
        }
      />
    </View>
  );
}