import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { MatchesPage } from './pages/Matches';
import { TeamsPage } from './pages/Teams';
import { PredictionsPage } from './pages/Predictions';
import { NotificationsPage } from './pages/Notifications';
import { NewsPage } from './pages/News';
import { AdsPage } from './pages/Ads';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import {
  LayoutDashboard, Users, Calendar, Trophy, Zap, Bell, Newspaper,
  Megaphone, Settings, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/users', label: 'Usuarios', icon: Users },
  { path: '/matches', label: 'Partidos', icon: Calendar },
  { path: '/teams', label: 'Selecciones', icon: Trophy },
  { path: '/predictions', label: 'Predicciones', icon: Zap },
  { path: '/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/news', label: 'Noticias', icon: Newspaper },
  { path: '/ads', label: 'Publicidad', icon: Megaphone },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();

  return (
    <aside className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="font-black text-sm">S</span>
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm">ShinraFixture</div>
            <div className="text-xs text-gray-400">Admin Panel</div>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto p-1 rounded text-gray-400 hover:text-white transition-colors">
          {collapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-colors">
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 overflow-hidden">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 gap-4">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={20} className="dark:text-white" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium dark:text-white">Admin</p>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/users" element={<UsersPage />} />
                      <Route path="/matches" element={<MatchesPage />} />
                      <Route path="/teams" element={<TeamsPage />} />
                      <Route path="/predictions" element={<PredictionsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/ads" element={<AdsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
