'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Navigation & Master-Detail',
      items: [
        { keys: ['J'], desc: 'Select next event in list' },
        { keys: ['K'], desc: 'Select previous event in list' },
        { keys: ['Enter'], desc: 'Open / focus selected event detail' },
        { keys: ['/'], desc: 'Focus global search input' },
        { keys: ['Ctrl', 'K'], desc: 'Toggle command palette' },
        { keys: ['?'], desc: 'Toggle this keyboard shortcut guide' },
      ],
    },
    {
      title: 'Event Quick Actions',
      items: [
        { keys: ['C'], desc: 'Copy event metadata to clipboard' },
        { keys: ['Y'], desc: 'Open official YouTube video / premiere' },
        { keys: ['T'], desc: 'Add selected event to Kanban Tasks' },
      ],
    },
    {
      title: 'Go-to Jumps (Sequence)',
      items: [
        { keys: ['G', 'L'], desc: 'Go to Live Drops (/)' },
        { keys: ['G', 'U'], desc: 'Go to Upcoming Releases (/upcoming)' },
        { keys: ['G', 'R'], desc: 'Go to Released Catalog (/released)' },
        { keys: ['G', 'T'], desc: 'Go to Tasks Kanban (/tasks)' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
        className="relative z-10 w-full max-w-lg bg-surface-elevated border border-surface-border rounded-xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-foreground rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {shortcutGroups.map(group => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map(item => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-subtle/50"
                  >
                    <span className="text-sm text-foreground">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={k}>
                          <kbd className="min-w-[24px] px-2 py-1 text-center font-mono text-xs font-semibold text-text-primary bg-surface border border-surface-border rounded shadow-sm">
                            {k}
                          </kbd>
                          {idx < item.keys.length - 1 && (
                            <span className="text-xs text-text-muted">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-surface-border text-center text-xs text-text-muted">
          Press <kbd className="px-1.5 py-0.5 bg-surface border border-surface-border rounded text-[11px]">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
}
