import React, { useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ImageBackground, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useMatches } from '../../hooks/useMatches';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { MatchCard } from '../../components/match/MatchCard';
import { LiveMatchCard } from '../../components/match/LiveMatchCard';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { FeaturedNews } from '../../components/news/FeaturedNews';
import { GroupStandingsWidget } from '../../components/standings/GroupStandingsWidget';
import { QuickPredictionCard } from '../../components/predictions/QuickPredictionCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WC_START_DATE = new Date('2026-06-11T16:00:00Z');

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { appColors, isDark } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const { liveMatches, todayMatches, upcomingMatches, isLoading, refetch } = useMatches();
  const scrollRef = useRef<ScrollView>(null);

  const headerGradient = isDark
    ? ['#0F172A', '#1E293B', '#0F172A']
    : ['#001489', '#1565C0', '#0D47A1'];

  const isWorldCupStarted = new Date() >= WC_START_DATE;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* ── Hero Header ─────────────────────────── */}
        <LinearGradient colors={headerGradient as any} style={styles.hero}>
          <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ duration: 600 }}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroGreeting}>
                  {user ? `Hola, ${user.displayName.split(' ')[0]} 👋` : 'Bienvenido'}
                </Text>
                <Text style={styles.heroTitle}>ShinraFixture</Text>
                <Text style={styles.heroSubtitle}>FIFA World Cup 2026™</Text>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.notifButton} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={24} color="white" />
                  <View style={styles.notifBadge} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user?.displayName?.[0] ?? 'U'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Countdown */}
            {!isWorldCupStarted && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>El Mundial comienza en</Text>
                <CountdownTimer targetDate={WC_START_DATE} />
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Mis Puntos', value: user?.predictionPoints ?? 0, icon: 'star' },
                { label: 'Predicciones', value: user?.totalPredictions ?? 0, icon: 'lightning-bolt' },
                { label: 'Correctas', value: user?.correctPredictions ?? 0, icon: 'check-circle' },
              ].map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <MaterialCommunityIcons name={stat.icon as any} size={16} color={colors.accent} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </MotiView>
        </LinearGradient>

        {/* ── Live Matches ─────────────────────────── */}
        {liveMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={[styles.sectionTitle, { color: colors.live }]}>EN VIVO</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('FixtureTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {liveMatches.map((match) => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Today's Matches ──────────────────────── */}
        {todayMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>Partidos de Hoy</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FixtureTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => <LoadingSkeleton key={i} style={styles.matchSkeleton} />)
              : todayMatches.slice(0, 3).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
                  />
                ))}
          </View>
        )}

        {/* ── Quick Predictions ────────────────────── */}
        {upcomingMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>Pronostica</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PredictionsTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver más</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {upcomingMatches.slice(0, 5).map((match) => (
                <QuickPredictionCard
                  key={match.id}
                  match={match}
                  onPress={() => navigation.navigate('PredictionsTab')}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Group Standings Widget ───────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Tabla de Posiciones</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FixtureTab')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Completa</Text>
            </TouchableOpacity>
          </View>
          <GroupStandingsWidget group="A" />
        </View>

        {/* ── Featured News ────────────────────────── */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: appColors.text }]}>Noticias</Text>
            <TouchableOpacity onPress={() => navigation.navigate('News')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Ver más</Text>
            </TouchableOpacity>
          </View>
          <FeaturedNews onPress={(news) => navigation.navigate('NewsDetail', { newsId: news.id, slug: news.slug })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular },
  heroTitle: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black, letterSpacing: -1 },
  heroSubtitle: { color: colors.accent, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifButton: { position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error,
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.bold },
  countdownContainer: { alignItems: 'center', marginBottom: spacing.lg },
  countdownLabel: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.sm, marginBottom: spacing.xs },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
  section: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl },
  lastSection: { paddingBottom: spacing.xxxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  seeAll: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  horizontalList: { gap: spacing.sm, paddingRight: spacing.screen },
  matchSkeleton: { height: 80, borderRadius: borderRadius.md, marginBottom: spacing.sm },
});
