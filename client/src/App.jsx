import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { FullGuard } from './guards/RouteGuards';

import UnifiedLanding from './pages/UnifiedLanding';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Unified landing + auth flow */}
          <Route path="/" element={<UnifiedLanding />} />
          <Route path="/auth" element={<UnifiedLanding showAuth />} />

          {/* Fully protected — auth + OTP + org */}
          <Route element={<FullGuard />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
