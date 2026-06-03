import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Ban, Star, CheckCircle, XCircle, User } from 'lucide-react';
import { adminApi } from '../services/adminApi';

interface UserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isPremium: boolean;
  isBanned: boolean;
  isVerified: boolean;
  totalPredictions: number;
  predictionPoints: number;
  createdAt: string;
}

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminApi.getUsers({ search, page: String(page), limit: '20' }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.banUser(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const premiumMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => adminApi.grantPremium(id, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users: UserRow[] = data?.data?.users ?? [];
  const total: number = data?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{total.toLocaleString()} usuarios registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por email o username..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Usuario', 'Email', 'Rol', 'Puntos', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse h-4 bg-gray-100 dark:bg-slate-700 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary-500/10 rounded-full flex items-center justify-center">
                            <User size={14} className="text-primary-600" />
                          </div>
                          <span className="font-medium dark:text-white">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' :
                            u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                            u.isPremium ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'}`}>
                          {u.isPremium && u.role === 'USER' ? 'PREMIUM' : u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm dark:text-gray-300">{u.predictionPoints.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {u.isBanned
                          ? <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle size={13} /> Baneado</span>
                          : <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13} /> Activo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!u.isBanned && (
                            <button
                              onClick={() => banMutation.mutate({ id: u.id, reason: 'Violación de términos' })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Banear usuario"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {!u.isPremium && u.role === 'USER' && (
                            <button
                              onClick={() => premiumMutation.mutate({ id: u.id, days: 30 })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors"
                              title="Dar 30 días Premium"
                            >
                              <Star size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">Página {page} de {Math.ceil(total / 20)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-white transition-colors">
                Anterior
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-white transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
