'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { MobileShell } from '@/components/shell/MobileShell';
import { DesktopShell } from '@/components/shell/DesktopShell';

interface ShellSwitchProps {
  children: React.ReactNode;
}

export function ShellSwitch({ children }: ShellSwitchProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  return <DesktopShell>{children}</DesktopShell>;
}
