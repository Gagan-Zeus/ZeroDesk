import { useState, useEffect, useRef } from 'react';
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
  {
    title: 'Multi-organization workspaces',
    desc: 'Create or join isolated workspaces with their own members, tasks, and roles.',
  },
  {
    title: 'Secure auth flows',
    desc: 'Google, GitHub, email OTP, and password setup stay wired to your existing backend.',
  },
  {
    title: 'Production-ready onboarding',
    desc: 'From first sign in to org creation, every step is real, connected, and responsive.',
  },
];

export default function UnifiedLanding({ showAuth: initialShowAuth = false }) {
  const { setToken, fetchUser, isAuthenticated, hasOrganization } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const skipOtp = searchParams.get('skipOtp');
  const tokenFromUrl = searchParams.get('token');
  const isOAuthCallback = skipOtp === 'true' && tokenFromUrl;

  const [showAuth, setShowAuth] = useState(isOAuthCallback ? false : initialShowAuth);
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
  const [loading, setLoading] = useState(isOAuthCallback);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [githubData, setGithubData] = useState({});
  const [animating, setAnimating] = useState(false);
  const oauthProcessedRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    const dataFromUrl = searchParams.get('data');
    const stepFromUrl = searchParams.get('step');
    const skipOtpParam = searchParams.get('skipOtp');

    if (skipOtpParam === 'true' && token && !oauthProcessedRef.current) {
      oauthProcessedRef.current = true;
      (async () => {
        try {
          setLoading(true);
          setToken(token);
          const userData = await fetchUser();
          toast.success('Signed in successfully!');

          if (!userData?.currentOrganizationId) {
            window.history.replaceState({}, '', '/auth?step=org');
            setShowAuth(true);
            setStep(STEPS.ORGANIZATION);
          } else {
            navigate('/dashboard');
          }
        } catch {
          toast.error('Failed to authenticate');
          setShowAuth(true);
          setStep(STEPS.CHOOSE_METHOD);
          oauthProcessedRef.current = false;
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    if (token || dataFromUrl || stepFromUrl) {
      setShowAuth(true);
      setTimeout(() => {
        if (token && !skipOtpParam) {
          localStorage.setItem('zerodesk_token', token);
          if (emailFromUrl) setEmail(decodeURIComponent(emailFromUrl));
          setStep(STEPS.OTP);
        } else if (dataFromUrl) {
          try {
            const parsed = JSON.parse(decodeURIComponent(dataFromUrl));
            setGithubData(parsed);
            setStep(STEPS.GITHUB_EMAIL);
          } catch {
            // ignore bad payloads
          }
        } else if (stepFromUrl === 'org') {
          setStep(STEPS.ORGANIZATION);
        }
      }, 100);
    }
  }, [fetchUser, navigate, searchParams, setToken]);

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
    setShowAuth(true);
  };

  const closeAuth = () => {
    if (step === STEPS.OTP || step === STEPS.SET_PASSWORD || step === STEPS.ORGANIZATION) return;
    setShowAuth(false);
    setStep(STEPS.CHOOSE_METHOD);
    resetForm();
  };

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
    setEmail('');
    setName('');
    setOrgName('');
    setOrgCode('');
    setRoleTitle('');
    setOrgMode('choose');
  };

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
      setPassword('');
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
      setPassword('');
      setConfirmPassword('');
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
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
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
    pasted.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
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
      if (!data.user.hasPassword) transitionTo(STEPS.SET_PASSWORD);
      else if (data.user.currentOrganizationId) navigate('/dashboard');
      else transitionTo(STEPS.ORGANIZATION);
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
      const { data } = await createOrg(orgName, roleTitle || 'Owner');
      toast.success(`Created "${data.organization.name}"!`);
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
      const { data } = await joinOrg(orgCode, roleTitle);
      toast.success(`Joined "${data.organization.name}"!`);
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'zd-input';
  const labelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]';

  const authTab =
    step === STEPS.PASSWORD_REGISTER ? 'signup' :
    step === STEPS.PASSWORD_LOGIN || step === STEPS.EMAIL_INPUT || step === STEPS.CHOOSE_METHOD ? 'login' :
    null;

  const renderAuthStep = () => {
    switch (step) {
      case STEPS.CHOOSE_METHOD:
      case STEPS.EMAIL_INPUT:
      case STEPS.PASSWORD_LOGIN:
      case STEPS.PASSWORD_REGISTER:
        return (
          <>
            <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl bg-[#eef0ff] p-1">
              <button
                type="button"
                onClick={() => {
                  setStep(STEPS.PASSWORD_LOGIN);
                }}
                className={`rounded-2xl px-4 py-3 text-base font-semibold transition ${
                  authTab === 'login' ? 'bg-white text-[#003aa0] shadow-sm' : 'text-[#565c84] hover:text-[#131b2e]'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(STEPS.PASSWORD_REGISTER);
                }}
                className={`rounded-2xl px-4 py-3 text-base font-semibold transition ${
                  authTab === 'signup' ? 'bg-white text-[#003aa0] shadow-sm' : 'text-[#565c84] hover:text-[#131b2e]'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-8 space-y-3">
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#131b2e]">
                {authTab === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-sm leading-6 text-[#565c84]">
                {authTab === 'signup'
                  ? 'Set up your account and enter your workspace in a few steps.'
                  : 'Enter your credentials to access your workspace.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleGoogle} className="flex w-full items-center justify-center gap-3 rounded-[20px] border border-[#c5c5d4]/20 bg-white px-4 py-4 text-base font-semibold text-[#131b2e] shadow-[0px_12px_32px_rgba(19,27,46,0.04)] transition hover:bg-[#f7f8ff]">
                <GoogleIcon />
                <span className="pointer-events-none select-none">Google</span>
              </button>
              <button type="button" onClick={handleGithub} className="flex w-full items-center justify-center gap-3 rounded-[20px] border border-[#c5c5d4]/20 bg-white px-4 py-4 text-base font-semibold text-[#131b2e] shadow-[0px_12px_32px_rgba(19,27,46,0.04)] transition hover:bg-[#f7f8ff]">
                <GithubIcon />
                <span className="pointer-events-none select-none">GitHub</span>
              </button>
            </div>

            <div className="relative my-7 flex items-center">
              <div className="h-px flex-1 bg-[#e1e3f2]" />
              <span className="px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a8ea8]">Or continue with</span>
              <div className="h-px flex-1 bg-[#e1e3f2]" />
            </div>

            {authTab === 'signup' ? (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className={labelClass}>Work email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="name@company.com" />
                </div>
                <div>
                  <label className={labelClass}>Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Your full name" />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="Create password" />
                </div>
                <div>
                  <label className={labelClass}>Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} placeholder="Repeat password" />
                </div>
                <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            ) : (
              <form onSubmit={email ? handleLogin : handleEmailCheck} className="space-y-5">
                <div>
                  <label className={labelClass}>Work email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={inputClass} placeholder="name@company.com" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className={labelClass.replace('mb-2 block ', '')}>Password</label>
                    <button type="button" onClick={() => transitionTo(STEPS.EMAIL_INPUT)} className="text-sm font-semibold text-[#003aa0] transition hover:text-[#004fd2]">
                      {email ? 'Change email' : 'Forgot password?'}
                    </button>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!!email} className={inputClass} placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                  {loading ? (email ? 'Signing in...' : 'Checking...') : 'Enter Workspace'}
                </button>
              </form>
            )}
          </>
        );

      case STEPS.GITHUB_EMAIL:
        return (
          <>
            <StepHeader title="Email required" subtitle="Your GitHub email is private, so we need one to continue." />
            <form onSubmit={handleGithubEmail} className="space-y-5">
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={inputClass} placeholder="name@company.com" />
              </div>
              <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
            <BackButton onClick={() => setStep(STEPS.PASSWORD_LOGIN)} />
          </>
        );

      case STEPS.OTP:
        return (
          <>
            <StepHeader title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email}`} />
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="h-14 w-11 rounded-2xl border border-[#c5c5d4]/30 bg-white text-center text-xl font-semibold outline-none transition focus:border-[#003aa0] focus:ring-4 focus:ring-[#0053db]/10 sm:w-12"
                  />
                ))}
              </div>
              <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0} className="mt-5 w-full text-sm font-medium text-[#003aa0] transition hover:text-[#004fd2] disabled:text-[#757684]">
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </>
        );

      case STEPS.SET_PASSWORD:
        return (
          <>
            <StepHeader title="Set a password" subtitle="So you can also sign in with email next time." />
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="Create a password" />
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} placeholder="Repeat your password" />
              </div>
              <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                {loading ? 'Setting...' : 'Set Password'}
              </button>
            </form>
            <button type="button" onClick={handleSkipPassword} className="mt-5 w-full text-sm font-medium text-[#565c84] transition hover:text-[#131b2e]">
              Skip for now
            </button>
          </>
        );

      case STEPS.ORGANIZATION:
        return (
          <>
            <StepHeader title="Your organization" subtitle="Create a new workspace or join an existing one." />

            {orgMode === 'choose' && (
              <div className="space-y-3">
                <button type="button" onClick={() => setOrgMode('create')} className="w-full rounded-[20px] bg-white p-5 text-left shadow-[0px_12px_32px_rgba(19,27,46,0.04)] transition hover:-translate-y-0.5">
                  <p className="text-sm font-semibold text-[#131b2e]">Create organization</p>
                  <p className="mt-1 text-sm text-[#565c84]">Start a new workspace and invite your team.</p>
                </button>
                <button type="button" onClick={() => setOrgMode('join')} className="w-full rounded-[20px] bg-white p-5 text-left shadow-[0px_12px_32px_rgba(19,27,46,0.04)] transition hover:-translate-y-0.5">
                  <p className="text-sm font-semibold text-[#131b2e]">Join organization</p>
                  <p className="mt-1 text-sm text-[#565c84]">Use an invite code to enter an existing workspace.</p>
                </button>
              </div>
            )}

            {orgMode === 'create' && (
              <form onSubmit={handleCreateOrg} className="space-y-5">
                <div>
                  <label className={labelClass}>Organization name</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required maxLength={120} autoFocus className={inputClass} placeholder="Acme Studio" />
                </div>
                <div>
                  <label className={labelClass}>Your role title</label>
                  <input type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={inputClass} placeholder="Founder, Team Lead, Owner..." />
                </div>
                <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}

            {orgMode === 'join' && (
              <form onSubmit={handleJoinOrg} className="space-y-5">
                <div>
                  <label className={labelClass}>Organization code</label>
                  <input type="text" value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} required autoFocus className={`${inputClass} text-center font-mono uppercase tracking-[0.28em]`} placeholder="A1B2C3D4" />
                </div>
                <div>
                  <label className={labelClass}>Your role title</label>
                  <input type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={inputClass} placeholder="Designer, Developer, Operations..." />
                </div>
                <button type="submit" disabled={loading} className="zd-primary-btn w-full justify-center py-4 text-base">
                  {loading ? 'Joining...' : 'Join Organization'}
                </button>
                <BackButton onClick={() => setOrgMode('choose')} />
              </form>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="zd-shell min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-40 border-b border-[#c5c5d4]/20 bg-[#faf8ff]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003aa0] text-white shadow-[0px_12px_32px_rgba(0,58,160,0.18)]">
              <span className="text-sm font-bold">Z</span>
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-[#131b2e]">ZeroDesk</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#565c84]">Architectural workspace</div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {showAuth ? (
              <button type="button" onClick={closeAuth} className="zd-ghost-btn">
                Back to home
              </button>
            ) : (
              <>
                <button type="button" onClick={openAuth} className="zd-ghost-btn hidden sm:inline-flex">
                  Sign In
                </button>
                <button type="button" onClick={openAuth} className="zd-primary-btn px-4 py-2.5">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={`relative overflow-hidden transition-all duration-500 ${showAuth ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#dbe1ff] blur-3xl" />
            <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#ffdcc6]/40 blur-3xl" />
          </div>
          <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-16 px-6 py-16 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-[#e2e7ff] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003aa0]">
                Zero friction, real collaboration
              </div>
              <h1 className="mt-8 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.04em] text-[#131b2e] md:text-6xl xl:text-7xl">
                Organize work. <span className="text-[#003aa0]">Zero friction.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#565c84] md:text-xl">
                ZeroDesk is a secure, multi-organization task platform built for teams that want polished onboarding, clean permissions, and workflows that actually stay connected.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={openAuth} className="zd-primary-btn px-8 py-4 text-base">
                  Enter Workspace
                </button>
                <button type="button" onClick={openAuth} className="zd-secondary-btn px-8 py-4 text-base">
                  Try Auth Flow
                </button>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-[24px] bg-white p-5 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                    <p className="text-sm font-semibold text-[#131b2e]">{feature.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#565c84]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <div className="rounded-[32px] bg-white p-6 shadow-[0px_24px_60px_rgba(19,27,46,0.08)] md:p-8">
                <div className="rounded-[24px] bg-[#f2f3ff] p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#565c84]">Workspace preview</p>
                      <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-[#131b2e]">Meridian Ops</h3>
                    </div>
                    <span className="rounded-full bg-[#dbe1ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#003aa0]">
                      Live sync
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-[20px] bg-white p-4 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#131b2e]">Refactor auth experience</p>
                          <p className="mt-1 text-sm text-[#565c84]">Improve login, OTP, and organization onboarding stability.</p>
                        </div>
                        <span className="rounded-full bg-[#dbe1ff] px-2.5 py-1 text-[11px] font-semibold text-[#003aa0]">In Progress</span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[20px] bg-white p-4 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#565c84]">Members</p>
                        <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#131b2e]">12</p>
                        <p className="mt-1 text-sm text-[#565c84]">Across 3 active teams</p>
                      </div>
                      <div className="rounded-[20px] bg-[#003aa0] p-4 text-white shadow-[0px_20px_40px_rgba(0,58,160,0.2)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Security</p>
                        <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">OTP</p>
                        <p className="mt-1 text-sm text-white/80">Verified sessions enabled</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={`fixed inset-0 z-50 flex bg-[#faf8ff]/95 backdrop-blur-xl transition-all duration-300 ${showAuth ? 'visible opacity-100' : 'invisible opacity-0'}`}>
          <div className="hidden w-1/2 bg-[#f2f3ff] lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div className="space-y-6">
              <div className="inline-flex rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003aa0] shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                Secure workspace access
              </div>
              <div>
                <h2 className="max-w-xl text-5xl font-extrabold leading-[1.02] tracking-[-0.04em] text-[#131b2e]">
                  Built for serious teams, not static mockups.
                </h2>
                <p className="mt-5 max-w-lg text-lg leading-8 text-[#565c84]">
                  This auth shell is wired to your real ZeroDesk backend, so every step you take here actually works.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-[24px] bg-white p-5 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                  <p className="text-sm font-semibold text-[#131b2e]">{feature.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#565c84]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className={`w-full max-w-[560px] transition-all duration-150 ${animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
              <div className="rounded-[32px] border border-[#c5c5d4]/20 bg-[#f2f3ff] p-3 shadow-[0px_24px_60px_rgba(19,27,46,0.08)]">
                <div className="rounded-[28px] bg-white p-6 md:p-8">
                  {loading && isOAuthCallback ? (
                    <div className="py-24 text-center">
                      <p className="text-sm font-medium text-[#565c84]">Authenticating your workspace access...</p>
                    </div>
                  ) : (
                    renderAuthStep()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <div className="mb-8 space-y-2">
      <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#131b2e]">{title}</h2>
      <p className="text-sm leading-6 text-[#565c84]">{subtitle}</p>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mt-5 w-full text-sm font-medium text-[#565c84] transition hover:text-[#131b2e]">
      Back
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
