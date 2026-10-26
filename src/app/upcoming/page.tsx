'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { AgendaListMobile } from '@/components/upcoming/AgendaListMobile';
import { CalendarGridDesktop } from '@/components/upcoming/CalendarGridDesktop';

export default function UpcomingPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <AgendaListMobile />;
  }

  return <CalendarGridDesktop />;
}
