import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, adminApi } from '../services/adminApi';
import { Bell } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const LEAGUE_THEME: Record<string, { emoji: string }> = {
  LIGA_ARG:       { emoji: '🇦🇷' },
  LA_LIGA:        { emoji: '🇪🇸' },
  PREMIER_LEAGUE: { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LIGUE_1:        { emoji: '🇫🇷' },
  BUNDESLIGA:     { emoji: '🇩🇪' },
  SERIE_A:        { emoji: '🇮🇹' },
  COPA_AMERICA:   { emoji: '🌎' },
  EURO:           { emoji: '⭐' },
  LIBERTADORES:   { emoji: '🦅' },
  LEAGUE:         { emoji: '🏆' },
};

function getStatus(t: any) {
  const now = dayjs();
  const start = dayjs(t.startDate);
  const end = dayjs(t.endDate);
  if (now.isBefore(start)) return { label: 'Próximo',    cls: 'bg-yellow-500/15 text-yellow-400' };
  if (now.isAfter(end))   return { label: 'Finalizado',  cls: 'bg-slate-500/20 text-slate-400' };
  return                         { label: 'En Curso',    cls: 'bg-green-500/15 text-green-400' };
}

export function LigasPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const notifyMutation = useMutation({
    mutationFn: () => adminApi.sendNotification({
      title: '🏆 ¡Nuevas ligas disponibles en Shinra Fixture!',
      body: '🇦🇷 Clausura 23 Jul · 🇪🇸 La Liga 15 Ago · 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier 15 Ago · 🇩🇪 Bundesliga 22 Ago · 🇮🇹 Serie A 23 Ago',
      type: 'NEWS',
      target: 'ALL',
    }),
    onSuccess: () => {
      setNotifMsg('✓ Notificación enviada a todos los usuarios');
      setTimeout(() => setNotifMsg(null), 5000);
    },
    onError: () => {
      setNotifMsg('✗ Error al enviar notificación');
      setTimeout(() => setNotifMsg(null), 4000);
    },
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: async () => {
      const res = await api.get('/tournaments');
      return (res.data.data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  const leagues = tournaments.filter((t: any) => t.type !== 'WORLD_CUP');
  const selected = leagues.find((t: any) => t.id === selectedId) ?? leagues[0] ?? null;

  const { data: standings = [] } = useQuery({
    queryKey: ['admin-standings', selected?.id],
    queryFn: async () => {
      try {
        const res = await api.get(`/teams/standings/${selected.id}`);
        return (res.data.data ?? []) as any[];
      } catch { return []; }
    },
    enabled: !!selected?.id,
    staleTime: 2 * 60_000,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['admin-league-matches', selected?.id],
    queryFn: async () => {
      try {
        const res = await api.get(`/matches?tournamentId=${selected.id}&limit=20`);
        return (res.data.data ?? []) as any[];
      } catch { return []; }
    },
    enabled: !!selected?.id,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Ligas 2026/27</h1>
          <p className="text-slate-500 text-sm mt-1">Seguimiento de ligas y torneos activos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {notifMsg && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${notifMsg.startsWith('✓') ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
              {notifMsg}
            </span>
          )}
          <button
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending}
            title="Envía una notificación push a todos los usuarios con las fechas de inicio de las ligas"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Bell size={14} />
            {notifyMutation.isPending ? 'Enviando...' : 'Notificar Inicio de Ligas'}
          </button>
        </div>
      </div>

      {/* Tabs de ligas */}
      {leagues.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {leagues.map((t: any) => {
            const theme = LEAGUE_THEME[t.type] ?? { emoji: '🏆' };
            const isActive = selected?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${
                  isActive
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{theme.emoji}</span>
                {t.shortName ?? t.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <span className="text-5xl mb-4">🏆</span>
          <p className="font-semibold text-lg">No hay ligas registradas aún</p>
          <p className="text-sm mt-1">Andá a <strong>Llaves</strong> y hacé click en <strong>"Activar Ligas"</strong></p>
        </div>
      )}

      {/* Detalle de la liga seleccionada */}
      {selected && (() => {
        const status = getStatus(selected);
        const theme = LEAGUE_THEME[selected.type] ?? { emoji: '🏆' };
        const start = dayjs(selected.startDate);
        const end = dayjs(selected.endDate);
        const now = dayjs();
        const isUpcoming = now.isBefore(start);
        const daysUntil = start.diff(now, 'day');

        const finished = matches.filter((m: any) => m.status === 'FINISHED')
          .sort((a: any, b: any) => dayjs(b.matchDate).valueOf() - dayjs(a.matchDate).valueOf());
        const upcoming = matches.filter((m: any) => m.status === 'SCHEDULED' || m.status === 'PENDING')
          .sort((a: any, b: any) => dayjs(a.matchDate).valueOf() - dayjs(b.matchDate).valueOf());

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <span className="text-5xl">{theme.emoji}</span>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold dark:text-white mb-4">{selected.name}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Inicio</span>
                    <span className="dark:text-white font-medium">{start.format('D MMM YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Fin</span>
                    <span className="dark:text-white font-medium">{end.format('D MMM YYYY')}</span>
                  </div>
                  {selected.hostCountries?.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">País</span>
                      <span className="dark:text-white font-medium">{selected.hostCountries.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Partidos</span>
                    <span className="dark:text-white font-medium">{matches.length}</span>
                  </div>
                </div>
                {isUpcoming && (
                  <div className="mt-5 p-4 bg-yellow-500/10 rounded-xl text-center">
                    <p className="text-yellow-400 font-black text-3xl">{daysUntil}</p>
                    <p className="text-yellow-400/70 text-xs mt-1">días para el inicio</p>
                    <p className="text-yellow-400/50 text-xs">{start.format('dddd D [de] MMMM')}</p>
                  </div>
                )}
              </div>

              {/* Próximos partidos */}
              {upcoming.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b dark:border-slate-700">
                    <h3 className="font-bold dark:text-white text-sm">Próximos partidos</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {upcoming.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="px-5 py-3 text-xs">
                        <p className="text-slate-500 mb-1">{dayjs(m.matchDate).format('ddd D MMM · HH:mm')}</p>
                        <p className="dark:text-white font-semibold">
                          {m.homeTeam?.shortName ?? m.homeTeam?.name ?? '—'}
                          <span className="text-slate-400 font-normal mx-1">vs</span>
                          {m.awayTeam?.shortName ?? m.awayTeam?.name ?? '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Standings + Resultados */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabla de posiciones */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-slate-700">
                  <h3 className="font-bold dark:text-white">Tabla de Posiciones</h3>
                </div>
                {standings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                    <span className="text-4xl mb-3">📋</span>
                    <p className="text-sm font-medium">
                      {isUpcoming
                        ? `La liga empieza el ${start.format('D [de] MMMM')}`
                        : 'Sin datos de posiciones'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b dark:border-slate-700 uppercase tracking-wide">
                          <th className="text-left px-6 py-3 w-8">#</th>
                          <th className="text-left px-3 py-3">Equipo</th>
                          <th className="text-center px-3 py-3">PJ</th>
                          <th className="text-center px-3 py-3">G</th>
                          <th className="text-center px-3 py-3">E</th>
                          <th className="text-center px-3 py-3">P</th>
                          <th className="text-center px-3 py-3">GF</th>
                          <th className="text-center px-3 py-3">GC</th>
                          <th className="text-center px-3 py-3">DG</th>
                          <th className="text-center px-4 py-3 text-white font-bold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s: any, i: number) => (
                          <tr
                            key={s.teamId ?? s.team?.id ?? i}
                            className="border-b dark:border-slate-700/50 hover:dark:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-6 py-3 text-slate-500 text-center">{i + 1}</td>
                            <td className="px-3 py-3 dark:text-white font-medium">
                              {s.teamName ?? s.team?.name ?? s.name ?? '—'}
                            </td>
                            <td className="text-center px-3 py-3 text-slate-400">{s.played ?? s.matchesPlayed ?? 0}</td>
                            <td className="text-center px-3 py-3 text-green-400 font-medium">{s.won ?? s.wins ?? 0}</td>
                            <td className="text-center px-3 py-3 text-slate-400">{s.drawn ?? s.draws ?? s.draw ?? 0}</td>
                            <td className="text-center px-3 py-3 text-red-400 font-medium">{s.lost ?? s.losses ?? 0}</td>
                            <td className="text-center px-3 py-3 text-slate-400">{s.goalsFor ?? s.gf ?? 0}</td>
                            <td className="text-center px-3 py-3 text-slate-400">{s.goalsAgainst ?? s.ga ?? 0}</td>
                            <td className="text-center px-3 py-3 text-slate-400">
                              {((s.goalsFor ?? s.gf ?? 0) - (s.goalsAgainst ?? s.ga ?? 0))}
                            </td>
                            <td className="text-center px-4 py-3 dark:text-white font-black text-base">
                              {s.points ?? s.pts ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Resultados recientes */}
              {finished.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b dark:border-slate-700">
                    <h3 className="font-bold dark:text-white">Resultados Recientes</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {finished.slice(0, 8).map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                        <span className="text-slate-500 text-xs w-24 shrink-0">
                          {dayjs(m.matchDate).format('DD/MM/YY')}
                        </span>
                        <div className="flex-1 text-right dark:text-white font-medium truncate">
                          {m.homeTeam?.shortName ?? m.homeTeam?.name ?? '—'}
                        </div>
                        <div className="w-20 text-center shrink-0">
                          <span className="font-black dark:text-white text-base">
                            {m.homeScore} – {m.awayScore}
                          </span>
                        </div>
                        <div className="flex-1 dark:text-white font-medium truncate">
                          {m.awayTeam?.shortName ?? m.awayTeam?.name ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
