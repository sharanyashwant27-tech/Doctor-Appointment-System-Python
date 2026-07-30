import type { AuthUser, UserRole } from '@/types/auth';

/** Home / dashboard path for a role or guest. */
export function dashboardPathForRole(role?: UserRole | string | null): string {
  if (role === 'admin') return '/admin';
  if (role === 'doctor') return '/doctor';
  if (role === 'patient') return '/patient';
  return '/';
}

/** Dashboard for signed-in users; landing for guests. */
export function dashboardPathForUser(user: AuthUser): string {
  return dashboardPathForRole(user?.role);
}
