'use client';

import React, { useState } from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const { isTouch } = useBreakpoint();

  // If strictly touch device, tooltips are omitted so they don't block clicks
  if (isTouch) {
    return <>{children}</>;
  }

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-40 px-2.5 py-1 text-xs font-medium text-white bg-gray-900 border border-gray-700 rounded-md shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in duration-150 ${positionStyles[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
