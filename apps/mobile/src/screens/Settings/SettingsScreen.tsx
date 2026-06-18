import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Switch, Alert, Share, Linking, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setAppIcon, setNotificationsEnabled, setFavoriteTeam, setLanguage, AppIconId, FavoriteTeam } from '../../store/slices/settingsSlice';
import { logout, clearAuth } from '../../store/slices/authSlice';
import { apiService } from '../../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { TeamPickerModal } from '../../components/common/TeamPickerModal';

const APK_DRIVE_URL =
  'https://drive.google.com/uc?export=download&id=1If7JUMqKt3BPX2gzZMFFMICJl0EIS9hB';
const APK_GITHUB_URL =
  'https://github.com/ShinraCodeApp/ShinraFixture2026/releases/latest/download/app-release.apk';
const QR_DOWNLOAD_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(APK_GITHUB_URL)}`;

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
  const [giftCode, setGiftCode] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);

  const handleApplyGiftCode = async () => {
    const code = giftCode.trim();
    if (!code.startsWith('@@@')) {
      Alert.alert('Código inválido', 'El código debe empezar con @@@ (activar) o @@@@@ (revocar).');
      return;
    }
    setGiftLoading(true);
    try {
      const res = await apiService.post('/auth/gift-code', { code });
      const msg = res.data?.data?.message ?? 'Listo';
      Alert.alert('Premium', msg, [{ text: 'OK' }]);
      setGiftCode('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Código inválido o sin cupos disponibles');
    } finally {
      setGiftLoading(false);
    }
  };

  const handleShareApk = async (url: string, source: 'Drive' | 'GitHub') => {
    try {
      await Share.share({
        message: `Instala ShinraFixture 2026 (beta) desde ${source}:\n${url}`,
        url,
        title: 'ShinraFixture 2026 — APK',
      });
    } catch {
      Linking.openURL(url);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Esta acción es irreversible. Se borrarán tu cuenta, predicciones y todos tus datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación final',
              'Escribí ELIMINAR para confirmar.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar mi cuenta',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiService.get('/users/g-delete-me');
                    } catch {}
                    dispatch(clearAuth());
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
          {notificationsEnabled && (
            <>
              <View style={[styles.separator, { backgroundColor: appColors.border }]} />
              <TouchableOpacity style={styles.row} onPress={() => (navigation as any).navigate('NotificationSettings')}>
                <MaterialCommunityIcons name="tune-vertical" size={20} color={appColors.textSecondary} />
                <Text style={[styles.rowLabel, { color: appColors.text }]}>Configurar tipos</Text>
                <Ionicons name="chevron-forward" size={16} color={appColors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Compartir APK ───────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>DISTRIBUCIÓN</Text>
        <TouchableOpacity onPress={() => handleShareApk(APK_DRIVE_URL, 'Drive')} activeOpacity={0.85} style={{ marginBottom: spacing.sm }}>
          <LinearGradient
            colors={['#0D47A1', '#1565C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <View style={styles.shareIconContainer}>
              <MaterialCommunityIcons name="google-drive" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir APK — Drive</Text>
              <Text style={styles.shareSub}>Enlace de Google Drive</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleShareApk(APK_GITHUB_URL, 'GitHub')} activeOpacity={0.85}>
          <LinearGradient
            colors={['#1B1F23', '#24292E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <View style={styles.shareIconContainer}>
              <MaterialCommunityIcons name="github" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLabel}>Compartir APK — GitHub</Text>
              <Text style={styles.shareSub}>Siempre descarga la última versión</Text>
            </View>
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── QR de descarga ──────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>QR DE DESCARGA</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface, alignItems: 'center', padding: spacing.xl }]}>
          <Text style={[styles.rowLabel, { color: appColors.text, marginBottom: spacing.xs }]}>
            Escaneá para descargar la app
          </Text>
          <Text style={[styles.rowValue, { color: appColors.textSecondary, marginBottom: spacing.base, textAlign: 'center' }]}>
            Mostrá este QR a tus amigos
          </Text>
          <View style={styles.qrWrapper}>
            <Image
              source={{ uri: QR_DOWNLOAD_URL }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={[styles.qrShareBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleShareApk(APK_GITHUB_URL, 'GitHub')}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={16} color="white" />
            <Text style={styles.qrShareText}>Compartir enlace</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cómo usar la app ─────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>INFORMACIÓN</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          {[
            { icon: 'home', label: 'Inicio', desc: 'Partidos del día, resultados recientes y predicciones destacadas de la comunidad' },
            { icon: 'soccer', label: 'Fixture', desc: 'Todos los partidos del torneo con resultados en vivo, reacciones con emojis y análisis detallado de cada match' },
            { icon: 'lightning-bolt', label: 'Predicciones', desc: 'Predecí resultados antes de cada partido y acumulá puntos. Resultado exacto: 5 pts · Ganador correcto: 2 pts · Empate correcto: 3 pts. Free: 5 predicciones por quiniela · Premium: ilimitadas' },
            { icon: 'chart-bar', label: 'Estadísticas', desc: 'Tabla de posiciones #WC (48 equipos), standings por grupo, goleadores y asistencias del Mundial en tiempo real' },
            { icon: 'account-group', label: 'Mi Liga', desc: 'Creá o uní a quinielas grupales con amigos. Free: hasta 2 quinielas creadas y 5 unidas · Premium: ilimitadas' },
            { icon: 'flag', label: 'Equipos', desc: 'Plantel completo, posiciones del grupo, próximos partidos y estadísticas de las 48 selecciones del Mundial' },
            { icon: 'robot', label: 'IA', desc: 'Análisis predictivo con inteligencia artificial para cada partido. Free: 2 consultas por día · Premium: ilimitadas' },
            { icon: 'bell-outline', label: 'Notificaciones', desc: 'Recibís una alerta 15 minutos antes de que juegue tu equipo favorito. Activá tu equipo en "Mi Equipo" arriba' },
            { icon: 'crown', label: 'Premium', desc: 'Desbloqueá predicciones, quinielas y consultas de IA ilimitadas. Activá con código de regalo en la sección PREMIUM de esta pantalla' },
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

        {/* ── Redes ShinraCode ─────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>SHINRACODE</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://shinracode.com')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="web" size={20} color="#1565C0" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: appColors.text }]}>sitio web</Text>
              <Text style={[styles.rowValue, { color: appColors.textSecondary }]}>shinracode.com</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={appColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: appColors.border }]}
            onPress={() => Linking.openURL('https://instagram.com/Shinracode')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="instagram" size={20} color="#E1306C" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: appColors.text }]}>Instagram</Text>
              <Text style={[styles.rowValue, { color: appColors.textSecondary }]}>@Shinracode</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={appColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Código premium ───────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>PREMIUM</Text>
        <View style={[styles.card, { backgroundColor: appColors.surface, padding: spacing.base }]}>
          <Text style={[styles.rowLabel, { color: appColors.text, marginBottom: spacing.xs }]}>
            Activar código de regalo
          </Text>
          <Text style={[styles.rowValue, { color: appColors.textSecondary, marginBottom: spacing.md }]}>
            {'@@@'}usuario para activar · {'@@@@@'}usuario para revocar
          </Text>
          <View style={styles.giftRow}>
            <TextInput
              style={[styles.giftInput, { backgroundColor: appColors.surfaceSecondary, color: appColors.text, borderColor: appColors.border }]}
              value={giftCode}
              onChangeText={setGiftCode}
              placeholder="@@@usuario"
              placeholderTextColor={appColors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.giftButton, giftLoading && { opacity: 0.6 }]}
              onPress={handleApplyGiftCode}
              disabled={giftLoading}
              activeOpacity={0.8}
            >
              {giftLoading
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={styles.giftButtonText}>Aplicar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Zona de peligro ──────────────────── */}
        <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>CUENTA</Text>
        <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.85}>
          <View style={[styles.card, { backgroundColor: appColors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.base, padding: spacing.base }]}>
            <View style={[styles.shareIconContainer, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <MaterialCommunityIcons name="delete-forever-outline" size={22} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.error }]}>Eliminar cuenta</Text>
              <Text style={[styles.rowValue, { color: appColors.textSecondary, fontSize: typography.fontSize.xs }]}>Borra permanentemente tu cuenta y datos</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.error} />
          </View>
        </TouchableOpacity>

        {/* ── Branding ─────────────────────────── */}
        <View style={styles.branding}>
          <Image
            source={require('../../../assets/ShinraCodeLogo1.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={styles.brandText}>
            <Text style={[styles.brandTitle, { color: appColors.text }]}>ShinraCode</Text>
            <Text style={[styles.brandSub, { color: appColors.textSecondary }]}>Desarrollado por Yamil D. Rueda</Text>
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

  // QR code
  qrWrapper: {
    padding: 12, backgroundColor: 'white', borderRadius: borderRadius.lg, marginBottom: spacing.base,
  },
  qrImage: { width: 200, height: 200 },
  qrShareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  qrShareText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },

  // Gift code
  giftRow: { flexDirection: 'row', gap: spacing.sm },
  giftInput: {
    flex: 1, height: 44, borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md, fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
  },
  giftButton: {
    height: 44, paddingHorizontal: spacing.base, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  giftButtonText: {
    color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm,
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
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },
  rowValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
  },
});
