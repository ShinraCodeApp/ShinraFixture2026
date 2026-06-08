import React, { useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useAppTheme } from '../../hooks/useAppTheme';
import { useMatches } from '../../hooks/useMatches';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectTournament } from '../../store/slices/tournamentSlice';
import { apiService } from '../../services/api';
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

// ── Colores y datos por tipo de torneo ────────────────
const TOURNAMENT_THEME: Record<string, { emoji: string; colors: [string, string]; label: string }> = {
  WORLD_CUP:        { emoji: '🌍', colors: ['#003087', '#0D47A1'], label: 'Mundial' },
  COPA_AMERICA:     { emoji: '🏆', colors: ['#1B5E20', '#2E7D32'], label: 'Copa América' },
  EURO:             { emoji: '⭐', colors: ['#1A237E', '#283593'], label: 'Eurocopa' },
  NATIONS_LEAGUE:   { emoji: '🏅', colors: ['#4A148C', '#6A1B9A'], label: 'Nations League' },
  CHAMPIONS_LEAGUE: { emoji: '👑', colors: ['#1A1A2E', '#16213E'], label: 'Champions' },
  LIBERTADORES:     { emoji: '🦅', colors: ['#B71C1C', '#C62828'], label: 'Libertadores' },
  SUDAMERICANA:     { emoji: '🌎', colors: ['#E65100', '#BF360C'], label: 'Sudamericana' },
  FRIENDLY:         { emoji: '🤝', colors: ['#37474F', '#455A64'], label: 'Amistoso' },
  PREMIER_LEAGUE:   { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', colors: ['#38003C', '#560053'], label: 'Premier League' },
  LA_LIGA:          { emoji: '🇪🇸', colors: ['#B00020', '#C62828'], label: 'LaLiga' },
  BUNDESLIGA:       { emoji: '🇩🇪', colors: ['#D32F2F', '#8B0000'], label: 'Bundesliga' },
  SERIE_A:          { emoji: '🇮🇹', colors: ['#003DA5', '#1565C0'], label: 'Serie A' },
  LIGUE_1:          { emoji: '🇫🇷', colors: ['#002395', '#0D1B80'], label: 'Ligue 1' },
  LIGA_ARG:         { emoji: '🇦🇷', colors: ['#001489', '#0D47A1'], label: 'Liga Arg.' },
  LEAGUE:           { emoji: '🏆', colors: ['#212121', '#424242'], label: 'Liga' },
};

const TILE_GAP = spacing.sm;
const TILE_SIZE = (SCREEN_WIDTH - spacing.screen * 2 - TILE_GAP) / 2;

function TournamentTile({ tournament, onPress }: { tournament: any; onPress: () => void }) {
  const theme = TOURNAMENT_THEME[tournament.type] ?? TOURNAMENT_THEME.FRIENDLY;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={tileStyles.wrapper}>
      <LinearGradient colors={theme.colors} style={tileStyles.tile}>
        <Text style={tileStyles.emoji}>{theme.emoji}</Text>
        <Text style={tileStyles.name} numberOfLines={2}>{tournament.shortName}</Text>
        <View style={tileStyles.cta}>
          <MaterialCommunityIcons name="soccer" size={12} color={colors.accent} />
          <Text style={tileStyles.ctaText}>Ver fixture</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const tileStyles = StyleSheet.create({
  wrapper: { width: TILE_SIZE },
  tile: {
    width: TILE_SIZE, height: TILE_SIZE,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  emoji: { fontSize: 36 },
  name: {
    color: 'white',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
    flex: 1,
    marginTop: spacing.xs,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    color: colors.accent,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
});

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { appColors, isDark } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { liveMatches, todayMatches, upcomingMatches, isLoading, refetch } = useMatches();
  const scrollRef = useRef<ScrollView>(null);

  const currentYear = new Date().getFullYear();

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: async () => {
      const all: any[] = (await apiService.get('/tournaments')).data.data ?? [];
      // Solo torneos del año actual o que terminen en el año actual
      return all.filter((t) => {
        const endYear = t.endDate ? new Date(t.endDate).getFullYear() : t.year;
        return t.year >= currentYear || endYear >= currentYear;
      });
    },
    staleTime: 60_000 * 10,
  });

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
          <View>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroGreeting}>
                  {user ? `Hola, ${user.displayName.split(' ')[0]} 👋` : 'Bienvenido'}
                </Text>
                <Text style={styles.heroTitle}>ShinraFixture</Text>
                <Text style={styles.heroSubtitle}>Copa Mundial 2026</Text>
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
          </View>
        </LinearGradient>

        {/* ── Elegir torneo para predecir ─────────── */}
        {tournaments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: appColors.text }]}>¿Dónde ponés tus puntos?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PredictionsTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tilesGrid}>
              {tournaments.map((t: any) => (
                <TournamentTile
                  key={t.id}
                  tournament={t}
                  onPress={() => {
                    dispatch(selectTournament(t.id));
                    navigation.navigate('FixtureTab', { screen: 'Fixture', params: { tournamentId: t.id } });
                  }}
                />
              ))}
            </View>
          </View>
        )}

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
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
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
