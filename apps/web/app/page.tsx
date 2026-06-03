'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MainLayout } from '../components/layout/MainLayout';
import { LiveMatchesBanner } from '../components/match/LiveMatchesBanner';
import { TodayMatches } from '../components/match/TodayMatches';
import { GroupStandings } from '../components/standings/GroupStandings';
import { FeaturedNews } from '../components/news/FeaturedNews';
import { TopScorers } from '../components/stats/TopScorers';
import { CountdownHero } from '../components/hero/CountdownHero';
import { QuickPredictions } from '../components/predictions/QuickPredictions';
import { useLiveMatches } from '../hooks/useMatches';

export default function HomePage() {
  const { liveMatches } = useLiveMatches();

  return (
    <MainLayout>
      {/* ── Hero Section ──────────────────────────── */}
      <CountdownHero />

      {/* ── Live Matches Banner ───────────────────── */}
      {liveMatches.length > 0 && (
        <section className="py-6 bg-gradient-to-r from-red-600/10 to-red-800/10 border-y border-red-500/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-lg font-bold text-red-500">EN VIVO</h2>
            </div>
            <LiveMatchesBanner matches={liveMatches} />
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Column ──────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Matches */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold dark:text-white">Partidos de Hoy</h2>
                <Link href="/fixture" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Ver fixture completo →
                </Link>
              </div>
              <TodayMatches />
            </motion.section>

            {/* Quick Predictions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold dark:text-white">Pronostica</h2>
                <Link href="/predictions" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Ver todos →
                </Link>
              </div>
              <QuickPredictions />
            </motion.section>

            {/* Group Standings */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold dark:text-white">Tabla de Posiciones</h2>
                <Link href="/standings" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Ver completa →
                </Link>
              </div>
              <GroupStandings compact />
            </motion.section>
          </div>

          {/* ── Sidebar ──────────────────────────── */}
          <div className="space-y-6">
            {/* Top Scorers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold dark:text-white">Goleadores</h2>
                <Link href="/stats" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Ver más →
                </Link>
              </div>
              <TopScorers limit={5} />
            </motion.div>

            {/* Featured News */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold dark:text-white">Noticias</h2>
                <Link href="/news" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  Ver más →
                </Link>
              </div>
              <FeaturedNews limit={4} sidebar />
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
