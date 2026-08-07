import React, { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 flex items-center justify-center text-[#9A9A9A] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-white border border-[#E8E8E8] rounded-[10px] text-sm text-[#111111] placeholder:text-[#9A9A9A] focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] transition-all ${
              icon ? 'pl-9' : 'pl-3'
            } pr-3 py-2.5 ${
              error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
