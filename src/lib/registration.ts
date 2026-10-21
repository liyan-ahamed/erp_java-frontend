import { Enrollment, RegistrationStatus } from '@/types/enrollment';

// Display helpers for semester course-registration status. The status itself is calculated by the backend
// (contract C in docs/ERP_API_CONTRACT.md) from the cohort's curriculum; the frontend only shows it.

export const REGISTRATION_STATUSES: RegistrationStatus[] = ['ALL_REGISTERED', 'INCOMPLETE', 'NOT_REGISTERED', 'REQUIREMENTS_UNKNOWN'];

export const REGISTRATION_STATUS_BADGE: Record<RegistrationStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  ALL_REGISTERED: { label: 'All Registered', variant: 'success' },
  INCOMPLETE: { label: 'Incomplete', variant: 'warning' },
  NOT_REGISTERED: { label: 'Not Registered', variant: 'error' },
  REQUIREMENTS_UNKNOWN: { label: 'Requirements Unknown', variant: 'default' },
};

/**
 * The shared counting rule (contract §0): a registration counts only while it is ENROLLED or COMPLETED on a
 * course offering that is still active. Used to list the rows that don't count; never to derive a status.
 */
export const isActiveRegistration = (e: Pick<Enrollment, 'status'> & { offeringActive?: boolean }) =>
  (e.status === 'ENROLLED' || e.status === 'COMPLETED') && e.offeringActive !== false;
