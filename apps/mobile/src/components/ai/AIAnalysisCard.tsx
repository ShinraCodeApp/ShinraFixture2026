import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface AIAnalysisCardProps {
  analysis: string;
  matchId: string;
}

export function AIAnalysisCard({ analysis, matchId }: AIAnalysisCardProps) {
  const { appColors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={[styles.card, { backgroundColor: appColors.surface, borderColor: `${colors.primary}40` }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: appColors.text }]}>Análisis IA</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={appColors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 50 }}>
          <View style={[styles.divider, { backgroundColor: appColors.border }]} />
          <Text style={[styles.text, { color: appColors.textSecondary }]}>{analysis}</Text>
          <View style={styles.footer}>
            <MaterialCommunityIcons name="information-outline" size={12} color={appColors.textSecondary} />
            <Text style={[styles.footerText, { color: appColors.textSecondary }]}>
              Generado por GPT-4 • Solo informativo
            </Text>
          </View>
        </MotiView>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.base, borderWidth: 1, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  text: { fontSize: typography.fontSize.sm, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  footerText: { fontSize: 10 },
});
