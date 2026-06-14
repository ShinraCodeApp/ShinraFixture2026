import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

interface MatchStatusBadgeProps {
  status: string;
  minute?: number | null;
  compact?: boolean;
}

export function MatchStatusBadge({ status, minute, compact = false }: MatchStatusBadgeProps) {
  const config = {
    LIVE: { bg: colors.live, text: minute ? (minute > 90 ? `90+${minute - 90}'` : `${minute}'`) : 'EN VIVO', textColor: 'white' },
    HALF_TIME: { bg: '#F59E0B', text: 'DESC', textColor: 'white' },
    FINISHED: { bg: '#6B7280', text: 'FIN', textColor: 'white' },
    SCHEDULED: { bg: 'transparent', text: 'PROG', textColor: '#6B7280', border: '#D1D5DB' },
    POSTPONED: { bg: '#9CA3AF', text: 'POSPUESTO', textColor: 'white' },
    CANCELLED: { bg: '#EF4444', text: 'CANCEL', textColor: 'white' },
  }[status] ?? { bg: '#9CA3AF', text: status, textColor: 'white' };

  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg },
      (config as any).border && { borderWidth: 1, borderColor: (config as any).border },
      compact && styles.compact,
    ]}>
      <Text style={[styles.text, { color: config.textColor }, compact && styles.compactText]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  compact: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: typography.fontSize.xs, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  compactText: { fontSize: 9 },
});
