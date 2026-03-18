import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkEmail, login, register } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function EmailAuthPage() {
  const [step, setStep] = useState('email'); // 'email' | 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await checkEmail(email);
      if (data.exists) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login({ email, password });
      setToken(data.preAuthToken);
      toast.success('OTP sent to your email');
      navigate('/auth/otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await register({ name, email, password });
      setToken(data.preAuthToken);
      toast.success('Account created! OTP sent to your email');
      navigate('/auth/otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-900">
            {step === 'email' && 'Enter your email'}
            {step === 'login' && 'Welcome back'}
            {step === 'register' && 'Create your account'}
          </h1>
          {step !== 'email' && (
            <p className="text-gray-500 mt-1 text-sm">{email}</p>
          )}
        </div>

        {/* Step: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step: Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Step: Register */}
        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <button
          onClick={() => {
            if (step === 'email') navigate('/login');
            else setStep('email');
          }}
          className="w-full text-sm text-gray-500 hover:text-brand-600 transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
