import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, EyeOff, Trash2, Edit3 } from 'lucide-react';
import dayjs from 'dayjs';
import { adminApi } from '../services/adminApi';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  category?: string;
  author?: string;
  isPublished: boolean;
  isPremium: boolean;
  viewsCount: number;
  createdAt: string;
}

export function NewsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', author: '', category: '', isPremium: false });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-news'],
    queryFn: adminApi.getNews,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createNews(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-news'] }); setShowForm(false); setForm({ title: '', slug: '', content: '', excerpt: '', author: '', category: '', isPremium: false }); },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishNews(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-news'] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpublishNews(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-news'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteNews(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-news'] }),
  });

  const news: NewsItem[] = (data?.data?.items ?? data?.items ?? []) as NewsItem[];

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Noticias</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{news.length} artículos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={16} /> Nueva Noticia
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white mb-4">Nueva Noticia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Título *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="Título del artículo"
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Slug</label>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Categoría</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="ej. Mundial, Selecciones..."
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Autor</label>
              <input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPremium} onChange={(e) => setForm((f) => ({ ...f, isPremium: e.target.checked }))}
                  className="rounded text-primary-500" />
                <span className="text-sm dark:text-gray-300">Contenido Premium</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Extracto</label>
              <textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2} placeholder="Resumen breve del artículo..."
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Contenido *</label>
              <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6} placeholder="Contenido completo del artículo..."
                className="w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button onClick={() => createMutation.mutate()}
              disabled={!form.title || !form.content || createMutation.isPending}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 text-sm transition-colors">
              {createMutation.isPending ? 'Guardando...' : 'Guardar Borrador'}
            </button>
            <button
              onClick={() => {
                const payload = { ...form, isPublished: true, publishedAt: new Date().toISOString() };
                adminApi.createNews(payload).then(() => {
                  qc.invalidateQueries({ queryKey: ['admin-news'] });
                  setShowForm(false);
                  setForm({ title: '', slug: '', content: '', excerpt: '', author: '', category: '', isPremium: false });
                });
              }}
              disabled={!form.title || !form.content || createMutation.isPending}
              className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-bold transition-colors">
              Publicar Ahora
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Título', 'Categoría', 'Autor', 'Vistas', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 dark:bg-slate-700 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : news.map((n) => (
                    <tr key={n.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium dark:text-white truncate">{n.title}</p>
                        {n.isPremium && <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">PREMIUM</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n.category ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n.author ?? '-'}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{n.viewsCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${n.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'}`}>
                          {n.isPublished ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{dayjs(n.createdAt).format('D MMM')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => n.isPublished ? unpublishMutation.mutate(n.id) : publishMutation.mutate(n.id)}
                            className={`p-1.5 rounded-lg transition-colors ${n.isPublished ? 'text-green-500 hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700' : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20'}`}
                            title={n.isPublished ? 'Despublicar' : 'Publicar'}>
                            {n.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => window.confirm('¿Eliminar esta noticia?') && deleteMutation.mutate(n.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
