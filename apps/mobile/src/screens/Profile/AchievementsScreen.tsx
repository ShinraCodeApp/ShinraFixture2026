import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { RootState } from '../../store';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const ALL_ACHIEVEMENTS = [
  { type: 'FIRST_PREDICTION',  name: 'Primera predicción',   description: 'Realizaste tu primer pronóstico',          icon: 'lightning-bolt',     xp: 10,  color: '#3B82F6' },
  { type: 'PERFECT_MATCH',     name: 'Marcador exacto',      description: 'Acertaste el resultado exacto de un partido', icon: 'bullseye-arrow',  xp: 50,  color: '#10B981' },
  { type: 'STREAK_3',          name: 'Racha de 3',           description: '3 predicciones correctas seguidas',         icon: 'fire',               xp: 30,  color: '#F59E0B' },
  { type: 'STREAK_5',          name: 'Racha de 5',           description: '5 predicciones correctas seguidas',         icon: 'fire',               xp: 75,  color: '#EF4444' },
  { type: 'STREAK_10',         name: '¡Imparable!',          description: '10 predicciones correctas seguidas',        icon: 'fire',               xp: 200, color: '#DC2626' },
  { type: 'EARLY_BIRD',        name: 'Madrugador',           description: 'Predijiste un partido con +48 hs de antelación', icon: 'clock-fast',   xp: 20,  color: '#8B5CF6' },
  { type: 'WORLD_CUP_FAN',     name: 'Fan del Mundial',      description: 'Predijiste 10 partidos del Mundial',        icon: 'earth',              xp: 60,  color: '#F59E0B' },
  { type: 'GROUP_EXPERT',      name: 'Experto de grupos',    description: 'Acertaste el ganador de un grupo',          icon: 'trophy',             xp: 80,  color: '#FBBF24' },
  { type: 'CHAMPION_CALLER',   name: '¡Vidente!',            description: 'Predijiste al campeón del torneo',          icon: 'crystal-ball',       xp: 500, color: '#A855F7' },
  { type: 'SOCIAL_BUTTERFLY',  name: 'Social',               description: 'Agregaste 5 amigos en la app',              icon: 'account-group',      xp: 25,  color: '#06B6D4' },
  { type: 'FORUM_POSTER',      name: 'Comentarista',         description: 'Publicaste en el foro de la comunidad',     icon: 'forum',              xp: 15,  color: '#84CC16' },
  { type: 'QUINIELA_WINNER',   name: 'Rey de la quiniela',   description: 'Ganaste una quiniela grupal',               icon: 'crown',              xp: 150, color: '#EAB308' },
  { type: 'LEVEL_5',           name: 'Veterano',             description: 'Alcanzaste el nivel 5',                     icon: 'shield-star',        xp: 100, color: '#6366F1' },
  { type: 'LEVEL_10',          name: 'Leyenda',              description: 'Alcanzaste el nivel 10',                    icon: 'shield-crown',       xp: 300, color: '#EC4899' },
  { type: 'WATCH_PARTY',       name: 'Animador',             description: 'Enviaste 50 reacciones en partidos en vivo', icon: 'party-popper',      xp: 40,  color: '#F97316' },
];

export function AchievementsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const { user } = useSelector((s: RootState) => s.auth);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      const res = await apiService.get(`/users/${user?.id}/achievements`);
      return res.data.data as { achievement: { type: string }; unlockedAt: string }[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const unlockedTypes = new Set((data ?? []).map((u) => u.achievement?.type ?? u.type));
  const unlockedCount = unlockedTypes.size;
  const totalXP = ALL_ACHIEVEMENTS.filter((a) => unlockedTypes.has(a.type)).reduce((s, a) => s + a.xp, 0);

  const unlocked = ALL_ACHIEVEMENTS.filter((a) => unlockedTypes.has(a.type));
  const locked = ALL_ACHIEVEMENTS.filter((a) => !unlockedTypes.has(a.type));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: appColors.text }]}>Mis Logros</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Stats banner */}
          <LinearGradient colors={['#0D47A1', '#1565C0']} style={styles.banner}>
            <View style={styles.bannerStat}>
              <Text style={styles.bannerValue}>{unlockedCount}</Text>
              <Text style={styles.bannerLabel}>Desbloqueados</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerValue}>{ALL_ACHIEVEMENTS.length}</Text>
              <Text style={styles.bannerLabel}>Total</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerValue}>{totalXP}</Text>
              <Text style={styles.bannerLabel}>XP ganada</Text>
            </View>
          </LinearGradient>

          {/* Progress bar */}
          <View style={[styles.progressWrap, { backgroundColor: appColors.surface }]}>
            <View style={[styles.progressTrack, { backgroundColor: appColors.border }]}>
              <View style={[styles.progressFill, { width: `${Math.round((unlockedCount / ALL_ACHIEVEMENTS.length) * 100)}%` as any, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressLabel, { color: appColors.textSecondary }]}>
              {Math.round((unlockedCount / ALL_ACHIEVEMENTS.length) * 100)}% completado
            </Text>
          </View>

          {/* Unlocked */}
          {unlocked.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>DESBLOQUEADOS</Text>
              <View style={styles.grid}>
                {unlocked.map((a) => (
                  <AchievementCard key={a.type} achievement={a} unlocked appColors={appColors} />
                ))}
              </View>
            </>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: appColors.textSecondary }]}>POR DESBLOQUEAR</Text>
              <View style={styles.grid}>
                {locked.map((a) => (
                  <AchievementCard key={a.type} achievement={a} unlocked={false} appColors={appColors} />
                ))}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AchievementCard({ achievement: a, unlocked, appColors }: {
  achievement: typeof ALL_ACHIEVEMENTS[0];
  unlocked: boolean;
  appColors: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: appColors.surface, opacity: unlocked ? 1 : 0.45 }]}>
      <View style={[styles.iconCircle, { backgroundColor: unlocked ? a.color + '22' : appColors.border }]}>
        <MaterialCommunityIcons
          name={a.icon as any}
          size={28}
          color={unlocked ? a.color : appColors.textSecondary}
        />
        {unlocked && <View style={[styles.checkBadge, { backgroundColor: '#10B981' }]}>
          <Ionicons name="checkmark" size={9} color="white" />
        </View>}
      </View>
      <Text style={[styles.achName, { color: appColors.text }]} numberOfLines={2}>{a.name}</Text>
      <Text style={[styles.achDesc, { color: appColors.textSecondary }]} numberOfLines={2}>{a.description}</Text>
      <Text style={[styles.achXP, { color: unlocked ? a.color : appColors.textSecondary }]}>+{a.xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  banner: { padding: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bannerStat: { flex: 1, alignItems: 'center' },
  bannerValue: { color: 'white', fontSize: typography.fontSize.xxl, fontFamily: typography.fontFamily.bold },
  bannerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs, marginTop: 2 },
  bannerDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressWrap: { padding: spacing.base, gap: spacing.xs },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { fontSize: typography.fontSize.xs, textAlign: 'right' },
  sectionTitle: {
    fontSize: 11, fontFamily: typography.fontFamily.bold, letterSpacing: 0.8,
    marginHorizontal: spacing.base, marginTop: spacing.base, marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, gap: spacing.sm,
  },
  card: {
    width: '47%', borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.xs,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative',
  },
  checkBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  achName: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, textAlign: 'center' },
  achDesc: { fontSize: typography.fontSize.xs, textAlign: 'center', lineHeight: 14 },
  achXP: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, marginTop: 2 },
});
