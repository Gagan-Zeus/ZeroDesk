import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  checkEmail,
  login,
  register,
  verifyOtp,
  resendOtp,
  githubCompleteEmail,
  createOrg,
  joinOrg,
} from '../services/authService';
import api from '../services/api';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Step definitions
const STEPS = {
  CHOOSE_METHOD: 'choose_method',
  EMAIL_INPUT: 'email_input',
  PASSWORD_LOGIN: 'password_login',
  PASSWORD_REGISTER: 'password_register',
  GITHUB_EMAIL: 'github_email',
  OTP: 'otp',
  SET_PASSWORD: 'set_password',
  ORGANIZATION: 'organization',
};

export default function AuthFlow() {
  const [step, setStep] = useState(STEPS.CHOOSE_METHOD);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgMode, setOrgMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [githubData, setGithubData] = useState({});
  const [animating, setAnimating] = useState(false);
  const [oauthProcessed, setOauthProcessed] = useState(false);

  const { setToken, fetchUser, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth callback params
  useEffect(() => {
    // Prevent re-processing when navigating to org setup
    if (oauthProcessed) {
      console.log('OAuth already processed, skipping');
      return;
    }

    const tokenFromUrl = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    const dataFromUrl = searchParams.get('data');
    const stepFromUrl = searchParams.get('step');
    const skipOtp = searchParams.get('skipOtp');

    // Debug logging
    console.log('OAuth Callback Debug:', { 
      tokenFromUrl: tokenFromUrl ? 'present' : 'null', 
      skipOtp, 
      skipOtpType: typeof skipOtp,
      emailFromUrl, 
      stepFromUrl,
      oauthProcessed 
    });

    // Check skipOtp first before token to catch OAuth flow
    if (skipOtp === 'true' && tokenFromUrl) {
      // OAuth login - skip OTP, directly authenticate
      console.log('✅ OAuth flow detected - skipping OTP');
      setOauthProcessed(true);
      
      (async () => {
        try {
          setLoading(true);
          console.log('Setting token...');
          setToken(tokenFromUrl);
          
          console.log('Fetching user data...');
          const userData = await fetchUser();
          console.log('User data fetched:', userData);
          
          toast.success('Signed in successfully!');
          
          // Check if user needs to set up organization
          if (!userData?.currentOrganizationId) {
            console.log('No organization - redirecting to org setup');
            // Clear URL params before navigating
            window.history.replaceState({}, '', '/auth?step=org');
            transitionTo(STEPS.ORGANIZATION);
          } else {
            console.log('Has organization - redirecting to dashboard');
            navigate('/dashboard');
          }
        } catch (err) {
          console.error('❌ OAuth auth failed:', err);
          toast.error('Failed to authenticate');
          setOauthProcessed(false);
          transitionTo(STEPS.CHOOSE_METHOD);
        } finally {
          setLoading(false);
        }
      })();
    } else if (tokenFromUrl && !skipOtp) {
      // Email/password login - show OTP screen
      console.log('📧 Email/password flow - showing OTP');
      localStorage.setItem('zerodesk_token', tokenFromUrl);
      if (emailFromUrl) setEmail(decodeURIComponent(emailFromUrl));
      transitionTo(STEPS.OTP);
    } else if (dataFromUrl) {
      console.log('GitHub email fallback');
      try {
        const parsed = JSON.parse(decodeURIComponent(dataFromUrl));
        setGithubData(parsed);
        transitionTo(STEPS.GITHUB_EMAIL);
      } catch {}
    } else if (stepFromUrl === 'org') {
      console.log('Organization step');
      transitionTo(STEPS.ORGANIZATION);
    }
  }, [searchParams, oauthProcessed]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const transitionTo = (newStep) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 150);
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '', '', '']);
  };

  // Handlers
  const handleGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleGithub = () => {
    window.location.href = `${API_BASE}/auth/github`;
  };

  const handleEmailCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await checkEmail(email);
      resetForm();
      transitionTo(data.exists ? STEPS.PASSWORD_LOGIN : STEPS.PASSWORD_REGISTER);
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
      resetForm();
      transitionTo(STEPS.OTP);
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
      resetForm();
      transitionTo(STEPS.OTP);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubEmail = async (e) => {
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
      transitionTo(STEPS.OTP);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => (newOtp[i] = char));
    setOtp(newOtp);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyOtp(otpString);
      setToken(data.token);
      await fetchUser();
      toast.success('Verified!');

      if (!data.user.hasPassword) {
        transitionTo(STEPS.SET_PASSWORD);
      } else if (data.user.currentOrganizationId) {
        navigate('/dashboard');
      } else {
        transitionTo(STEPS.ORGANIZATION);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp();
      setResendCooldown(60);
      toast.success('OTP resent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/set-password', { password });
      toast.success('Password set!');
      await fetchUser();
      transitionTo(STEPS.ORGANIZATION);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPassword = async () => {
    await fetchUser();
    transitionTo(STEPS.ORGANIZATION);
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createOrg(orgName);
      toast.success(`Created "${data.organization.name}"! Code: ${data.organization.code}`);
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await joinOrg(orgCode);
      toast.success(`Joined "${data.organization.name}"!`);
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  // Render panels
  const renderStep = () => {
    switch (step) {
      case STEPS.CHOOSE_METHOD:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome to ZeroDesk</h2>
              <p className="text-gray-500 mt-1">Choose how you'd like to continue</p>
            </div>
            <div className="space-y-3">
              <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium">
                <GoogleIcon /> Continue with Google
              </button>
              <button onClick={handleGithub} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium">
                <GithubIcon /> Continue with GitHub
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-400">or</span></div>
            </div>
            <button onClick={() => transitionTo(STEPS.EMAIL_INPUT)} className="w-full px-4 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium shadow-lg shadow-brand-600/20">
              Continue with Email
            </button>
          </div>
        );

      case STEPS.EMAIL_INPUT:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Enter your email</h2>
              <p className="text-gray-500 mt-1">We'll check if you have an account</p>
            </div>
            <form onSubmit={handleEmailCheck} className="space-y-4">
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
            <BackButton onClick={() => transitionTo(STEPS.CHOOSE_METHOD)} />
          </div>
        );

      case STEPS.PASSWORD_LOGIN:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1">{email}</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <BackButton onClick={() => { resetForm(); transitionTo(STEPS.EMAIL_INPUT); }} />
          </div>
        );

      case STEPS.PASSWORD_REGISTER:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-1">{email}</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
            <BackButton onClick={() => { resetForm(); transitionTo(STEPS.EMAIL_INPUT); }} />
          </div>
        );

      case STEPS.GITHUB_EMAIL:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Required</h2>
              <p className="text-gray-500 mt-1">Your GitHub email is private. Please provide one.</p>
            </div>
            <form onSubmit={handleGithubEmail} className="space-y-4">
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            </form>
            <BackButton onClick={() => transitionTo(STEPS.CHOOSE_METHOD)} />
          </div>
        );

      case STEPS.OTP:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
              <p className="text-gray-500 mt-1">Enter the 6-digit code sent to <strong>{email}</strong></p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} onPaste={i === 0 ? handleOtpPaste : undefined} className="w-12 h-14 text-center text-xl font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
                ))}
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            <div className="text-center">
              <button onClick={handleResendOtp} disabled={resendCooldown > 0} className="text-sm text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline transition-all">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        );

      case STEPS.SET_PASSWORD:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Set a Password</h2>
              <p className="text-gray-500 mt-1">So you can also sign in with email</p>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                {loading ? 'Setting...' : 'Set Password'}
              </button>
            </form>
            <button onClick={handleSkipPassword} className="w-full text-sm text-gray-500 hover:text-brand-600 transition-all">Skip for now →</button>
          </div>
        );

      case STEPS.ORGANIZATION:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Organization</h2>
              <p className="text-gray-500 mt-1">Create or join a workspace</p>
            </div>

            {orgMode === 'choose' && (
              <div className="space-y-3">
                <button onClick={() => setOrgMode('create')} className="w-full px-4 py-4 border-2 border-brand-500 rounded-xl hover:bg-brand-50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <div className="font-semibold text-brand-900">Create Organization</div>
                      <div className="text-sm text-gray-500">Start a new workspace</div>
                    </div>
                  </div>
                </button>
                <button onClick={() => setOrgMode('join')} className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-semibold text-gray-900">Join Organization</div>
                      <div className="text-sm text-gray-500">Enter an invite code</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {orgMode === 'create' && (
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <input type="text" placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required maxLength={120} autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}

            {orgMode === 'join' && (
              <form onSubmit={handleJoinOrg} className="space-y-4">
                <input type="text" placeholder="Organization Code (e.g., A1B2C3D4)" value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} required autoFocus className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none font-mono tracking-widest text-center uppercase transition-all" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20">
                  {loading ? 'Joining...' : 'Join Organization'}
                </button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="text-2xl font-bold text-white">ZeroDesk</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Organize work.<br />Zero friction.
          </h1>
          <p className="text-brand-100 text-lg max-w-md">
            The secure, multi-organization task platform for teams who value simplicity and security.
          </p>
          <div className="flex items-center gap-6 text-sm text-brand-200">
            <span className="flex items-center gap-2">🔒 OTP Verified</span>
            <span className="flex items-center gap-2">🏢 Multi-Tenant</span>
            <span className="flex items-center gap-2">⚡ Real-time</span>
          </div>
        </div>
        <div className="relative z-10 text-brand-200 text-sm">
          © 2026 ZeroDesk. All rights reserved.
        </div>
      </div>

      {/* Right Panel — Auth Flow */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-xl font-bold text-brand-900">ZeroDesk</span>
          </div>

          {/* Animated content */}
          <div className={`transition-all duration-150 ${animating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="w-full text-sm text-gray-500 hover:text-brand-600 transition-all flex items-center justify-center gap-1">
      <span>←</span> Back
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
