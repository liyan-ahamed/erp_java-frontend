import React from 'react';

export const Spinner = ({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full border-[#E8E8E8] border-t-[#111111] ${sizes[size]} ${className}`}
    />
  );
};
