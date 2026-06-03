'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Home, Calendar, Trophy, BarChart3, Zap, Users, Bell,
  Search, Menu, X, Moon, Sun, ChevronDown, Star, Target
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserMenu } from '../user/UserMenu';
import { NotificationsDropdown } from '../notifications/NotificationsDropdown';
import { LiveScoreTicker } from '../match/LiveScoreTicker';
import { SearchModal } from '../search/SearchModal';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/fixture', label: 'Fixture', icon: Calendar },
  { href: '/standings', label: 'Posiciones', icon: Trophy },
  { href: '/teams', label: 'Selecciones', icon: Users },
  { href: '/stats', label: 'Estadísticas', icon: BarChart3 },
  { href: '/predictions', label: 'Predicciones', icon: Zap },
  { href: '/simulator', label: 'Simulador', icon: Target },
  { href: '/community', label: 'Comunidad', icon: Users },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* ── Live Score Ticker ─────────────────────── */}
      <LiveScoreTicker />

      {/* ── Navbar ───────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <div>
                <span className="font-black text-lg dark:text-white group-hover:text-primary-500 transition-colors">
                  Shinra
                </span>
                <span className="font-black text-lg text-primary-500">Fixture</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">2026</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.slice(0, 6).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'text-primary-500 bg-primary-50 dark:bg-primary-950/30'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  Más <ChevronDown size={14} />
                </button>
                <div className="absolute top-full right-0 pt-1 hidden group-hover:block">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-2 min-w-40">
                    {NAV_ITEMS.slice(6).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <item.icon size={15} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Search size={20} />
              </button>

              <NotificationsDropdown />

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <UserMenu />

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-3 grid grid-cols-3 gap-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-colors',
                      pathname === item.href
                        ? 'text-primary-500 bg-primary-50 dark:bg-primary-950/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main Content ─────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="mt-16 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ShinraFixture</h3>
              <p className="text-sm text-gray-400 mb-4">
                La plataforma definitiva para el Mundial FIFA 2026™. Resultados en vivo, predicciones e IA.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Fixture</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {['Fase de Grupos', 'Octavos', 'Cuartos', 'Semifinales', 'Final'].map(l => (
                  <li key={l}><Link href="/fixture" className="hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Comunidad</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {['Predicciones', 'Quiniela', 'Simulador', 'Noticias', 'Foros'].map(l => (
                  <li key={l}><Link href="/community" className="hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">App Móvil</h4>
              <p className="text-sm text-gray-400 mb-3">Descarga la app gratis</p>
              <div className="space-y-2">
                <a href="#" className="block bg-black rounded-xl px-4 py-2 text-center text-xs border border-gray-700 hover:border-gray-500 transition-colors">
                  App Store
                </a>
                <a href="#" className="block bg-black rounded-xl px-4 py-2 text-center text-xs border border-gray-700 hover:border-gray-500 transition-colors">
                  Google Play
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs text-gray-500">
            © 2026 ShinraFixture. Datos FIFA World Cup 2026™. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
