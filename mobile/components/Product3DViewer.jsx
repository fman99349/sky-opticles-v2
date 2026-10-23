// mobile/components/Product3DViewer.jsx
//
// Full-screen 3D product viewer.
//
// Renders Google's <model-viewer> web component inside a WebView.
// Works in Expo Go (SDK 57) — no eject required.
// If the URL 404s or fails, shows a fallback card with a Close button.
//
// Props:
//   visible      boolean   — controls Modal visibility
//   modelUrl     string    — absolute URL to .glb/.gltf (from API)
//   posterUrl    string    — optional preview image
//   title        string    — shown in the header
//   onClose      () => void

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const NAVY = '#101D2C';
const GOLD = '#D7B987';
const TEAL = '#2E8D86';
const MUTED = '#7C8792';
const CREAM = '#F8F5EF';
const BORDER = '#E7E3DC';
const INK = '#17283A';

function buildHtml(modelUrl, posterUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
  <style>
    html, body { margin: 0; padding: 0; background: ${CREAM}; height: 100%; overflow: hidden; }
    model-viewer {
      width: 100vw;
      height: 100vh;
      --progress-bar-color: ${TEAL};
      --poster-color: ${CREAM};
    }
  </style>
</head>
<body>
  <model-viewer
    src="${modelUrl}"
    poster="${posterUrl || ''}"
    auto-rotate
    auto-rotate-delay="300"
    rotation-per-second="25deg"
    camera-controls
    touch-action="pan-y"
    ar
    ar-modes="webxr scene-viewer quick-look"
    shadow-intensity="1"
    exposure="1"
    environment-image="neutral">
  </model-viewer>
</body>
</html>
  `;
}

export default function Product3DViewer({
  visible,
  modelUrl,
  posterUrl,
  title,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webKey, setWebKey] = useState(Date.now());

  const handleClose = () => {
    // Reset internal state so the next open starts fresh
    setLoading(true);
    setError(false);
    setWebKey(Date.now());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: NAVY }}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#1D3044',
          }}
        >
          <Text
            style={{
              color: GOLD,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.4,
              flex: 1,
              paddingRight: 10,
            }}
            numberOfLines={1}
          >
            {title ? title.toUpperCase() : '3D VIEW'}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={{ color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }}>
              CLOSE
            </Text>
          </Pressable>
        </View>

        {/* Body */}
        <View style={{ flex: 1, backgroundColor: CREAM }}>
          {error ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 28,
              }}
            >
              <Text style={{ color: INK, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                3D view unavailable
              </Text>
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 18,
                  textAlign: 'center',
                  marginTop: 10,
                  maxWidth: 280,
                }}
              >
                We couldn't load the 3D model. Check your internet connection and try again.
              </Text>
              <Pressable
                onPress={() => {
                  setError(false);
                  setLoading(true);
                  setWebKey(Date.now());
                }}
                style={{
                  marginTop: 22,
                  backgroundColor: GOLD,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: NAVY, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }}>
                  TRY AGAIN
                </Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              key={webKey}
              originWhitelist={['*']}
              source={{ html: buildHtml(modelUrl, posterUrl) }}
              style={{ flex: 1, backgroundColor: CREAM }}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400) {
                  setLoading(false);
                  setError(true);
                }
              }}
            />
          )}

          {loading && !error && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: CREAM,
              }}
              pointerEvents="none"
            >
              <ActivityIndicator size="large" color={TEAL} />
              <Text
                style={{
                  color: MUTED,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1.2,
                  marginTop: 14,
                }}
              >
                LOADING 3D MODEL...
              </Text>
            </View>
          )}
        </View>

        {/* Footer hint */}
        <View
          style={{
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderTopWidth: 1,
            borderTopColor: '#1D3044',
          }}
        >
          <Text
            style={{
              color: '#7C8792',
              fontSize: 9,
              textAlign: 'center',
              letterSpacing: 1.1,
            }}
          >
            DRAG TO ROTATE · PINCH TO ZOOM
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}