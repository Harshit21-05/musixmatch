import React from 'react';
import { Language, SCRIPT_CONFIGS } from '@/types';
import { Globe } from 'lucide-react';

interface LanguageChipProps {
  language: Language;
  showNative?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function LanguageChip({
  language,
  showNative = true,
  selected = false,
  onClick,
  size = 'md',
}: LanguageChipProps) {
  const script = SCRIPT_CONFIGS[language] || SCRIPT_CONFIGS.en;

  const content = (
    <>
      <Globe className="w-3 h-3 opacity-70 shrink-0" aria-hidden="true" />
      <span className="font-semibold uppercase tracking-wider text-[10px]">{script.code}</span>
      {showNative && (
        <span className={`opacity-90 font-medium ${script.fontClass} ${script.lineHeightScale}`}>
          {script.nativeName}
        </span>
      )}
    </>
  );

  const baseClasses = `inline-flex items-center gap-1.5 rounded-md border transition-all select-none ${
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  } ${
    selected
      ? 'bg-brand-600 text-white border-brand-500 shadow-sm ring-1 ring-brand-400'
      : `${script.badgeBg} ${script.badgeText} ${script.badgeBorder} hover:brightness-110`
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500`}
        aria-pressed={selected}
        aria-label={`Filter by language: ${script.name} (${script.nativeName})`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={baseClasses} aria-label={`Language: ${script.name}`}>
      {content}
    </span>
  );
}
