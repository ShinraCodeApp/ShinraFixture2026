import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavoriteTeams } from '../../hooks/useFavoriteTeams';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useAppTheme } from '../../hooks/useAppTheme';

export function FavoriteTeamsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const { favorites, toggle, isPending } = useFavoriteTeams();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#001489', '#0D47A1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="heart" size={20} color="#EF4444" />
          <Text style={styles.headerTitle}>Mis equipos favoritos</Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-off-outline" size={64} color={appColors.border} />
          <Text style={[styles.emptyTitle, { color: appColors.text }]}>Sin favoritos aún</Text>
          <Text style={[styles.emptyHint, { color: appColors.textSecondary }]}>
            Entrá al detalle de un equipo y tocá el corazón para guardarlo acá
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Teams')}
          >
            <MaterialCommunityIcons name="soccer" size={18} color="white" />
            <Text style={styles.exploreBtnText}>Ver equipos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: appColors.surface }, shadows.sm]}
              onPress={() => navigation.navigate('TeamDetail', { teamId: item.teamId })}
              activeOpacity={0.8}
            >
              {item.team.flagUrl ? (
                <Image source={{ uri: item.team.flagUrl }} style={styles.flag} />
              ) : (
                <View style={[styles.flag, styles.flagPlaceholder]}>
                  <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.bold }}>
                    {item.team.code}
                  </Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={[styles.teamName, { color: appColors.text }]} numberOfLines={1}>
                  {item.team.name}
                </Text>
                <Text style={[styles.teamMeta, { color: appColors.textSecondary }]}>
                  {item.team.code} · {item.team.region}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggle(item.teamId)}
                disabled={isPending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="heart" size={22} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <Text style={[styles.hint, { color: appColors.textSecondary }]}>
              Podés guardar hasta 5 equipos · Tocá el corazón para quitar
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  emptyHint: { fontSize: typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, marginTop: spacing.sm,
  },
  exploreBtnText: { color: 'white', fontFamily: typography.fontFamily.semiBold },

  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg,
  },
  flag: { width: 48, height: 34, borderRadius: 4 },
  flagPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  cardInfo: { flex: 1 },
  teamName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold },
  teamMeta: { fontSize: typography.fontSize.xs, marginTop: 2 },
  hint: { textAlign: 'center', fontSize: typography.fontSize.xs, marginTop: spacing.sm },
});
