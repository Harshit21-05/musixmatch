'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, Download, ChevronRight, Play } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { StateBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { BottomSheet } from '@/components/atomic/BottomSheet';
import { Button } from '@/components/atomic/Button';
import { Language, MusicEvent } from '@/types';
import { exportEventsToICS } from '@/utils/export';
import { formatIST, formatRelativeIST } from '@/utils/date';

export function AgendaListMobile() {
  const router = useRouter();
  const { events, showToast } = useData();
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('October 2026');

  const upcomingEvents = events.filter(
    e =>
      e.state === 'upcoming' ||
      e.state === 'scheduled' ||
      e.state === 'announced' ||
      e.state === 'teaser' ||
      e.state === 'rumor'
  );

  const handleExportICS = () => {
    exportEventsToICS(upcomingEvents);
    showToast('Exported releases to .ics calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-foreground">Upcoming Releases</h1>
          <p className="text-xs text-text-muted">Agenda Timeline (IST)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportICS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-xs font-semibold text-foreground min-h-[44px]"
            aria-label="Export to iCalendar"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>.ics</span>
          </button>

          <button
            type="button"
            onClick={() => setMonthSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-xs font-semibold text-foreground min-h-[44px]"
          >
            <CalendarIcon className="w-4 h-4 text-brand-400" />
            <span>{selectedMonth.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      {/* Agenda Feed */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center justify-between text-xs text-text-muted px-1">
          <span>{upcomingEvents.length} Scheduled Premieres</span>
          <span>Times in IST</span>
        </div>

        {upcomingEvents.map(event => {
          const eventTime = event.date_time_ist || event.releaseTime;

          return (
            <div
              key={event.id}
              onClick={() => router.push(`/events/${event.id}`)}
              className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-surface-border/50 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatIST(eventTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">{formatRelativeIST(eventTime)}</span>
                  <StateBadge state={event.state} size="sm" pulse={false} />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-surface-subtle overflow-hidden shrink-0 relative border border-surface-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.thumbnail} alt={event.songTitle} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white/90" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {event.is_demo && <DemoBadge size="sm" />}
                    <LanguageChip language={event.language} showNative={false} size="sm" />
                    <TierBadge tier={event.tier} size="sm" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate">{event.songTitle}</h3>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}
                  </p>
                  <p className="text-[11px] text-text-muted truncate mt-1">
                    {event.singers?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Month Bottom Sheet */}
      <BottomSheet
        isOpen={monthSheetOpen}
        onClose={() => setMonthSheetOpen(false)}
        title="Select Agenda Month"
      >
        <div className="space-y-2">
          {['October 2026', 'November 2026', 'December 2026', 'January 2027'].map(month => (
            <button
              key={month}
              type="button"
              onClick={() => {
                setSelectedMonth(month);
                setMonthSheetOpen(false);
              }}
              className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center justify-between min-h-[48px] ${
                selectedMonth === month
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-foreground hover:bg-surface-subtle'
              }`}
            >
              <span>{month}</span>
              {selectedMonth === month && <span className="text-xs font-bold">Active</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
