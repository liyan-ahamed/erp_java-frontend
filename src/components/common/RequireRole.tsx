'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppRole, useAuth } from '@/contexts/auth-context';
import { ROUTES } from '@/constants/routes';

interface RequireRoleProps {
  roles: AppRole[];
  children: ReactNode;
}

/**
 * Renders children only for users holding one of `roles`; anyone else is sent
 * back to the dashboard. Children are not mounted for unauthorized users, so
 * their data queries never run.
 */
export const RequireRole = ({ roles, children }: RequireRoleProps) => {
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  const allowed = roles.some(hasRole);

  useEffect(() => {
    if (!isLoading && !allowed) router.replace(ROUTES.DASHBOARD);
  }, [allowed, isLoading, router]);

  if (isLoading || !allowed) return null;
  return <>{children}</>;
};
