import React from 'react';
import { useBreakpoint } from '@/context/BreakpointContext';
import { triggerHaptic } from '@/utils/haptics';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  haptic?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  haptic = true,
  onClick,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const { isMobile, isTouch } = useBreakpoint();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (haptic) triggerHaptic('light');
    onClick?.(e);
  };

  const variantStyles = {
    primary:
      'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-md shadow-brand-600/20 border-transparent',
    secondary:
      'bg-surface-elevated hover:bg-surface-subtle active:bg-surface text-foreground border-surface-border',
    outline:
      'bg-transparent hover:bg-surface-subtle text-foreground border-surface-border active:bg-surface-elevated',
    ghost:
      'bg-transparent hover:bg-surface-subtle text-text-secondary hover:text-foreground border-transparent',
    danger:
      'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-transparent',
  };

  // Ensure minimum 44px touch targets on mobile / touch devices for WCAG AA
  const touchMinHeight = (isMobile || isTouch) ? 'min-h-[44px]' : '';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-lg border transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${variantStyles[variant]} ${sizeStyles[size]} ${touchMinHeight} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}
