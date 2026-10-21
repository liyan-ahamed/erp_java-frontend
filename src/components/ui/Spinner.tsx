import React from 'react';

export const Spinner = ({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes = {
    sm: 'w-3.5 h-3.5 border-[1.5px]',
    md: 'w-5 h-5 border-2',
    lg: 'w-7 h-7 border-2',
    xl: 'w-10 h-10 border-[3px]',
  };

  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block flex-shrink-0 animate-spin rounded-full border-line border-t-fg ${sizes[size]} ${className}`}
    />
  );
};
