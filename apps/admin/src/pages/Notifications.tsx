import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Send, Calendar } from 'lucide-react';
import { adminApi, api } from '../services/adminApi';

const NOTIFICATION_TYPES = ['SYSTEM', 'NEWS', 'MATCH_START', 'GOAL', 'PREDICTION_RESULT', 'QUINIELA_UPDATE'];
const TARGETS = [
  { value: 'ALL', label: 'Todos los usuarios' },
  { value: 'PREMIUM', label: 'Solo usuarios Premium' },
  { value: 'ACTIVE', label: 'Usuarios activos (últimos 7 días)' },
];

export function NotificationsPage() {
  const [form, setForm] = useState({ title: '', body: '', type: 'SYSTEM', target: 'ALL' });
  const [sent, setSent] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () => adminApi.sendNotification(form),
    onSuccess: () => {
      setSent(true);
      setForm({ title: '', body: '', type: 'SYSTEM', target: 'ALL' });
      setTimeout(() => setSent(false), 4000);
    },
  });

  const dailyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/notifications/daily-matches');
      return res.data;
    },
    onSuccess: (data) => {
      setDailyMsg(`✓ ${data.result}`);
      setTimeout(() => setDailyMsg(null), 5000);
    },
    onError: () => {
      setDailyMsg('✗ Error al enviar');
      setTimeout(() => setDailyMsg(null), 4000);
    },
  });

  const canSend = form.title.trim() && form.body.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Notificaciones</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Envío de notificaciones push a los usuarios</p>
      </div>

      {/* Notificación rápida de partidos del día */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-white font-bold flex items-center gap-2">
            <Calendar size={16} /> Partidos del día
          </p>
          <p className="text-blue-100 text-xs mt-1">
            Envía automáticamente a las 12:00 PM (ART) · También podés dispararlo manualmente ahora
          </p>
          {dailyMsg && (
            <p className={`text-xs font-semibold mt-2 ${dailyMsg.startsWith('✓') ? 'text-green-200' : 'text-red-200'}`}>
              {dailyMsg}
            </p>
          )}
        </div>
        <button
          onClick={() => dailyMutation.mutate()}
          disabled={dailyMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50 font-bold text-sm rounded-xl transition-colors flex-shrink-0"
        >
          <Bell size={14} />
          {dailyMutation.isPending ? 'Enviando...' : 'Notificar ahora'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white mb-5 flex items-center gap-2">
            <Bell size={16} className="text-primary-500" />
            Enviar Notificación
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Título</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ej. ¡Nuevo partido en vivo!"
                maxLength={100}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Mensaje</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Cuerpo del mensaje..."
                maxLength={200}
                rows={3}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length}/200</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Destinatarios</label>
              <select
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {sent && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <p className="text-green-700 dark:text-green-400 text-sm font-medium">✓ Notificación enviada correctamente</p>
              </div>
            )}

            <button
              onClick={() => sendMutation.mutate()}
              disabled={!canSend || sendMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              <Send size={15} />
              {sendMutation.isPending ? 'Enviando...' : 'Enviar Notificación'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white mb-5">Vista Previa</h2>
          <div className="bg-gray-900 rounded-2xl p-4 min-h-[200px]">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-sm">S</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {form.title || 'Título de la notificación'}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    {form.body || 'Cuerpo del mensaje aquí...'}
                  </p>
                  <p className="text-white/40 text-xs mt-1">ShinraFixture · ahora</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
