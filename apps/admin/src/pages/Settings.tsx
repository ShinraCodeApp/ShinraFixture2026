import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { useTheme } from '../components/ThemeProvider';

interface ConfigItem {
  key: string;
  value: string | number | boolean;
  description?: string;
}

const CONFIG_LABELS: Record<string, string> = {
  wc2026_active: 'Mundial 2026 Activo',
  prediction_close_minutes: 'Cierre de predicciones (minutos antes)',
  premium_price_monthly: 'Precio Premium Mensual (USD)',
  premium_price_annual: 'Precio Premium Anual (USD)',
  max_quiniela_members: 'Máx. miembros por quiniela',
  points_exact_score: 'Puntos por marcador exacto',
  points_correct_gd: 'Puntos por diferencia de goles correcta',
  points_correct_winner: 'Puntos por ganador correcto',
};

export function SettingsPage() {
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const [saved, setSaved] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: adminApi.getAppConfig,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateAppConfig(key, value),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-config'] });
      setSaved(vars.key);
      setTimeout(() => setSaved(null), 2000);
    },
  });

  const configs: ConfigItem[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Configuración</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Parámetros de la plataforma</p>
      </div>

      {/* App Config */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold dark:text-white">Configuración de la App</h2>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex justify-between">
                  <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-48" />
                  <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-24" />
                </div>
              ))
            : configs.map((cfg) => (
                <ConfigRow
                  key={cfg.key}
                  config={cfg}
                  label={CONFIG_LABELS[cfg.key] ?? cfg.key}
                  isSaved={saved === cfg.key}
                  onSave={(value) => updateMutation.mutate({ key: cfg.key, value })}
                />
              ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
        <h2 className="font-semibold dark:text-white mb-4">Apariencia</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium dark:text-white">Tema</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Modo {theme === 'dark' ? 'oscuro' : 'claro'} activo</p>
          </div>
          <button onClick={toggle}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cambiar a {theme === 'dark' ? 'claro' : 'oscuro'}
          </button>
        </div>
      </div>

      {/* Admin info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
        <h2 className="font-semibold dark:text-white mb-4">Administrador</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="dark:text-white font-medium">admin@shinrafixture.com</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rol</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">SUPER_ADMIN</span>
          </div>
        </div>
        <button
          onClick={() => { localStorage.removeItem('shinra_admin_token'); window.location.href = '/login'; }}
          className="mt-4 w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

function ConfigRow({ config, label, isSaved, onSave }: { config: ConfigItem; label: string; isSaved: boolean; onSave: (v: unknown) => void }) {
  const [localVal, setLocalVal] = useState(String(config.value));
  const isBoolean = typeof config.value === 'boolean';
  const isDirty = localVal !== String(config.value);

  if (isBoolean) {
    return (
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium dark:text-white">{label}</p>
          {config.description && <p className="text-xs text-gray-400">{config.description}</p>}
        </div>
        <button onClick={() => onSave(!config.value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${config.value ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.value ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium dark:text-white">{label}</p>
        {config.description && <p className="text-xs text-gray-400">{config.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type={typeof config.value === 'number' ? 'number' : 'text'}
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          className="w-28 text-right border dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {isDirty && (
          <button onClick={() => onSave(typeof config.value === 'number' ? +localVal : localVal)}
            className="p-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors">
            <Save size={13} />
          </button>
        )}
        {isSaved && <span className="text-xs text-green-500 font-bold">✓</span>}
      </div>
    </div>
  );
}
