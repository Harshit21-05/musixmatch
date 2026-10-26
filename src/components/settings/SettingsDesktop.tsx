'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Layout,
  Type,
  Volume2,
  Check,
  Languages,
  Download,
  LogOut,
  Eye,
  EyeOff,
  Sliders,
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

export function SettingsDesktop() {
  const router = useRouter();
  const {
    theme,
    setTheme,
    density,
    setDensity,
    soundEnabled,
    setSoundEnabled,
    reducedMotion,
    setReducedMotion,
  } = useSettings();

  const { events, rawEvents, hideDemo, setHideDemo, showToast } = useData();
  const [activeTab, setActiveTab] = useState<'languages' | 'appearance' | 'density' | 'demo' | 'export' | 'account'>('languages');

  // Track enabled languages
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
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Top Header */}
      <div className="bg-surface border-b border-surface-border px-8 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings & System Preferences</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure regional tracking languages, design themes, density, demo filter, and data exports
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          icon={LogOut}
          onClick={handleLogout}
          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
        >
          Logout Passcode
        </Button>
      </div>

      {/* Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-surface-border bg-surface p-4 space-y-1 shrink-0">
          {[
            { id: 'languages', label: 'Tracking Languages', icon: Languages },
            { id: 'appearance', label: 'Theme & Appearance', icon: Sun },
            { id: 'density', label: 'Layout Density', icon: Layout },
            { id: 'demo', label: 'Demo Data Toggle', icon: Eye },
            { id: 'export', label: 'Export Catalog (CSV/JSON)', icon: Download },
            { id: 'account', label: 'Session & Passcode', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-text-secondary hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Setting Content Panel */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-8">
          {/* Section: Languages */}
          {activeTab === 'languages' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Regional Music Languages</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Select which Indian music industries you actively track on Song Radar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {(Object.keys(SCRIPT_CONFIGS) as Language[]).map(lang => {
                  const cfg = SCRIPT_CONFIGS[lang];
                  const isEnabled = enabledLanguages[lang];

                  return (
                    <div
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isEnabled
                          ? 'bg-brand-500/10 border-brand-500/50 shadow-sm'
                          : 'bg-surface-elevated border-surface-border opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{cfg.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border text-text-muted">
                            {cfg.code.toUpperCase()}
                          </span>
                        </div>
                        <span className={`text-base font-bold text-brand-400 mt-0.5 block ${cfg.fontClass}`}>
                          {cfg.nativeName}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isEnabled
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'border-surface-border bg-surface'
                        }`}
                      >
                        {isEnabled && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Appearance (Theme) */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Theme Selection</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Choose between Dark mode (default), Light mode, or synchronize with system.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(['dark', 'light', 'system'] as ThemeMode[]).map(t => (
                  <div
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      theme === t
                        ? 'bg-brand-500/10 border-brand-500 shadow-md ring-1 ring-brand-500'
                        : 'bg-surface-elevated border-surface-border hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="capitalize font-bold text-sm text-foreground">{t} Theme</span>
                      {theme === t && <Check className="w-4 h-4 text-brand-400" />}
                    </div>
                    <p className="text-xs text-text-muted">
                      {t === 'dark'
                        ? 'Default high-contrast dark theme optimized for studio monitors'
                        : t === 'light'
                        ? 'Clean light surfaces for daytime productivity'
                        : 'Automatically synchronizes with your OS setting'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Layout Density */}
          {activeTab === 'density' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Density Modes</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  &quot;Compact&quot; is optimized for dense table scanning on desktop; &quot;Comfortable&quot; provides large tap targets for touch.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setDensity('compact')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    density === 'compact'
                      ? 'bg-brand-500/10 border-brand-500 shadow-md ring-1 ring-brand-500'
                      : 'bg-surface-elevated border-surface-border hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">Compact (Desktop Standard)</span>
                    {density === 'compact' && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Tighter table row height, condensed padding, maximum information density.
                  </p>
                </div>

                <div
                  onClick={() => setDensity('comfortable')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    density === 'comfortable'
                      ? 'bg-brand-500/10 border-brand-500 shadow-md ring-1 ring-brand-500'
                      : 'bg-surface-elevated border-surface-border hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">Comfortable (Mobile Standard)</span>
                    {density === 'comfortable' && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Spacious padding, min 44px tap targets adhering strictly to WCAG guidelines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Demo Data Toggle */}
          {activeTab === 'demo' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Seeded Demo Data Control</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Toggle whether initial sample seed rows (marked with DEMO badge) appear in the feeds.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Hide Demo Data</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {hideDemo
                      ? 'Currently hiding all is_demo = true seed rows across all pages'
                      : 'Showing demo songs alongside live automation ingests'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setHideDemo(!hideDemo);
                    showToast(hideDemo ? 'Showing demo data' : 'Hiding demo data');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    hideDemo
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-surface text-foreground border-surface-border hover:bg-surface-subtle'
                  }`}
                >
                  {hideDemo ? 'Demo Data Hidden' : 'Demo Data Visible'}
                </button>
              </div>

              <div className="p-4 bg-surface rounded-xl border border-surface-border/60 text-xs text-text-secondary space-y-1.5">
                <span className="font-bold text-foreground block">CLI Demo Cleaner Command</span>
                <p>To permanently purge all demo records from Supabase Postgres:</p>
                <code className="px-2.5 py-1 bg-surface-elevated rounded border border-surface-border text-brand-400 font-mono block w-fit">
                  npm run db:clean-demo
                </code>
              </div>
            </div>
          )}

          {/* Section: Export CSV / JSON */}
          {activeTab === 'export' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Catalog Data Export</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Download the current tracked Indian song catalog in standard spreadsheet or developer formats.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Export as CSV</h3>
                      <p className="text-xs text-text-muted">Compatible with Excel, Google Sheets, Airtable</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    icon={Download}
                    onClick={handleExportCSV}
                    className="w-full text-xs font-semibold"
                  >
                    Download CSV ({events.length} rows)
                  </Button>
                </div>

                <div className="p-5 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-5 h-5 text-brand-400" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Export as JSON</h3>
                      <p className="text-xs text-text-muted">Full structured metadata, sources & history</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    icon={Download}
                    onClick={handleExportJSON}
                    className="w-full text-xs font-semibold"
                  >
                    Download JSON ({events.length} items)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Section: Account / Passcode */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Session & Security</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Manage your authenticated session protected by SONG_RADAR_PASSCODE.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-foreground">Signed HttpOnly Session</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Single shared passcode sets an HMAC-signed httpOnly cookie.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    icon={LogOut}
                    onClick={handleLogout}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    End Session (Logout)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
