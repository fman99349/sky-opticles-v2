import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  
  listMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../utils/api';
import AddressModal from '../components/AddressModal';
import { useNotifications } from '../notifications/NotificationContext';










import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import {
  applyFilters,
  buildFilterTabs,
  imageFor,
  price,
} from '../utils/product';
import {
  fetchProducts,
  fetchCategories,
  listMyOrders,
  getMyOrder,
} from '../utils/api';
import {
  configSummary,
  configTotalDelta,
  defaultConfigForProductType,
  prescriptionLabel,
} from '../data/lensOptions';
import ProductCard from '../components/ProductCard';
import FilterTabs from '../components/FilterTabs';
import PrimaryButton from '../components/PrimaryButton';
import NotificationIcon from '../components/NotificationIcon';
import BottomTabs from '../components/BottomTabs';
import { CartIcon } from '../components/Icons';
import CheckoutScreen from './CheckoutScreen';
import { dashStyles as d } from './dashboardStyles';

const NAVY = '#101D2C';
const GOLD = '#D7B987';
const MUTED = '#7C8792';
const TEAL = '#2E8D86';
const INK = '#17283A';
const WHITE = '#FFFFFF';
const CREAM = '#F8F5EF';
const BORDER = '#E7E3DC';

function TopBar({ user, cartCount, onBell, onCart }) {
  const { unreadCount } = useNotifications(); // <-- ADD THIS
  const firstName = user && user.name ? user.name.split(' ')[0] : '';
  return (
    <View style={d.topBar}>
      <View style={d.greetingWrap}>
        <Text style={d.greetingHi}>WELCOME BACK</Text>
        <Text style={d.greetingName} numberOfLines={1}>
          {firstName || 'Customer'}
        </Text>
      </View>

      <View style={d.topActions}>
        <Pressable
          onPress={onBell}
          style={d.iconBtn}
          accessibilityLabel="Notifications"
        >
          <NotificationIcon color={GOLD} size={22} />
          {unreadCount > 0 && (
            <View style={d.iconBadge}>
              <Text style={d.iconBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={onCart}
          style={d.iconBtn}
          accessibilityLabel={`Cart, ${cartCount} items`}
        >
          <CartIcon color={GOLD} size={22} />
          {cartCount > 0 && (
            <View style={d.iconBadge}>
              <Text style={d.iconBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
















// ---------------------------------------------------------------------------
// Orders helpers
// ---------------------------------------------------------------------------

function formatOrderDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function OrderPill({ kind, value }) {
  const maps = {
    pay: {
      unpaid:    { bg: 'rgba(201,150,46,0.12)', fg: '#8A6B1E', border: 'rgba(201,150,46,0.35)' },
      paid:      { bg: 'rgba(46,141,134,0.12)', fg: '#2E8D86', border: 'rgba(46,141,134,0.35)' },
      refunded:  { bg: '#F1EDE5',               fg: '#7C8792', border: '#E7E3DC' },
    },
    ful: {
      pending:    { bg: '#F1EDE5',               fg: '#7C8792', border: '#E7E3DC' },
      processing: { bg: 'rgba(201,150,46,0.12)', fg: '#8A6B1E', border: 'rgba(201,150,46,0.35)' },
      shipped:    { bg: 'rgba(43,92,155,0.10)',  fg: '#2B5C9B', border: 'rgba(43,92,155,0.30)' },
      delivered:  { bg: 'rgba(46,141,134,0.12)', fg: '#2E8D86', border: 'rgba(46,141,134,0.35)' },
      cancelled:  { bg: 'rgba(192,57,43,0.10)',  fg: '#C0392B', border: 'rgba(192,57,43,0.30)' },
    },
  };
  const c = (maps[kind] && maps[kind][value]) || {
    bg: '#F1EDE5',
    fg: '#7C8792',
    border: '#E7E3DC',
  };
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 0.8,
          color: c.fg,
          textTransform: 'uppercase',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Order detail modal
// ---------------------------------------------------------------------------
function OrderDetailModal({ orderId, onClose }) {
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await getMyOrder(token, orderId);
        if (!cancelled) setOrder(r.data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load order.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: NAVY }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#1D3044',
          }}
        >
          <Text
            style={{
              color: GOLD,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.4,
            }}
          >
            {order ? order.order_number : 'ORDER DETAILS'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text
              style={{
                color: GOLD,
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: 1.2,
              }}
            >
              CLOSE
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: CREAM }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {loading && (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={TEAL} />
            </View>
          )}
          {error ? (
            <Text style={{ color: '#C0392B', fontSize: 13 }}>{error}</Text>
          ) : null}

          {order && (
            <>
              {/* Status + date */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <OrderPill kind="pay" value={order.payment_status} />
                <OrderPill kind="ful" value={order.fulfillment_status} />
              </View>
              <Text
                style={{ fontSize: 11, color: MUTED, marginBottom: 20 }}
              >
                Placed {formatOrderDate(order.created_at)}
              </Text>

              {/* Items */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  color: INK,
                  marginBottom: 10,
                }}
              >
                ITEMS
              </Text>
              <View
                style={{
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 6,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                {order.items.map((it, i) => {
                  const cfg = it.lens_config || {};
                  const summaryParts = [];
                  if (cfg.lensType) summaryParts.push(cfg.lensType);
                  if (cfg.lensIndex) summaryParts.push(`index ${cfg.lensIndex}`);
                  if (cfg.tint) summaryParts.push(cfg.tint);
                  if (cfg.coating) summaryParts.push(cfg.coating);
                  if (cfg.polarization === 'yes') summaryParts.push('polarized');
                  const summary = summaryParts.join(' · ');
                                    const variantAttrs = it.variant_attributes || {};
                  const attrText = Object.entries(variantAttrs)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ');

                  return (
                    <View
                      key={it.id}
                      style={{
                        paddingVertical: 10,
                        borderBottomWidth: i === order.items.length - 1 ? 0 : 1,
                        borderBottomColor: '#F0EBE3',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: '800',
                            color: INK,
                          }}
                          numberOfLines={2}
                        >
                          {it.product_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '900',
                            color: INK,
                          }}
                        >
                          {price(it.line_total)}
                        </Text>
                      </View>
                      {summary ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: TEAL,
                            marginTop: 3,
                            fontWeight: '700',
                          }}
                          numberOfLines={2}
                        >
                          {summary}
                        </Text>
                      ) : null}

                      {attrText ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: TEAL,
                            marginTop: 3,
                            fontWeight: '700',
                          }}
                          numberOfLines={3}
                        >
                          {attrText}
                        </Text>
                      ) : null}









                      {it.prescription_id ? (
                        <Text
                          style={{
                            fontSize: 10,
                            color: MUTED,
                            marginTop: 3,
                            fontWeight: '900',
                            letterSpacing: 0.8,
                          }}
                        >
                          PRESCRIPTION ATTACHED
                        </Text>
                      ) : null}
                      <Text
                        style={{ fontSize: 11, color: MUTED, marginTop: 4 }}
                      >
                        {price(it.unit_price)} × {it.quantity}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Summary */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  color: INK,
                  marginBottom: 10,
                }}
              >
                SUMMARY
              </Text>
              <View
                style={{
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 6,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, color: MUTED }}>Subtotal</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: INK,
                    }}
                  >
                    {price(order.subtotal)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, color: MUTED }}>Shipping</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: INK,
                    }}
                  >
                    {Number(order.shipping_cost) > 0
                      ? price(order.shipping_cost)
                      : 'Free'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    marginTop: 6,
                    borderTopWidth: 2,
                    borderTopColor: INK,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '900',
                      letterSpacing: 1.4,
                      color: INK,
                    }}
                  >
                    TOTAL
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '900',
                      color: INK,
                    }}
                  >
                    {price(order.total)}
                  </Text>
                </View>
              </View>

              {/* Shipping address */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  color: INK,
                  marginBottom: 10,
                }}
              >
                SHIPPING TO
              </Text>
              <View
                style={{
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: INK,
                    marginBottom: 4,
                  }}
                >
                  {order.customer.name}
                </Text>
                <Text
                  style={{ fontSize: 12, color: MUTED, lineHeight: 18 }}
                >
                  {order.shipping.line1}
                  {order.shipping.line2 ? `, ${order.shipping.line2}` : ''}
                  {'\n'}
                  {order.shipping.city}, {order.shipping.province}{' '}
                  {order.shipping.postalCode}
                  {'\n'}
                  {order.shipping.country}
                </Text>
                <Text
                  style={{ fontSize: 11, color: MUTED, marginTop: 8 }}
                >
                  {order.customer.phone}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------
