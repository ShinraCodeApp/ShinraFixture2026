import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';

interface LiveBannerMatch {
  id: string;
  homeTeam: { name: string; code: string; flagUrl?: string };
  awayTeam: { name: string; code: string; flagUrl?: string };
  homeScore?: number | null;
  awayScore?: number | null;
  minute?: number | null;
  status: string;
}

interface Props {
  match: LiveBannerMatch;
  extraCount?: number;
  onPress: () => void;
  onSeeAll?: () => void;
}

export function LiveMatchBanner({ match, extraCount = 0, onPress, onSeeAll }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const minuteLabel =
    match.status === 'HALF_TIME'
      ? 'DESCANSO'
      : match.minute != null
        ? match.minute > 90
          ? `90+${match.minute - 90}'`
          : `${match.minute}'`
        : 'EN VIVO';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={['#1C0606', '#7B0000', '#4A0000', '#1C0606']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.livePill}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.livePillText}>⚽  EN VIVO AHORA</Text>
          </View>
          <View style={styles.minutePill}>
            <Text style={styles.minuteText}>{minuteLabel}</Text>
          </View>
        </View>

        {/* Teams + Score */}
        <View style={styles.body}>
          <View style={styles.teamCol}>
            <TeamLogo uri={match.homeTeam.flagUrl} size={56} code={match.homeTeam.code} />
            <Text style={styles.teamCode}>{match.homeTeam.code}</Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{match.homeScore ?? 0}</Text>
            <Text style={styles.scoreSep}>-</Text>
            <Text style={styles.scoreText}>{match.awayScore ?? 0}</Text>
          </View>

          <View style={styles.teamCol}>
            <TeamLogo uri={match.awayTeam.flagUrl} size={56} code={match.awayTeam.code} />
            <Text style={styles.teamCode}>{match.awayTeam.code}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.radarCta}>Ver Radar en Vivo  →</Text>
          {extraCount > 0 && onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
              <Text style={styles.moreBtn}>+{extraCount} partido{extraCount > 1 ? 's' : ''} más</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.live,
  },
  livePillText: {
    color: colors.live,
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.4,
  },
  minutePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  minuteText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: typography.fontFamily.bold,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamCode: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  scoreText: {
    color: 'white',
    fontSize: 52,
    fontFamily: typography.fontFamily.black,
    lineHeight: 60,
  },
  scoreSep: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 30,
    fontFamily: typography.fontFamily.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: spacing.sm,
  },
  radarCta: {
    color: colors.live,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  moreBtn: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },
});
