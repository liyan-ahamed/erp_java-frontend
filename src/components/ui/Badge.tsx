import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'info';
}

// Forma status badges: green = done/approved, orange = pending/shortage, purple = scheduled/open.
// Red is the ERP's addition for errors and rejections.
const VARIANTS = {
  default: '',
  success: 'green',
  warning: 'orange',
  error: 'red',
  info: 'purple',
  outline: 'outline',
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => (
    <div ref={ref} className={`badge ${VARIANTS[variant]} ${className}`} {...props} />
  )
);
Badge.displayName = 'Badge';
