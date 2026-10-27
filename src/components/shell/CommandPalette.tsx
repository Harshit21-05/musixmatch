'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Film, Music, User, Radio, Calendar, CheckSquare, Activity, Settings, ArrowRight, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { isSimulationEnabled } from '@/lib/config';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { events, watchlist, setActiveEventId, triggerSimulatedDrop } = useData();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Ctrl+K, Cmd+K, and "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // toggle
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Filter items
  const staticNavigation = [
    { label: 'Live Drops & Events', href: '/', icon: Radio, category: 'Navigation' },
    { label: 'Upcoming Releases Calendar', href: '/upcoming', icon: Calendar, category: 'Navigation' },
    { label: 'Released Catalog Table', href: '/released', icon: Music, category: 'Navigation' },
    { label: 'Kanban Tasks & Workflows', href: '/tasks', icon: CheckSquare, category: 'Navigation' },
    { label: 'Watchlist Monitor', href: '/watchlist', icon: Film, category: 'Navigation' },
    { label: 'Collector Health Dashboard', href: '/health', icon: Activity, category: 'Navigation' },
    { label: 'Settings & Appearance', href: '/settings', icon: Settings, category: 'Navigation' },
    { label: 'Launch Wall Mode (Dashboard)', href: '/wall', icon: Radio, category: 'Navigation' },
  ];

  const matchedEvents = events
    .filter(
      e =>
        e.songTitle.toLowerCase().includes(query.toLowerCase()) ||
        e.movieTitle.toLowerCase().includes(query.toLowerCase()) ||
        e.composer.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5)
    .map(e => ({
      label: `${e.songTitle} - ${e.movieTitle} (${e.composer})`,
      action: () => {
        setActiveEventId(e.id);
        router.push(`/events/${e.id}`);
        onClose();
      },
      icon: Music,
      category: 'Events & Songs',
    }));

  const matchedWatchlist = watchlist
    .filter(w => w.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
    .map(w => ({
      label: `${w.title} (${w.type.toUpperCase()}) - ${w.notes || ''}`,
      action: () => {
        router.push('/watchlist');
        onClose();
      },
      icon: w.type === 'composer' ? User : Film,
      category: 'Watchlist',
    }));

  const simulationEnabled = isSimulationEnabled();
  const quickActions = simulationEnabled
    ? [
        {
          label: '⚡ Simulate Live Drop Alert (Chime & Banner)',
          action: () => {
            triggerSimulatedDrop();
            onClose();
          },
          icon: Radio,
          category: 'Quick Actions',
        },
      ]
    : [];

  const filteredNav = query
    ? staticNavigation.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : staticNavigation;

  const allResults = [
    ...quickActions.filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase())),
    ...matchedEvents,
    ...matchedWatchlist,
    ...filteredNav,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allResults[selectedIndex];
      if (item) {
        if ('action' in item && typeof item.action === 'function') {
          item.action();
        } else if ('href' in item && typeof item.href === 'string') {
          router.push(item.href);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global Search Command Palette"
        className="relative z-10 w-full max-w-xl bg-surface-elevated border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center px-4 border-b border-surface-border bg-surface">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search movie, song, artist, composer, or page..."
            className="w-full px-3 py-3.5 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-foreground rounded focus:outline-none"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {allResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            allResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.category}-${item.label}-${idx}`}
                  onClick={() => {
                    if ('action' in item && typeof item.action === 'function') {
                      item.action();
                    } else if ('href' in item && typeof item.href === 'string') {
                      router.push(item.href);
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'text-foreground hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-text-secondary'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-text-muted opacity-60'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-surface-border bg-surface text-[11px] text-text-muted flex items-center justify-between">
          <span>Navigate with <kbd className="px-1 py-0.5 bg-surface-subtle border border-surface-border rounded text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-surface-subtle border border-surface-border rounded text-[10px]">↓</kbd></span>
          <span>Open with <kbd className="px-1 py-0.5 bg-surface-subtle border border-surface-border rounded text-[10px]">Enter</kbd></span>
          <span>Close with <kbd className="px-1 py-0.5 bg-surface-subtle border border-surface-border rounded text-[10px]">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
