'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { LiveFeedMobile } from '@/components/live/LiveFeedMobile';
import { LiveFeedDesktop } from '@/components/live/LiveFeedDesktop';

export default function HomePage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <LiveFeedMobile />;
  }

  return <LiveFeedDesktop />;
}
