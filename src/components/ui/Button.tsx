import React, { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

// Forma buttons: primary inverts the theme (text colour background); others are outlined surfaces.
const VARIANTS = {
  primary: 'primary',
  secondary: '',
  outline: '',
  ghost: 'ghost',
  danger: 'danger',
};

const SIZES = { sm: 'sm', md: '', lg: 'lg' };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`f-btn ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="!border-current !border-t-transparent" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
