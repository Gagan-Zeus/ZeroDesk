import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { githubCompleteEmail } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function GithubEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  let githubData = {};
  try {
    githubData = JSON.parse(decodeURIComponent(searchParams.get('data') || '{}'));
  } catch {
    // ignore parse errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await githubCompleteEmail({
        email,
        githubId: githubData.githubId,
        name: githubData.name,
        avatar: githubData.avatar,
      });
      setToken(data.preAuthToken);
      toast.success('OTP sent to your email');
      navigate(`/auth/otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-900">Email Required</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your GitHub email is private. Please provide an email address for verification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send Verification Code'}
          </button>
        </form>

        <button
          onClick={() => navigate('/login')}
          className="w-full text-sm text-gray-500 hover:text-brand-600 transition"
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}
