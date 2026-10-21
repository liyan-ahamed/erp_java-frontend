'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getPageMeta, roleOf } from '@/lib/navigation';

interface PageContainerProps {
  children: ReactNode;
  /** Defaults to the route's title (lib/navigation), so every page gets a Forma heading. */
  title?: ReactNode;
  description?: ReactNode;
  /** Small purple label above the title. */
  eyebrow?: string;
  /** A "← Back" link shown above the heading. */
  backLink?: ReactNode;
  actions?: ReactNode;
  contextArea?: ReactNode;
  maxWidth?: 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  rawLayout?: boolean;
}

/** Forma page frame: heading (title, subtitle, action), optional toolbar row, then content. */
export const PageContainer = ({
  children,
  title,
  description,
  eyebrow,
  backLink,
  actions,
  contextArea,
  maxWidth = 'max-w-full',
  rawLayout = true,
}: PageContainerProps) => {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const meta = getPageMeta(pathname, roleOf(hasRole));
  const heading = title ?? meta.title;
  const subtitle = description ?? meta.subtitle;

  return (
    <div className={`w-full mx-auto ${maxWidth} flex flex-col`}>
      {backLink && <div className="mb-3">{backLink}</div>}
      <div className="page-heading">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{heading}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-[9px] flex-wrap">{actions}</div>}
      </div>
      {contextArea && <div className="mb-6 w-full">{contextArea}</div>}
      {rawLayout ? (
        <div className="w-full flex-1">{children}</div>
      ) : (
        <div className="panel flex-1 w-full p-[22px]">{children}</div>
      )}
    </div>
  );
};
