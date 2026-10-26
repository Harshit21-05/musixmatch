'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Calendar, Music, CheckSquare, MoreHorizontal } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';
import { useData } from '@/context/DataContext';

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const pathname = usePathname();
  const { toastMessage } = useData();

  const navItems = [
    { label: 'Live', href: '/', icon: Radio },
    { label: 'Upcoming', href: '/upcoming', icon: Calendar },
    { label: 'Released', href: '/released', icon: Music },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'More', href: '/settings', icon: MoreHorizontal },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative">
      {/* Toast Notification for Mobile */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center animate-in fade-in slide-in-from-top duration-200 pointer-events-none">
          <div className="bg-brand-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 pb-16">{children}</main>

      {/* Mobile Bottom Navigation (Thumb Zone) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-surface-border flex items-center justify-around px-2 py-1 pb-[env(safe-area-inset-bottom,0.5rem)] shadow-2xl"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 rounded-xl transition-all focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                isActive
                  ? 'text-brand-500 font-bold'
                  : 'text-text-muted hover:text-foreground font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-brand-500' : ''}`} />
                {item.label === 'Live' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
