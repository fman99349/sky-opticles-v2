import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import Typewriter from './components/Typewriter';

import { styles } from './styles';
import { fetchProducts, fetchProductDetail, fetchCategories } from './utils/api';
import {
  applyFilters,
  buildTabHierarchy,
  category,
  imageFor,
  price,
} from './utils/product';
import { defaultConfigForProductType } from './data/lensOptions';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import { CartProvider, useCart } from './cart/CartContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { NotificationProvider } from './notifications/NotificationContext';
import { CurrencyProvider, useCurrency } from './utils/CurrencyContext';
import Brand from './components/Brand';
import PrimaryButton from './components/PrimaryButton';
import ProductCard from './components/ProductCard';
import FilterTabs from './components/FilterTabs';
import ConditionDropdown from './components/ConditionDropdown';
import CartScreen from './screens/CartScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import DashboardScreen from './screens/DashboardScreen';
import { HomeIcon, CartIcon } from './components/Icons';
import DetailScreen from './screens/DetailScreen';
import LensWizard from './screens/LensWizard';
import VariantPicker from './components/VariantPicker';

const C = {
  navy: '#101D2C',
  navyLight: '#1D3044',
  cream: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#D7B987',
  ink: '#17283A',
  muted: '#7C8792',
  border: '#E7E3DC',
  teal: '#2E8D86',
};

const SLIDES = [
  {
    eyebrow: 'THE NEW ERA OF SHOPPING',
    title: 'Everything you need.\nIn one place.',
    description: 'Discover top-tier electronics, home essentials, and fashion.',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1100&q=85',
  },
  {
    eyebrow: 'PREMIUM LIFESTYLE',
    title: 'Upgrade your\neveryday.',
    description: 'Browse curated products from around the world.',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85',
  },
  {
    eyebrow: 'OPTICS & BEYOND',
    title: 'See the world.\nBuy the world.',
    description: 'From prescription lenses to high-end tech.',
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1100&q=85',
  },
];