function OrdersTab({ user, onGoToShop }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [openOrderId, setOpenOrderId] = useState(null);

  const load = async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const r = await listMyOrders(token);
      setOrders(r.data || []);
    } catch (e) {
      setError(e.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user && user.name ? user.name.split(' ')[0] : '';

  if (loading) {
    return (
      <View style={d.shopStateBox}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={d.shopStateTitle}>Loading your orders…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={d.homeScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={TEAL}
          />
        }
      >
        <View style={d.sectionBlock}>
          <Text style={d.sectionTitle}>YOUR ORDERS</Text>
          <Text style={d.sectionSubtitle}>
            {orders.length === 0
              ? 'Past and upcoming orders will appear here.'
              : `${orders.length} order${orders.length === 1 ? '' : 's'} on this account. Pull down to refresh.`}
          </Text>

          {error ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 6,
                padding: 20,
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}
              >
                {error}
              </Text>
              <PrimaryButton
                title="TRY AGAIN"
                onPress={() => load(false)}
              />
            </View>
          ) : orders.length === 0 ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 6,
                padding: 26,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ color: TEAL, fontSize: 42, marginBottom: 12 }}
              >
                ◫
              </Text>
              <Text
                style={{
                  color: INK,
                  fontSize: 15,
                  fontWeight: '900',
                  textAlign: 'center',
                }}
              >
                No orders yet
              </Text>
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 18,
                  textAlign: 'center',
                  marginTop: 8,
                  maxWidth: 280,
                }}
              >
                {firstName
                  ? `Welcome, ${firstName}. Once you place an order, you will be able to track it here.`
                  : 'Once you place an order, you will be able to track it here.'}
              </Text>

              <View style={{ marginTop: 20, width: 220 }}>
                <PrimaryButton
                  title="START SHOPPING"
                  onPress={onGoToShop}
                />
              </View>
            </View>
          ) : (
            orders.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setOpenOrderId(o.id)}
                style={({ pressed }) => ({
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 6,
                  padding: 14,
                  marginBottom: 10,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color: INK,
                      fontSize: 13,
                      fontWeight: '900',
                      letterSpacing: 0.4,
                    }}
                  >
                    {o.order_number}
                  </Text>
                  <Text
                    style={{
                      color: INK,
                      fontSize: 14,
                      fontWeight: '900',
                    }}
                  >
                    {price(o.total)}
                  </Text>
                </View>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    marginBottom: 10,
                  }}
                >
                  {formatOrderDate(o.created_at)}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <OrderPill kind="pay" value={o.payment_status} />
                  <OrderPill kind="ful" value={o.fulfillment_status} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {openOrderId && (
        <OrderDetailModal
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
        />
      )}
    </View>
  );
}







