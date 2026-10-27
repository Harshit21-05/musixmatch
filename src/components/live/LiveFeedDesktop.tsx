'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Radio,
  Play,
  Sparkles,
  Maximize2,
  Clock,
  Zap,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useBreakpoint } from '@/context/BreakpointContext';
import { StateBadge, ConfidenceBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { EventDetailPane } from '@/components/live/EventDetailPane';
import { NextUpStickyCard } from '@/components/live/NextUpStickyCard';
import { ContextMenu } from '@/components/atomic/ContextMenu';
import { Button } from '@/components/atomic/Button';
import { MusicEvent, Language, EventState, ConfidenceLevel } from '@/types';
import { formatRelativeIST, formatIST } from '@/utils/date';
import { isSimulationEnabled } from '@/lib/config';

export function LiveFeedDesktop() {
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const {
    events,
    activeEventId,
    setActiveEventId,
    activeEvent,
    addEventToTasks,
    collectors,
    triggerSimulatedDrop,
    showToast,
    newDropEventId,
    hideDemo,
    setHideDemo,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>('all');
  const [selectedState, setSelectedState] = useState<EventState | 'all'>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | 'all'>('all');
  const [unannouncedOnly, setUnannouncedOnly] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    event: MusicEvent | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    event: null,
  });

  const filteredEvents = events
    .filter(e => (selectedLanguage === 'all' ? true : e.language === selectedLanguage))
    .filter(e => (selectedState === 'all' ? true : e.state === selectedState))
    .filter(e => {
      if (selectedConfidence === 'all') return true;
      if (typeof e.confidence === 'string') return e.confidence === selectedConfidence;
      if (selectedConfidence === 'high') return e.confidence >= 80;
      if (selectedConfidence === 'medium') return e.confidence >= 50 && e.confidence < 80;
      return e.confidence < 50;
    })
    .filter(e => {
      if (!unannouncedOnly) return true;
      return e.state === 'unannounced_drop' || e.isNewDrop;
    })
    .filter(e => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.songTitle.toLowerCase().includes(q) ||
        e.movieTitle.toLowerCase().includes(q) ||
        e.composer.toLowerCase().includes(q) ||
        (e.singers && e.singers.some(s => s.toLowerCase().includes(q)))
      );
    });

  // Keyboard Navigation: J/K/Enter/C/Y/T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const currentIndex = filteredEvents.findIndex(ev => ev.id === activeEventId);

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const nextIndex = Math.min(filteredEvents.length - 1, currentIndex + 1);
        if (filteredEvents[nextIndex]) {
          setActiveEventId(filteredEvents[nextIndex].id);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        if (filteredEvents[prevIndex]) {
          setActiveEventId(filteredEvents[prevIndex].id);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (activeEvent) {
          e.preventDefault();
          const meta = `Title: ${activeEvent.songTitle}\nMovie: ${activeEvent.movieTitle}\nComposer: ${activeEvent.composer}\nSingers: ${activeEvent.singers.join(', ')}\nLanguage: ${activeEvent.language}\nState: ${activeEvent.state}\nLink: ${activeEvent.youtubeUrl || activeEvent.link}`;
          navigator.clipboard.writeText(meta);
          showToast('Copied metadata block (Shortcut C)');
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        if (activeEvent) {
          e.preventDefault();
          const targetUrl = activeEvent.youtubeUrl || activeEvent.link;
          if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (activeEvent) {
          e.preventDefault();
          addEventToTasks(activeEvent);
        }
      } else if (e.key === 'Enter') {
        if (activeEvent) {
          router.push(`/events/${activeEvent.id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredEvents, activeEventId, activeEvent, setActiveEventId, addEventToTasks, showToast, router]);

  const handleRowContextMenu = (e: React.MouseEvent, event: MusicEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      event,
    });
  };

  const hasActiveFilters =
    selectedLanguage !== 'all' ||
    selectedState !== 'all' ||
    selectedConfidence !== 'all' ||
    unannouncedOnly ||
    Boolean(searchQuery);

  const clearAllFilters = () => {
    setSelectedLanguage('all');
    setSelectedState('all');
    setSelectedConfidence('all');
    setUnannouncedOnly(false);
    setSearchQuery('');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Ticker Row for Real-time Ingestion Stream */}
      <div className="bg-surface border-b border-surface-border px-4 py-2 flex items-center justify-between text-xs overflow-hidden shrink-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 shrink-0">
            <Radio className="w-3 h-3 animate-pulse text-red-500" />
            Live Ingestion Radar
          </span>
          <div className="truncate text-text-secondary">
            ⚡ Real-time Indian music drops • Active coverage: Hindi, Tamil, Telugu, Punjabi
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {isSimulationEnabled() && (
            <Button
              size="sm"
              variant="ghost"
              onClick={triggerSimulatedDrop}
              icon={Sparkles}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Simulate Drop
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/wall')}
            icon={Maximize2}
            className="text-xs"
          >
            Wall Mode
          </Button>
        </div>
      </div>

      {/* Master-Detail Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Filterable Event List */}
        <div className="w-full md:w-[400px] lg:w-[440px] xl:w-[480px] border-r border-surface-border flex flex-col bg-surface shrink-0">
          {/* Search & Filter Controls */}
          <div className="p-3 border-b border-surface-border space-y-2.5 bg-surface-elevated/40">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, movies (Press /)..."
                className="w-full pl-9 pr-3 py-1.5 bg-surface text-xs text-foreground placeholder:text-text-muted rounded-lg border border-surface-border focus:outline-none focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedLanguage('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0 ${
                  selectedLanguage === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface text-text-muted hover:text-foreground border border-surface-border'
                }`}
              >
                All Languages
              </button>
              {(['hi', 'ta', 'te', 'pa', 'ml', 'kn', 'bn'] as Language[]).map(l => (
                <LanguageChip
                  key={l}
                  language={l}
                  size="sm"
                  showNative={false}
                  selected={selectedLanguage === l}
                  onClick={() => setSelectedLanguage(prev => (prev === l ? 'all' : l))}
                />
              ))}
            </div>

            {/* State, Confidence & Surprise Drop Filters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* State Filter */}
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value as EventState | 'all')}
                className="px-2 py-1 bg-surface border border-surface-border rounded-md text-[11px] text-foreground focus:outline-none focus:border-brand-500"
              >
                <option value="all">All States</option>
                <option value="unannounced_drop">Surprise Drops</option>
                <option value="scheduled">Scheduled</option>
                <option value="live_on_dsp">Live on DSP</option>
                <option value="released">Released</option>
                <option value="teaser">Teaser Out</option>
                <option value="announced">Announced</option>
                <option value="rumor">Rumor</option>
              </select>

              {/* Confidence Filter */}
              <select
                value={selectedConfidence}
                onChange={e => setSelectedConfidence(e.target.value as ConfidenceLevel | 'all')}
                className="px-2 py-1 bg-surface border border-surface-border rounded-md text-[11px] text-foreground focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Conf</option>
                <option value="high">High Conf</option>
                <option value="medium">Medium Conf</option>
                <option value="low">Low Conf</option>
              </select>

              {/* Unannounced Drops Only Toggle */}
              <button
                type="button"
                onClick={() => setUnannouncedOnly(prev => !prev)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  unannouncedOnly
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm'
                    : 'bg-surface text-text-muted hover:text-foreground border border-surface-border'
                }`}
              >
                <Zap className="w-3 h-3 text-rose-400" />
                <span>Surprise Drops Only</span>
              </button>

              {/* Hide Demo Toggle */}
              <button
                type="button"
                onClick={() => setHideDemo(!hideDemo)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  hideDemo
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-surface text-text-muted hover:text-foreground border border-surface-border'
                }`}
                title="Toggle visibility of seeded demo rows"
              >
                <span>{hideDemo ? 'Demo Hidden' : 'Demo Visible'}</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] text-text-muted hover:text-red-400 ml-auto underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* List of Events */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border/40 p-2 space-y-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-text-muted space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-text-muted opacity-50" />
                <p className="text-xs font-medium">No song events match your filter</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-brand-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              filteredEvents.map(event => {
                const isActive = event.id === activeEventId;
                const isNew = event.id === newDropEventId;
                const relativeTime = formatRelativeIST(event.date_time_ist || event.releaseTime);

                return (
                  <div
                    key={event.id}
                    onClick={() => setActiveEventId(event.id)}
                    onContextMenu={e => handleRowContextMenu(e, event)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex gap-3 relative select-none ${
                      isActive
                        ? 'bg-brand-500/10 border border-brand-500/40 shadow-sm'
                        : 'hover:bg-surface-elevated/80 border border-transparent'
                    } ${isNew ? 'ring-2 ring-brand-500 animate-pulse bg-brand-500/20' : ''}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-subtle shrink-0 relative group border border-surface-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.thumbnail}
                        alt={event.songTitle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <StateBadge state={event.state} size="sm" pulse={false} />
                        {event.is_demo && <DemoBadge size="sm" />}
                        <LanguageChip language={event.language} showNative={false} size="sm" />
                        <TierBadge tier={event.tier} size="sm" />
                        <span className="text-[10px] text-text-muted flex items-center gap-0.5 ml-auto">
                          <Clock className="w-3 h-3" />
                          {relativeTime}
                        </span>
                      </div>

                      <h3
                        className={`text-sm font-bold truncate ${
                          isActive ? 'text-brand-400' : 'text-foreground'
                        }`}
                      >
                        {event.songTitle}
                      </h3>
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}
                      </p>

                      <div className="flex items-center justify-between mt-2 text-[11px] text-text-muted">
                        <span className="truncate pr-2">{event.singers?.join(', ')}</span>
                        <ConfidenceBadge confidence={event.confidence} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer Keyboard Helper */}
          <div className="p-2 border-t border-surface-border bg-surface-elevated/20 text-[11px] text-text-muted flex items-center justify-between">
            <span>
              <kbd className="font-mono bg-surface border px-1 rounded">J</kbd>/
              <kbd className="font-mono bg-surface border px-1 rounded">K</kbd> move •{' '}
              <kbd className="font-mono bg-surface border px-1 rounded">Enter</kbd> open
            </span>
            <span>
              <kbd className="font-mono bg-surface border px-1 rounded">C</kbd> copy •{' '}
              <kbd className="font-mono bg-surface border px-1 rounded">Y</kbd> play •{' '}
              <kbd className="font-mono bg-surface border px-1 rounded">T</kbd> task
            </span>
          </div>
        </div>

        {/* Center Pane: Active Event Detail */}
        <div className="flex-1 overflow-hidden p-4 bg-background">
          <EventDetailPane event={activeEvent} />
        </div>

        {/* Right Rail: Available on Wide screens (>= 1536px) */}
        {isWide && (
          <aside className="w-80 border-l border-surface-border bg-surface p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-brand-500" />
              Live Radar & Health
            </h2>

            {/* Next Up Sticky Countdown */}
            <NextUpStickyCard />

            {/* Quick Task Queue */}
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Task Pipeline</span>
                <span
                  className="text-[10px] text-brand-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => router.push('/tasks')}
                >
                  View all →
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-surface border border-surface-border/60">
                  <div className="font-medium text-foreground">Verify lyrics: Chuttamalle</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">High priority • Due 2:00 PM IST</div>
                </div>
                <div className="p-2 rounded bg-surface border border-surface-border/60">
                  <div className="font-medium text-foreground">Kissik premiere watch</div>
                  <div className="text-[10px] text-blue-400 mt-0.5">Scheduled • Starts in 35m</div>
                </div>
              </div>
            </div>

            {/* Collector Health Indicator */}
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Scout & Collector Health</span>
                <span
                  className="text-[10px] text-emerald-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => router.push('/health')}
                >
                  Details →
                </span>
              </div>
              <div className="space-y-2">
                {collectors.slice(0, 3).map(col => (
                  <div key={col.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate pr-2 flex items-center gap-1.5">
                      <span>{col.name}</span>
                      {col.is_demo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          DEMO
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {col.latencyMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          event={contextMenu.event}
          onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}
