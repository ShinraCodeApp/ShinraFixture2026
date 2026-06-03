import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface CountdownTimerProps {
  targetDate: Date;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [diff, setDiff] = useState(Math.max(0, targetDate.getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(Math.max(0, targetDate.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <View style={styles.row}>
      {[['días', days], ['hrs', hours], ['min', minutes], ['seg', seconds]].map(([label, value]) => (
        <View key={label as string} style={styles.unit}>
          <Text style={styles.value}>{pad(value as number)}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  unit: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 52,
  },
  value: { color: 'white', fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.black },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: typography.fontFamily.medium },
});
