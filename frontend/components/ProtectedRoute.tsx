import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import LoadingScreen from './LoadingScreen';

/** Requires a valid access session; waits for bootstrap `/me` before deciding. */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuthContext();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
