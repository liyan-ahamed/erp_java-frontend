import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[#F5F5F5] text-[#666666]',
      success: 'bg-[#ECFDF5] text-[#059669]', // Soft Green
      warning: 'bg-[#FFFBEB] text-[#D97706]', // Soft Amber
      error: 'bg-[#FEF2F2] text-[#DC2626]',   // Soft Red
      info: 'bg-[#EFF6FF] text-[#2563EB]',    // Soft Blue
      outline: 'text-[#666666] border border-[#E8E8E8]',
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors focus:outline-none ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
