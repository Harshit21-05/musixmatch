'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  ShieldCheck,
  Play,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSettings } from '@/context/SettingsContext';
import { StateBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Button } from '@/components/atomic/Button';
import { soundManager } from '@/utils/sound';

export default function WallModePage() {
  const { events, nextUpEvent, triggerSimulatedDrop, newDropEventId } = useData();
  const { soundEnabled, setSoundEnabled } = useSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 44, seconds: 52 });

  // Clock ticker & Drop countdown
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      if (nextUpEvent) {
        const diff = new Date(nextUpEvent.releaseTime).getTime() - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown({ hours, minutes, seconds });
        } else {
          setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        }
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [nextUpEvent]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const liveAndRecentDrops = events.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col p-6 overflow-hidden select-none">
      {/* Top Wall Dashboard Header */}
      <header className="flex items-center justify-between pb-6 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Wall</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              mxm <span className="text-red-500 font-extrabold">WALL DASHBOARD</span>
            </h1>
          </div>
        </div>

        {/* Big Wall Clock & Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              icon={soundEnabled ? Volume2 : VolumeX}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) soundManager.playClickBeep();
              }}
              className="text-xs"
            >
              Sound {soundEnabled ? 'ON' : 'OFF'}
            </Button>

            <Button
              size="sm"
              variant="primary"
              icon={Sparkles}
              onClick={triggerSimulatedDrop}
              className="text-xs font-bold"
              title="Client-side memory simulation only. Never writes to database."
            >
              Simulate Drop (TEST)
            </Button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:text-white text-gray-400"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          <div className="font-mono text-3xl font-extrabold text-gray-200 bg-gray-900/80 px-4 py-1.5 rounded-xl border border-gray-800">
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Grid: Big Next-Up Drop Card + Live Drop Grid */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 pt-6 overflow-hidden">
        {/* Left 1-Column: Giant Hero Next-Up Countdown */}
        {nextUpEvent && (
          <div className="xl:col-span-1 bg-gradient-to-b from-gray-900 via-[#10121a] to-[#0c0d14] border border-red-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Upcoming Next Drop
                </span>
                <TierBadge tier={nextUpEvent.tier} />
              </div>

              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black mb-4 border border-gray-800 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextUpEvent.thumbnail}
                  alt={nextUpEvent.songTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <LanguageChip language={nextUpEvent.language} showNative={true} />
                <StateBadge state={nextUpEvent.state} />
              </div>

              <h2 className="text-3xl font-black text-white leading-tight mb-1">
                {nextUpEvent.songTitle}
              </h2>
              <p className="text-base font-semibold text-gray-400">
                {nextUpEvent.movieTitle} • {nextUpEvent.composer}
              </p>
            </div>

            {/* Giant Countdown Digits */}
            <div className="mt-6 pt-6 border-t border-gray-800/80">
              <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 block mb-2">
                Drop Target Countdown
              </span>
              <div className="font-mono text-5xl font-black text-white tracking-wider">
                {String(countdown.hours).padStart(2, '0')} : {String(countdown.minutes).padStart(2, '0')} : {String(countdown.seconds).padStart(2, '0')}
              </div>
            </div>
          </div>
        )}

        {/* Right 2-Columns: Live Drop Stream Grid with Flash Highlights */}
        <div className="xl:col-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              Live Ingestion Radar Feed
            </h2>
            <span className="text-xs text-gray-500 font-mono">Listening on WebSocket & YouTube Webhooks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
            {liveAndRecentDrops.map(event => {
              const isFlashing = event.id === newDropEventId;

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isFlashing
                      ? 'bg-red-950/60 border-red-500 shadow-2xl ring-2 ring-red-500 animate-drop-flash'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {event.songTitle.startsWith('[TEST]') && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            TEST
                          </span>
                        )}
                        <StateBadge state={event.state} size="sm" />
                        <LanguageChip language={event.language} showNative={false} size="sm" />
                        <TierBadge tier={event.tier} size="sm" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {event.confidence}% verified
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white truncate">{event.songTitle}</h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {event.movieTitle} • {event.composer}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">{event.singers.join(', ')}</span>
                    <button
                      type="button"
                      onClick={() => window.open(event.youtubeUrl, '_blank')}
                      className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Watch</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
