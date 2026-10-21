/**
 * One role per account. The backend still stores a set of roles; the UI treats an account as having a
 * single role and, if an old account holds several, shows the highest one (HOD > Faculty > Student).
 * The STAFF backend role is displayed as "Faculty".
 */
export type SingleRole = 'ROLE_HOD' | 'ROLE_STAFF' | 'ROLE_STUDENT';

export const ROLE_DISPLAY: Record<SingleRole, string> = {
  ROLE_HOD: 'HOD',
  ROLE_STAFF: 'Faculty',
  ROLE_STUDENT: 'Student',
};

export const primaryRole = (roles: readonly string[]): SingleRole | null =>
  roles.includes('ROLE_HOD') ? 'ROLE_HOD' : roles.includes('ROLE_STAFF') ? 'ROLE_STAFF' : roles.includes('ROLE_STUDENT') ? 'ROLE_STUDENT' : null;

export const roleDisplay = (roles: readonly string[]) => {
  const role = primaryRole(roles);
  return role ? ROLE_DISPLAY[role] : '—';
};
