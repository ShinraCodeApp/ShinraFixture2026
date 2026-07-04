import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, Swords, Star, CheckCircle, Clock, Trophy, Shield,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi } from '../services/adminApi';
import dayjs from 'dayjs';

const COLORS = ['#00C851', '#1565C0', '#FFD700', '#EF4444', '#8B5CF6'];

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCard({ title, value, change, icon, color, sub }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold dark:text-white mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getDashboardStats });
  const { data: activityData } = useQuery({ queryKey: ['admin-activity'], queryFn: adminApi.getActivityData, refetchInterval: 5 * 60_000 });
  const { data: tournament } = useQuery({ queryKey: ['admin-tournament-status'], queryFn: adminApi.getTournamentStatus, refetchInterval: 60_000 });

  const matchStatusPie = tournament
    ? [
        { name: 'Finalizados', value: tournament.matchesPlayed, color: '#00C851' },
        { name: 'Programados', value: tournament.totalMatches - tournament.matchesPlayed - tournament.liveCount, color: '#94a3b8' },
        { name: 'En vivo', value: tournament.liveCount, color: '#EF4444' },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Panel de control ShinraFixture 2026</p>
      </div>

      {/* ── Alertas operativas ─────────────────────────────── */}
      {tournament?.staleMatches?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-700 dark:text-amber-400">
              {tournament.staleMatches.length} partido{tournament.staleMatches.length > 1 ? 's' : ''} sin actualizar
            </h2>
          </div>
          <div className="space-y-1">
            {tournament.staleMatches.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Clock size={13} />
                <span className="font-mono font-bold">R{m.round}</span>
                <span>{m.homeTeam?.code} vs {m.awayTeam?.code}</span>
                <span className="text-amber-500">· {dayjs(m.matchDate).format('D MMM HH:mm')} (SCHEDULED)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Widget del torneo ──────────────────────────────── */}
      {tournament && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Fase actual</p>
              <h2 className="text-2xl font-black">{tournament.currentPhase}</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black">{tournament.matchesPlayed}<span className="text-blue-300 text-lg font-normal">/{tournament.totalMatches}</span></p>
              <p className="text-blue-200 text-sm">partidos jugados</p>
            </div>
          </div>
          {tournament.liveCount > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-semibold">{tournament.liveCount} partido{tournament.liveCount > 1 ? 's' : ''} en vivo ahora</span>
            </div>
          )}
          {tournament.nextMatches?.length > 0 && (
            <div className="border-t border-blue-500 pt-3 mt-2">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">Próximos partidos</p>
              <div className="flex gap-4 flex-wrap">
                {tournament.nextMatches.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold">{m.homeTeam?.code}</span>
                    <span className="text-blue-300">vs</span>
                    <span className="font-bold">{m.awayTeam?.code}</span>
                    <span className="text-blue-300 text-xs">· {dayjs(m.matchDate).format('D MMM HH:mm')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Usuarios totales"
          value={stats?.total ?? '—'}
          icon={<Users size={20} className="text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-950/30"
          sub={`+${stats?.newToday ?? 0} hoy`}
        />
        <StatCard
          title="Premium activos"
          value={stats?.premium ?? '—'}
          icon={<Star size={20} className="text-yellow-500" />}
          color="bg-yellow-50 dark:bg-yellow-950/30"
        />
        <StatCard
          title="Predicciones totales"
          value={stats?.totalPredictions ?? '—'}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          title="Duelos creados"
          value={stats?.totalDuels ?? '—'}
          icon={<Swords size={20} className="text-purple-600" />}
          color="bg-purple-50 dark:bg-purple-950/30"
        />
      </div>

      {/* ── Registros de usuarios ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats?.newToday ?? '—'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registros hoy</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-green-600">{stats?.newLast7 ?? '—'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Últimos 7 días</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
          <p className="text-3xl font-bold text-purple-600">{stats?.newLast30 ?? '—'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Últimos 30 días</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Gráfico de actividad real ───────────────────── */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white mb-1">Actividad (últimos 30 días)</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Registros de usuarios y predicciones por día</p>
          {activityData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activityData}>
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
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Area type="monotone" dataKey="users" stroke="#00C851" fill="url(#usersGrad)" strokeWidth={2} name="Usuarios" />
                <Area type="monotone" dataKey="predictions" stroke="#1565C0" fill="url(#predsGrad)" strokeWidth={2} name="Predicciones" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Cargando datos...</div>
            </div>
          )}
        </div>

        {/* ── Estado del Mundial ─────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white mb-6">Estado del Mundial</h2>
          {matchStatusPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={matchStatusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {matchStatusPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} partidos`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {matchStatusPie.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm dark:text-gray-300">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Cargando...</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Partidos en vivo / Próximos ────────────────────── */}
      {tournament && (tournament.liveMatches?.length > 0 || tournament.nextMatches?.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {tournament.liveMatches?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h2 className="font-semibold dark:text-white">En vivo ahora</h2>
              </div>
              {tournament.liveMatches.map((m: any) => (
                <div key={m.id} className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    {m.homeTeam?.flagUrl && <img src={m.homeTeam.flagUrl} className="w-6 h-4 object-contain rounded" />}
                    <span className="font-bold dark:text-white text-sm">{m.homeTeam?.code}</span>
                    <span className="text-gray-400 text-xs">vs</span>
                    <span className="font-bold dark:text-white text-sm">{m.awayTeam?.code}</span>
                    {m.awayTeam?.flagUrl && <img src={m.awayTeam.flagUrl} className="w-6 h-4 object-contain rounded" />}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">LIVE</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500" />
              <h2 className="font-semibold dark:text-white">Próximos partidos</h2>
            </div>
            {(tournament.nextMatches ?? []).slice(0, 5).map((m: any) => (
              <div key={m.id} className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono w-6">R{m.round}</span>
                  <span className="font-bold dark:text-white text-sm">{m.homeTeam?.code}</span>
                  <span className="text-gray-400 text-xs">vs</span>
                  <span className="font-bold dark:text-white text-sm">{m.awayTeam?.code}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{dayjs(m.matchDate).format('D MMM HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Octavos de Final ──────────────────────────────── */}
      {tournament?.r16Matches?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" />
            <h2 className="font-semibold dark:text-white">Octavos de Final</h2>
            <span className="ml-auto text-xs text-gray-400">
              {tournament.r16Matches.filter((m: any) => m.status === 'FINISHED').length} / {tournament.r16Matches.length} jugados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-700">
            {tournament.r16Matches.map((m: any) => {
              const finished = m.status === 'FINISHED';
              const live = m.status === 'LIVE' || m.status === 'HALF_TIME';
              return (
                <div key={m.id} className={`p-4 ${live ? 'bg-red-50 dark:bg-red-950/10' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    {/* Home */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {m.homeTeam?.flagUrl
                        ? <img src={m.homeTeam.flagUrl} className="w-6 h-4 object-contain rounded flex-shrink-0" />
                        : <div className="w-6 h-4 bg-gray-200 dark:bg-slate-600 rounded flex-shrink-0" />}
                      <span className={`text-sm font-bold truncate ${finished && m.homeScore > m.awayScore ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {m.homeTeam?.code ?? 'TBD'}
                      </span>
                    </div>
                    {/* Score */}
                    <div className="text-center flex-shrink-0 px-1">
                      {finished ? (
                        <span className="text-sm font-black dark:text-white tabular-nums">
                          {m.homeScore} - {m.awayScore}
                          {m.homePenalties != null && (
                            <span className="text-[10px] text-gray-400 block">({m.homePenalties}-{m.awayPenalties}p)</span>
                          )}
                        </span>
                      ) : live ? (
                        <span className="text-xs font-bold text-red-500 animate-pulse">EN VIVO</span>
                      ) : (
                        <span className="text-xs text-gray-400">vs</span>
                      )}
                    </div>
                    {/* Away */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className={`text-sm font-bold truncate ${finished && m.awayScore > m.homeScore ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {m.awayTeam?.code ?? 'TBD'}
                      </span>
                      {m.awayTeam?.flagUrl
                        ? <img src={m.awayTeam.flagUrl} className="w-6 h-4 object-contain rounded flex-shrink-0" />
                        : <div className="w-6 h-4 bg-gray-200 dark:bg-slate-600 rounded flex-shrink-0" />}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-gray-400 mt-1.5">
                    {dayjs(m.matchDate).format('D MMM · HH:mm')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Predicciones + Top Predictores ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Desglose de predicciones */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Predicciones
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Correctas', value: stats?.predictionsWon ?? 0, total: stats?.totalPredictions ?? 1, color: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
              { label: 'Incorrectas', value: stats?.predictionsLost ?? 0, total: stats?.totalPredictions ?? 1, color: 'bg-red-500', text: 'text-red-500 dark:text-red-400' },
              { label: 'Pendientes', value: stats?.predictionsPending ?? 0, total: stats?.totalPredictions ?? 1, color: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400' },
            ].map((s) => {
              const pct = stats?.totalPredictions ? Math.round((s.value / stats.totalPredictions) * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="dark:text-gray-300">{s.label}</span>
                    <span className={`font-bold ${s.text}`}>{s.value.toLocaleString()} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-bold dark:text-white">{(stats?.totalPredictions ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Top 5 predictores */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" />
            <h2 className="font-semibold dark:text-white">Top Predictores</h2>
          </div>
          {(stats?.topPredictors ?? []).length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Sin predicciones aún</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {(stats?.topPredictors ?? []).map((u: any, i: number) => (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                    ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {(u.displayName ?? u.username ?? '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold dark:text-white truncate">{u.displayName ?? u.username}</p>
                    <p className="text-xs text-gray-400">{u.totalPredictions} predicciones</p>
                  </div>
                  <span className="text-sm font-black text-primary-600 dark:text-primary-400">{u.predictionPoints.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Equipos eliminados ─────────────────────────────── */}
      {stats?.eliminatedTeams !== undefined && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={18} className="text-red-500" />
            <h2 className="font-semibold dark:text-white">Selecciones eliminadas</h2>
            <span className="ml-auto text-2xl font-black text-red-500">{stats.eliminatedTeams}</span>
            <span className="text-gray-400 text-sm">/ 48</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
              style={{ width: `${Math.round((stats.eliminatedTeams / 48) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {48 - stats.eliminatedTeams} selecciones aún en competencia
          </p>
        </div>
      )}

      {/* ── Monitor de actividad ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">Resumen del sistema</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-700">
          {[
            { label: 'Fase actual', value: tournament?.currentPhase ?? '—', icon: <Activity size={16} className="text-blue-500" /> },
            { label: 'Partidos jugados', value: `${tournament?.matchesPlayed ?? '—'} / ${tournament?.totalMatches ?? '—'}`, icon: <CheckCircle size={16} className="text-green-500" /> },
            { label: 'Alertas pendientes', value: tournament?.staleMatches?.length ?? 0, icon: <AlertTriangle size={16} className="text-amber-500" /> },
            { label: 'Torneos activos', value: stats?.totalTournaments ?? '—', icon: <Star size={16} className="text-purple-500" /> },
          ].map((item) => (
            <div key={item.label} className="p-6 flex items-center gap-3">
              {item.icon}
              <div>
                <p className="text-lg font-bold dark:text-white">{item.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
