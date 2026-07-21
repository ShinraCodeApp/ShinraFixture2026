import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, Share, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.shinra.fixture2026';
const PLAY_STORE_QR = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(PLAY_STORE_URL)}`;

const SHARE_TEXT = `⚽ ShinraFixture 2026 — Seguí el Mundial con predicciones, estadísticas en vivo y IA.\nDescargá gratis en Google Play:\n${PLAY_STORE_URL}`;

export function ShareAppScreen() {
  const navigation = useNavigation();
  const { appColors } = useAppTheme();
  const [zoomQR, setZoomQR] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({ message: SHARE_TEXT, url: PLAY_STORE_URL, title: 'ShinraFixture 2026' });
    } catch {
      Linking.openURL(PLAY_STORE_URL);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Compartir la app</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Hero */}
        <LinearGradient colors={['#0D47A1', '#1565C0']} style={styles.hero}>
          <MaterialCommunityIcons name="soccer" size={44} color="white" />
          <Text style={styles.heroTitle}>Shinra Fixture Ligas</Text>
          <Text style={styles.heroSub}>¡Compartí la app con tus amigos y seguí las ligas juntos!</Text>
        </LinearGradient>

        {/* Play Store button */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>GOOGLE PLAY</Text>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.85}>
          <LinearGradient colors={['#1D7A46', '#2E9E5A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareButton}>
            <View style={styles.shareIcon}>
              <Ionicons name="logo-google-playstore" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir — Google Play</Text>
              <Text style={styles.shareSub}>Instalación directa, siempre actualizada</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.openStoreBtn, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
          onPress={() => Linking.openURL(PLAY_STORE_URL)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google-playstore" size={18} color={colors.primary} />
          <Text style={[styles.openStoreTxt, { color: colors.primary }]}>Abrir en Play Store</Text>
          <Ionicons name="open-outline" size={15} color={colors.primary} />
        </TouchableOpacity>

        {/* QR */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>QR DE DESCARGA</Text>
        <Text style={[styles.hint, { color: appColors.textSecondary }]}>
          Escaneá para descargar directamente desde Google Play
        </Text>

        <View style={[styles.qrCard, { backgroundColor: appColors.surface }]}>
          <TouchableOpacity style={styles.qrWrapper} onPress={() => setZoomQR(true)} activeOpacity={0.8}>
            <Image source={{ uri: PLAY_STORE_QR }} style={styles.qrImage} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={[styles.qrHint, { color: appColors.textSecondary }]}>Tocá para agrandar</Text>
          <TouchableOpacity style={[styles.qrBtn, { backgroundColor: '#1D7A46' }]} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={14} color="white" />
            <Text style={styles.qrBtnText}>Compartir enlace</Text>
          </TouchableOpacity>
        </View>

        {/* Modal zoom QR */}
        <Modal visible={zoomQR} transparent animationType="fade" onRequestClose={() => setZoomQR(false)}>
          <TouchableOpacity style={styles.zoomOverlay} onPress={() => setZoomQR(false)} activeOpacity={1}>
            <View style={styles.zoomCard}>
              <Image source={{ uri: PLAY_STORE_QR }} style={styles.zoomImage} resizeMode="contain" />
              <Text style={styles.zoomHint}>Tocá para cerrar</Text>
            </View>
          </TouchableOpacity>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 36, alignItems: 'flex-start' },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  content: { padding: spacing.base, paddingBottom: spacing.xxxl, gap: spacing.base },

  hero: {
    borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  heroTitle: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.fontSize.sm, textAlign: 'center' },

  sectionTitle: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8, marginTop: spacing.sm,
  },
  hint: { fontSize: typography.fontSize.xs, textAlign: 'center' },

  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    padding: spacing.base, borderRadius: borderRadius.lg, ...shadows.lg,
  },
  shareIcon: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  shareLabel: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  shareSub: { color: 'rgba(255,255,255,0.7)', fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, marginTop: 2 },

  openStoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  openStoreTxt: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.base },

  qrCard: {
    borderRadius: borderRadius.xl, padding: spacing.base,
    alignItems: 'center', gap: spacing.sm, ...shadows.sm,
  },
  qrWrapper: { padding: 10, backgroundColor: 'white', borderRadius: borderRadius.md },
  qrImage: { width: 180, height: 180 },
  qrHint: { fontSize: typography.fontSize.xs },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  qrBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },

  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' },
  zoomCard: { alignItems: 'center', gap: spacing.base },
  zoomImage: { width: 300, height: 300, backgroundColor: 'white', borderRadius: borderRadius.lg },
  zoomHint: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.sm },
});
