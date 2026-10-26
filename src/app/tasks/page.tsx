'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { KanbanMobile } from '@/components/tasks/KanbanMobile';
import { KanbanDesktop } from '@/components/tasks/KanbanDesktop';

export default function TasksPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <KanbanMobile />;
  }

  return <KanbanDesktop />;
}
