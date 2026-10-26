'use client';

import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { SettingsMobile } from '@/components/settings/SettingsMobile';
import { SettingsDesktop } from '@/components/settings/SettingsDesktop';

export default function SettingsPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <SettingsMobile />;
  }

  return <SettingsDesktop />;
}
