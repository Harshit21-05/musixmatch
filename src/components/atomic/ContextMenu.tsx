'use client';

import React, { useEffect, useRef } from 'react';
import { ExternalLink, Copy, CheckSquare, Download, Play, Eye } from 'lucide-react';
import { MusicEvent } from '@/types';
import { useData } from '@/context/DataContext';

interface ContextMenuProps {
  x: number;
  y: number;
  event: MusicEvent | null;
  onClose: () => void;
}

export function ContextMenu({ x, y, event, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { setActiveEventId, addEventToTasks, showToast } = useData();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!event) return null;

  const handleOpenDetail = () => {
    setActiveEventId(event.id);
    onClose();
  };

  const handleCopy = () => {
    const meta = `${event.songTitle} - ${event.movieTitle} | ${event.composer} | ${event.singers.join(', ')} | ${event.youtubeUrl}`;
    navigator.clipboard.writeText(meta);
    showToast('Metadata copied to clipboard');
    onClose();
  };

  const handleOpenYoutube = () => {
    window.open(event.youtubeUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleAddTask = () => {
    addEventToTasks(event);
    onClose();
  };

  // Keep menu within screen boundaries
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 240);

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-50 w-52 bg-surface-elevated border border-surface-border rounded-lg shadow-2xl py-1 text-sm text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 border-b border-surface-border text-xs text-text-muted truncate">
        {event.songTitle}
      </div>

      <button
        type="button"
        onClick={handleOpenDetail}
        className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-subtle transition-colors"
      >
        <Eye className="w-4 h-4 text-brand-500" />
        <span>View Details</span>
        <kbd className="ml-auto text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">Enter</kbd>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-subtle transition-colors"
      >
        <Copy className="w-4 h-4 text-cyan-400" />
        <span>Copy Metadata</span>
        <kbd className="ml-auto text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">C</kbd>
      </button>

      <button
        type="button"
        onClick={handleOpenYoutube}
        className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-subtle transition-colors"
      >
        <Play className="w-4 h-4 text-red-500" />
        <span>Open YouTube</span>
        <kbd className="ml-auto text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">Y</kbd>
      </button>

      <button
        type="button"
        onClick={handleAddTask}
        className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-subtle transition-colors"
      >
        <CheckSquare className="w-4 h-4 text-emerald-400" />
        <span>Add to Tasks</span>
        <kbd className="ml-auto text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">T</kbd>
      </button>
    </div>
  );
}
