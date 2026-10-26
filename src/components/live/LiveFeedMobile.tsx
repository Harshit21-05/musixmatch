'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckSquare, BellOff, Filter, Play, Clock, Zap, AlertCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { StateBadge, ConfidenceBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { NextUpStickyCard } from '@/components/live/NextUpStickyCard';
import { triggerHaptic } from '@/utils/haptics';
import { Language, EventState, ConfidenceLevel } from '@/types';
import { BottomSheet } from '@/components/atomic/BottomSheet';
import { Button } from '@/components/atomic/Button';
import { formatRelativeIST } from '@/utils/date';

export function LiveFeedMobile() {
  const router = useRouter();
  const { events, addEventToTasks, showToast, newDropEventId } = useData();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | 'all'>('all');
  const [selectedState, setSelectedState] = useState<EventState | 'all'>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | 'all'>('all');
  const [unannouncedOnly, setUnannouncedOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Swipe gesture state per card
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(id);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Bound swipe offset between -140 and 140
    setSwipeOffset(Math.max(-140, Math.min(140, diff)));
  };

  const handleTouchEnd = (id: string) => {
    if (swipeOffset > 80) {
      // Swipe Right: Add to Tasks
      const evt = events.find(e => e.id === id);
      if (evt) {
        addEventToTasks(evt);
        triggerHaptic('success');
      }
    } else if (swipeOffset < -80) {
      // Swipe Left: Dismiss / Mute
      setDismissedIds(prev => [...prev, id]);
      triggerHaptic('warning');
      showToast('Event dismissed');
    }
    setSwipingId(null);
    setSwipeOffset(0);
  };

  // Pull to refresh simulation
  const handlePullRefresh = () => {
    setIsRefreshing(true);
    triggerHaptic('medium');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Feed refreshed');
    }, 800);
  };

  const filteredEvents = events
    .filter(e => !dismissedIds.includes(e.id))
    .filter(e => (selectedLang === 'all' ? true : e.language === selectedLang))
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
    });

  const clearFilters = () => {
    setSelectedLang('all');
    setSelectedState('all');
    setSelectedConfidence('all');
    setUnannouncedOnly(false);
    setFilterSheetOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Bar for Mobile */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          <h1 className="text-base font-extrabold tracking-tight text-foreground">Song Radar Live</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePullRefresh}
            className={`p-2 rounded-full text-text-secondary hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none ${
              isRefreshing ? 'animate-spin text-brand-500' : ''
            }`}
            aria-label="Refresh live drop feed"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className={`p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none ${
              selectedState !== 'all' || selectedConfidence !== 'all' || unannouncedOnly
                ? 'text-brand-400 bg-brand-500/15'
                : 'text-text-secondary hover:text-foreground'
            }`}
            aria-label="Open filter bottom sheet"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Chips Horizontal Row */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-surface-border/50 bg-surface/40">
        <button
          type="button"
          onClick={() => setSelectedLang('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] transition-colors ${
            selectedLang === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-surface-elevated text-text-secondary border border-surface-border'
          }`}
        >
          All
        </button>
        {(['hi', 'ta', 'te', 'pa', 'ml', 'kn', 'bn'] as Language[]).map(lang => (
          <LanguageChip
            key={lang}
            language={lang}
            selected={selectedLang === lang}
            onClick={() => setSelectedLang(prev => (prev === lang ? 'all' : lang))}
            size="sm"
          />
        ))}

        {/* Quick surprise drop toggle chip */}
        <button
          type="button"
          onClick={() => setUnannouncedOnly(prev => !prev)}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 min-h-[36px] border transition-colors ${
            unannouncedOnly
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
              : 'bg-surface-elevated text-text-muted border-surface-border'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span>Surprise Drops</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Sticky Next Up Card */}
        <NextUpStickyCard />

        {/* Feed Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>Swipe right → Tasks | Swipe left ← Dismiss</span>
            <span>{filteredEvents.length} items</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-surface-border text-text-muted space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs font-medium">No releases match current filter</p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-brand-400 font-semibold underline min-h-[44px] flex items-center justify-center mx-auto"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredEvents.map(event => {
              const isSwipingThis = swipingId === event.id;
              const isNewDrop = event.id === newDropEventId || event.isNewDrop;
              const relativeTime = formatRelativeIST(event.date_time_ist || event.releaseTime);

              return (
                <div
                  key={event.id}
                  className="relative overflow-hidden rounded-xl"
                  onTouchStart={e => handleTouchStart(e, event.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(event.id)}
                >
                  {/* Swipe Action Backgrounds */}
                  <div
                    className={`absolute inset-0 flex items-center justify-between px-6 transition-colors ${
                      swipeOffset > 40
                        ? 'bg-emerald-600 text-white'
                        : swipeOffset < -40
                        ? 'bg-red-600 text-white'
                        : 'bg-surface-subtle text-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckSquare className="w-5 h-5" />
                      <span>Add to Tasks</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>Dismiss</span>
                      <BellOff className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Foreground Card */}
                  <div
                    style={{
                      transform: isSwipingThis ? `translateX(${swipeOffset}px)` : 'translateX(0px)',
                      transition: isSwipingThis ? 'none' : 'transform 0.25s ease-out',
                    }}
                    onClick={() => router.push(`/events/${event.id}`)}
                    className={`relative z-10 bg-surface-elevated border border-surface-border p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer rounded-xl ${
                      isNewDrop ? 'ring-2 ring-brand-500 animate-pulse bg-brand-500/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-subtle shrink-0 border border-surface-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.thumbnail}
                          alt={event.songTitle}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white/90" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <StateBadge state={event.state} size="sm" />
                          {event.is_demo && <DemoBadge size="sm" />}
                          <LanguageChip language={event.language} showNative={false} size="sm" />
                          <TierBadge tier={event.tier} size="sm" />
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5 ml-auto">
                            <Clock className="w-3 h-3" />
                            {relativeTime}
                          </span>
                        </div>

                        <h2 className="text-sm font-bold text-foreground truncate">
                          {event.songTitle}
                        </h2>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}
                        </p>

                        <div className="flex items-center justify-between mt-2 text-[11px] text-text-muted">
                          <span className="truncate pr-2">{event.singers?.join(', ')}</span>
                          <ConfidenceBadge confidence={event.confidence} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filter Song Radar"
      >
        <div className="space-y-5">
          {/* Release State */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 block">
              Release State
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedState === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('all')}
                className="min-h-[44px]"
              >
                All States
              </Button>
              <Button
                variant={selectedState === 'unannounced_drop' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('unannounced_drop')}
                className="min-h-[44px]"
              >
                Surprise Drop
              </Button>
              <Button
                variant={selectedState === 'scheduled' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('scheduled')}
                className="min-h-[44px]"
              >
                Scheduled
              </Button>
              <Button
                variant={selectedState === 'live_on_dsp' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('live_on_dsp')}
                className="min-h-[44px]"
              >
                Live on DSP
              </Button>
              <Button
                variant={selectedState === 'released' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('released')}
                className="min-h-[44px]"
              >
                Released
              </Button>
              <Button
                variant={selectedState === 'teaser' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedState('teaser')}
                className="min-h-[44px]"
              >
                Teaser
              </Button>
            </div>
          </div>

          {/* Confidence Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 block">
              Confidence Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedConfidence === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedConfidence('all')}
                className="min-h-[44px]"
              >
                All
              </Button>
              <Button
                variant={selectedConfidence === 'high' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedConfidence('high')}
                className="min-h-[44px]"
              >
                High
              </Button>
              <Button
                variant={selectedConfidence === 'medium' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedConfidence('medium')}
                className="min-h-[44px]"
              >
                Med / Low
              </Button>
            </div>
          </div>

          {/* Surprise Drops Toggle */}
          <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-surface-border">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-rose-400" />
              <div>
                <div className="text-xs font-bold text-foreground">Surprise Drops Only</div>
                <div className="text-[10px] text-text-muted">Show unannounced releases only</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={unannouncedOnly}
              onChange={e => setUnannouncedOnly(e.target.checked)}
              className="w-5 h-5 accent-brand-500 rounded cursor-pointer min-h-[44px] min-w-[44px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={clearFilters}
            >
              Reset All
            </Button>
            <Button
              variant="primary"
              className="flex-1 min-h-[44px]"
              onClick={() => setFilterSheetOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
