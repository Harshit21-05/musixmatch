'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Download,
  Play,
  Sparkles,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { StateBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Button } from '@/components/atomic/Button';
import { MusicEvent, Language } from '@/types';
import { exportEventsToICS } from '@/utils/export';
import { formatIST, formatRelativeIST } from '@/utils/date';

export function CalendarGridDesktop() {
  const router = useRouter();
  const { events, setActiveEventId, activeEventId, showToast } = useData();
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(26);

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
    showToast('Exported upcoming releases to .ics calendar');
  };

  // Calendar dates for October 2026 (starts on Thursday, 31 days)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Calendar Header Controls */}
      <div className="bg-surface border-b border-surface-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-500" />
            October 2026 — Song Radar Agenda
          </h1>

          <div className="flex items-center gap-1 border border-surface-border rounded-lg bg-surface-elevated p-0.5">
            <button
              type="button"
              className="p-1 hover:text-foreground text-text-muted rounded"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2">Today</span>
            <button
              type="button"
              className="p-1 hover:text-foreground text-text-muted rounded"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* .ics Calendar Export Button */}
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={handleExportICS}
            className="text-xs font-semibold"
          >
            Export .ics Calendar
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'month' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Month Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'week' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Week View
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Split Calendar Grid + Side List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid Pane */}
        <div className="flex-1 overflow-y-auto p-4 bg-background">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-2 auto-rows-fr">
            {/* Empty offset padding for October 2026 (Starts on Thursday: 4 blanks) */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] rounded-lg bg-surface/20 border border-transparent" />
            ))}

            {daysInMonth.map(day => {
              const isToday = day === 26;
              const isSelected = day === selectedDay;

              // Match events dropping on this day
              const dayEvents = upcomingEvents.filter(e => {
                const date = new Date(e.date_time_ist || e.releaseTime);
                return date.getDate() === day;
              });

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 shadow-sm'
                      : isToday
                      ? 'border-brand-500/40 bg-surface-elevated'
                      : 'border-surface-border bg-surface hover:bg-surface-elevated/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-brand-600 text-white' : 'text-text-muted'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => {
                          e.stopPropagation();
                          setActiveEventId(ev.id);
                          router.push(`/events/${ev.id}`);
                        }}
                        className="truncate text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-subtle text-foreground border border-surface-border hover:border-brand-500 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                        <span className="truncate">{ev.songTitle}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-text-muted block pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Agenda Pane */}
        <div className="w-80 lg:w-96 border-l border-surface-border bg-surface p-4 flex flex-col overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              Day Agenda: Oct {selectedDay}
            </h2>
            <span className="text-xs font-semibold text-brand-400">
              {upcomingEvents.length} Tracked Drops
            </span>
          </div>

          <div className="space-y-2.5">
            {upcomingEvents.map(event => {
              const dateObj = new Date(event.date_time_ist || event.releaseTime);
              return (
                <div
                  key={event.id}
                  onClick={() => {
                    setActiveEventId(event.id);
                    router.push(`/events/${event.id}`);
                  }}
                  className="p-3 rounded-xl bg-surface-elevated border border-surface-border hover:border-brand-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-brand-400">
                      {formatIST(event.date_time_ist || event.releaseTime)}
                    </span>
                    <StateBadge state={event.state} size="sm" pulse={false} />
                  </div>

                  <div className="flex gap-2.5">
                    <div className="w-12 h-12 rounded-lg bg-surface-subtle overflow-hidden shrink-0 border border-surface-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.thumbnail} alt={event.songTitle} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand-400 transition-colors">
                        {event.songTitle}
                      </h4>
                      <p className="text-[11px] text-text-secondary truncate">
                        {event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {event.is_demo && <DemoBadge size="sm" />}
                        <LanguageChip language={event.language} size="sm" showNative={false} />
                        <TierBadge tier={event.tier} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
