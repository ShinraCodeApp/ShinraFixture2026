import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const SOURCES = [
  { label: 'Telefe', url: 'https://www.mitelefe.com/telefe-en-vivo' },
  { label: 'TyC Sports', url: 'https://www.tycsports.com/en-vivo.html' },
  { label: 'ESPN+', url: 'https://www.espn.com.ar/deportes/' },
  { label: 'Canal 13', url: 'https://www.eltrecetv.com.ar/en-vivo', browserOnly: true },
  { label: 'TV Pública', url: 'https://www.tvpublica.com.ar/' },
  { label: 'Pluto TV', url: 'https://pluto.tv/latam/live-tv/66997d18a1b69e00082ee85f?lang=es' },
];

// Chrome Android user-agent to bypass mobile-blocking sites
const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export function LiveStreamTab() {
  const { appColors } = useAppTheme();
  const [sourceIdx, setSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const webviewRef = useRef<any>(null);

  const source = SOURCES[sourceIdx] as typeof SOURCES[0] & { browserOnly?: boolean };

  const handleSourceChange = (i: number) => {
    setSourceIdx(i);
    setLoading(true);
    setBlocked(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: appColors.background }]}>
      {/* Source tabs */}
      <View style={[styles.sourceTabs, { borderBottomColor: appColors.border }]}>
        {SOURCES.map((s, i) => (
          <TouchableOpacity
            key={s.label}
            style={[
              styles.sourceTab,
              i === sourceIdx && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => handleSourceChange(i)}
          >
            <Text
              style={[
                styles.sourceLabel,
                { color: i === sourceIdx ? colors.primary : appColors.textSecondary },
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: appColors.surface }]}>
        <Ionicons name="information-circle-outline" size={14} color={appColors.textSecondary} />
        <Text style={[styles.infoText, { color: appColors.textSecondary }]}>
          Algunos canales pueden bloquear la carga. Probá cambiando la fuente.
        </Text>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: appColors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: appColors.textSecondary }]}>
              Cargando {source.label}...
            </Text>
          </View>
        )}

        {(blocked || source.browserOnly) ? (
          <View style={[styles.blockedContainer, { backgroundColor: appColors.surface }]}>
            <Text style={styles.blockedIcon}>📺</Text>
            <Text style={[styles.blockedTitle, { color: appColors.text }]}>
              {source.browserOnly ? `${source.label} requiere el navegador` : `${source.label} bloqueó la carga`}
            </Text>
            <Text style={[styles.blockedSub, { color: appColors.textSecondary }]}>
              {source.browserOnly
                ? 'Este canal solo funciona en el navegador de tu teléfono.'
                : 'Este canal no permite ser visto desde otras apps.'}
            </Text>
            <TouchableOpacity
              style={[styles.altSourceBtn, { backgroundColor: colors.primary, marginBottom: spacing.sm }]}
              onPress={() => Linking.openURL(source.url)}
            >
              <Text style={styles.altSourceTxt}>Abrir en navegador</Text>
            </TouchableOpacity>
            <View style={styles.otherSources}>
              {SOURCES.filter((_, i) => i !== sourceIdx).map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={[styles.altSourceBtn, { backgroundColor: appColors.surfaceSecondary }]}
                  onPress={() => handleSourceChange(SOURCES.indexOf(s))}
                >
                  <Text style={[styles.altSourceTxt, { color: appColors.text }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            key={source.url}
            source={{ uri: source.url }}
            userAgent={CHROME_UA}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            mixedContentMode="always"
            onLoadStart={() => { setLoading(true); setBlocked(false); }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setBlocked(true); setLoading(false); }}
            onHttpError={(e) => {
              if (e.nativeEvent.statusCode >= 400) {
                setBlocked(true);
                setLoading(false);
              }
            }}
            style={styles.webview}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sourceTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sourceTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sourceLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 10,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  webviewContainer: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 1,
  },
  loadingText: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  webview: { flex: 1 },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  blockedIcon: { fontSize: 48 },
  blockedTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  blockedSub: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginBottom: spacing.base,
  },
  otherSources: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  altSourceBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  altSourceTxt: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
});
