'use client';

import React, { useState, useEffect } from 'react';
import { Search, Film, User, Building2, Bell, BellOff, Sparkles, Filter, ExternalLink } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { WatchlistItem, Tier } from '@/types';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Button } from '@/components/atomic/Button';
import { apiFetch } from '@/lib/api-client';

export function WatchlistDesktop() {
  const { watchlist, toggleWatchlistAlert } = useData();
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'artist' | 'label'>('all');
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);

  useEffect(() => {
    apiFetch('/api/ingest/entities')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setEntities(data);
        }
      })
      .catch(() => {});
  }, []);

  // Merge context watchlist and fetched entities
  const displayItems = entities.length > 0 ? entities : watchlist;

  const filtered = displayItems.filter(item => {
    const name = item.name || item.title || '';
    const type = item.type || 'movie';
    const notes = item.tracked_reason || item.notes || '';
    const tier = item.tier || 2;

    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      notes.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || type === typeFilter || (typeFilter === 'artist' && type === 'composer');
    const matchesTier = tierFilter === 'all' || tier === tierFilter;

    return matchesSearch && matchesType && matchesTier;
  });

  const getTypeIcon = (type: string) => {
    if (type === 'label') return Building2;
    if (type === 'artist' || type === 'composer') return User;
    return Film;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Top Filter Bar */}
      <div className="bg-surface border-b border-surface-border px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search watchlist movies, artists, labels..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface-elevated text-xs text-foreground placeholder:text-text-muted rounded-lg border border-surface-border focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Entity Type Filter */}
          <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated p-0.5 text-xs">
            {(['all', 'movie', 'artist', 'label'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-md font-semibold capitalize transition-colors ${
                  typeFilter === t ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'
                }`}
              >
                {t === 'all' ? 'All Types' : t + 's'}
              </button>
            ))}
          </div>

          {/* Tier Filter */}
          <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated p-0.5 text-xs">
            {(['all', 1, 2] as const).map(tr => (
              <button
                key={tr}
                type="button"
                onClick={() => setTierFilter(tr as any)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  tierFilter === tr ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'
                }`}
              >
                {tr === 'all' ? 'All Tiers' : `Tier ${tr}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table + Hover Preview Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table View */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-surface-elevated border-b border-surface-border text-text-muted select-none">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Tracked Entity & Type</th>
                <th className="py-2.5 px-4 font-semibold">Tier</th>
                <th className="py-2.5 px-4 font-semibold">Hype Score</th>
                <th className="py-2.5 px-4 font-semibold">Expected Release Date</th>
                <th className="py-2.5 px-4 font-semibold">Why Tracked</th>
                <th className="py-2.5 px-4 text-right font-semibold">Notification</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-border/50 text-foreground">
              {filtered.map(item => {
                const name = item.name || item.title || 'Untitled';
                const type = item.type || 'movie';
                const Icon = getTypeIcon(type);
                const isHovered = hoveredItem?.id === item.id;
                const hype = item.hype_score ?? item.hype ?? 80;
                const whyTracked = item.tracked_reason || item.notes || 'Automated scouting radar';

                return (
                  <tr
                    key={item.id}
                    onMouseEnter={() => setHoveredItem(item)}
                    className={`transition-colors cursor-pointer ${
                      isHovered ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/60'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-brand-400" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{name}</div>
                          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                            {type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <TierBadge tier={item.tier || 1} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">🔥 {hype}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${hype}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-text-secondary font-medium">
                      {item.release_date || item.expectedDropDate || 'Ongoing'}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <span className="inline-block text-[11px] text-text-muted truncate max-w-sm" title={whyTracked}>
                        {whyTracked}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleWatchlistAlert(item.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          item.alertEnabled
                            ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                            : 'bg-surface text-text-muted border-surface-border hover:text-foreground'
                        }`}
                        title={item.alertEnabled ? 'Alert Active' : 'Alert Muted'}
                        aria-label={`Toggle alerts for ${name}`}
                      >
                        {item.alertEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Hover Inspector Pane */}
        {hoveredItem && (
          <aside className="w-80 border-l border-surface-border bg-surface p-5 flex flex-col gap-4 overflow-y-auto shrink-0 animate-in fade-in duration-100">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-brand-400 tracking-wider">
                Entity Intelligence
              </span>
              <h2 className="text-base font-bold text-foreground mt-1">
                {hoveredItem.name || hoveredItem.title}
              </h2>
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Category: {hoveredItem.type}
              </span>
            </div>

            <div className="p-3.5 bg-surface-elevated rounded-xl border border-surface-border space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-text-muted">Hype Score</span>
                <span className="font-bold text-emerald-400">
                  🔥 {hoveredItem.hype_score ?? hoveredItem.hype ?? 85}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-border/50">
                <span className="text-text-muted">Tier Ranking</span>
                <TierBadge tier={hoveredItem.tier || 1} size="sm" />
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Target Release</span>
                <span className="font-semibold text-foreground">
                  {hoveredItem.release_date || hoveredItem.expectedDropDate || 'Pending announcement'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Why It Is Tracked
              </span>
              <p className="text-xs text-text-secondary leading-relaxed p-3.5 bg-surface-elevated rounded-xl border border-surface-border">
                {hoveredItem.tracked_reason || hoveredItem.notes || 'Auto-discovered by AI scout monitor'}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
