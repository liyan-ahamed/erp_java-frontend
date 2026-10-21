import React, { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

/** Forma form control: soft background, fine border, 8 px radius, purple focus outline. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, error, ...props }, ref) => (
    <div className="w-full">
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 flex items-center justify-center text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={`f-control ${icon ? '!pl-9' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
