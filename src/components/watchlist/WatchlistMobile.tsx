'use client';

import React, { useState, useEffect } from 'react';
import { Search, Film, User, Building2, Bell, BellOff, ChevronRight } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { WatchlistItem } from '@/types';
import { TierBadge } from '@/components/atomic/TierBadge';
import { BottomSheet } from '@/components/atomic/BottomSheet';
import { Button } from '@/components/atomic/Button';
import { apiFetch } from '@/lib/api-client';

export function WatchlistMobile() {
  const { watchlist, toggleWatchlistAlert } = useData();
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'artist' | 'label'>('all');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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

  const displayItems = entities.length > 0 ? entities : watchlist;

  const filtered = displayItems.filter(item => {
    const name = item.name || item.title || '';
    const type = item.type || 'movie';
    const notes = item.tracked_reason || item.notes || '';

    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      notes.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      selectedType === 'all' ||
      type === selectedType ||
      (selectedType === 'artist' && type === 'composer');

    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    if (type === 'label') return Building2;
    if (type === 'artist' || type === 'composer') return User;
    return Film;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3">
        <h1 className="text-base font-extrabold text-foreground">Watchlist Directory</h1>
        <p className="text-xs text-text-muted">Auto-discovered movies, artists & labels</p>

        <div className="mt-2.5 relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search watchlist..."
            className="w-full pl-9 pr-3 py-2 bg-surface text-xs text-foreground rounded-xl border border-surface-border focus:outline-none min-h-[44px]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-2 bg-surface border-b border-surface-border overflow-x-auto no-scrollbar">
        {(['all', 'movie', 'artist', 'label'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[38px] capitalize transition-all ${
              selectedType === t
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-surface-elevated text-text-muted hover:text-foreground border border-surface-border'
            }`}
          >
            {t === 'all' ? 'All Entities' : t + 's'}
          </button>
        ))}
      </div>

      {/* List Feed */}
      <div className="p-4 space-y-3">
        {filtered.map(item => {
          const name = item.name || item.title || 'Untitled';
          const type = item.type || 'movie';
          const Icon = getTypeIcon(type);
          const hype = item.hype_score ?? item.hype ?? 85;
          const whyTracked = item.tracked_reason || item.notes || 'Automated scouting rule';

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{name}</h3>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      {type}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                  🔥 {hype}%
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <TierBadge tier={item.tier || 1} size="sm" />
                <span className="text-[11px] text-text-muted font-mono">
                  {item.release_date || item.expectedDropDate || 'Ongoing'}
                </span>
              </div>

              {/* Why Tracked snippet */}
              <div className="p-2.5 rounded-lg bg-surface border border-surface-border/60 text-xs text-text-secondary leading-relaxed">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-0.5">
                  Why Tracked:
                </span>
                <p className="line-clamp-2">{whyTracked}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Details */}
      <BottomSheet
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || selectedItem?.title || 'Entity Details'}
      >
        {selectedItem && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  {selectedItem.type}
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedItem.name || selectedItem.title}
                </h2>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                🔥 {selectedItem.hype_score ?? selectedItem.hype ?? 85}% Hype
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-surface-border">
                <span className="text-text-muted block text-[10px] uppercase">Tier</span>
                <span className="font-bold text-foreground mt-0.5 block">
                  Tier {selectedItem.tier || 1}
                </span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-surface-border">
                <span className="text-text-muted block text-[10px] uppercase">Expected Date</span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {selectedItem.release_date || selectedItem.expectedDropDate || 'TBA'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Tracking Intelligence & Notes
              </span>
              <p className="text-xs text-text-secondary leading-relaxed p-3.5 bg-surface rounded-xl border border-surface-border">
                {selectedItem.tracked_reason || selectedItem.notes || 'Tracked by automated scout'}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => setSelectedItem(null)}
            >
              Close
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
