'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DensityMode, ThemeMode, Language } from '@/types';
import { soundManager } from '@/utils/sound';

interface SettingsContextValue {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  selectedLanguages: Language[];
  toggleLanguageFilter: (lang: Language) => void;
  clearLanguageFilters: () => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [density, setDensityState] = useState<DensityMode>('compact');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load saved settings
    const savedTheme = localStorage.getItem('mxm_theme') as ThemeMode | null;
    const savedDensity = localStorage.getItem('mxm_density') as DensityMode | null;
    const savedSound = localStorage.getItem('mxm_sound');
    const savedHaptics = localStorage.getItem('mxm_haptics');

    if (savedTheme) setThemeState(savedTheme);
    if (savedDensity) setDensityState(savedDensity);
    if (savedSound !== null) {
      const isSound = savedSound === 'true';
      setSoundEnabledState(isSound);
      soundManager.setSoundEnabled(isSound);
    }
    if (savedHaptics !== null) setHapticsEnabledState(savedHaptics === 'true');

    // System reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotionState(motionQuery.matches);
    const motionHandler = (e: MediaQueryListEvent) => setReducedMotionState(e.matches);
    motionQuery.addEventListener?.('change', motionHandler);

    return () => {
      motionQuery.removeEventListener?.('change', motionHandler);
    };
  }, []);

  // Theme resolution & DOM sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    let effective: 'dark' | 'light' = 'dark';

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = isDark ? 'dark' : 'light';
    } else {
      effective = theme;
    }

    setResolvedTheme(effective);

    if (effective === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Density class
    root.classList.remove('density-compact', 'density-comfortable');
    root.classList.add(`density-${density}`);
  }, [theme, density]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mxm_theme', newTheme);
    }
  };

  const setDensity = (newDensity: DensityMode) => {
    setDensityState(newDensity);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mxm_density', newDensity);
    }
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundManager.setSoundEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mxm_sound', String(enabled));
    }
  };

  const setHapticsEnabled = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mxm_haptics', String(enabled));
    }
  };

  const toggleLanguageFilter = (lang: Language) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const clearLanguageFilters = () => {
    setSelectedLanguages([]);
  };

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced);
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        density,
        setDensity,
        soundEnabled,
        setSoundEnabled,
        hapticsEnabled,
        setHapticsEnabled,
        selectedLanguages,
        toggleLanguageFilter,
        clearLanguageFilters,
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
