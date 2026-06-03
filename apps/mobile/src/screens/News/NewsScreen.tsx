import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';
import dayjs from 'dayjs';

export function NewsScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['news', page],
    queryFn: async () => (await apiService.get(`/news?page=${page}&limit=20`)).data.data,
  });

  const articles = data?.items ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: appColors.text }]}>Noticias</Text>

      <FlatList
        data={articles}
        keyExtractor={(a: any) => a.id}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }: { item: any; index: number }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: appColors.surface }, index === 0 && styles.featuredCard]}
            onPress={() => navigation.navigate('NewsDetail', { newsId: item.id, slug: item.slug })}
          >
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.image, index === 0 && styles.featuredImage]}
                resizeMode="cover"
              />
            )}
            <View style={styles.cardContent}>
              {item.category && (
                <Text style={[styles.category, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
              )}
              <Text style={[styles.cardTitle, { color: appColors.text }]} numberOfLines={index === 0 ? 3 : 2}>
                {item.title}
              </Text>
              {item.excerpt && index === 0 && (
                <Text style={[styles.excerpt, { color: appColors.textSecondary }]} numberOfLines={2}>{item.excerpt}</Text>
              )}
              <Text style={[styles.date, { color: appColors.textSecondary }]}>
                {dayjs(item.publishedAt).fromNow()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, padding: spacing.base },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: 80 },
  card: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  featuredCard: {},
  image: { width: '100%', height: 120 },
  featuredImage: { height: 200 },
  cardContent: { padding: spacing.base, gap: 4 },
  category: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, letterSpacing: 0.5 },
  cardTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, lineHeight: 20 },
  excerpt: { fontSize: typography.fontSize.sm, lineHeight: 18 },
  date: { fontSize: typography.fontSize.xs },
});
