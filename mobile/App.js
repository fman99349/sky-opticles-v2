// Main app file for SKY OPTICLES
import { NotificationProvider } from './notifications/NotificationContext';
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

import { styles } from './styles';
import DetailScreen from './screens/DetailScreen';
import { fetchProducts, fetchProductDetail, fetchCategories } from './utils/api';
import {
  applyFilters,
  buildFilterTabs,
  category,
  imageFor,
  price,
} from './utils/product';
import { defaultConfigForProductType } from './data/lensOptions';
import { CartProvider, useCart } from './cart/CartContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Brand from './components/Brand';
import PrimaryButton from './components/PrimaryButton';
import ProductCard from './components/ProductCard';
import FilterTabs from './components/FilterTabs';
import CartScreen from './screens/CartScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import DashboardScreen from './screens/DashboardScreen';
import { HomeIcon, CartIcon } from './components/Icons';
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
    eyebrow: 'THE ART OF SEEING',
    title: 'See the world\nin a new light.',
    description: 'Eyewear that brings your individuality into focus.',
    image:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=85',
  },
  {
    eyebrow: 'TIMELESS DESIGN',
    title: 'Your style.\nYour signature.',
    description: 'Discover frames made to complement your everyday.',
    image:
      'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1100&q=85',
  },
  {
    eyebrow: 'THE SUN COLLECTION',
    title: 'Meet your\nsunny side.',
    description: 'Make every moment a little more remarkable.',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1100&q=85',
  },
];

function WelcomeScreen({ onBrowse, onSignIn }) {
  const { user, signOut } = useAuth();
  const [slide, setSlide] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setSlide((current) => (current + 1) % SLIDES.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
      });
    }, 5200);

    return () => clearInterval(timer);
  }, [fade]);

  const changeSlide = (index) => {
    if (index === slide) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSlide(index);
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
          <Image
            key={current.image}
            source={{ uri: current.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
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
                accessibilityLabel={`Show slide ${index + 1}`}
                style={[styles.dot, index === slide && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.welcomeBottom}>
        <Text style={styles.welcomeHeadline}>
          More than eyewear.{' '}
          <Text style={styles.welcomeHeadlineAccent}>It's you.</Text>
        </Text>

        <PrimaryButton title="GET STARTED" onPress={onBrowse} />

        {!user && (
          <Pressable style={styles.secondaryLink} onPress={onSignIn}>
            <Text style={styles.secondaryLinkText}>
              Already have an account?{' '}
              <Text style={styles.goldText}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function CatalogueScreen({ onBack, onProduct, onOpenCart, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const { count } = useCart();

  const loadProducts = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
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
        'We could not connect to your catalogue. Check that the backend is running and your phone can reach your computer.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const tabs = buildFilterTabs(categories);
  const activeTab = tabs.find((t) => t.id === activeFilter) || tabs[0];
  const filtered = applyFilters(products, query, activeTab);

  return (
    <SafeAreaView style={styles.catalogueSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.catalogueHeaderCompact}>
        <View style={styles.catalogueTopRow}>
          <Pressable onPress={onBack} style={styles.headerBtnRow}>
            <HomeIcon color={C.gold} size={14} />
            <Text style={styles.backLinkText}>HOME</Text>
          </Pressable>

          <Pressable
            onPress={onOpenCart}
            style={styles.headerCartBtn}
            hitSlop={10}
            accessibilityLabel={`Open cart, ${count} items`}
          >
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

      <View style={styles.searchBox}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search..."
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.clearText}>CLEAR</Text>
          </Pressable>
        )}
      </View>

      <FilterTabs tabs={tabs} activeId={activeFilter} onChange={setActiveFilter} />

      <View style={styles.collectionHeader}>
        <View>
          <Text style={styles.collectionTitle}>THE COLLECTION</Text>
          <Text style={styles.collectionSubtitle}>
            {loading
              ? 'Discovering...'
              : `${filtered.length} piece${filtered.length === 1 ? '' : 's'} to explore`}
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
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={onProduct}
              onAddToCart={onAddToCart}
            />
          )}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadProducts(true)}
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Nothing found just yet</Text>
              <Text style={styles.stateDescription}>
                Try a different search or filter.
              </Text>
            </View>
          }
          ListFooterComponent={
            <Text style={styles.listFooter}>CRAFTED FOR YOUR POINT OF VIEW.</Text>
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
    if (user && (screen === 'signin' || screen === 'signup')) {
      setScreen('catalogue');
    }
  }, [user, screen]);

  if (restoring) {
    return (
      <SafeAreaView style={styles.welcomeSafe}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={{ color: C.white, marginTop: 14, fontSize: 12, letterSpacing: 1.2 }}>
            LOADING YOUR SESSION...
          </Text>
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
    return (
      <CatalogueScreen
        onBack={() => setScreen('welcome')}
        onProduct={(product) => { setSelectedProduct(product); setScreen('detail'); }}
        onOpenCart={() => setScreen('cart')}
        onAddToCart={handleAddToCart}
      />
    );
  }

  if (screen === 'detail' && selectedProduct) {
    return <DetailScreen product={selectedProduct} onBack={() => setScreen('catalogue')} onAddToCart={handleAddToCart} />;
  }

  if (screen === 'cart') {
    return (
      <CartScreen
        onBack={() => setScreen('catalogue')}
        onCheckout={() => {
          Alert.alert(
            'Sign in to check out',
            'Your cart is saved. Sign in or create an account to place your order.',
            [
              { text: 'Keep browsing', style: 'cancel' },
              { text: 'Sign In', onPress: () => setScreen('signin') },
            ]
          );
        }}
      />
    );
  }

  if (screen === 'signin') {
    return <SignInScreen onBack={() => setScreen('welcome')} onGoToSignUp={() => setScreen('signup')} />;
  }

  if (screen === 'signup') {
    return <SignUpScreen onBack={() => setScreen('welcome')} onGoToSignIn={() => setScreen('signin')} />;
  }

  return <WelcomeScreen onBrowse={() => setScreen('catalogue')} onSignIn={() => setScreen('signin')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <RootApp />
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}