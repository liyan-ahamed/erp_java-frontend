'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from './icons';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Open dialogs, newest last, so Escape and the focus trap only act on the top one.
const stack: symbol[] = [];

interface DialogProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** 640 px instead of Forma's 480 px, for dense forms and tables. */
  wide?: boolean;
}

/**
 * Forma dialog: blurred overlay, compact header with close button, scrolling body.
 * Escape and overlay clicks close it, Tab focus stays inside, and focus returns to the opener.
 */
export function Dialog({ title, onClose, children, wide }: DialogProps) {
  const ref = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const pressStartedOnOverlay = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = Symbol('dialog');
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const isTop = () => stack[stack.length - 1] === id;

    // Prefer the first form field; otherwise the close button.
    const timer = setTimeout(() => {
      const root = ref.current;
      const target =
        root?.querySelector<HTMLElement>('.modal-body input:not([disabled]),.modal-body select:not([disabled]),.modal-body textarea:not([disabled])') ??
        root?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!ref.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        pressStartedOnOverlay.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        // Only a click that starts and ends on the overlay closes (not a text selection drag).
        if (pressStartedOnOverlay.current && e.target === e.currentTarget) onClose();
        pressStartedOnOverlay.current = false;
      }}
    >
      <section ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} className="f-btn icon" aria-label="Close dialog">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>,
    document.body
  );
}
