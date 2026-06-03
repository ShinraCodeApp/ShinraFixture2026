import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, typography, borderRadius, spacing } from '../../theme';

interface FilterPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export function FilterPill({ label, isSelected, onPress }: FilterPillProps) {
  const { appColors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        isSelected
          ? { backgroundColor: colors.primary }
          : { backgroundColor: appColors.surface, borderWidth: 1, borderColor: appColors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color: isSelected ? 'white' : appColors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  label: { fontSize: typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
});
