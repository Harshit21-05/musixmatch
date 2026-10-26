'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Radio,
  Calendar,
  Music,
  CheckSquare,
  Bookmark,
  Activity,
  Settings,
  Search,
  Keyboard,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { useSettings } from '@/context/SettingsContext';
import { useData } from '@/context/DataContext';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/modals/KeyboardShortcutsModal';

interface DesktopShellProps {
  children: React.ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTablet } = useBreakpoint();
  const { theme, resolvedTheme, setTheme, density } = useSettings();
  const { toastMessage, triggerSimulatedDrop } = useData();

  // Collapsible sidebar state (defaults collapsed on tablet)
  const [collapsed, setCollapsed] = useState(isTablet);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Sync collapsed state with tablet breakpoint
  useEffect(() => {
    setCollapsed(isTablet);
  }, [isTablet]);

  // Global Keyboard Navigation (Sequence: G then L/U/R/T, ?, /, Ctrl/Cmd+K)
  const sequenceKeyRef = useRef<string | null>(null);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an editable input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Command palette toggle (Ctrl+K or Cmd+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // Quick slash key focuses search
      if (e.key === '/') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ? key opens shortcut guide
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
        return;
      }

      // 'G' prefix sequence navigation
      if (e.key.toLowerCase() === 'g' && !sequenceKeyRef.current) {
        sequenceKeyRef.current = 'g';
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
        sequenceTimeoutRef.current = setTimeout(() => {
          sequenceKeyRef.current = null;
        }, 1200);
        return;
      }

      if (sequenceKeyRef.current === 'g') {
        const nextKey = e.key.toLowerCase();
        sequenceKeyRef.current = null;
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);

        if (nextKey === 'l') router.push('/');
        else if (nextKey === 'u') router.push('/upcoming');
        else if (nextKey === 'r') router.push('/released');
        else if (nextKey === 't') router.push('/tasks');
        else if (nextKey === 'w') router.push('/watchlist');
        else if (nextKey === 'h') router.push('/health');
        else if (nextKey === 's') router.push('/settings');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [router]);

  const navItems = [
    { label: 'Live Drops', href: '/', icon: Radio, shortcut: 'G then L', badge: 'LIVE' },
    { label: 'Upcoming', href: '/upcoming', icon: Calendar, shortcut: 'G then U' },
    { label: 'Released', href: '/released', icon: Music, shortcut: 'G then R' },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare, shortcut: 'G then T' },
    { label: 'Watchlist', href: '/watchlist', icon: Bookmark, shortcut: 'G then W' },
    { label: 'Health', href: '/health', icon: Activity, shortcut: 'G then H' },
    { label: 'Settings', href: '/settings', icon: Settings, shortcut: 'G then S' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Toast Notification for Desktop */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <div className="bg-brand-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 border border-brand-400/40">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Left Sidebar Nav */}
      <aside
        className={`flex flex-col border-r border-surface-border bg-surface transition-all duration-200 shrink-0 select-none ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* App Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-border">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md shadow-brand-600/30">
              M
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-extrabold text-base tracking-tight text-foreground">mxm</span>
                <span className="ml-1 text-[10px] font-bold text-brand-500 uppercase tracking-widest bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                  radar
                </span>
              </div>
            )}
          </Link>

          {!isTablet && (
            <button
              type="button"
              onClick={() => setCollapsed(prev => !prev)}
              className="p-1 rounded text-text-muted hover:text-foreground hover:bg-surface-subtle focus:outline-none"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-text-secondary hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                  {item.badge === 'LIVE' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-surface-border space-y-2">
          {!collapsed && (
            <button
              type="button"
              onClick={() => setShortcutsModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs text-text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5" />
                Shortcuts
              </span>
              <kbd className="font-mono text-[10px] bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">?</kbd>
            </button>
          )}

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 text-text-muted hover:text-foreground rounded hover:bg-surface-elevated"
              aria-label="Toggle dark/light theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!collapsed && (
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono">
                {density} mode
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar with Global Search */}
        <header className="h-16 border-b border-surface-border bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
          {/* Global Search Bar (Cmd+K trigger) */}
          <div
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-3 w-full max-w-md px-3.5 py-2 rounded-lg bg-surface-elevated border border-surface-border text-text-muted hover:text-foreground hover:border-brand-500/50 cursor-pointer transition-colors shadow-sm"
          >
            <Search className="w-4 h-4 text-text-muted" />
            <span className="text-xs flex-1 truncate">Search movies, songs, artists, pages...</span>
            <div className="flex items-center gap-1 font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-surface-border text-text-muted">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={triggerSimulatedDrop}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simulate Drop
            </button>

            <Link
              href="/wall"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated text-foreground border border-surface-border hover:bg-surface-subtle transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden md:inline">Wall Mode</span>
            </Link>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
