import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const C = {
  navy: '#101D2C',
  white: '#FFFFFF',
  gold: '#D7B987',
  teal: '#2E8D86',
};

const SCREEN_W = Dimensions.get('window').width;

/**
 * Horizontal swipeable image gallery with page dots and a fullscreen viewer.
 *
 * Props:
 *   images       — array of { id, image_url, variant_id, is_primary } (from API)
 *   fallbackUri  — a single image URL to show if `images` is empty
 *   height       — carousel height in px (default 250, matches detailImageBox)
 *   imagesKey    — any value that identifies this image set (e.g. variant id).
 *                  When it changes, the carousel resets to the first image.
 */
export default function ProductImageCarousel({
  images,
  fallbackUri,
  height = 250,
  imagesKey = 'default',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const scrollRef = useRef(null);

  // Build the list of URIs to display.
  const validImages = (images || []).filter((img) => img && img.image_url);
  const displayUris =
    validImages.length > 0
      ? validImages.map((img) => img.image_url)
      : fallbackUri
      ? [fallbackUri]
      : [];

  // Reset to image 0 when the image set changes (variant switch).
  useEffect(() => {
    setActiveIndex(0);
    if (scrollRef.current && carouselWidth > 0) {
      scrollRef.current.scrollTo({ x: 0, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey]);

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== carouselWidth) setCarouselWidth(w);
  };

  const onScrollEnd = (e) => {
    if (carouselWidth === 0) return;
    const x = e.nativeEvent.contentOffset.x;
    setActiveIndex(Math.round(x / carouselWidth));
  };

  if (displayUris.length === 0) {
    return (
      <View style={[styles.carousel, { height }]}>
        <Text style={styles.placeholder}>SKY OPTICLES</Text>
      </View>
    );
  }

  const showDots = displayUris.length > 1;

  return (
    <>
      <View style={[styles.carousel, { height }]} onLayout={onLayout}>
        {carouselWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
          >
            {displayUris.map((uri, i) => (
              <Pressable
                key={i}
                onPress={() => setFullscreenOpen(true)}
                style={{
                  width: carouselWidth,
                  height,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {showDots && (
          <View style={styles.dots} pointerEvents="box-none">
            {displayUris.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {displayUris.length > 1 && (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {activeIndex + 1} / {displayUris.length}
            </Text>
          </View>
        )}
      </View>

      {fullscreenOpen && (
        <FullscreenViewer
          uris={displayUris}
          initialIndex={activeIndex}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
    </>
  );
}

function FullscreenViewer({ uris, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const ref = useRef(null);

  useEffect(() => {
    // Defer until after layout so the ScrollView is mounted.
    const t = setTimeout(() => {
      ref.current?.scrollTo({
        x: initialIndex * SCREEN_W,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [initialIndex]);

  const onScrollEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    setIdx(Math.round(x / SCREEN_W));
  };

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.fullscreen}>
        <Pressable
          style={styles.fullscreenClose}
          onPress={onClose}
          hitSlop={12}
        >
          <Text style={styles.fullscreenCloseText}>×</Text>
        </Pressable>

        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {uris.map((uri, i) => (
            <View
              key={i}
              style={{
                width: SCREEN_W,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={{ uri }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.fullscreenFooter} pointerEvents="none">
          <Text style={styles.fullscreenCounterText}>
            {idx + 1} / {uris.length}
          </Text>
          {uris.length > 1 && (
            <View style={styles.fullscreenDots}>
              {uris.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.fullscreenDot,
                    i === idx && styles.fullscreenDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  carousel: {
    backgroundColor: '#EDEAE4',
    position: 'relative',
    marginBottom: 25,
    overflow: 'hidden',
  },
  image: {
    width: '88%',
    height: '88%',
  },
  placeholder: {
    color: C.teal,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 100,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(23, 40, 58, 0.35)',
  },
  dotActive: {
    width: 20,
    backgroundColor: C.navy,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(16, 29, 44, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  counterText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#0A1420',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseText: {
    color: C.white,
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
  },
  fullscreenImage: {
    width: '92%',
    height: '92%',
  },
  fullscreenFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  fullscreenCounterText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fullscreenDots: {
    flexDirection: 'row',
    gap: 6,
  },
  fullscreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  fullscreenDotActive: {
    width: 20,
    backgroundColor: C.gold,
  },
});