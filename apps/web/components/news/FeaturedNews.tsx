'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api';

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

function useNews(limit: number) {
  return useQuery<News[]>({
    queryKey: ['news', 'featured', limit],
    queryFn: async () => {
      const res = await apiClient.get(`/news?limit=${limit}&published=true`);
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

interface FeaturedNewsProps {
  limit?: number;
  sidebar?: boolean;
}

export function FeaturedNews({ limit = 5, sidebar = false }: FeaturedNewsProps) {
  const { data: news = [], isLoading } = useNews(limit);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-20" />
        ))}
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 text-center">
        <p className="text-gray-400 text-sm">No hay noticias disponibles</p>
      </div>
    );
  }

  if (sidebar) {
    return (
      <div className="space-y-3">
        {news.map((item) => (
          <Link key={item.id} href={`/news/${item.slug}`}>
            <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-all group">
              {item.imageUrl && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {item.category && (
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-0.5">
                    {item.category}
                  </p>
                )}
                <p className="text-sm font-semibold dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {item.title}
                </p>
                {item.publishedAt && (
                  <p className="text-xs text-gray-400 mt-1">{dayjs(item.publishedAt).format('D MMM')}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  const [featured, ...rest] = news;

  return (
    <div className="space-y-4">
      {/* Featured hero */}
      {featured && (
        <Link href={`/news/${featured.slug}`}>
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer">
            {featured.imageUrl && (
              <div className="relative h-56">
                <Image src={featured.imageUrl} alt={featured.title} fill className="object-cover opacity-70 group-hover:opacity-80 transition-opacity" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {featured.category && (
                <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                  {featured.category}
                </span>
              )}
              <h3 className="text-white font-bold text-lg mt-1 line-clamp-2">{featured.title}</h3>
              {featured.publishedAt && (
                <p className="text-white/50 text-xs mt-1">{dayjs(featured.publishedAt).format('D MMM YYYY')}</p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Rest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rest.map((item) => (
          <Link key={item.id} href={`/news/${item.slug}`}>
            <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-all group cursor-pointer">
              {item.imageUrl && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {item.category && (
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-0.5">{item.category}</p>
                )}
                <p className="text-sm font-semibold dark:text-white line-clamp-2">{item.title}</p>
                {item.publishedAt && (
                  <p className="text-xs text-gray-400 mt-1">{dayjs(item.publishedAt).format('D MMM')}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
