import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params;
  const { appColors } = useAppTheme();

  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => (await apiService.get(`/users/${userId}`)).data.data,
    staleTime: 60_000,
  });

  const { data: predictionsData, isLoading: loadingPreds, refetch: refetchPreds } = useQuery({
    queryKey: ['public-predictions', userId],
    queryFn: async () => (await apiService.get(`/users/${userId}/predictions`)).data.data,
    staleTime: 60_000,
  });

  const isLoading = loadingProfile || loadingPreds;
  const refetch = () => Promise.all([refetchProfile(), refetchPreds()]);

  const items: any[] = useMemo(() => predictionsData?.items ?? [], [predictionsData]);

  const stats = useMemo(() => {
    const settled = items.filter((p) => p.status !== 'PENDING');
    const won = items.filter((p) => p.status === 'WON');
    const accuracy = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;
    const totalPoints = items.reduce((s, p) => s + (p.pointsEarned ?? 0), 0);
    const exactScores = won.filter((p) => p.pointsEarned >= 5).length;

    let current = 0; let best = 0; let tmp = 0;
    for (let i = settled.length - 1; i >= 0; i--) {
      if (settled[i].status === 'WON') {
        tmp++;
        if (i === settled.length - 1 || settled[i + 1].status === 'WON') current++;
      } else {
        if (tmp > best) best = tmp;
        tmp = 0;
        if (i === settled.length - 1) current = 0;
      }
    }
    if (tmp > best) best = tmp;

    const last20 = settled.slice(-20);
    return { total: items.length, won: won.length, accuracy, totalPoints, exactScores, currentStreak: current, bestStreak: best, last20 };
  }, [items]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <LinearGradient colors={['#1565C0', '#0D47A1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 26 }} />
      </LinearGradient>

      {isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.base }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} style={{ height: 72, borderRadius: borderRadius.lg }} />
          ))}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {/* Hero */}
          <View style={[styles.heroCard, { backgroundColor: appColors.surface }, shadows.md]}>
            <View style={styles.heroRow}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: 'white', fontSize: 28, fontFamily: typography.fontFamily.bold }}>
                    {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.displayName, { color: appColors.text }]}>{profile?.displayName ?? '—'}</Text>
                <Text style={[styles.username, { color: appColors.textSecondary }]}>@{profile?.username}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialCommunityIcons name="shield-star" size={12} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>Nv. {profile?.level ?? 1}</Text>
                  </View>
                  {profile?.country && (
                    <View style={[styles.badge, { backgroundColor: appColors.border }]}>
                      <Text style={[styles.badgeText, { color: appColors.textSecondary }]}>{profile.country}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.ptsCol}>
                <Text style={[styles.ptsValue, { color: colors.primary }]}>{profile?.predictionPoints ?? 0}</Text>
                <Text style={[styles.ptsLabel, { color: appColors.textSecondary }]}>puntos</Text>
              </View>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.grid}>
            {[
              { label: 'Predicciones', value: stats.total, icon: 'lightning-bolt', color: colors.primary },
              { label: 'Aciertos', value: stats.won, icon: 'check-circle', color: '#4CAF50' },
              { label: 'Precisión', value: `${stats.accuracy}%`, icon: 'target', color: '#FF9800' },
              { label: 'Exactos', value: stats.exactScores, icon: 'bullseye-arrow', color: '#4CAF50' },
            ].map((s) => (
              <View key={s.label} style={[styles.gridCard, { backgroundColor: appColors.surface }, shadows.sm]}>
                <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                <Text style={[styles.gridValue, { color: appColors.text }]}>{s.value}</Text>
                <Text style={[styles.gridLabel, { color: appColors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Rachas */}
          <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Rachas</Text>
            <View style={styles.streakRow}>
              {[
                { icon: 'fire', color: '#FF6B35', value: stats.currentStreak, label: 'Actual' },
                { icon: 'trophy', color: '#FFD700', value: stats.bestStreak, label: 'Mejor' },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: appColors.border }]} />}
                  <View style={styles.streakItem}>
                    <MaterialCommunityIcons name={s.icon as any} size={26} color={s.color} />
                    <Text style={[styles.streakValue, { color: appColors.text }]}>{s.value}</Text>
                    <Text style={[styles.streakLabel, { color: appColors.textSecondary }]}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Dot timeline */}
          {stats.last20.length > 0 && (
            <View style={[styles.section, { backgroundColor: appColors.surface }, shadows.sm]}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>Últimas {stats.last20.length} predicciones</Text>
              <View style={styles.dots}>
                {stats.last20.map((p, i) => (
                  <View
                    key={i}
                    style={[styles.dot, { backgroundColor: p.status === 'WON' ? '#4CAF50' : '#EF4444' }]}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.screen, paddingBottom: spacing.lg,
  },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  scroll: { padding: spacing.screen, gap: spacing.base, paddingBottom: 100 },
  heroCard: { borderRadius: borderRadius.xl, padding: spacing.base },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  displayName: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  username: { fontSize: typography.fontSize.sm, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: 11, fontFamily: typography.fontFamily.semiBold },
  ptsCol: { alignItems: 'center' },
  ptsValue: { fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.black },
  ptsLabel: { fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCard: { flex: 1, minWidth: '45%', alignItems: 'center', gap: 4, borderRadius: borderRadius.lg, padding: spacing.sm },
  gridValue: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  gridLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium },
  section: { borderRadius: borderRadius.xl, padding: spacing.base },
  sectionTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, marginBottom: spacing.sm },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: StyleSheet.hairlineWidth, height: 50 },
  streakValue: { fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.black },
  streakLabel: { fontSize: 10, fontFamily: typography.fontFamily.medium },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
