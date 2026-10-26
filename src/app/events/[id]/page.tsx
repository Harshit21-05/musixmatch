'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useBreakpoint } from '@/context/BreakpointContext';
import { EventDetailPane } from '@/components/live/EventDetailPane';
import { LiveFeedDesktop } from '@/components/live/LiveFeedDesktop';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { events, setActiveEventId } = useData();
  const { isMobile } = useBreakpoint();

  const event = events.find(e => e.id === resolvedParams.id) || null;

  useEffect(() => {
    if (resolvedParams.id) {
      setActiveEventId(resolvedParams.id);
    }
  }, [resolvedParams.id, setActiveEventId]);

  // On desktop, keep master-detail experience active with this event selected
  if (!isMobile) {
    return <LiveFeedDesktop />;
  }

  // Mobile: Full screen page deep-link experience with safe-area support
  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      {/* Top Mobile Bar with Back Button */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full text-foreground hover:bg-surface-subtle min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Back to feed"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-foreground truncate">
          {event ? event.songTitle : 'Event Detail'}
        </span>
      </div>

      <div className="flex-1 pb-16">
        <EventDetailPane event={event} isFullScreenMobile={true} />
      </div>
    </div>
  );
}