function WelcomeScreen({ onBrowse, onSignIn }) {
  const { user, signOut } = useAuth();
  const [slide, setSlide] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setSlide((current) => (current + 1) % SLIDES.length);
        Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [fade]);

  const changeSlide = (index) => {
    if (index === slide) return;
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setSlide(index);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const current = SLIDES[slide];

  return (
    <SafeAreaView style={styles.welcomeSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={styles.welcomeTop}>
        <Brand />
        {user ? (
          <Pressable onPress={signOut} hitSlop={12}>
            <Text style={styles.topSignIn}>SIGN OUT</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onSignIn} hitSlop={12}>
            <Text style={styles.topSignIn}>SIGN IN</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        <Animated.View style={[styles.heroImageWrap, { opacity: fade }]}>
          <Image key={current.image} source={{ uri: current.image }} style={styles.heroImage} resizeMode="cover" />
        </Animated.View>
        <View style={styles.heroShadeTop} pointerEvents="none" />
        <View style={styles.heroShadeBottom} pointerEvents="none" />
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>{current.eyebrow}</Text>
          <Text style={styles.heroTitle}>{current.title}</Text>
          <Text style={styles.heroDescription}>{current.description}</Text>
          <View style={styles.dots}>
            {SLIDES.map((item, index) => (
              <Pressable
                key={item.eyebrow}
                onPress={() => changeSlide(index)}
                style={[styles.dot, index === slide && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.welcomeBottom}>
        <Typewriter 
          text="More than a store. It's Diamond Dee." 
          style={styles.welcomeHeadline} 
          delay={70} 
        />
        
        <PrimaryButton title="GET STARTED" onPress={onBrowse} />
        {!user && (
          <Pressable style={styles.secondaryLink} onPress={onSignIn}>
            <Text style={styles.secondaryLinkText}>
              Already have an account? <Text style={styles.goldText}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function CatalogueScreen({ onBack, onProduct, onOpenCart, onAddToCart }) {
  const { currency, changeCurrency } = useCurrency();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [activeParentId, setActiveParentId] = useState('all');
  const [activeChildId, setActiveChildId] = useState('all');
  const [condition, setCondition] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const { count } = useCart();

  const loadProducts = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const [prodData, catData] = await Promise.all([
        fetchProducts(currency),
        fetchCategories(),
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch {
      setError('We could not connect to your catalogue. Check that the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currency]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const { parents, childrenByParent } = buildTabHierarchy(categories);
  const childTabs = childrenByParent[activeParentId] || [];

  let validCategoryNames = null;
  if (activeChildId !== 'all') {
    const selectedChild = childTabs.find((c) => c.id === activeChildId);
    if (selectedChild) validCategoryNames = [selectedChild.label];
  } else if (activeParentId !== 'all') {
    const selectedParent = parents.find((p) => p.id === activeParentId);
    validCategoryNames = childTabs.map((c) => c.label);
    if (selectedParent) validCategoryNames.push(selectedParent.label);
  }

  const filtered = applyFilters(products, query, condition, validCategoryNames);

  return (
    <SafeAreaView style={styles.catalogueSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.catalogueHeaderCompact}>
        <View style={styles.catalogueTopRow}>
          <Pressable onPress={onBack} style={styles.headerBtnRow}>
            <HomeIcon color={C.gold} size={14} />
            <Text style={styles.backLinkText}>HOME</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={() => changeCurrency(currency === 'ZAR' ? 'USD' : currency === 'USD' ? 'GBP' : 'ZAR')}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: '#1D3044', marginRight: 12 }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: '900' }}>{currency} ▼</Text>
            </Pressable>

            <Pressable onPress={onOpenCart} style={styles.headerCartBtn} hitSlop={10}>
              <CartIcon color={C.gold} size={22} />
              {count > 0 && (
                <View style={styles.headerCartBadge}>
                  <Text style={styles.headerCartBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        <Brand />
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search..." placeholderTextColor={C.muted} style={styles.searchInput} returnKeyType="search" />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}><Text style={styles.clearText}>CLEAR</Text></Pressable>
        )}
      </View>

      <ConditionDropdown value={condition} onChange={setCondition} />

      <FilterTabs
        parentTabs={parents}
        childTabs={childTabs}
        activeParentId={activeParentId}
        activeChildId={activeChildId}
        onParentChange={(id) => { setActiveParentId(id); setActiveChildId('all'); }}
        onChildChange={setActiveChildId}
      />

      <View style={styles.collectionHeader}>
        <View>
          <Text style={styles.collectionTitle}>THE COLLECTION</Text>
          <Text style={styles.collectionSubtitle}>
            {loading ? 'Discovering...' : `${filtered.length} piece${filtered.length === 1 ? '' : 's'} to explore`}
          </Text>
        </View>
        <Text style={styles.collectionMark}>S / O</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={styles.stateTitle}>Curating your collection...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Catalogue unavailable</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <PrimaryButton title="TRY AGAIN" onPress={() => loadProducts()} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          renderItem={({ item }) => <ProductCard product={item} onPress={onProduct} onAddToCart={onAddToCart} currency={currency} />}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadProducts(true)}
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Nothing found just yet</Text>
              <Text style={styles.stateDescription}>Try a different search or filter.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function RootApp() {
  const { user, restoring } = useAuth();
  const [screen, setScreen] = useState('welcome');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (user && (screen === 'signin' || screen === 'signup')) setScreen('catalogue');
  }, [user, screen]);

  if (restoring) {
    return (
      <SafeAreaView style={styles.welcomeSafe}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={{ color: C.white, marginTop: 14, fontSize: 12, letterSpacing: 1.2 }}>LOADING YOUR SESSION...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddToCart = (product, config) => {
    const finalConfig = config || defaultConfigForProductType(product.product_type);
    addItem(product, finalConfig, 1);
    setScreen('cart');
  };

  if (user && screen !== 'signin' && screen !== 'signup') {
    if (screen === 'detail' && selectedProduct) {
      return <DetailScreen product={selectedProduct} onBack={() => setScreen('welcome')} onAddToCart={handleAddToCart} />;
    }
    return <DashboardScreen onOpenProduct={(product) => { setSelectedProduct(product); setScreen('detail'); }} />;
  }

  if (screen === 'catalogue') {
    return <CatalogueScreen onBack={() => setScreen('welcome')} onProduct={(product) => { setSelectedProduct(product); setScreen('detail'); }} onOpenCart={() => setScreen('cart')} onAddToCart={handleAddToCart} />;
  }

  if (screen === 'detail' && selectedProduct) {
    return <DetailScreen product={selectedProduct} onBack={() => setScreen('catalogue')} onAddToCart={handleAddToCart} />;
  }

  if (screen === 'cart') {
    return (
      <CartScreen
        onBack={() => setScreen('catalogue')}
        onCheckout={() => {
          Alert.alert('Sign in to check out', 'Your cart is saved.', [
            { text: 'Keep browsing', style: 'cancel' },
            { text: 'Sign In', onPress: () => setScreen('signin') },
          ]);
        }}
      />
    );
  }

  if (screen === 'signin') {
    return (
      <SignInScreen 
        onBack={() => setScreen('welcome')} 
        onGoToSignUp={() => setScreen('signup')} 
        onForgotPassword={() => setScreen('forgotPassword')}
      />
    );
  }
  
  if (screen === 'signup') {
    return <SignUpScreen onBack={() => setScreen('welcome')} onGoToSignIn={() => setScreen('signin')} />;
  }

  if (screen === 'forgotPassword') {
    return <ForgotPasswordScreen onBack={() => setScreen('signin')} />;
  }

  return <WelcomeScreen onBrowse={() => setScreen('catalogue')} onSignIn={() => setScreen('signin')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <CartProvider>
            <RootApp />
          </CartProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}