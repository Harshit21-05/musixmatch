'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Breakpoint } from '@/types';

interface BreakpointContextValue {
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isTouch: boolean;
  hasFinePointer: boolean;
  isCapacitor: boolean;
  forcedShell: 'auto' | 'mobile' | 'desktop';
  setForcedShell: (shell: 'auto' | 'mobile' | 'desktop') => void;
}

const BreakpointContext = createContext<BreakpointContextValue | undefined>(undefined);

export function getBreakpointFromWidth(w: number): Breakpoint {
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  if (w < 1536) return 'desktop';
  return 'wide';
}

interface BreakpointProviderProps {
  children: React.ReactNode;
  initialBreakpoint?: Breakpoint;
}

export function BreakpointProvider({
  children,
  initialBreakpoint = 'desktop',
}: BreakpointProviderProps) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(initialBreakpoint);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: initialBreakpoint === 'mobile' ? 390 : initialBreakpoint === 'tablet' ? 768 : 1440,
    height: 900,
  });
  const [isTouch, setIsTouch] = useState<boolean>(false);
  const [hasFinePointer, setHasFinePointer] = useState<boolean>(true);
  const [isCapacitor, setIsCapacitor] = useState<boolean>(false);
  const [forcedShell, setForcedShell] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect Capacitor environment
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      setIsCapacitor(true);
    }

    // Pointer capabilities
    const coarseMedia = window.matchMedia('(pointer: coarse)');
    const fineMedia = window.matchMedia('(pointer: fine)');
    setIsTouch(coarseMedia.matches);
    setHasFinePointer(fineMedia.matches);

    const handlePointerChange = () => {
      setIsTouch(coarseMedia.matches);
      setHasFinePointer(fineMedia.matches);
    };

    coarseMedia.addEventListener?.('change', handlePointerChange);
    fineMedia.addEventListener?.('change', handlePointerChange);

    // Window resize handler
    const updateBreakpoint = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bp = getBreakpointFromWidth(w);
      setDimensions({ width: w, height: h });
      setBreakpoint(bp);

      // Store in cookie for zero-flash SSR on next requests
      try {
        document.cookie = `mxm_breakpoint=${bp}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Ignore cookie errors
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);

    return () => {
      window.removeEventListener('resize', updateBreakpoint);
      coarseMedia.removeEventListener?.('change', handlePointerChange);
      fineMedia.removeEventListener?.('change', handlePointerChange);
    };
  }, []);

  const effectiveBreakpoint =
    forcedShell === 'mobile' ? 'mobile' : forcedShell === 'desktop' ? (breakpoint === 'wide' ? 'wide' : 'desktop') : breakpoint;

  const isMobile = effectiveBreakpoint === 'mobile';
  const isTablet = effectiveBreakpoint === 'tablet';
  const isDesktop = effectiveBreakpoint === 'desktop' || effectiveBreakpoint === 'wide';
  const isWide = effectiveBreakpoint === 'wide';

  return (
    <BreakpointContext.Provider
      value={{
        breakpoint: effectiveBreakpoint,
        width: dimensions.width,
        height: dimensions.height,
        isMobile,
        isTablet,
        isDesktop,
        isWide,
        isTouch,
        hasFinePointer,
        isCapacitor,
        forcedShell,
        setForcedShell,
      }}
    >
      {children}
    </BreakpointContext.Provider>
  );
}

export function useBreakpoint() {
  const context = useContext(BreakpointContext);
  if (!context) {
    throw new Error('useBreakpoint must be used within a BreakpointProvider');
  }
  return context;
}
