'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Layout,
  Languages,
  Download,
  LogOut,
  Eye,
  Check,
  FileSpreadsheet,
  FileCode,
  Shield,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useData } from '@/context/DataContext';
import { SCRIPT_CONFIGS, Language, ThemeMode, DensityMode } from '@/types';
import { Button } from '@/components/atomic/Button';
import { exportEventsToCSV, exportEventsToJSON } from '@/utils/export';
import { apiFetch } from '@/lib/api-client';

export function SettingsMobile() {
  const router = useRouter();
  const { theme, setTheme, density, setDensity } = useSettings();
  const { events, hideDemo, setHideDemo, showToast } = useData();

  const [enabledLanguages, setEnabledLanguages] = useState<Record<Language, boolean>>({
    te: true,
    ta: true,
    hi: true,
    pa: true,
    ml: true,
    kn: true,
    bn: true,
    en: true,
  });

  const toggleLanguage = (lang: Language) => {
    setEnabledLanguages(prev => ({ ...prev, [lang]: !prev[lang] }));
    showToast(`Updated ${SCRIPT_CONFIGS[lang]?.name || lang} preference`);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });

      // Clear Service Worker caches on logout
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
        }
      }

      showToast('Logged out');
      window.location.href = '/';
    } catch {
      showToast('Error logging out');
    }
  };

  const handleExportCSV = () => {
    exportEventsToCSV(events);
    showToast(`Exported ${events.length} songs to CSV`);
  };

  const handleExportJSON = () => {
    exportEventsToJSON(events);
    showToast(`Exported ${events.length} songs to JSON`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-foreground">Preferences & Settings</h1>
          <p className="text-xs text-text-muted">Regional filters, theme & exports</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2 text-rose-400 hover:text-rose-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Languages Selection */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 block mb-2">
            Active Languages
          </span>
          <div className="bg-surface-elevated rounded-xl border border-surface-border divide-y divide-surface-border/50 overflow-hidden">
            {(Object.keys(SCRIPT_CONFIGS) as Language[]).map(lang => {
              const cfg = SCRIPT_CONFIGS[lang];
              const isEnabled = enabledLanguages[lang];

              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-foreground active:bg-surface-subtle min-h-[48px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold">{cfg.name}</span>
                    <span className={`text-xs text-brand-400 font-bold ${cfg.fontClass}`}>
                      {cfg.nativeName}
                    </span>
                  </div>
                  {isEnabled && <Check className="w-5 h-5 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Mode */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 block mb-2">
            Appearance Theme
          </span>
          <div className="bg-surface-elevated rounded-xl border border-surface-border divide-y divide-surface-border/50 overflow-hidden">
            {(['dark', 'light', 'system'] as ThemeMode[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-foreground active:bg-surface-subtle min-h-[48px]"
              >
                <span className="capitalize font-semibold">{t} Mode</span>
                {theme === t && <Check className="w-5 h-5 text-brand-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Data Toggle */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 block mb-2">
            Seed Data Filtering
          </span>
          <div className="bg-surface-elevated rounded-xl border border-surface-border p-4 flex items-center justify-between min-h-[48px]">
            <div>
              <div className="text-sm font-semibold text-foreground">Hide Demo Data</div>
              <div className="text-xs text-text-muted mt-0.5">
                {hideDemo ? 'Only showing live ingests' : 'Showing seed items'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setHideDemo(!hideDemo);
                showToast(hideDemo ? 'Showing demo data' : 'Hiding demo data');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border min-h-[44px] ${
                hideDemo
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-surface text-foreground border-surface-border'
              }`}
            >
              {hideDemo ? 'Hidden' : 'Visible'}
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 block mb-2">
            Export Song Catalog
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-3.5 bg-surface-elevated rounded-xl border border-surface-border flex items-center justify-center gap-2 text-xs font-bold text-foreground min-h-[48px] active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="p-3.5 bg-surface-elevated rounded-xl border border-surface-border flex items-center justify-center gap-2 text-xs font-bold text-foreground min-h-[48px] active:scale-95 transition-all"
            >
              <FileCode className="w-4 h-4 text-brand-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <Button
            variant="outline"
            icon={LogOut}
            className="w-full min-h-[48px] text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            onClick={handleLogout}
          >
            End Passcode Session
          </Button>
        </div>
      </div>
    </div>
  );
}
