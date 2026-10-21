'use client';

import { ReactNode } from 'react';

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: readonly { value: T; label: ReactNode }[];
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/** Forma tabs: borderless labels on a rule; the active tab has a 2 px underline. */
export function Tabs<T extends string>({ value, onChange, items, label, className = '' }: TabsProps<T>) {
  return (
    <div className={`tabs ${className}`} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? 'active' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
