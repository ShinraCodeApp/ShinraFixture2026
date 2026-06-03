import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '../services/adminApi';

interface Ad {
  id: string;
  name: string;
  placement: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  startDate?: string;
  endDate?: string;
}

const PLACEMENTS = ['BANNER', 'INTERSTITIAL', 'NATIVE', 'REWARDED'];

export function AdsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', placement: 'BANNER', imageUrl: '', targetUrl: '' });

  const { data, isLoading } = useQuery({ queryKey: ['admin-ads'], queryFn: adminApi.getAds });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createAd(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ads'] }); setShowForm(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.toggleAd(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ads'] }),
  });

  const ads: Ad[] = data?.data ?? [];

  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const ctr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Publicidad</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{ads.filter((a) => a.isActive).length} anuncios activos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={16} /> Nuevo Anuncio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Impresiones', value: totalImpressions.toLocaleString() },
          { label: 'Clicks', value: totalClicks.toLocaleString() },
          { label: 'CTR', value: `${ctr}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-2xl font-black dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white mb-4">Nuevo Anuncio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Placement</label>
              <select value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">URL Imagen</label>
              <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">URL Destino</label>
              <input value={form.targetUrl} onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white text-sm font-bold transition-colors">
              {createMutation.isPending ? 'Guardando...' : 'Crear Anuncio'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="animate-pulse h-12 bg-gray-100 dark:bg-slate-700 rounded-xl" />)}
          </div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay anuncios creados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  {['Nombre', 'Placement', 'Impresiones', 'Clicks', 'CTR', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const adCtr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={ad.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium dark:text-white">{ad.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ad.placement}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{ad.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{ad.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{adCtr}%</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleMutation.mutate({ id: ad.id, isActive: !ad.isActive })}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ad.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {ad.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          {ad.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
