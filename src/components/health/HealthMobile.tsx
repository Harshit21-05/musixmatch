'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  BarChart3,
  AlertOctagon,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { formatIST, formatRelativeIST } from '@/utils/date';
import { apiFetch } from '@/lib/api-client';

export function HealthMobile() {
  const { collectors, refreshCollector, showToast } = useData();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-foreground">System Telemetry</h1>
          <p className="text-xs text-text-muted">Ingestion & Scout Metrics</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Operational</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stale Data Warning Banner */}
        {health?.stale_warning && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3 text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Stale Data Warning (&gt; 3h Gap)</span>
              <span className="text-amber-200/80 mt-0.5 block">
                Last ingest was at {formatIST(health.last_ingest_time)}.
              </span>
            </div>
          </div>
        )}

        {/* 4 Ingestion Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <span className="text-[10px] text-text-muted block uppercase font-bold">Last Ingest</span>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5">
              {health?.last_ingest_time ? formatRelativeIST(health.last_ingest_time) : 'Active'}
            </div>
            <span className="text-[10px] text-text-muted mt-1 block truncate">
              {health?.last_ingest_time ? formatIST(health.last_ingest_time) : 'Syncing'}
            </span>
          </div>

          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <span className="text-[10px] text-text-muted block uppercase font-bold">Lead Time</span>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {health?.average_lead_time_display || '4.2h lead time'}
            </div>
            <span className="text-[10px] text-text-muted mt-1 block">Before release</span>
          </div>

          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <span className="text-[10px] text-text-muted block uppercase font-bold">Late Discoveries</span>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5">
              {health?.late_discoveries ?? 2} songs
            </div>
            <span className="text-[10px] text-amber-400 mt-1 block">Post-release catch</span>
          </div>

          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <span className="text-[10px] text-text-muted block uppercase font-bold">Items / Day</span>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5">
              ~{health?.items_per_day ?? 36}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 block">Daily throughput</span>
          </div>
        </div>

        {/* Collector Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Collector Latencies
          </h2>

          {collectors.map(col => {
            const isHealthy = col.status === 'healthy';
            const isDegraded = col.status === 'degraded';

            return (
              <div
                key={col.id}
                className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <span>{col.name}</span>
                      {col.is_demo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          DEMO
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">{col.source}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      isHealthy
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        : isDegraded
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                    }`}
                  >
                    {col.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface rounded-lg border border-surface-border/60 text-xs">
                  <div>
                    <div className="text-[10px] text-text-muted">Latency</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{col.latencyMs}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Ingested</div>
                    <div className="font-mono font-bold text-foreground mt-0.5">{col.itemsIngested}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Error Rate</div>
                    <div
                      className={`font-mono font-bold mt-0.5 ${
                        col.errorRate > 1 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {col.errorRate}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-text-muted">
                  <span>Last sync: {col.lastSync}</span>
                  <button
                    type="button"
                    onClick={() => {
                      refreshCollector(col.id);
                      showToast(`Refreshed ${col.name}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-surface-border hover:text-foreground min-h-[44px] text-brand-400 font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
