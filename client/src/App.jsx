import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { GuestGuard, AuthGuard, OtpGuard, FullGuard } from './guards/RouteGuards';

import LoginPage from './pages/LoginPage';
import EmailAuthPage from './pages/EmailAuthPage';
import OtpPage from './pages/OtpPage';
import GithubEmailPage from './pages/GithubEmailPage';
import OrgOnboardingPage from './pages/OrgOnboardingPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public / Guest routes */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/email" element={<EmailAuthPage />} />
            <Route path="/auth/github-email" element={<GithubEmailPage />} />
          </Route>

          {/* OTP page — needs pre-auth token */}
          <Route path="/auth/otp" element={<OtpPage />} />

          {/* Requires auth + OTP verified */}
          <Route element={<OtpGuard />}>
            <Route path="/onboarding/org" element={<OrgOnboardingPage />} />
          </Route>

          {/* Fully protected — auth + OTP + org */}
          <Route element={<FullGuard />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
