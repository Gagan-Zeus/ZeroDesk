import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/set-password', { password });
      toast.success('Password set successfully!');
      await fetchUser();
      if (user?.currentOrganizationId) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding/org');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user?.currentOrganizationId) {
      navigate('/dashboard');
    } else {
      navigate('/onboarding/org');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-900">Set a Password</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Create a password so you can also sign in with email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-gray-400">
            Password must be at least 8 characters with an uppercase letter and a number.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Setting password...' : 'Set Password'}
          </button>
        </form>

        <button
          onClick={handleSkip}
          className="w-full text-sm text-gray-500 hover:text-brand-600 transition"
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}
