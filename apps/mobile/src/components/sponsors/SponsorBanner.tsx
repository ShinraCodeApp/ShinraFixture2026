import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { spacing, typography, borderRadius } from '../../theme';

interface Sponsor {
  id: string;
  name: string;
  text?: string;
  imageUrl?: string;
  url?: string;
}

/**
 * Espacio de patrocinio ("Presentado por …"). Los patrocinadores se cargan
 * desde el panel admin (config "sponsors"); si no hay ninguno no se muestra
 * nada. Se ve también con Pro: es un espacio de marca, no publicidad de AdMob.
 */
export function SponsorBanner({ league }: { league?: string }) {
  const { appColors } = useAppTheme();
  const { data: sponsors = [] } = useQuery<Sponsor[]>({
    queryKey: ['sponsors', league ?? 'all'],
    queryFn: async () =>
      (await apiService.get('/sponsors', { params: league ? { league } : {} })).data.data ?? [],
    staleTime: 30 * 60_000,
  });

  if (sponsors.length === 0) return null;
  // Rota entre los patrocinadores de la liga, uno distinto por hora
  const s = sponsors[new Date().getHours() % sponsors.length];

  return (
    <TouchableOpacity
      activeOpacity={s.url ? 0.8 : 1}
      disabled={!s.url}
      onPress={() => s.url && Linking.openURL(s.url)}
      style={[styles.box, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
      accessibilityRole={s.url ? 'link' : 'text'}
      accessibilityLabel={`Patrocinado por ${s.name}`}
    >
      {s.imageUrl ? <Image source={{ uri: s.imageUrl }} style={styles.logo} resizeMode="contain" /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: appColors.textSecondary }]}>PRESENTADO POR</Text>
        <Text style={[styles.name, { color: appColors.text }]} numberOfLines={1}>{s.name}</Text>
        {s.text ? (
          <Text style={[styles.text, { color: appColors.textSecondary }]} numberOfLines={2}>{s.text}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.screen, marginVertical: spacing.xs,
    padding: spacing.sm, borderRadius: borderRadius.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  logo: { width: 44, height: 44, borderRadius: borderRadius.sm },
  label: { fontSize: 9, letterSpacing: 0.8, fontFamily: typography.fontFamily.semiBold },
  name: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold },
  text: { fontSize: typography.fontSize.xs },
});
