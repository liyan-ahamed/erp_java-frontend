'use client';

import { ReactNode } from 'react';

// For now, this is a placeholder ThemeProvider that just renders children.
// In the future, this can be expanded to use next-themes or a custom context
// for managing dark mode, primary colors, etc.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
