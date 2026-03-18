import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(() => localStorage.getItem('zerodesk_token'));

  const fetchUser = useCallback(async () => {
    const currentToken = localStorage.getItem('zerodesk_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await getMe();
      setUser(data.user);
    } catch {
      setUser(null);
      localStorage.removeItem('zerodesk_token');
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('zerodesk_token', newToken);
    } else {
      localStorage.removeItem('zerodesk_token');
    }
    setTokenState(newToken); // triggers re-render → fetchUser
  };

  const logout = () => {
    localStorage.removeItem('zerodesk_token');
    setTokenState(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  const value = {
    user,
    setUser,
    loading,
    token,
    setToken,
    logout,
    fetchUser,
    updateUser,
    isAuthenticated: !!user,
    isOtpVerified: !!user?.isOtpVerified,
    hasOrganization: !!user?.currentOrganizationId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