function ShopTab({
  products,
  categories,
  loading,
  error,
  onRetry,
  onOpenProduct,
  onAddToCart,
}) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const tabs = buildFilterTabs(categories);
  const activeTab = tabs.find((t) => t.id === activeFilter) || tabs[0];
  const filtered = applyFilters(products, query, activeTab);

  if (loading) {
    return (
      <View style={d.shopStateBox}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={d.shopStateTitle}>Curating your collection…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={d.shopStateBox}>
        <Text style={d.shopStateTitle}>Catalogue unavailable</Text>
        <Text style={d.shopStateText}>{error}</Text>
        <View style={{ marginTop: 14, width: 220 }}>
          <PrimaryButton title="TRY AGAIN" onPress={onRetry} />
        </View>
      </View>
    );
  }

  return (
    <View style={d.shopContainer}>
      <View style={d.shopSearchWrap}>
        <View style={d.shopSearchBox}>
          <Text style={d.shopSearchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search eyewear..."
            placeholderTextColor={MUTED}
            style={d.shopSearchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={d.shopClear}>CLEAR</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FilterTabs tabs={tabs} activeId={activeFilter} onChange={setActiveFilter} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={onOpenProduct}
            onAddToCart={onAddToCart}
          />
        )}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: 13,
        }}
        contentContainerStyle={d.shopList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={d.shopStateBox}>
            <Text style={d.shopStateTitle}>Nothing found just yet</Text>
            <Text style={d.shopStateText}>
              Try a different search or filter.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function CartTab({ onCheckout, onGoToShop }) {
  const { items, setQuantity, removeItem, clear, total } = useCart();

  if (items.length === 0) {
    return (
      <View style={d.cartEmpty}>
        <Text style={d.cartEmptyTitle}>Your cart is empty</Text>
        <Text style={d.cartEmptyText}>
          Add something from the shop to get started.
        </Text>
        <View style={{ marginTop: 16, width: 220 }}>
          <PrimaryButton title="OPEN SHOP" onPress={onGoToShop} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 12,
        }}
      >
        {items.map((item) => {
          const uri = imageFor(item.product);
          const summary = configSummary(
            item.product.product_type,
            item.config
          );
          const delta = configTotalDelta(
            item.product.product_type,
            item.config
          );
          const unit = Number(item.product.price || 0) + delta;
          const linePrice = unit * item.quantity;

          return (
            <View
              key={item.key}
              style={{
                flexDirection: 'row',
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 4,
                padding: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: '#EDEAE4',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: '88%', height: '88%' }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={{ color: TEAL, fontWeight: '900' }}>SO</Text>
                )}
              </View>

              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    color: INK,
                    fontSize: 12,
                    fontWeight: '800',
                    lineHeight: 16,
                  }}
                >
                  {item.product.name}
                </Text>

                                {summary.length > 0 && (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: TEAL,
                      fontSize: 10,
                      marginTop: 3,
                      fontWeight: '700',
                    }}
                  >
                    {summary.join(' · ')}
                  </Text>
                )}

                                {prescriptionLabel(item.config.prescription) && (
                  <Text
                    style={{
                      color: '#7C8792',
                      fontSize: 9,
                      fontWeight: '900',
                      letterSpacing: 1,
                      marginTop: 4,
                    }}
                  >
                    {prescriptionLabel(item.config.prescription)}
                  </Text>
                )}

                <Text style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>
                  {price(unit)} each
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                    gap: 8,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      setQuantity(item.key, item.quantity - 1)
                    }
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: NAVY,
                        fontSize: 15,
                        fontWeight: '900',
                      }}
                    >
                      −
                    </Text>
                  </Pressable>

                  <Text
                    style={{
                      minWidth: 22,
                      textAlign: 'center',
                      color: INK,
                      fontWeight: '900',
                      fontSize: 12,
                    }}
                  >
                    {item.quantity}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setQuantity(item.key, item.quantity + 1)
                    }
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: NAVY,
                        fontSize: 15,
                        fontWeight: '900',
                      }}
                    >
                      +
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => removeItem(item.key)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 9,
                        fontWeight: '800',
                        letterSpacing: 1,
                      }}
                    >
                      REMOVE
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text
                style={{
                  color: NAVY,
                  fontWeight: '900',
                  fontSize: 12,
                }}
              >
                {price(linePrice)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderTopColor: BORDER,
          backgroundColor: CREAM,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.5,
            }}
          >
            TOTAL
          </Text>
          <Text style={{ color: NAVY, fontSize: 20, fontWeight: '900' }}>
            {price(total)}
          </Text>
        </View>

        <PrimaryButton title="CHECKOUT" onPress={onCheckout} />
        <Pressable
          onPress={clear}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
            }}
          >
            CLEAR CART
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AccountTab({ user, onSignOut }) {
  const { updateProfile, token } = useAuth();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Addresses state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const LABELS = { name: 'Full name', phone: 'Phone number', email: 'Email address' };
  const HINTS = { name: 'Used to greet you and pre-fill checkout.', phone: 'Optional. Pre-fills checkout so you do not retype it.', email: 'You will use this email to sign in next time.' };

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const r = await listMyAddresses(token);
      setAddresses(r.data || []);
    } catch {
      // silent
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const startEdit = (field) => {
    setEditing(field);
    setDraft(user[field] || '');
    setError('');
    setSuccess('');
  };

  const cancel = () => {
    setEditing(null);
    setDraft('');
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateProfile({ [editing]: draft });
      setSuccess(`${LABELS[editing]} updated.`);
      setEditing(null);
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async (form) => {
    if (editingAddress) {
      await updateAddress(token, editingAddress.id, form);
    } else {
      await createAddress(token, form);
    }
    await loadAddresses();
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm && !Alert) return; // fallback
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteAddress(token, id);
            await loadAddresses();
          } catch (e) {
            setError(e.message || 'Could not delete address.');
          }
        }
      }
    ]);
  };

  const setDefault = async (id) => {
    try {
      await updateAddress(token, id, { isDefault: true });
      await loadAddresses();
    } catch (e) {
      setError(e.message || 'Could not set default.');
    }
  };

  const fields = ['name', 'phone', 'email'];

  const renderRow = (field, isLast) => {
    const isEditing = editing === field;
    const value = user[field];

    if (isEditing) {
      return (
        <View key={field} style={d.accountEditRow}>
          <Text style={d.accountLabel}>{LABELS[field].toUpperCase()}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            style={d.accountEditInput}
            autoFocus
            editable={!saving}
            keyboardType={field === 'phone' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            autoCorrect={field === 'email' ? false : true}
          />
          {HINTS[field] ? <Text style={d.accountEditHint}>{HINTS[field]}</Text> : null}
          <View style={d.accountEditActions}>
            <Pressable onPress={cancel} disabled={saving} style={d.accountEditBtn}>
              <Text style={d.accountEditBtnText}>CANCEL</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} style={[d.accountEditBtn, d.accountEditBtnPrimary]}>
              <Text style={d.accountEditBtnTextPrimary}>{saving ? 'SAVING…' : 'SAVE'}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View key={field} style={[d.accountRow, isLast && d.accountRowLast]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={d.accountLabel}>{LABELS[field].toUpperCase()}</Text>
          {value ? <Text style={d.accountValue}>{value}</Text> : <Text style={[d.accountValue, { color: MUTED, fontStyle: 'italic' }]}>Not set</Text>}
        </View>
        <Pressable onPress={() => startEdit(field)} hitSlop={8} style={d.accountEditIcon}>
          <Text style={d.accountEditIconText}>EDIT</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={d.accountScroll} showsVerticalScrollIndicator={false}>
      <Text style={d.sectionTitle}>YOUR ACCOUNT</Text>
      <Text style={d.sectionSubtitle}>These details pre-fill your checkout. Update them any time.</Text>

      {error ? <View style={d.accountEditError}><Text style={{ color: '#F87171', fontSize: 12 }}>{error}</Text></View> : null}
      {success ? <View style={d.accountEditSuccess}><Text style={{ color: '#2E8D86', fontSize: 12, fontWeight: '700' }}>{success}</Text></View> : null}

      <View style={d.accountCard}>
        {fields.map((f, i) => renderRow(f, i === fields.length - 1))}
      </View>

      {/* Saved Addresses Section */}
      <View style={{ marginTop: 10 }}>
        <Text style={d.sectionTitle}>SAVED ADDRESSES</Text>
        <Text style={d.sectionSubtitle}>Manage your delivery locations.</Text>

        {loadingAddresses ? (
          <ActivityIndicator color={TEAL} style={{ margin: 20 }} />
        ) : addresses.length === 0 ? (
          <Text style={{ color: MUTED, fontSize: 12, fontStyle: 'italic', marginBottom: 10 }}>No addresses saved yet.</Text>
        ) : (
          addresses.map((addr) => (
            <View key={addr.id} style={d.addressCard}>
              {addr.is_default && (
                <View style={d.addressDefaultBadge}><Text style={d.addressDefaultText}>DEFAULT</Text></View>
              )}
              <Text style={d.addressLabelText}>{addr.label || 'Address'}</Text>
              <Text style={d.addressText}>
                {addr.recipient_name}{'\n'}
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}{'\n'}
                {addr.city}, {addr.province} {addr.postal_code}{'\n'}
                {addr.phone}
              </Text>
              <View style={d.addressActions}>
                <Pressable onPress={() => { setEditingAddress(addr); setAddressModalOpen(true); }}>
                  <Text style={d.addressActionBtn}>EDIT</Text>
                </Pressable>
                {!addr.is_default && (
                  <Pressable onPress={() => setDefault(addr.id)}>
                    <Text style={d.addressActionBtn}>SET DEFAULT</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => handleDeleteAddress(addr.id)}>
                  <Text style={d.addressActionBtnDanger}>DELETE</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable style={d.addAddressBtn} onPress={() => { setEditingAddress(null); setAddressModalOpen(true); }}>
          <Text style={d.addAddressBtnText}>+ ADD NEW ADDRESS</Text>
        </Pressable>
      </View>

      <View style={[d.accountCard, { marginTop: 20 }]}>
        <View style={[d.accountMutedRow, { borderTopWidth: 0 }]}>
          <Text style={d.accountMutedLabel}>Wishlist</Text>
          <Text style={d.accountMutedBadge}>COMING SOON</Text>
        </View>
        <View style={d.accountMutedRow}>
          <Text style={d.accountMutedLabel}>Change password</Text>
          <Text style={d.accountMutedBadge}>COMING SOON</Text>
        </View>
      </View>

      <Pressable onPress={onSignOut} style={d.signOutBtn}>
        <Text style={d.signOutBtnText}>SIGN OUT</Text>
      </Pressable>

      {addressModalOpen && (
        <AddressModal
          visible={addressModalOpen}
          initialData={editingAddress}
          onClose={() => setAddressModalOpen(false)}
          onSave={handleSaveAddress}
        />
      )}
    </ScrollView>
  );
}





















function NotificationsView({ onClose }) {
  const { notifications, markAllAsRead, loading } = useNotifications();

  useEffect(() => {
    // Mark all as read when the view opens
    markAllAsRead();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Pressable onPress={onClose} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <Text style={{ color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }}>
          ← BACK
        </Text>
      </Pressable>

      {loading && notifications.length === 0 ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={d.emptyBox}>
          <Text style={d.emptyGlyph}>◔</Text>
          <Text style={d.emptyTitle}>No notifications yet</Text>
          <Text style={d.emptyText}>Updates about your orders and account will appear here.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <View key={n.id} style={{ backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: n.is_read ? INK : TEAL }}>{n.title}</Text>
                <Text style={{ fontSize: 10, color: MUTED }}>{formatOrderDate(n.created_at)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: INK, lineHeight: 18 }}>{n.message}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}







export default function DashboardScreen({ onOpenProduct }) {
  const { user, signOut } = useAuth();
  const { addItem, count } = useCart();

  const [tab, setTab] = useState('shop');
  const [showNotifications, setShowNotifications] = useState(false);
   const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [toast, setToast] = useState('');
    // Checkout is a full-screen mode within the dashboard — no tabs, no topbar
  const [checkoutMode, setCheckoutMode] = useState(false);

  const firstName = user && user.name ? user.name.split(' ')[0] : '';
    const handleCheckoutComplete = (result) => {
    setCheckoutMode(false);
    if (result?.action === 'orders') setTab('orders');
    else if (result?.action === 'shop') setTab('shop');
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodData, catData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch {
      setError(
        'We could not connect to the catalogue. Check that the backend is running and your phone can reach your computer.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const t = setTimeout(() => setWelcomeVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleAddToCart = (product, config) => {
    const finalConfig =
      config || defaultConfigForProductType(product.product_type);
    addItem(product, finalConfig, 1);
    showToast(`${product.name} added to cart`);
  };

  const goToShop = () => {
    setShowNotifications(false);
    setTab('shop');
  };

  const goToCart = () => {
    setShowNotifications(false);
    setTab('cart');
  };

  // Full-screen checkout. Replaces the entire dashboard shell while active,
  // because CheckoutScreen has its own header and footer.
  if (checkoutMode) {
    return (
      <CheckoutScreen
        onBack={() => setCheckoutMode(false)}
        onSignIn={() => {
          // In dashboard context, the user is always signed in.
          // This branch is defensive only.
          setCheckoutMode(false);
        }}
        onComplete={handleCheckoutComplete}
      />
    );
  }


















  const renderBody = () => {
    if (showNotifications) {
      return (
        <NotificationsView onClose={() => setShowNotifications(false)} />
      );
    }
    if (tab === 'shop') {
      return (
        <ShopTab
          products={products}
          categories={categories}
          loading={loading}
          error={error}
          onRetry={loadProducts}
          onOpenProduct={onOpenProduct}
          onAddToCart={handleAddToCart}
        />
      );
    }
    if (tab === 'orders') {
      return <OrdersTab user={user} onGoToShop={goToShop} />;
    }
        if (tab === 'cart') {
      return (
        <CartTab
          onCheckout={() => setCheckoutMode(true)}
          onGoToShop={goToShop}
        />
      );
    }
    if (tab === 'account') {
      return <AccountTab user={user} onSignOut={signOut} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={d.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <TopBar
        user={user}
        cartCount={count}
        onBell={() => setShowNotifications(true)}
        onCart={goToCart}
      />

      {welcomeVisible && !showNotifications && (
        <View
          style={{
            backgroundColor: GOLD,
            paddingVertical: 10,
            paddingHorizontal: 20,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: NAVY,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.2,
            }}
          >
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </Text>
        </View>
      )}

      <View style={d.content}>{renderBody()}</View>

      {toast ? (
        <View
          style={{
            position: 'absolute',
            bottom: 90,
            left: 20,
            right: 20,
            backgroundColor: NAVY,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              color: GOLD,
              fontSize: 11,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {toast}
          </Text>
        </View>
      ) : null}

      <BottomTabs
        active={showNotifications ? null : tab}
        onChange={(t) => {
          setShowNotifications(false);
          setTab(t);
        }}
        cartCount={count}
      />
    </SafeAreaView>
  );
}