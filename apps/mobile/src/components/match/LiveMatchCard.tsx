import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TeamLogo } from '../common/TeamLogo';

interface LiveMatchCardProps {
  match: {
    id: string;
    homeTeam: { name: string; code: string; flagUrl?: string };
    awayTeam: { name: string; code: string; flagUrl?: string };
    homeScore?: number | null;
    awayScore?: number | null;
    minute?: number | null;
    status: string;
  };
  onPress: () => void;
}

export function LiveMatchCard({ match, onPress }: LiveMatchCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <LinearGradient
        colors={['#1A0A0A', '#3D1515', '#1A0A0A']}
        style={styles.card}
      >
        {/* Live Indicator */}
        <View style={styles.liveRow}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>
            {match.status === 'HALF_TIME'
            ? 'DESCANSO'
            : match.minute != null
              ? (match.minute > 90 ? `90+${match.minute - 90}'` : `${match.minute}'`)
              : "0'"}
          </Text>
        </View>

        {/* Teams and Score */}
        <View style={styles.body}>
          <View style={styles.teamCol}>
            <TeamLogo uri={match.homeTeam.flagUrl} size={44} />
            <Text style={styles.teamCode}>{match.homeTeam.code}</Text>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={styles.score}>{match.homeScore ?? 0}</Text>
            <Text style={styles.scoreSep}>:</Text>
            <Text style={styles.score}>{match.awayScore ?? 0}</Text>
          </View>

          <View style={styles.teamCol}>
            <TeamLogo uri={match.awayTeam.flagUrl} size={44} />
            <Text style={styles.teamCode}>{match.awayTeam.code}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  liveText: { color: colors.live, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, letterSpacing: 1 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamCol: { alignItems: 'center', gap: 4, flex: 1 },
  teamCode: { color: 'white', fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  score: { color: 'white', fontSize: typography.fontSize.xxxl, fontFamily: typography.fontFamily.black },
  scoreSep: { color: 'rgba(255,255,255,0.5)', fontSize: typography.fontSize.xl },
});
