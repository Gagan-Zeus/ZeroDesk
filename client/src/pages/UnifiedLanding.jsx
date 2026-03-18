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
import TiltedCard from '../components/TiltedCard';

const API_BASE = '/api';

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

const features = [
  { icon: '🏢', title: 'Multi-Organization Workspaces', desc: 'Create or join multiple organizations. Each workspace is fully isolated with its own tasks, members, and roles.' },
  { icon: '🔐', title: 'Bank-Grade Security', desc: 'OAuth 2.0 with Google & GitHub, email OTP verification, encrypted passwords, and JWT session tokens.' },
  { icon: '👥', title: 'Role-Based Access Control', desc: 'Owners manage the workspace and see everything. Members focus on their own tasks. Clear permissions, zero confusion.' },
  { icon: '📋', title: 'Task Management', desc: 'Create, assign, and track tasks with status workflows — To Do, In Progress, and Done — all scoped to your org.' },
  { icon: '🚀', title: 'Instant Onboarding', desc: 'Sign up in seconds. Create an organization or join one with an invite code. Start collaborating immediately.' },
  { icon: '🛡️', title: 'Data Isolation', desc: "Strict multi-tenant architecture ensures your organization's data is never visible to outsiders. Ever." },
];

export default function UnifiedLanding({ showAuth: initialShowAuth = false }) {
  const [showAuth, setShowAuth] = useState(initialShowAuth);
  const [isClosing, setIsClosing] = useState(false);
  const [step, setStep] = useState(STEPS.CHOOSE_METHOD);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [orgMode, setOrgMode] = useState('choose');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [githubData, setGithubData] = useState({});
  const [animating, setAnimating] = useState(false);

  const { setToken, fetchUser, isAuthenticated, hasOrganization } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    const dataFromUrl = searchParams.get('data');
    const stepFromUrl = searchParams.get('step');

    if (tokenFromUrl || dataFromUrl || stepFromUrl) {
      setShowAuth(true);
      setTimeout(() => {
        if (tokenFromUrl) {
          localStorage.setItem('zerodesk_token', tokenFromUrl);
          if (emailFromUrl) setEmail(decodeURIComponent(emailFromUrl));
          setStep(STEPS.OTP);
        } else if (dataFromUrl) {
          try {
            const parsed = JSON.parse(decodeURIComponent(dataFromUrl));
            setGithubData(parsed);
            setStep(STEPS.GITHUB_EMAIL);
          } catch {}
        } else if (stepFromUrl === 'org') {
          setStep(STEPS.ORGANIZATION);
        }
      }, 100);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const openAuth = () => {
    if (isAuthenticated && hasOrganization) {
      navigate('/dashboard');
      return;
    }
    setIsClosing(false);
    setShowAuth(true);
  };

  const closeAuth = () => {
    if (step !== STEPS.OTP && step !== STEPS.SET_PASSWORD && step !== STEPS.ORGANIZATION) {
      setIsClosing(true);
      setTimeout(() => {
        setShowAuth(false);
        setIsClosing(false);
        setStep(STEPS.CHOOSE_METHOD);
        resetForm();
      }, 500);
    }
  };

  const transitionTo = (newStep) => {
    setAnimating(true);
    setTimeout(() => { setStep(newStep); setAnimating(false); }, 150);
  };

  const resetForm = () => {
    setPassword(''); setConfirmPassword(''); setOtp(['', '', '', '', '', '']); setEmail(''); setName('');
  };

  const handleGoogle = () => { window.location.href = `${API_BASE}/auth/google`; };
  const handleGithub = () => { window.location.href = `${API_BASE}/auth/github`; };

  const handleEmailCheck = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await checkEmail(email);
      transitionTo(data.exists ? STEPS.PASSWORD_LOGIN : STEPS.PASSWORD_REGISTER);
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await login({ email, password });
      setToken(data.preAuthToken); setPassword(''); transitionTo(STEPS.OTP);
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await register({ name, email, password });
      setToken(data.preAuthToken); setPassword(''); setConfirmPassword(''); transitionTo(STEPS.OTP);
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleGithubEmail = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await githubCompleteEmail({ email, githubId: githubData.githubId, name: githubData.name, avatar: githubData.avatar });
      setToken(data.preAuthToken); transitionTo(STEPS.OTP);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp]; pasted.split('').forEach((char, i) => (newOtp[i] = char)); setOtp(newOtp);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) { toast.error('Enter the full 6-digit code'); return; }
    setLoading(true);
    try {
      const { data } = await verifyOtp(otpString);
      setToken(data.token); await fetchUser(); toast.success('Verified!');
      if (!data.user.hasPassword) transitionTo(STEPS.SET_PASSWORD);
      else if (data.user.currentOrganizationId) navigate('/dashboard');
      else transitionTo(STEPS.ORGANIZATION);
    } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); setOtp(['', '', '', '', '', '']); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    try { await resendOtp(); setResendCooldown(60); toast.success('OTP resent!'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try { await api.post('/auth/set-password', { password }); toast.success('Password set!'); await fetchUser(); transitionTo(STEPS.ORGANIZATION); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleSkipPassword = async () => { await fetchUser(); transitionTo(STEPS.ORGANIZATION); };

  const handleCreateOrg = async (e) => {
    e.preventDefault(); setLoading(true);
    try { const { data } = await createOrg(orgName, roleTitle || 'Owner'); toast.success(`Created "${data.organization.name}"!`); await fetchUser(); navigate('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleJoinOrg = async (e) => {
    e.preventDefault(); setLoading(true);
    try { const { data } = await joinOrg(orgCode, roleTitle); toast.success(`Joined "${data.organization.name}"!`); await fetchUser(); navigate('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.message || 'Invalid code'); }
    finally { setLoading(false); }
  };

  const renderAuthStep = () => {
    const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white";
    const btnClass = "w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-brand-600/20";

    switch (step) {
      case STEPS.CHOOSE_METHOD:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to ZeroDesk</h2>
              <p className="text-gray-500 mt-1 text-sm">Choose how you'd like to continue</p>
            </div>
            <div className="space-y-3">
              <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm">
                <GoogleIcon /> Continue with Google
              </button>
              <button onClick={handleGithub} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm">
                <GithubIcon /> Continue with GitHub
              </button>
            </div>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-400">or</span></div>
            </div>
            <button onClick={() => transitionTo(STEPS.EMAIL_INPUT)} className={btnClass}>Continue with Email</button>
          </>
        );
      case STEPS.EMAIL_INPUT:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Enter your email</h2>
              <p className="text-gray-500 mt-1 text-sm">We'll check if you have an account</p>
            </div>
            <form onSubmit={handleEmailCheck} className="space-y-4">
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={inputClass} />
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Checking...' : 'Continue'}</button>
            </form>
            <BackButton onClick={() => transitionTo(STEPS.CHOOSE_METHOD)} />
          </>
        );
      case STEPS.PASSWORD_LOGIN:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1 text-sm">{email}</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus className={inputClass} />
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Signing in...' : 'Sign In'}</button>
            </form>
            <BackButton onClick={() => { setPassword(''); transitionTo(STEPS.EMAIL_INPUT); }} />
          </>
        );
      case STEPS.PASSWORD_REGISTER:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
              <p className="text-gray-500 mt-1 text-sm">{email}</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-3">
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} />
              <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Creating...' : 'Create Account'}</button>
            </form>
            <BackButton onClick={() => { setPassword(''); setConfirmPassword(''); transitionTo(STEPS.EMAIL_INPUT); }} />
          </>
        );
      case STEPS.GITHUB_EMAIL:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Email Required</h2>
              <p className="text-gray-500 mt-1 text-sm">Your GitHub email is private</p>
            </div>
            <form onSubmit={handleGithubEmail} className="space-y-4">
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={inputClass} />
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Sending...' : 'Send Verification Code'}</button>
            </form>
          </>
        );
      case STEPS.OTP:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Verify email</h2>
              <p className="text-gray-500 mt-1 text-sm">Enter code sent to <strong>{email}</strong></p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} onPaste={i === 0 ? handleOtpPaste : undefined} className="w-12 h-12 text-center text-xl font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white" />
                ))}
              </div>
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Verifying...' : 'Verify'}</button>
            </form>
            <div className="text-center mt-4">
              <button onClick={handleResendOtp} disabled={resendCooldown > 0} className="text-sm text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </>
        );
      case STEPS.SET_PASSWORD:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Set a Password</h2>
              <p className="text-gray-500 mt-1 text-sm">So you can sign in with email too</p>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-3">
              <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
              <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Setting...' : 'Set Password'}</button>
            </form>
            <button onClick={handleSkipPassword} className="w-full text-sm text-gray-500 hover:text-brand-600 mt-4">Skip for now →</button>
          </>
        );
      case STEPS.ORGANIZATION:
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Organization</h2>
              <p className="text-gray-500 mt-1 text-sm">Create or join a workspace</p>
            </div>
            {orgMode === 'choose' && (
              <div className="space-y-3">
                <button onClick={() => setOrgMode('create')} className="w-full px-4 py-4 bg-white border-2 border-brand-500 rounded-xl hover:bg-brand-50 transition-all text-left shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div><div className="font-semibold text-brand-900">Create Organization</div><div className="text-xs text-gray-500">Start a new workspace</div></div>
                  </div>
                </button>
                <button onClick={() => setOrgMode('join')} className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all text-left shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div><div className="font-semibold text-gray-900">Join Organization</div><div className="text-xs text-gray-500">Enter an invite code</div></div>
                  </div>
                </button>
              </div>
            )}
            {orgMode === 'create' && (
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <input type="text" placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required maxLength={120} autoFocus className={inputClass} />
                <input type="text" placeholder="Your Role (e.g., CEO, Founder)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={inputClass} />
                <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Creating...' : 'Create Organization'}</button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}
            {orgMode === 'join' && (
              <form onSubmit={handleJoinOrg} className="space-y-4">
                <input type="text" placeholder="Enter Code (e.g., A1B2C3D4)" value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} required autoFocus className={`${inputClass} font-mono tracking-widest text-center uppercase`} />
                <input type="text" placeholder="Your Role (e.g., Developer, Designer)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required className={inputClass} />
                <button type="submit" disabled={loading} className={btnClass}>{loading ? 'Joining...' : 'Join Organization'}</button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-xl font-bold text-brand-900">ZeroDesk</span>
          </div>
          {/* Container with fixed width to prevent layout shift */}
          <div className="w-[260px] flex items-center justify-end">
            {!showAuth ? (
              <div className="flex items-center gap-3">
                <button onClick={openAuth} className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition">Sign In</button>
                <button onClick={openAuth} className="px-5 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition">Get Started Free</button>
              </div>
            ) : step === STEPS.CHOOSE_METHOD ? (
              <button onClick={closeAuth} className="text-sm text-gray-500 hover:text-gray-700 transition">← Back to Home</button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Auth Overlay - Solid white background with smooth transitions */}
      <div 
        className={`fixed inset-0 z-40 flex bg-white transition-all duration-500 ease-out ${
          showAuth && !isClosing ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Left side - Hero content */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative z-10 bg-gradient-to-br from-gray-50 to-white">
          <div 
            className={`max-w-lg transition-all duration-500 ease-out ${
              showAuth && !isClosing ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
            style={{ transitionDelay: showAuth && !isClosing ? '100ms' : '0ms' }}
          >
            <div className="inline-block px-4 py-1.5 bg-brand-50 text-brand-600 text-sm font-medium rounded-full mb-6">
              ✨ Task management, reimagined
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Organize work.<br />
              <span className="text-brand-600">Zero friction.</span>
            </h1>
            <p className="mt-6 text-gray-500 leading-relaxed text-lg">
              ZeroDesk is the secure, multi-organization task platform that lets your team create workspaces, manage tasks, and collaborate — with enterprise-grade security.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-100">🔒 OTP Verified Sessions</span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-100">🏢 Multi-Tenant Isolation</span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-100">⚡ Real-time Updates</span>
            </div>
          </div>
        </div>

        {/* Right side - Auth Card */}
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div 
            className={`transition-all duration-500 ease-out ${
              showAuth && !isClosing ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'
            }`}
            style={{ transitionDelay: showAuth && !isClosing ? '150ms' : '0ms' }}
          >
            <TiltedCard className="w-[500px] px-16 py-10 relative">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <span className="text-xl font-bold text-brand-900">ZeroDesk</span>
              </div>

              <div className={`w-full max-w-lg mx-auto transition-all duration-150 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                {renderAuthStep()}
              </div>
            </TiltedCard>
          </div>
        </div>
      </div>

      {/* Hero Section - Visible when auth is closed */}
      <section className={`max-w-6xl mx-auto px-6 pt-20 pb-16 text-center transition-all duration-500 ${showAuth ? 'opacity-0' : 'opacity-100'}`}>
        <div className="inline-block px-4 py-1.5 bg-brand-50 text-brand-600 text-sm font-medium rounded-full mb-6">
          ✨ Task management, reimagined for teams
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Organize work.<br />
          <span className="text-brand-600">Zero friction.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          ZeroDesk is the secure, multi-organization task platform that lets your team create workspaces, manage tasks, and collaborate — all with enterprise-grade authentication and strict data isolation.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button onClick={openAuth} className="px-8 py-3.5 bg-brand-600 text-white text-base font-semibold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-600/25">
            Start for Free →
          </button>
          <a href="#features" className="px-8 py-3.5 text-base font-semibold text-gray-700 border border-gray-200 rounded-xl hover:border-brand-300 hover:text-brand-600 transition">
            See Features
          </a>
        </div>
        <div className="mt-16 flex items-center justify-center gap-8 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">🔒 OTP Verified Sessions</span>
          <span className="flex items-center gap-1.5">🏢 Multi-Tenant Isolation</span>
          <span className="flex items-center gap-1.5">⚡ Real-time Updates</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`max-w-6xl mx-auto px-6 py-20 transition-all duration-500 ${showAuth ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Everything your team needs</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">Built from the ground up for security, collaboration, and simplicity.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-6 bg-white border border-gray-100 rounded-2xl hover:border-brand-200 hover:shadow-lg hover:shadow-brand-50 transition-all duration-300">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works Section */}
      <section className={`bg-gray-50 py-20 transition-all duration-500 ${showAuth ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Up and running in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up Securely', desc: 'Use Google, GitHub, or email. Verify with a one-time code sent to your inbox.' },
              { step: '02', title: 'Create or Join an Org', desc: 'Start a new workspace as Owner, or enter an invite code to join your team.' },
              { step: '03', title: 'Manage Tasks', desc: 'Create tasks, assign to members, track progress with status boards — all org-scoped.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-sm mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`max-w-6xl mx-auto px-6 py-20 text-center transition-all duration-500 ${showAuth ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-brand-900 rounded-3xl px-8 py-16">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get organized?</h2>
          <p className="text-brand-100 mb-8 max-w-md mx-auto">Join teams already using ZeroDesk to streamline their workflow with secure, isolated workspaces.</p>
          <button onClick={openAuth} className="px-8 py-3.5 bg-white text-brand-900 font-semibold rounded-xl hover:bg-brand-50 transition shadow-lg">Get Started Free →</button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t border-gray-100 py-8 transition-all duration-500 ${showAuth ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span>© 2026 ZeroDesk. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">Z</span>
            </div>
            <span className="font-medium text-gray-500">ZeroDesk</span>
          </div>
        </div>
      </footer>

      {/* Custom animations */}
      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes fadeOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }
        .animate-fade-in-left { animation: fadeInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-right { animation: fadeInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out-left { animation: fadeOutLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out-right { animation: fadeOutRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}

function BackButton({ onClick }) {
  return <button onClick={onClick} className="w-full text-sm text-gray-500 hover:text-brand-600 mt-4 flex items-center justify-center gap-1 transition-all">← Back</button>;
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
