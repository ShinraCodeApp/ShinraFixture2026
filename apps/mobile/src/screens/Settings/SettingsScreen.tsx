import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Switch, Alert, Share, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setAppIcon, setNotificationsEnabled, setFavoriteTeam, setLanguage, AppIconId, FavoriteTeam } from '../../store/slices/settingsSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { TeamPickerModal } from '../../components/common/TeamPickerModal';

const APK_BUILD_URL =
  'https://expo.dev/artifacts/eas/k9iRuLDPasnJWq3A6ot8yG.apk';

const ICONS: { id: AppIconId; label: string; description: string; image: ReturnType<typeof require> }[] = [
  {
    id: 'SCFixture1',
    label: 'SCFixture 1',
    description: 'Predeterminado',
    image: require('../../../assets/branding/SCFixture1.png'),
  },
  {
    id: 'SCFixture2',
    label: 'SCFixture 2',
    description: 'Alternativo',
    image: require('../../../assets/branding/SCFixture2.png'),
  },
];

export function SettingsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { appColors, isDark, toggleTheme } = useAppTheme();
  const { appIcon, notificationsEnabled, favoriteTeam, language } = useSelector((state: RootState) => state.settings);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);

  const handleShareApk = async () => {
    try {
      await Share.share({
        message: `Instala ShinraFixture 2026 (beta):\n${APK_BUILD_URL}`,
        url: APK_BUILD_URL,
        title: 'ShinraFixture 2026 — APK',
      });
    } catch {
      Linking.openURL(APK_BUILD_URL);
    }
  };

  const handleSelectIcon = (id: AppIconId) => {
    if (id === appIcon) return;
    dispatch(setAppIcon(id));
    Alert.alert(
      'Icono actualizado',
      'Tu preferencia se guardó. El icono del lanzador se aplicará en la próxima actualización de la app.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Configuración</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Icono de la app ──────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>ICONO DE LA APLICACIÓN</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.iconsRow}>
            {ICONS.map((icon) => {
              const isSelected = appIcon === icon.id;
              return (
                <TouchableOpacity
                  key={icon.id}
                  style={[
                    styles.iconOption,
                    { backgroundColor: appColors.surfaceSecondary },
                    isSelected && styles.iconOptionSelected,
                  ]}
                  onPress={() => handleSelectIcon(icon.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconImageWrapper}>
                    <Image source={icon.image} style={styles.iconImage} />
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.iconLabel, { color: appColors.text }]}>{icon.label}</Text>
                  <View style={[
                    styles.iconDescBadge,
                    { backgroundColor: isSelected ? colors.primary + '22' : appColors.border },
                  ]}>
                    <Text style={[styles.iconDesc, { color: isSelected ? colors.primary : appColors.textSecondary }]}>
                      {isSelected ? '✓ Activo' : icon.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.iconHint, { color: appColors.textSecondary }]}>
            El cambio de icono del lanzador se aplica en la próxima actualización
          </Text>
        </View>

        {/* ── Equipo favorito ──────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>MI EQUIPO</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <TouchableOpacity style={styles.teamRow} onPress={() => setTeamPickerVisible(true)} activeOpacity={0.75}>
            {favoriteTeam?.flagUrl ? (
              <Image source={{ uri: favoriteTeam.flagUrl }} style={styles.teamFlag} />
            ) : (
              <View style={[styles.teamFlagEmpty, { backgroundColor: appColors.surfaceSecondary }]}>
                <MaterialCommunityIcons name="shield-star-outline" size={24} color={appColors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: appColors.text }]}>
                {favoriteTeam ? favoriteTeam.name : 'Elegir equipo favorito'}
              </Text>
              {favoriteTeam && (
                <Text style={[styles.rowValue, { color: appColors.textSecondary }]}>
                  {favoriteTeam.code} · Toca para cambiar
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={appColors.textSecondary} />
          </TouchableOpacity>
          {favoriteTeam && (
            <TouchableOpacity
              style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: appColors.border }]}
              onPress={() => dispatch(setFavoriteTeam(null))}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={[styles.rowLabel, { color: colors.error }]}>Quitar equipo favorito</Text>
            </TouchableOpacity>
          )}
        </View>

        <TeamPickerModal
          visible={teamPickerVisible}
          onClose={() => setTeamPickerVisible(false)}
          onSelect={(team) => dispatch(setFavoriteTeam(team))}
          currentTeamId={favoriteTeam?.id}
        />

        {/* ── Apariencia ───────────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>APARIENCIA</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name={isDark ? 'weather-night' : 'white-balance-sunny'}
              size={20}
              color={appColors.textSecondary}
            />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>
              {isDark ? 'Modo oscuro' : 'Modo claro'}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: appColors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* ── Idioma ───────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>IDIOMA</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.row}>
            <Ionicons name="language" size={20} color={appColors.textSecondary} />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>Idioma de la app</Text>
            <View style={styles.langToggle}>
              {(['es', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBtn, language === lang && { backgroundColor: colors.primary }]}
                  onPress={() => dispatch(setLanguage(lang))}
                >
                  <Text style={[styles.langText, language === lang && { color: 'white' }]}>
                    {lang === 'es' ? '🇦🇷 ES' : '🇺🇸 EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Notificaciones ───────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>NOTIFICACIONES</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="bell-outline" size={20} color={appColors.textSecondary} />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>Notificaciones</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) => dispatch(setNotificationsEnabled(v))}
              trackColor={{ false: appColors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* ── Compartir APK ───────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>DISTRIBUCIÓN</Text>
        <TouchableOpacity onPress={handleShareApk} activeOpacity={0.85}>
          <LinearGradient
            colors={['#0D47A1', '#1565C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <View style={styles.shareIconContainer}>
              <MaterialCommunityIcons name="android" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir APK</Text>
              <Text style={styles.shareSub}>Enviar enlace de descarga (build interno)</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Cómo usar la app ─────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>INFORMACIÓN</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          {[
            { icon: 'home', label: 'Inicio', desc: 'Noticias, partidos del día y predicciones destacadas' },
            { icon: 'soccer', label: 'Fixture', desc: 'Todos los partidos del torneo, resultados en vivo y detalle de cada match' },
            { icon: 'lightning-bolt', label: 'Predicciones', desc: 'Predecí resultados y acumulá puntos. El resultado exacto vale 5 pts' },
            { icon: 'account-group', label: 'Comunidad', desc: 'Quinielas grupales y ranking global de predictores' },
            { icon: 'flag', label: 'Equipos', desc: 'Plantel, posiciones del grupo, partidos y estadísticas de cada selección' },
            { icon: 'robot', label: 'IA', desc: 'Análisis predictivo de partidos con inteligencia artificial' },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                styles.infoRow,
                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border },
              ]}
            >
              <View style={[styles.infoIconBox, { backgroundColor: appColors.surfaceSecondary }]}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: appColors.text }]}>{item.label}</Text>
                <Text style={[styles.infoDesc, { color: appColors.textSecondary }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Acerca de ────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>ACERCA DE</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="information-outline" size={20} color={appColors.textSecondary} />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>Versión</Text>
            <Text style={[styles.rowValue, { color: appColors.textSecondary }]}>1.0.0</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: appColors.border }]}
            onPress={() => (navigation as any).navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={appColors.textSecondary} />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>Política de privacidad</Text>
            <Ionicons name="chevron-forward" size={16} color={appColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: appColors.border }]}
            onPress={() => (navigation as any).navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color={appColors.textSecondary} />
            <Text style={[styles.rowLabel, { color: appColors.text }]}>Términos y condiciones</Text>
            <Ionicons name="chevron-forward" size={16} color={appColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Branding ─────────────────────────── */}
        <View style={styles.branding}>
          <Image
            source={require('../../../assets/ShinraCodeLogo1.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={styles.brandText}>
            <Text style={[styles.brandTitle, { color: appColors.text }]}>ShinraCode</Text>
            <Text style={[styles.brandSub, { color: appColors.textSecondary }]}>Programador Yamil.D.Rueda</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },
  content: { padding: spacing.base, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },

  // Icon picker
  iconsRow: {
    flexDirection: 'row',
    gap: spacing.base,
    padding: spacing.base,
  },
  iconOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: colors.primary,
  },
  iconImageWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  iconImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
  },
  iconLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    marginBottom: spacing.xs,
  },
  iconDescBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  iconDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },
  iconHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },

  // Share APK button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    color: 'white',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
  },
  shareSub: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },

  // Team picker
  teamRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  teamFlag: { width: 52, height: 36, borderRadius: 6 },
  teamFlagEmpty: {
    width: 52, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Info section
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  infoIconBox: {
    width: 34, height: 34, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, marginBottom: 2,
  },
  infoDesc: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, lineHeight: 16,
  },

  // Branding
  branding: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    justifyContent: 'center', paddingVertical: spacing.xl, marginTop: spacing.sm,
  },
  langToggle: { flexDirection: 'row', gap: spacing.xs },
  langBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: borderRadius.sm, backgroundColor: 'rgba(0,0,0,0.06)',
  },
  langText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  brandLogo: {
    width: 48, height: 48, borderRadius: borderRadius.md,
  },
  brandText: {
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
  },
  brandSub: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular,
  },

  // Generic row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
  rowValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
  },
});
