import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Bottom tab bar for the signed-in dashboard.
// Tab order: Shop, Orders, Cart, Account.
// Icons are Ionicons — outline when inactive, filled when active.
// The bar is intentionally slim so it does not compete with content.

// Tab definitions. Order here = order on screen (left to right).
// icon / iconActive swap based on whether the tab is currently selected.
const TABS = [
  { id: 'shop',    label: 'Shop',    icon: 'storefront-outline', iconActive: 'storefront' },
  { id: 'orders',  label: 'Orders',  icon: 'receipt-outline',    iconActive: 'receipt' },
  { id: 'cart',    label: 'Cart',    icon: 'cart-outline',       iconActive: 'cart' },
  { id: 'account', label: 'Account', icon: 'person-outline',     iconActive: 'person' },
];

// Local palette — kept inline so this component has no styling dependency.
const C = {
  navy: '#101D2C',      // bar background
  navyLight: '#1D3044', // thin top divider
  gold: '#D7B987',      // active tab colour
  muted: '#7C8792',     // inactive tab colour
};

export default function BottomTabs({ active, onChange, cartCount = 0 }) {
  return (
    <View
      style={{
        flexDirection: 'row',         // tabs sit side by side
        backgroundColor: C.navy,
        borderTopWidth: 1,            // subtle separator from content above
        borderTopColor: C.navyLight,
        paddingTop: 5,                // was 8  — trimmed
        paddingBottom: 7,             // was 12 — trimmed
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;

        // Colour and icon both react to the active state.
        const color = isActive ? C.gold : C.muted;
        const iconName = isActive ? tab.iconActive : tab.icon;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={{
              flex: 1,                  // equal width for each tab
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 3,       // was 6 — trimmed
            }}
            accessibilityLabel={`${tab.label} tab`}
          >
            {/* Icon wrapper is relatively positioned so the badge can anchor to it */}
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={18} color={color} />
              {/* was 22 — trimmed */}

              {/* Cart badge — only on the cart tab, only when there are items */}
              {tab.id === 'cart' && cartCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -12,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: C.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{
                      color: C.navy,
                      fontSize: 9,
                      fontWeight: '900',
                    }}
                  >
                    {cartCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Tiny label under the icon. Always uppercase for the retail look. */}
            <Text
              style={{
                color,
                fontSize: 9,            // was 10 — trimmed
                fontWeight: '800',
                letterSpacing: 0.8,
                marginTop: 3,           // was 4  — trimmed
              }}
            >
              {tab.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}