import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, User, Shield, Crown, Save, Trash2, Eye, EyeOff } from 'lucide-react';
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
  xp?: number;
  level?: number;
  country?: string;
  createdAt: string;
}

type ModalTab = 'actions' | 'profile';

function UserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<ModalTab>('actions');

  // Profile edit state
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [username, setUsername] = useState(user.username || '');
  const [country, setCountry] = useState(user.country || '');
  const [points, setPoints] = useState(String(user.predictionPoints ?? 0));
  const [xp, setXp] = useState(String(user.xp ?? 0));
  const [level, setLevel] = useState(String(user.level ?? 1));
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = { onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) };
  const closeAfter = { onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); } };

  const banMut = useMutation({ mutationFn: () => adminApi.banUser(user.id, 'Violación de términos'), ...closeAfter });
  const unbanMut = useMutation({ mutationFn: () => adminApi.unbanUser(user.id), ...closeAfter });
  const premiumMut = useMutation({ mutationFn: () => adminApi.grantPremium(user.id, 30), ...closeAfter });
  const revokeMut = useMutation({ mutationFn: () => adminApi.revokePremium(user.id), ...closeAfter });
  const roleMut = useMutation({ mutationFn: (role: string) => adminApi.setRole(user.id, role), ...closeAfter });
  const profileMut = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = {
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        country: country.trim() || undefined,
        predictionPoints: Number(points),
        xp: Number(xp),
        level: Number(level),
      };
      if (newPassword.trim().length >= 6) data.password = newPassword.trim();
      return adminApi.updateUser(user.id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setSavedProfile(true);
      setNewPassword('');
      setTimeout(() => setSavedProfile(false), 2000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => adminApi.deleteUser(user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
  });

  const isPending = banMut.isPending || unbanMut.isPending || premiumMut.isPending || revokeMut.isPending || roleMut.isPending;
  const initials = (user.displayName || user.username || '?')[0].toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-bold text-lg">
            {initials}
          </div>
          <div>
            <p className="font-semibold dark:text-white">{user.displayName || user.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 text-sm font-semibold">
          {([['actions', 'Gestionar'], ['profile', 'Editar Perfil']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 transition-colors ${tab === key ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'actions' && (
          <>
            {/* Premium */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Plan</p>
              <div className="flex gap-2">
                <button
                  onClick={() => !user.isPremium && premiumMut.mutate()}
                  disabled={isPending || user.isPremium}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${!user.isPremium ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500'}`}
                >
                  Free
                </button>
                <button
                  onClick={() => !user.isPremium ? premiumMut.mutate() : revokeMut.mutate()}
                  disabled={isPending}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${user.isPremium ? 'border-yellow-400 bg-yellow-400 text-white' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-yellow-400 hover:text-yellow-500'}`}
                >
                  ⭐ Premium
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Rol</p>
              <div className="flex gap-2">
                {(['USER', 'ADMIN', 'SUPER_ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => user.role !== r && roleMut.mutate(r)}
                    disabled={isPending || user.role === r}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1
                      ${user.role === r ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500'}`}
                  >
                    {r === 'USER' && <User size={11} />}
                    {r === 'ADMIN' && <Shield size={11} />}
                    {r === 'SUPER_ADMIN' && <Crown size={11} />}
                    {r === 'USER' ? 'User' : r === 'ADMIN' ? 'Admin' : 'Super'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ban */}
            <button
              onClick={() => user.isBanned ? unbanMut.mutate() : banMut.mutate()}
              disabled={isPending}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                ${user.isBanned
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-50 hover:bg-red-500 text-red-500 hover:text-white dark:bg-red-950/20 dark:hover:bg-red-500 border border-red-200 dark:border-red-800'}`}
            >
              {user.isBanned ? '✓ Desbanear usuario' : '⛔ Banear usuario'}
            </button>
          </>
        )}

        {tab === 'profile' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nombre visible', value: displayName, set: setDisplayName },
                { label: 'Username', value: username, set: setUsername },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">País (ej: AR)</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Puntos', value: points, set: setPoints },
                { label: 'XP', value: xp, set: setXp },
                { label: 'Nivel', value: level, set: setLevel },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nueva contraseña (vacío = no cambiar)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className="w-full px-2.5 py-1.5 pr-8 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <button
              onClick={() => profileMut.mutate()}
              disabled={profileMut.isPending}
              className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {savedProfile ? '✓ Guardado' : profileMut.isPending ? 'Guardando...' : <><Save size={14} /> Guardar cambios</>}
            </button>
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={14} /> Eliminar usuario
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-500 text-center font-semibold">¿Confirmar eliminación permanente?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                    <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-60">
                      {deleteMut.isPending ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminApi.getUsers({ search, page: String(page), limit: '20' }),
  });

  const users: UserRow[] = data?.data?.items ?? [];
  const total: number = data?.data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      {selected && <UserModal user={selected} onClose={() => setSelected(null)} />}

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
                          <div className="w-7 h-7 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                            {(u.displayName || u.username || '?')[0].toUpperCase()}
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
                          ? <span className="text-red-500 text-xs font-medium">⛔ Baneado</span>
                          : <span className="text-green-600 text-xs font-medium">✓ Activo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(u)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500 hover:text-white transition-all"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Página {page} de {Math.ceil(total / 20)}</p>
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
