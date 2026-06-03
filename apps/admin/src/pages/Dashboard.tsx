import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Calendar, Trophy, TrendingUp, Bell, Activity,
  ArrowUpRight, ArrowDownRight, DollarSign, Eye
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../services/adminApi';

const COLORS = ['#00C851', '#1565C0', '#FFD700', '#EF4444', '#8B5CF6'];

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className="text-2xl font-bold dark:text-white mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </div>
  );
}

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getDashboardStats });
  const { data: activityData } = useQuery({ queryKey: ['admin-activity'], queryFn: adminApi.getActivityData });

  const mockActivity = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
    users: Math.floor(Math.random() * 5000) + 10000,
    predictions: Math.floor(Math.random() * 20000) + 50000,
    revenue: Math.floor(Math.random() * 1000) + 2000,
  }));

  const deviceData = [
    { name: 'Android', value: 52, color: '#00C851' },
    { name: 'iOS', value: 38, color: '#1565C0' },
    { name: 'Web', value: 10, color: '#FFD700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Panel de control ShinraFixture 2026</p>
      </div>

      {/* ── Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Usuarios Activos"
          value={stats?.activeUsers ?? 125840}
          change={12.5}
          icon={<Users size={20} className="text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          title="Partidos en Vivo"
          value={stats?.liveMatches ?? 3}
          change={0}
          icon={<Activity size={20} className="text-red-500" />}
          color="bg-red-50 dark:bg-red-950/30"
        />
        <StatCard
          title="Predicciones Hoy"
          value={stats?.todayPredictions ?? 48930}
          change={8.2}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          title="Ingresos (USD)"
          value={`$${(stats?.revenue ?? 15280).toLocaleString()}`}
          change={-2.1}
          icon={<DollarSign size={20} className="text-yellow-600" />}
          color="bg-yellow-50 dark:bg-yellow-950/30"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Activity Chart ──────────────────────── */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white mb-6">Actividad de Usuarios</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={activityData ?? mockActivity}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C851" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00C851" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Area type="monotone" dataKey="users" stroke="#00C851" fill="url(#usersGrad)" strokeWidth={2} name="Usuarios" />
              <Area type="monotone" dataKey="predictions" stroke="#1565C0" fill="url(#predsGrad)" strokeWidth={2} name="Predicciones" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Device Breakdown ────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white mb-6">Plataformas</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {deviceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {deviceData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm dark:text-gray-300">{d.name}</span>
                </div>
                <span className="text-sm font-semibold dark:text-white">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Activity Table ────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">Actividad Reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Usuario', 'Acción', 'Detalles', 'Fecha'].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { user: 'carlos_mx', action: 'Predicción', detail: 'México vs Canadá - 2:1', time: '2 min ago' },
                { user: 'futbolero99', action: 'Registro', detail: 'Nuevo usuario', time: '5 min ago' },
                { user: 'argentina_fan', action: 'Quiniela', detail: 'Unió grupo "Amigos del barrio"', time: '8 min ago' },
                { user: 'premium_user1', action: 'Suscripción', detail: 'Premium Mensual - $4.99', time: '12 min ago' },
                { user: 'worldcup2026', action: 'Comentario', detail: 'Partido: Brasil vs Argentina', time: '15 min ago' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 text-sm font-medium dark:text-white">{row.user}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400">
                      {row.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{row.detail}</td>
                  <td className="p-4 text-xs text-gray-400">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
