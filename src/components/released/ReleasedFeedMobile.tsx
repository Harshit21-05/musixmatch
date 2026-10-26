'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Play, Filter, CheckCircle2, Zap, Clock } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { StateBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Language } from '@/types';
import { formatRelativeIST, formatIST } from '@/utils/date';

export function ReleasedFeedMobile() {
  const router = useRouter();
  const { events } = useData();
  const [selectedLang, setSelectedLang] = useState<Language | 'all'>('all');

  const releasedEvents = events
    .filter(e => e.state === 'released' || e.state === 'unannounced_drop' || e.state === 'live_on_dsp')
    .filter(e => (selectedLang === 'all' ? true : e.language === selectedLang))
    .sort((a, b) => {
      const timeA = new Date(a.date_time_ist || a.releaseTime).getTime();
      const timeB = new Date(b.date_time_ist || b.releaseTime).getTime();
      return timeB - timeA;
    });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-foreground">Released Catalog</h1>
          <p className="text-xs text-text-muted">Verified drop index (IST)</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {releasedEvents.length} Drops
        </span>
      </div>

      {/* Language Filter Chips */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-surface-border/50 bg-surface/40">
        <button
          type="button"
          onClick={() => setSelectedLang('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] transition-colors ${
            selectedLang === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-surface-elevated text-text-secondary border border-surface-border'
          }`}
        >
          All
        </button>
        {(['te', 'ta', 'hi', 'ml', 'kn', 'bn', 'pa'] as Language[]).map(lang => (
          <LanguageChip
            key={lang}
            language={lang}
            selected={selectedLang === lang}
            onClick={() => setSelectedLang(prev => (prev === lang ? 'all' : lang))}
            size="sm"
          />
        ))}
      </div>

      {/* Feed Cards */}
      <div className="p-4 space-y-3">
        {releasedEvents.map(event => {
          const eventTime = event.date_time_ist || event.releaseTime;
          const isSurpriseDrop = event.isNewDrop || event.state === 'unannounced_drop';

          return (
            <div
              key={event.id}
              onClick={() => router.push(`/events/${event.id}`)}
              className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
            >
              {/* Header with relative time and surprise badge */}
              <div className="flex items-center justify-between border-b border-surface-border/40 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span>{formatRelativeIST(eventTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSurpriseDrop && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <Zap className="w-2.5 h-2.5 fill-rose-300" />
                      Surprise Drop
                    </span>
                  )}
                  <StateBadge state={event.state} size="sm" pulse={false} />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-surface-subtle overflow-hidden shrink-0 relative border border-surface-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.thumbnail} alt={event.songTitle} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <LanguageChip language={event.language} showNative={false} size="sm" />
                    <TierBadge tier={event.tier} size="sm" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate">{event.songTitle}</h3>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-text-muted">
                    <span className="truncate max-w-[150px]">{event.singers?.join(', ') || 'Official'}</span>
                    <span className="font-semibold text-emerald-400 shrink-0">
                      {typeof event.confidence === 'number' ? `${event.confidence}%` : event.confidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
