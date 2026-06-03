import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import dayjs from 'dayjs';

import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { apiClient } from '../../services/api';

interface News {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  imageUrl?: string;
  author?: string;
  category?: string;
  publishedAt?: string;
  isPremium: boolean;
}

interface FeaturedNewsProps {
  onPress: (news: News) => void;
  limit?: number;
}

function useFeaturedNews(limit = 5) {
  return useQuery<News[]>({
    queryKey: ['news', 'featured', limit],
    queryFn: async () => {
      const res = await apiClient.get(`/news?limit=${limit}&featured=true`);
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function NewsItem({ item, onPress, index }: { item: News; onPress: () => void; index: number }) {
  const { appColors } = useAppTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: index * 80 }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, shadows.sm]}
      >
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        )}
        <View style={styles.content}>
          {item.category && (
            <View style={styles.categoryRow}>
              <Text style={styles.category}>{item.category.toUpperCase()}</Text>
              {item.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>PREMIUM</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[styles.title, { color: appColors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.excerpt && (
            <Text style={[styles.excerpt, { color: appColors.textSecondary }]} numberOfLines={2}>
              {item.excerpt}
            </Text>
          )}
          <View style={styles.meta}>
            {item.author && (
              <Text style={[styles.author, { color: appColors.textSecondary }]}>{item.author}</Text>
            )}
            {item.publishedAt && (
              <Text style={[styles.date, { color: appColors.textSecondary }]}>
                {dayjs(item.publishedAt).format('D MMM')}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

export function FeaturedNews({ onPress, limit = 5 }: FeaturedNewsProps) {
  const { data: news, isLoading } = useFeaturedNews(limit);

  if (isLoading) {
    return (
      <View>
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  if (!news?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No hay noticias disponibles</Text>
      </View>
    );
  }

  return (
    <View>
      {news.map((item, i) => (
        <NewsItem key={item.id} item={item} onPress={() => onPress(item)} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: spacing.base,
    gap: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  category: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  premiumBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  premiumText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: '#000',
  },
  title: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.fontSize.md * 1.4,
  },
  excerpt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  author: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },
  date: {
    fontSize: typography.fontSize.xs,
  },
  skeleton: {
    height: 100,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: typography.fontSize.sm,
  },
});
