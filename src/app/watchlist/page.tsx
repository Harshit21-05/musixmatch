'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { WatchlistMobile } from '@/components/watchlist/WatchlistMobile';
import { WatchlistDesktop } from '@/components/watchlist/WatchlistDesktop';

export default function WatchlistPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <WatchlistMobile />;
  }

  return <WatchlistDesktop />;
}
