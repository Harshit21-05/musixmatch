'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { ReleasedFeedMobile } from '@/components/released/ReleasedFeedMobile';
import { DenseTableDesktop } from '@/components/released/DenseTableDesktop';

export default function ReleasedPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <ReleasedFeedMobile />;
  }

  return <DenseTableDesktop />;
}
