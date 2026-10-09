import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success'
  | 'ai';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  iconOnly?: boolean;
  loading?: boolean;
  active?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'secondary',
      size = 'md',
      icon,
      iconRight,
      iconOnly = false,
      loading = false,
      active = false,
      fullWidth = false,
      disabled = false,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isIconOnly = iconOnly || (!children && Boolean(icon));

    const classes = [
      'collabo-btn',
      `collabo-btn-${variant}`,
      `collabo-btn-${size}`,
      isIconOnly ? 'collabo-btn-icon-only' : '',
      active ? 'collabo-btn-active' : '',
      loading ? 'collabo-btn-loading' : '',
      fullWidth ? 'collabo-btn-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-pressed={active ? true : undefined}
        {...rest}
      >
        {loading ? (
          <Loader2 className="collabo-btn-spinner spin" size={size === 'xs' ? 11 : size === 'sm' ? 13 : 15} />
        ) : (
          icon && <span className="collabo-btn-icon collabo-btn-icon-left">{icon}</span>
        )}

        {children && <span className="collabo-btn-text">{children}</span>}

        {!loading && iconRight && (
          <span className="collabo-btn-icon collabo-btn-icon-right">{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
