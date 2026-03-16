import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Requires authentication only
export function AuthGuard() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// Requires auth + OTP verified
export function OtpGuard() {
  const { isAuthenticated, isOtpVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isOtpVerified) return <Navigate to="/auth/otp" replace />;
  return <Outlet />;
}

// Requires auth + OTP + organization
export function FullGuard() {
  const { isAuthenticated, isOtpVerified, hasOrganization, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isOtpVerified) return <Navigate to="/auth/otp" replace />;
  if (!hasOrganization) return <Navigate to="/onboarding/org" replace />;
  return <Outlet />;
}

// Redirect if already fully authenticated
export function GuestGuard() {
  const { isAuthenticated, isOtpVerified, hasOrganization, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated && isOtpVerified && hasOrganization) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
    </div>
  );
}
