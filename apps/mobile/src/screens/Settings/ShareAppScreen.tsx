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

const APK_DRIVE_URL =
  'https://drive.google.com/uc?export=download&id=1If7JUMqKt3BPX2gzZMFFMICJl0EIS9hB';
const APK_DRIVE_SHARE_URL =
  'https://drive.google.com/file/d/1If7JUMqKt3BPX2gzZMFFMICJl0EIS9hB/view?usp=sharing';
const APK_GITHUB_URL =
  'https://github.com/ShinraCodeApp/ShinraFixture2026/releases/latest/download/app-release.apk';

const QR_DRIVE = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(APK_DRIVE_SHARE_URL)}`;
const QR_GITHUB = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(APK_GITHUB_URL)}`;

export function ShareAppScreen() {
  const navigation = useNavigation();
  const { appColors } = useAppTheme();
  const [zoomQR, setZoomQR] = useState<string | null>(null);

  const handleShare = async (url: string, source: 'Drive' | 'GitHub') => {
    try {
      await Share.share({
        message: `⚽ Instalá ShinraFixture 2026 desde ${source}:\n${url}`,
        url,
        title: 'ShinraFixture 2026 — APK',
      });
    } catch {
      Linking.openURL(url);
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

        {/* ── Botones de compartir ── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>ENLACE DE DESCARGA</Text>

        <TouchableOpacity onPress={() => handleShare(APK_DRIVE_SHARE_URL, 'Drive')} activeOpacity={0.85} style={{ marginBottom: spacing.sm }}>
          <LinearGradient colors={['#0D47A1', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareButton}>
            <View style={styles.shareIcon}>
              <MaterialCommunityIcons name="google-drive" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir — Google Drive</Text>
              <Text style={styles.shareSub}>Abre el archivo en Drive para descargar</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleShare(APK_GITHUB_URL, 'GitHub')} activeOpacity={0.85}>
          <LinearGradient colors={['#1B1F23', '#24292E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareButton}>
            <View style={styles.shareIcon}>
              <MaterialCommunityIcons name="github" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir — GitHub</Text>
              <Text style={styles.shareSub}>Siempre descarga la última versión</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── QR codes ── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>QR DE DESCARGA</Text>
        <Text style={[styles.hint, { color: appColors.textSecondary }]}>
          Tocá el QR para agrandarlo y escanearlo más fácil
        </Text>

        <View style={styles.qrRow}>
          {/* Drive QR */}
          <View style={[styles.qrCard, { backgroundColor: appColors.surface }]}>
            <View style={styles.qrLabelRow}>
              <MaterialCommunityIcons name="google-drive" size={14} color="#4285F4" />
              <Text style={[styles.qrLabel, { color: '#4285F4' }]}>Google Drive</Text>
            </View>
            <TouchableOpacity style={styles.qrWrapper} onPress={() => setZoomQR(QR_DRIVE)} activeOpacity={0.8}>
              <Image source={{ uri: QR_DRIVE }} style={styles.qrImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qrBtn, { backgroundColor: '#4285F4' }]} onPress={() => handleShare(APK_DRIVE_SHARE_URL, 'Drive')} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={13} color="white" />
              <Text style={styles.qrBtnText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          {/* GitHub QR */}
          <View style={[styles.qrCard, { backgroundColor: appColors.surface }]}>
            <View style={styles.qrLabelRow}>
              <MaterialCommunityIcons name="github" size={14} color={appColors.text} />
              <Text style={[styles.qrLabel, { color: appColors.text }]}>GitHub</Text>
            </View>
            <TouchableOpacity style={styles.qrWrapper} onPress={() => setZoomQR(QR_GITHUB)} activeOpacity={0.8}>
              <Image source={{ uri: QR_GITHUB }} style={styles.qrImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qrBtn, { backgroundColor: '#24292E' }]} onPress={() => handleShare(APK_GITHUB_URL, 'GitHub')} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={13} color="white" />
              <Text style={styles.qrBtnText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal zoom QR */}
        <Modal visible={!!zoomQR} transparent animationType="fade" onRequestClose={() => setZoomQR(null)}>
          <TouchableOpacity style={styles.zoomOverlay} onPress={() => setZoomQR(null)} activeOpacity={1}>
            <View style={styles.zoomCard}>
              <Image source={{ uri: zoomQR ?? '' }} style={styles.zoomImage} resizeMode="contain" />
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
  content: { padding: spacing.base, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.base,
  },
  hint: { fontSize: typography.fontSize.xs, textAlign: 'center', marginBottom: spacing.base },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    padding: spacing.base, borderRadius: borderRadius.lg, ...shadows.lg,
  },
  shareIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  shareLabel: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  shareSub: { color: 'rgba(255,255,255,0.7)', fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, marginTop: 2 },
  qrRow: { flexDirection: 'row', gap: spacing.sm },
  qrCard: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: 'center', gap: spacing.xs, ...shadows.sm },
  qrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qrLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  qrWrapper: { padding: 8, backgroundColor: 'white', borderRadius: borderRadius.md },
  qrImage: { width: 130, height: 130 },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.full,
  },
  qrBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: 11 },
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  zoomCard: { alignItems: 'center', gap: spacing.base },
  zoomImage: { width: 300, height: 300, backgroundColor: 'white', borderRadius: borderRadius.lg },
  zoomHint: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.sm },
});
