import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext, UserRole } from '@context/AuthContext';
import LoadingScreen from './LoadingScreen';

type Props = { roles: UserRole[] };

function homeForRole(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'doctor') return '/doctor';
  return '/patient';
}

/** Restricts nested routes to allowed roles; redirects elsewhere if wrong role. */
export default function RoleGuard({ roles }: Props) {
  const { user, isAuthenticated, loading } = useAuthContext();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user) return <LoadingScreen />;
  if (!roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <Outlet />;
}
