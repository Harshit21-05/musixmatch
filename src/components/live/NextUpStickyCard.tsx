'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Bell, ChevronRight, Music } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/context/BreakpointContext';

export function NextUpStickyCard() {
  const { nextUpEvent, setActiveEventId, addEventToTasks } = useData();
  const { isMobile } = useBreakpoint();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 44,
    seconds: 52,
  });

  useEffect(() => {
    if (!nextUpEvent) return;

    const calculateTime = () => {
      const diff = new Date(nextUpEvent.releaseTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [nextUpEvent]);

  if (!nextUpEvent) return null;

  const handleOpenDetail = () => {
    setActiveEventId(nextUpEvent.id);
    if (isMobile) {
      router.push(`/events/${nextUpEvent.id}`);
    }
  };

  return (
    <div className="bg-gradient-to-r from-brand-900/40 via-surface-elevated to-surface-elevated border border-brand-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden backdrop-blur-md">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">
            Next Up Drop
          </span>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex items-center gap-1 font-mono text-xs font-bold bg-surface/90 px-2.5 py-1 rounded-md border border-brand-500/20 text-foreground">
          <Clock className="w-3.5 h-3.5 text-brand-400" />
          <span>
            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Thumbnail preview */}
        <div
          onClick={handleOpenDetail}
          className="w-14 h-14 rounded-lg bg-surface-subtle overflow-hidden relative shrink-0 cursor-pointer group border border-surface-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nextUpEvent.thumbnail}
            alt={nextUpEvent.songTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={handleOpenDetail}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <LanguageChip language={nextUpEvent.language} showNative={false} size="sm" />
            <TierBadge tier={nextUpEvent.tier} size="sm" />
          </div>
          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-brand-400 transition-colors">
            {nextUpEvent.songTitle}
          </h3>
          <p className="text-xs text-text-secondary truncate">
            {nextUpEvent.movieTitle} • {nextUpEvent.composer}
          </p>
        </div>

        {/* Quick action button */}
        <button
          type="button"
          onClick={() => addEventToTasks(nextUpEvent)}
          className="p-2.5 bg-surface text-text-secondary hover:text-foreground rounded-lg border border-surface-border min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={`Queue task for ${nextUpEvent.songTitle}`}
        >
          <Bell className="w-4 h-4 text-brand-400" />
        </button>
      </div>
    </div>
  );
}
