import React from 'react';
import { Tier } from '@/types';
import { Sparkles, Zap, Flame } from 'lucide-react';

interface TierBadgeProps {
  tier: Tier;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const configs: Record<
    Tier,
    { label: string; icon: React.ElementType; bg: string; text: string; border: string }
  > = {
    1: {
      label: 'Tier 1 (Pan-India)',
      icon: Sparkles,
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    },
    2: {
      label: 'Tier 2 (Mid-scale)',
      icon: Flame,
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
    },
    3: {
      label: 'Tier 3 (Regional)',
      icon: Zap,
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/40',
    },
  };

  const cfg = configs[tier];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      aria-label={`Priority: ${cfg.label}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}
