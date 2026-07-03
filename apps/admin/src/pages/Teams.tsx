import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, X, Save } from 'lucide-react';
import { adminApi } from '../services/adminApi';

interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  region: string;
  fifaRanking?: number;
  group?: string;
  isEliminated: boolean;
}

const REGION_COLORS: Record<string, string> = {
  UEFA: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  CONMEBOL: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  CONCACAF: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  CAF: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  AFC: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  OFC: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
};

function EditTeamModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const qc = useQueryClient();
  const [ranking, setRanking] = useState(String(team.fifaRanking ?? ''));
  const [group, setGroup] = useState(team.group ?? '');
  const [eliminated, setEliminated] = useState(team.isEliminated);

  const saveMut = useMutation({
    mutationFn: () => adminApi.updateTeam(team.id, {
      isEliminated: eliminated,
      fifaRanking: ranking !== '' ? Number(ranking) : null,
      group: group.trim().toUpperCase() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold dark:text-white">{team.code}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{team.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-medium dark:text-white">Eliminado</span>
            <button
              onClick={() => setEliminated(!eliminated)}
              className={`w-11 h-6 rounded-full transition-colors relative ${eliminated ? 'bg-red-500' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${eliminated ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ranking FIFA</label>
            <input
              type="number" min="1" value={ranking}
              onChange={(e) => setRanking(e.target.value)}
              placeholder="ej: 1"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Grupo</label>
            <input
              type="text" value={group} maxLength={1}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="ej: A"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {saveMut.isPending ? 'Guardando...' : <><Save size={14} /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: adminApi.getTeams,
  });
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const teams: Team[] = data?.data ?? [];
  const byGroup = teams.reduce<Record<string, Team[]>>((acc, t) => {
    const g = t.group ?? '?';
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  const eliminated = teams.filter((t) => t.isEliminated).length;

  return (
    <div className="space-y-6">
      {editTeam && <EditTeamModal team={editTeam} onClose={() => setEditTeam(null)} />}

      <div>
        <h1 className="text-2xl font-bold dark:text-white">Selecciones</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {teams.length} equipos — {eliminated} eliminados — 12 grupos WC 2026
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).map(([letter, groupTeams]) => (
            <div key={letter} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold dark:text-white">Grupo {letter}</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {groupTeams.sort((a, b) => (a.fifaRanking ?? 999) - (b.fifaRanking ?? 999)).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-7 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black dark:text-white">{t.code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${t.isEliminated ? 'text-gray-400 line-through' : 'dark:text-white'}`}>
                        {t.name}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${REGION_COLORS[t.region] ?? REGION_COLORS.OFC}`}>
                        {t.region}
                      </span>
                    </div>
                    {t.fifaRanking && (
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">#{t.fifaRanking}</span>
                    )}
                    <button
                      onClick={() => setEditTeam(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors flex-shrink-0"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
