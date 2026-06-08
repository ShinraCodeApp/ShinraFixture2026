import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface ProbabilityBarsProps {
  homeProb: number;
  drawProb: number;
  awayProb: number;
  homeName: string;
  awayName: string;
}

export function ProbabilityBars({ homeProb, drawProb, awayProb, homeName, awayName }: ProbabilityBarsProps) {
  const homeP = Math.round(homeProb * 100);
  const drawP = Math.round(drawProb * 100);
  const awayP = Math.round(awayProb * 100);

  const homeAnim = useRef(new Animated.Value(0)).current;
  const drawAnim = useRef(new Animated.Value(0)).current;
  const awayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(homeAnim, { toValue: homeP, duration: 800, useNativeDriver: false }),
      Animated.timing(drawAnim, { toValue: drawP, duration: 800, delay: 100, useNativeDriver: false }),
      Animated.timing(awayAnim, { toValue: awayP, duration: 800, delay: 200, useNativeDriver: false }),
    ]).start();
  }, [homeP, drawP, awayP]);

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={styles.teamLabel}>{homeName}</Text>
        <Text style={styles.drawLabel}>Empate</Text>
        <Text style={styles.teamLabel}>{awayName}</Text>
      </View>

      <View style={styles.barContainer}>
        <Animated.View style={[styles.bar, styles.homeBar, { width: homeAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        <Animated.View style={[styles.bar, styles.drawBar, { width: drawAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        <Animated.View style={[styles.bar, styles.awayBar, { width: awayAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>

      <View style={styles.percentages}>
        <Text style={[styles.pct, { color: colors.primary }]}>{homeP}%</Text>
        <Text style={[styles.pct, { color: 'rgba(255,255,255,0.6)' }]}>{drawP}%</Text>
        <Text style={[styles.pct, { color: '#EF4444' }]}>{awayP}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginTop: spacing.sm },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  teamLabel: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.xs, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'center' },
  drawLabel: { color: 'rgba(255,255,255,0.6)', fontSize: typography.fontSize.xs, textAlign: 'center', flex: 0.6 },
  barContainer: { flexDirection: 'row', height: 6, borderRadius: borderRadius.full, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', gap: 1 },
  bar: { height: '100%' },
  homeBar: { backgroundColor: colors.primary },
  drawBar: { backgroundColor: 'rgba(255,255,255,0.4)' },
  awayBar: { backgroundColor: '#EF4444' },
  percentages: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  pct: { fontSize: typography.fontSize.xs, fontFamily: 'Inter_700Bold', flex: 1, textAlign: 'center' },
});
