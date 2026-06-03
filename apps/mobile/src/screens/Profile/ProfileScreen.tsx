import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const XP_PER_LEVEL = [0, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 50000];

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { appColors, isDark, toggleTheme } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notificationsOn, setNotificationsOn] = useState(user?.predictionPoints !== undefined);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const currentLevelXP = XP_PER_LEVEL[Math.min(user?.level ?? 1, XP_PER_LEVEL.length - 1)] ?? 0;
  const nextLevelXP = XP_PER_LEVEL[Math.min((user?.level ?? 1) + 1, XP_PER_LEVEL.length - 1)] ?? 0;
  const xpProgress = nextLevelXP > 0 ? ((user?.xp ?? 0) - currentLevelXP) / (nextLevelXP - currentLevelXP) : 1;

  const menuItems = [
    { icon: 'heart', label: 'Equipos favoritos', onPress: () => {} },
    { icon: 'trophy', label: 'Mis logros', onPress: () => {} },
    { icon: 'history', label: 'Historial de predicciones', onPress: () => navigation.navigate('PredictionsTab') },
    { icon: 'account-group', label: 'Mis quinielas', onPress: () => navigation.navigate('Quiniela') },
    { icon: 'star', label: 'Premium', onPress: () => navigation.navigate('Premium'), highlight: !user?.isPremium },
    { icon: 'bell', label: 'Notificaciones', toggle: true, value: notificationsOn, onToggle: setNotificationsOn },
    { icon: 'white-balance-sunny', label: isDark ? 'Modo claro' : 'Modo oscuro', toggle: true, value: isDark, onToggle: toggleTheme },
    { icon: 'cog', label: 'Configuración', onPress: () => navigation.navigate('Settings') },
    { icon: 'help-circle', label: 'Ayuda y soporte', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero ──────────────────────────────────── */}
        <LinearGradient colors={['#0D47A1', '#1565C0', '#0D47A1']} style={styles.hero}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{user?.displayName?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
            )}
            {user?.isPremium && (
              <View style={styles.premiumBadge}>
                <MaterialCommunityIcons name="crown" size={12} color={colors.accent} />
              </View>
            )}
          </View>

          <Text style={styles.displayName}>{user?.displayName ?? 'Usuario'}</Text>
          <Text style={styles.username}>@{user?.username ?? 'username'}</Text>

          {/* Level Progress */}
          <View style={styles.levelContainer}>
            <View style={styles.levelInfo}>
              <MaterialCommunityIcons name="shield-star" size={16} color={colors.accent} />
              <Text style={styles.levelText}>Nivel {user?.level ?? 1}</Text>
            </View>
            <View style={styles.xpBar}>
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: `${Math.min(xpProgress * 100, 100)}%` as any }}
                transition={{ type: 'timing', duration: 1000 }}
                style={styles.xpFill}
              />
            </View>
            <Text style={styles.xpText}>{user?.xp ?? 0} XP</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Puntos', value: user?.predictionPoints ?? 0 },
              { label: 'Predicciones', value: user?.totalPredictions ?? 0 },
              { label: 'Acertadas', value: user?.correctPredictions ?? 0 },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Premium Banner ───────────────────────── */}
        {!user?.isPremium && (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => navigation.navigate('Premium')}
          >
            <MaterialCommunityIcons name="crown" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>ShinraFixture Premium</Text>
              <Text style={styles.premiumSub}>Sin anuncios · IA avanzada · Estadísticas pro</Text>
            </View>
            <Text style={styles.premiumPrice}>$4.99/mes</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* ── Menu ─────────────────────────────────── */}
        <View style={[styles.menuSection, { backgroundColor: appColors.surface }]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appColors.border },
                item.highlight && styles.menuItemHighlight,
              ]}
              onPress={item.toggle ? undefined : item.onPress}
              activeOpacity={item.toggle ? 1 : 0.7}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={item.highlight ? colors.accent : appColors.textSecondary}
              />
              <Text style={[styles.menuLabel, { color: item.highlight ? colors.accent : appColors.text }]}>
                {item.label}
              </Text>
              {item.toggle ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: appColors.border, true: colors.primary }}
                  thumbColor="white"
                />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={appColors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ───────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: appColors.surface }]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: appColors.textSecondary }]}>ShinraFixture 2026 v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: spacing.screen, paddingBottom: spacing.xl, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.bold },
  premiumBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  displayName: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  username: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm, marginBottom: spacing.base },
  levelContainer: { width: '100%', marginBottom: spacing.base },
  levelInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  levelText: { color: 'white', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  xpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  xpText: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs, alignSelf: 'flex-end' },
  statsRow: { flexDirection: 'row', width: '100%', gap: spacing.sm },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.md, padding: spacing.sm },
  statValue: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.base, padding: spacing.base,
    backgroundColor: '#1A1A2E', borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.accent,
  },
  premiumTitle: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  premiumSub: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.xs },
  premiumPrice: { color: colors.accent, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  menuSection: { marginHorizontal: spacing.base, borderRadius: borderRadius.lg, marginBottom: spacing.base, ...shadows.md },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  menuItemHighlight: { backgroundColor: 'rgba(255,215,0,0.05)' },
  menuLabel: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base, padding: spacing.base,
    borderRadius: borderRadius.lg, marginBottom: spacing.base, ...shadows.sm,
  },
  logoutText: { fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.base },
  version: { textAlign: 'center', fontSize: typography.fontSize.xs, marginBottom: spacing.xxxl },
});
