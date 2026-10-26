import React from 'react';
import { EventState } from '@/types';
import {
  Radio,
  Clock,
  CheckCircle2,
  Calendar,
  HelpCircle,
  Zap,
  Music2,
  Sparkles,
  Film,
} from 'lucide-react';

interface BadgeProps {
  state: EventState;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StateBadge({ state, size = 'md', pulse = true }: BadgeProps) {
  const configs: Record<
    string,
    { label: string; icon: React.ElementType; bg: string; text: string; border: string; isHot?: boolean }
  > = {
    // Canonical states from spec
    rumor: {
      label: 'Rumor',
      icon: HelpCircle,
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
    },
    announced: {
      label: 'Announced',
      icon: Sparkles,
      bg: 'bg-sky-500/15',
      text: 'text-sky-400',
      border: 'border-sky-500/40',
    },
    teaser: {
      label: 'Teaser Out',
      icon: Film,
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/40',
    },
    scheduled: {
      label: 'Scheduled',
      icon: Calendar,
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
    },
    released: {
      label: 'Released',
      icon: CheckCircle2,
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
    },
    unannounced_drop: {
      label: 'SURPRISE DROP',
      icon: Zap,
      bg: 'bg-rose-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/50',
      isHot: true,
    },
    live_on_dsp: {
      label: 'Live on DSP',
      icon: Music2,
      bg: 'bg-violet-500/15',
      text: 'text-violet-400',
      border: 'border-violet-500/40',
    },
    // Aliases
    live: {
      label: 'LIVE NOW',
      icon: Radio,
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/40',
      isHot: true,
    },
    upcoming: {
      label: 'Upcoming',
      icon: Clock,
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
    },
    unconfirmed: {
      label: 'Unconfirmed',
      icon: HelpCircle,
      bg: 'bg-gray-500/15',
      text: 'text-gray-400',
      border: 'border-gray-500/40',
    },
  };

  const cfg = configs[state] || configs.unconfirmed;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold tracking-wide border rounded-full transition-colors ${cfg.bg} ${cfg.text} ${cfg.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      role="status"
      aria-label={`Status: ${cfg.label}`}
    >
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${
          cfg.isHot && pulse ? 'animate-pulse text-red-400' : ''
        }`}
        aria-hidden="true"
      />
      <span>{cfg.label}</span>
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' | number }) {
  let level: 'high' | 'medium' | 'low' = 'high';
  if (typeof confidence === 'number') {
    level = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  } else {
    level = confidence;
  }

  const styles = {
    high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    low: 'text-red-400 bg-red-500/10 border-red-500/30',
  }[level];

  return (
    <span className={`inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${styles}`}>
      {level} conf
    </span>
  );
}

export function DemoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 tracking-wider shrink-0 ${sizeClasses}`}
      title="Demo Row (seeded data)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Demo
    </span>
  );
}
