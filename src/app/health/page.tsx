'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { HealthMobile } from '@/components/health/HealthMobile';
import { HealthDesktop } from '@/components/health/HealthDesktop';

export default function HealthPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <HealthMobile />;
  }

  return <HealthDesktop />;
}
