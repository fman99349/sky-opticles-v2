import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchShops, fetchShopTypes } from '../utils/api';
import { shopStyles as s } from './shopStyles';

function monogram(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function ShopCard({ shop, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(shop.slug)}
      style={({ pressed }) => [s.shopCard, pressed && s.shopCardPressed]}
    >
      <View style={s.shopCardLogoBox}>
        {shop.logo_url ? (
          <Image source={{ uri: shop.logo_url }} style={s.shopCardLogo} resizeMode="contain" />
        ) : (
          <Text style={s.shopCardMonogram}>{monogram(shop.name)}</Text>
        )}
      </View>
      <View style={s.shopCardInfo}>
        <View style={s.shopCardNameRow}>
          <Text style={s.shopCardName} numberOfLines={2}>{shop.name}</Text>
          {shop.is_verified ? <Text style={s.verifiedBadge}>✓</Text> : null}
        </View>
        {shop.tagline ? (
          <Text style={s.shopCardTagline} numberOfLines={2}>{shop.tagline}</Text>
        ) : (
          <View style={{ height: 28 }} />
        )}
        <View style={s.shopCardMeta}>
          <Text style={s.shopCardCity} numberOfLines={1}>{shop.city}</Text>
          <Text style={s.shopCardCount}>{shop.product_count} item{shop.product_count === 1 ? '' : 's'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ShopListScreen({ onOpenShop }) {
  const [shops, setShops] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [listRes, typesRes] = await Promise.all([
        fetchShops({ shop_type: activeType || undefined, search: query || undefined }),
        fetchShopTypes(),
      ]);
      setShops(listRes.data || []);
      setTypes(typesRes || []);
    } catch (e) {
      setError(e.message || 'Could not load shops.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType, query]);

  useEffect(() => {
    const delay = query.length > 0 ? 350 : 0;
    const t = setTimeout(() => load(false), delay);
    return () => clearTimeout(t);
  }, [load, query.length, activeType]);

  return (
    <View style={s.shopListWrap}>
      <View style={s.shopSearchWrap}>
        <View style={s.shopSearchBox}>
          <Text style={s.shopSearchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search shops..."
            placeholderTextColor="#7C8792"
            style={s.shopSearchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={s.shopSearchClear}>CLEAR</Text>
            </Pressable>
          )}
        </View>
      </View>

      {types.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={{ flexGrow: 0, flexShrink: 0 }}
        >
          <Pressable
            onPress={() => setActiveType(null)}
            style={[s.filterChip, !activeType && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, !activeType && s.filterChipTextActive]}>ALL</Text>
          </Pressable>
          {types.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setActiveType(activeType === t.key ? null : t.key)}
              style={[s.filterChip, activeType === t.key && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, activeType === t.key && s.filterChipTextActive]}>
                {t.label.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.stateBox}>
          <ActivityIndicator size="large" color="#2E8D86" />
          <Text style={s.stateTitle}>Finding shops…</Text>
        </View>
      ) : error ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>Couldn't load shops</Text>
          <Text style={s.stateText}>{error}</Text>
          <Pressable onPress={() => load(false)} style={s.retryBtn}>
            <Text style={s.retryBtnText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      ) : shops.length === 0 ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>No shops match</Text>
          <Text style={s.stateText}>Try a different search or filter.</Text>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          renderItem={({ item }) => <ShopCard shop={item} onPress={onOpenShop} />}
          columnWrapperStyle={s.shopRow}
          contentContainerStyle={s.shopGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2E8D86" />
          }
        />
      )}
    </View>
  );
}