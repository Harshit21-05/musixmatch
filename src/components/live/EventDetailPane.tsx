'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  CheckSquare,
  Clock,
  ShieldCheck,
  Check,
  Radio,
  AlertTriangle,
  Send,
  X,
  FileText,
} from 'lucide-react';
import { MusicEvent, SCRIPT_CONFIGS } from '@/types';
import { StateBadge, ConfidenceBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Button } from '@/components/atomic/Button';
import { useData } from '@/context/DataContext';
import { formatIST, formatRelativeIST } from '@/utils/date';
import { getFriendlyStateName } from '@/utils/export';
import { apiFetch } from '@/lib/api-client';

interface EventDetailPaneProps {
  event: MusicEvent | null;
  onClose?: () => void;
  isFullScreenMobile?: boolean;
}

export function EventDetailPane({
  event,
  onClose,
  isFullScreenMobile = false,
}: EventDetailPaneProps) {
  const { addEventToTasks, showToast } = useData();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('wrong_date');
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);

  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-text-muted bg-surface/40 rounded-xl border border-dashed border-surface-border">
        <Radio className="w-10 h-10 mb-3 opacity-40 animate-pulse text-brand-500" />
        <h3 className="text-sm font-semibold text-foreground">No Event Selected</h3>
        <p className="text-xs text-text-muted mt-1 max-w-xs">
          Select an event from the list or use J/K keys to inspect timeline, collectors, credits, and actions.
        </p>
      </div>
    );
  }

  const scriptConfig = SCRIPT_CONFIGS[event.language];
  const eventTime = event.date_time_ist || event.releaseTime;

  // Copy metadata as one structured formatted block
  const handleCopyMetadata = () => {
    const meta = [
      `Title: ${event.songTitle}`,
      `Movie / Artist: ${event.movieTitle || event.movie_or_artist}`,
      `Language: ${scriptConfig?.name || event.language}`,
      `Singers: ${event.singers?.length ? event.singers.join(', ') : 'TBA'}`,
      `Music Director: ${event.composer || event.music_director || 'TBA'}`,
      `Lyricist: ${event.lyricist || 'TBA'}`,
      `Release Date / Time (IST): ${formatIST(eventTime)}`,
      `State: ${getFriendlyStateName(event.state)}`,
      `Links: ${event.youtubeUrl || event.link || 'TBA'}`,
    ].join('\n');

    navigator.clipboard.writeText(meta);
    showToast('Metadata block copied to clipboard');
  };

  const handleOpenYoutube = () => {
    const url = event.youtubeUrl || event.link;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReporting(true);

    try {
      const res = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          reason: reportReason,
          note: reportNote,
        }),
      });

      if (res.ok) {
        showToast('Feedback submitted. Thanks for reporting!');
        setReportModalOpen(false);
        setReportNote('');
      } else {
        showToast('Error recording report');
      }
    } catch {
      showToast('Error connecting to feedback server');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-surface-elevated ${
        isFullScreenMobile ? 'min-h-screen' : 'rounded-xl border border-surface-border overflow-hidden'
      }`}
    >
      {/* Banner & Header */}
      <div className="relative h-48 sm:h-56 bg-surface-subtle overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.thumbnail}
          alt={event.songTitle}
          className="w-full h-full object-cover brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated via-surface-elevated/40 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StateBadge state={event.state} size="sm" />
              {event.is_demo && <DemoBadge size="sm" />}
              <LanguageChip language={event.language} showNative={true} size="sm" />
              <TierBadge tier={event.tier} size="sm" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate drop-shadow-md">
              {event.songTitle}
            </h1>
            <p className="text-sm font-medium text-gray-300 truncate">
              {event.movieTitle || event.movie_or_artist} {event.nativeTitle && `• ${event.nativeTitle}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-surface-border">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <ConfidenceBadge confidence={event.confidence} />
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Release Time Banner in IST */}
        <div className="bg-surface rounded-xl p-3.5 border border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className={`w-4 h-4 shrink-0 ${event.is_demo ? 'text-amber-400' : 'text-brand-400'}`} />
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>{formatIST(eventTime)}</span>
                {event.is_demo && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    DEMO
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-muted">
                {event.is_demo ? (
                  <span className="text-amber-400/90 font-medium">DEMO TIMESTAMP • {formatRelativeIST(eventTime)}</span>
                ) : (
                  formatRelativeIST(eventTime)
                )}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
            event.is_demo
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
          }`}>
            {event.is_demo ? 'DEMO DATA' : 'IST Synchronized'}
          </span>
        </div>

        {/* Description / Raw Note */}
        {event.description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed bg-surface/50 p-3.5 rounded-xl border border-surface-border/50">
            {event.description}
          </p>
        )}

        {/* 2-Column Grid for Credits & Sources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section: Credits */}
          <div className="bg-surface rounded-xl p-4 border border-surface-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Production Credits
            </h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline py-1 border-b border-surface-border/50">
                <dt className="text-text-muted">Music Director</dt>
                <dd className="font-semibold text-foreground text-right">
                  {event.composer || event.music_director || 'TBA'}
                </dd>
              </div>
              <div className="flex justify-between items-baseline py-1 border-b border-surface-border/50">
                <dt className="text-text-muted">Singers</dt>
                <dd className="font-semibold text-foreground text-right">
                  {event.singers?.length ? event.singers.join(', ') : 'TBA'}
                </dd>
              </div>
              <div className="flex justify-between items-baseline py-1 border-b border-surface-border/50">
                <dt className="text-text-muted">Lyricist</dt>
                <dd className="font-semibold text-foreground text-right">{event.lyricist || 'TBA'}</dd>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <dt className="text-text-muted">Record Label / Channel</dt>
                <dd className="font-semibold text-foreground text-right">{event.recordLabel || 'Official Channel'}</dd>
              </div>
            </dl>
          </div>

          {/* Section: Collector Sources with first-seen times */}
          <div className="bg-surface rounded-xl p-4 border border-surface-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              Collector Sources & Ingest Times
            </h3>
            <div className="space-y-2">
              {(event.sources || []).map((src, idx) => {
                const isDemo = event.is_demo || src.is_demo;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-surface-border/60 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                        <span>{src.source || src.name}</span>
                        {isDemo && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            DEMO SOURCE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        First seen:{' '}
                        {isDemo ? (
                          <span className="text-amber-400 font-mono font-semibold">DEMO</span>
                        ) : src.first_seen_at ? (
                          formatIST(src.first_seen_at)
                        ) : (
                          src.updated || 'Recent'
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {typeof src.confidence === 'number' ? `${src.confidence}%` : src.confidence} Conf
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section: State Timeline from event_history */}
        <div className="bg-surface rounded-xl p-4 border border-surface-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            State Audit & Timeline History
          </h3>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
            {(event.timeline || []).map((node, idx) => {
              const isDone = node.status === 'done';
              const isActive = node.status === 'active';
              return (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : isActive
                        ? 'bg-brand-500 border-brand-400 animate-ping'
                        : 'bg-surface border-surface-border'
                    }`}
                  >
                    {isDone && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{node.label}</span>
                    <span className="text-[10px] font-mono shrink-0">
                      {event.is_demo ? (
                        <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          DEMO
                        </span>
                      ) : (
                        <span className="text-text-muted">{node.time}</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-surface border-t border-surface-border flex items-center gap-2 sm:gap-3 backdrop-blur-md shrink-0 flex-wrap">
        <Button
          variant="primary"
          onClick={handleOpenYoutube}
          icon={ExternalLink}
          className="flex-1 font-semibold min-h-[44px]"
        >
          Open YouTube
        </Button>
        <Button
          variant="secondary"
          onClick={handleCopyMetadata}
          icon={Copy}
          className="flex-1 min-h-[44px]"
        >
          Copy Metadata
        </Button>
        <Button
          variant="outline"
          onClick={() => addEventToTasks(event)}
          icon={CheckSquare}
          className="flex-1 min-h-[44px]"
        >
          Add Task
        </Button>
        <Button
          variant="ghost"
          onClick={() => setReportModalOpen(true)}
          icon={AlertTriangle}
          className="text-text-muted hover:text-red-400 min-h-[44px]"
        >
          Report Wrong
        </Button>
      </div>

      {/* Report Wrong Alert Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-elevated border border-surface-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Report Wrong Alert / Metadata</span>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Report incorrect premiere dates, inaccurate credits, or debunked rumors for{' '}
              <strong className="text-foreground">{event.songTitle}</strong>.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted mb-1 block">Reason</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-surface-border rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500"
                >
                  <option value="wrong_date">Wrong Premiere Date / Time</option>
                  <option value="wrong_credits">Inaccurate Singers / Composer / Lyricist</option>
                  <option value="fake_rumor">False Alert / Debunked Rumor</option>
                  <option value="duplicate">Duplicate Release Entry</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted mb-1 block">Additional Note (Optional)</label>
                <textarea
                  value={reportNote}
                  onChange={e => setReportNote(e.target.value)}
                  placeholder="Provide correct source link or details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-surface-border rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={() => setReportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 min-h-[44px]"
                  disabled={reporting}
                  icon={Send}
                >
                  {reporting ? 'Submitting...' : 'Send Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
