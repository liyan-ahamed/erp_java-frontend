'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

const TOAST_DURATION_MS = 2800;

const ToastContext = createContext<((message: string) => void) | undefined>(undefined);

/** Forma toast: one inverted pill centred near the bottom, gone after 2.8 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${visible ? 'visible' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
