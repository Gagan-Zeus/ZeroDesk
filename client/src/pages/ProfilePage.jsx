import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword, getOrgMembers } from '../services/authService';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import toast from 'react-hot-toast';

const TABS = {
  PROFILE: 'profile',
  PASSWORD: 'password',
  ORGANIZATION: 'organization',
};

function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      blob.name = fileName;
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

function GoogleIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234C5.662 21.302 4.967 19.16 4.967 19.16c-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.304.762-1.604-2.665-.304-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.52 11.52 0 0112 6.844c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.769.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.798 24 17.302 24 12 24 5.373 18.627 0 12 0z" />
    </svg>
  );
}

function MailIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

function ZeroDeskLogo({ className = 'h-10 w-10' }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#003aa0] to-[#004fd2] text-white shadow-[0px_12px_32px_rgba(0,58,160,0.18)] ${className}`}>
      <span className="font-headline text-sm font-extrabold tracking-tight">Z</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, fetchUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS.PROFILE);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    if (activeTab === TABS.ORGANIZATION) {
      fetchMembers();
    }
  }, [activeTab]);

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => navigate('/dashboard'), 300);
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data } = await getOrgMembers();
      setMembers(data.members || []);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      await fetchUser();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    try {
      await updateProfile({ avatar: null });
      await fetchUser();
      toast.success('Avatar removed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardProfileChanges = () => {
    setName(user?.name || '');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    const initialCrop = {
      unit: 'px',
      width: size * 0.8,
      height: size * 0.8,
      x: x + size * 0.1,
      y: y + size * 0.1,
    };
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }, []);

  const handleCropComplete = async () => {
    const activeCrop = completedCrop?.width && completedCrop?.height ? completedCrop : crop;

    if (!imgRef.current || !activeCrop?.width || !activeCrop?.height) {
      toast.error('Please select a crop area');
      return;
    }

    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, activeCrop, 'avatar.jpg');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        await updateProfile({ avatar: base64 });
        await fetchUser();
        toast.success('Avatar updated!');
        setShowCropModal(false);
        setImageSrc(null);
      };
      reader.readAsDataURL(croppedBlob);
    } catch (err) {
      toast.error('Failed to update avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must contain an uppercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password must contain a number');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currentOrgData = user?.organizations?.find(
    (o) => o.orgId?.toString() === user?.currentOrganizationId?.toString()
  );

  const providerLabel = !user?.authProvider || user.authProvider === 'local'
    ? 'Email'
    : user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1);

  const providerDescription =
    providerLabel === 'Google'
      ? 'Your account is linked to your enterprise Google Workspace.'
      : providerLabel === 'Github'
        ? 'Your account is linked to your enterprise GitHub workspace.'
        : 'Your account uses your email and password credentials.';

  const activeTabLabel =
    activeTab === TABS.PROFILE ? 'Profile' : activeTab === TABS.PASSWORD ? 'Password' : 'Organization';

  const sidebarItemClass = (tab) =>
    `flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 ${
      activeTab === tab
        ? 'rounded-l-xl bg-white text-[#003aa0] shadow-sm'
        : 'text-[#565c84] hover:text-[#003aa0]'
    }`;

  const inputClass = 'w-full rounded-xl border border-[#c5c5d4]/20 bg-white px-4 py-3 font-body text-[#131b2e] outline-none transition-all focus:border-[#003aa0] focus:ring-2 focus:ring-[#003aa0]/10';
  const sectionCardClass = 'overflow-hidden rounded-xl border border-[#c5c5d4]/10 bg-white shadow-[0px_12px_32px_rgba(19,27,46,0.04)]';
  const primaryBtnClass = 'rounded-xl bg-gradient-to-br from-[#003aa0] to-[#004fd2] px-8 py-3 font-bold text-white shadow-lg shadow-[#003aa0]/20 transition-all active:scale-95 disabled:opacity-50';

  return (
    <div
      className={`min-h-screen bg-[#faf8ff] transition-opacity duration-300 ease-out ${
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="min-h-screen"
      >
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col space-y-2 border-r border-[#c5c5d4]/10 bg-[#f2f3ff] p-4 md:flex">
          <div className="mb-4 px-4 py-6">
            <button
              onClick={handleBack}
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#565c84] transition hover:text-[#003aa0]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex items-center gap-3">
              <ZeroDeskLogo className="h-11 w-11" />
              <div>
                <h1 className="font-headline text-lg font-bold text-[#131b2e]">ZeroDesk</h1>
                <p className="text-xs text-[#565c84] opacity-70">Enterprise Settings</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <button className={sidebarItemClass(TABS.PROFILE)} onClick={() => setActiveTab(TABS.PROFILE)}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 1.79-8 4v1h16v-1c0-2.21-3.582-4-8-4z" />
              </svg>
              <span className="font-body text-sm font-medium">Profile</span>
            </button>
            <button className={sidebarItemClass(TABS.PASSWORD)} onClick={() => setActiveTab(TABS.PASSWORD)}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V8a4 4 0 118 0v3m-9 0h10a2 2 0 012 2v6H5v-6a2 2 0 012-2z" />
              </svg>
              <span className="font-body text-sm font-medium">Password</span>
            </button>
            <button className={sidebarItemClass(TABS.ORGANIZATION)} onClick={() => setActiveTab(TABS.ORGANIZATION)}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
              </svg>
              <span className="font-body text-sm font-medium">Organization</span>
            </button>
          </nav>

          <div className="mt-auto space-y-1 border-t border-[#c5c5d4]/10 pt-6">
            <button
              type="button"
              className="mb-4 w-full rounded-xl bg-gradient-to-br from-[#003aa0] to-[#004fd2] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95"
            >
              Invite Member
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-[#565c84] transition-colors duration-200 hover:text-[#003aa0]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 1.76-2 3.272-2 2.071 0 3.75 1.567 3.75 3.5 0 1.324-.788 2.476-1.953 3.078-.41.212-.797.612-.797 1.047V15m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-body text-sm font-medium">Support</span>
            </button>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 text-[#565c84] transition-colors duration-200 hover:text-[#003aa0]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
              </svg>
              <span className="font-body text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="min-h-screen flex flex-col md:pl-64">
          <header className="sticky top-0 z-40 flex items-center justify-between bg-[#faf8ff] px-8 py-4 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="rounded-full p-2 text-[#565c84] transition hover:bg-[#f2f3ff] md:hidden"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-headline text-base font-bold tracking-[-0.02em] text-[#003aa0]">{activeTabLabel}</h2>
            </div>

            <div className="flex items-center gap-6">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-10 w-10 rounded-full border-2 border-[#004fd2]/20 object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#004fd2]/20 bg-[#dbe1ff] text-sm font-bold text-[#003aa0]">
                  {initials}
                </div>
              )}
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
            {activeTab === TABS.PROFILE && (
              <div className="space-y-12 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="font-headline text-3xl font-extrabold tracking-tight text-[#131b2e]">Manage your personal information</h3>
                  <p className="max-w-xl font-body text-[#565c84]">
                    Updates your profile details and control how you are visible within the ZeroDesk enterprise ecosystem.
                  </p>
                </div>

                <section className="flex flex-col items-center gap-8 rounded-xl border border-[#c5c5d4]/10 bg-white p-8 shadow-[0px_12px_32px_rgba(19,27,46,0.04)] md:flex-row">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 z-10 rounded-full bg-[#003aa0] p-2 text-white shadow-lg transition-transform hover:scale-105"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 16.536A4 4 0 019.707 17.707L6 18l.293-3.707A4 4 0 017.464 11.464L9 13z" />
                      </svg>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-32 w-32 rounded-full object-cover ring-4 ring-[#004fd2]/5" />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#dbe1ff] text-3xl font-bold text-[#003aa0] ring-4 ring-[#004fd2]/5">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <h4 className="font-headline text-lg font-bold text-[#131b2e]">Profile Photo</h4>
                    <p className="text-sm text-[#565c84]">Recommended: 400x400px. JPG, PNG or WebP max 5MB.</p>
                    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-[#e2e7ff] px-5 py-2.5 text-sm font-semibold text-[#003aa0] transition-colors hover:bg-[#dae2fd]"
                      >
                        Upload New Photo
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={!user?.avatar || saving}
                        className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/20 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <div className="border-b border-[#c5c5d4]/10 bg-[#f2f3ff]/50 px-8 py-6">
                    <h4 className="font-headline text-lg font-bold text-[#131b2e]">Personal Information</h4>
                  </div>

                  <div className="space-y-6 p-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-[#565c84]">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={inputClass}
                          placeholder="Your name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-[#565c84]">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className={`${inputClass} cursor-not-allowed bg-[#f2f3ff] text-[#565c84]`}
                          />
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#565c84]/70">
                            <svg className="h-[14px] w-[14px]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-3a1 1 0 00-.894.553l-1 2A1 1 0 009 11h1v2a1 1 0 102 0V10a1 1 0 00-1-1h-.382l.276-.553A1 1 0 0010 7zm0 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <span>Email cannot be changed manually. Contact admin.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#c5c5d4]/10 pt-6">
                      <div className="flex items-start gap-4 rounded-xl bg-[#f2f3ff]/30 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-[#131b2e]">
                          {user?.authProvider === 'google' ? <GoogleIcon /> : user?.authProvider === 'github' ? <GithubIcon /> : <MailIcon className="w-5 h-5 text-[#003aa0]" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#131b2e]">Signed in with {providerLabel}</p>
                          <p className="text-xs text-[#565c84]">{providerDescription}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex items-center justify-end gap-4 py-6">
                  <button
                    type="button"
                    onClick={handleDiscardProfileChanges}
                    className="px-6 py-3 font-semibold text-[#565c84] transition-colors hover:text-[#131b2e]"
                  >
                    Discard Changes
                  </button>
                  <button type="button" onClick={handleSaveProfile} disabled={saving} className={primaryBtnClass}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === TABS.PASSWORD && (
              <div className="space-y-12 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="font-headline text-3xl font-extrabold tracking-tight text-[#131b2e]">Update your password</h3>
                  <p className="max-w-xl font-body text-[#565c84]">
                    Keep your workspace secure with a strong password and make sure your account stays protected.
                  </p>
                </div>

                <section className={sectionCardClass}>
                  <div className="border-b border-[#c5c5d4]/10 bg-[#f2f3ff]/50 px-8 py-6">
                    <h4 className="font-headline text-lg font-bold text-[#131b2e]">Password</h4>
                  </div>

                  <div className="p-8">
                    {user?.authProvider !== 'local' && !user?.hasPassword ? (
                      <div className="rounded-xl bg-[#f2f3ff]/30 p-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e2e7ff]">
                          <svg className="h-8 w-8 text-[#565c84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p className="mb-2 text-[#565c84]">You signed in with {providerLabel}</p>
                        <p className="text-sm text-[#565c84]">You can set a password to also sign in with email.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} className="max-w-xl space-y-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-widest text-[#565c84]">Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className={inputClass}
                            placeholder="Enter current password"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-widest text-[#565c84]">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            className={inputClass}
                            placeholder="Enter new password"
                          />
                          <p className="text-xs text-[#565c84]/70">Must be at least 8 characters with an uppercase letter and a number</p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-widest text-[#565c84]">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className={inputClass}
                            placeholder="Confirm new password"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button type="submit" disabled={changingPassword} className={primaryBtnClass}>
                            {changingPassword ? 'Changing...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === TABS.ORGANIZATION && (
              <div className="space-y-12 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="font-headline text-3xl font-extrabold tracking-tight text-[#131b2e]">Organization settings</h3>
                  <p className="max-w-xl font-body text-[#565c84]">
                    Review the organization you belong to, your role, and the rest of the team in this workspace.
                  </p>
                </div>

                <section className={sectionCardClass}>
                  <div className="border-b border-[#c5c5d4]/10 bg-[#f2f3ff]/50 px-8 py-6">
                    <h4 className="font-headline text-lg font-bold text-[#131b2e]">Organization Details</h4>
                  </div>

                  <div className="p-8">
                    {currentOrgData ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-[#565c84]">Organization Name</p>
                          <p className="mt-1 font-medium text-[#131b2e]">{members[0]?.orgName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#565c84]">Your Role</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              currentOrgData.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-[#f2f3ff] text-[#565c84]'
                            }`}>
                              {currentOrgData.role}
                            </span>
                            {currentOrgData.roleTitle && (
                              <span className="text-sm text-[#454652]">{currentOrgData.roleTitle}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-[#565c84]">Invite Code</p>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="font-mono text-lg font-bold text-[#003aa0]">{members[0]?.orgCode || 'N/A'}</code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(members[0]?.orgCode || '');
                                toast.success('Code copied!');
                              }}
                              className="rounded-md bg-[#dbe1ff] px-2 py-1 text-xs text-[#003aa0] transition hover:bg-[#b4c5ff]"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-[#565c84]">Total Members</p>
                          <p className="mt-1 font-medium text-[#131b2e]">{members.length}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#565c84]">No organization selected</p>
                    )}
                  </div>
                </section>

                <section className={sectionCardClass}>
                  <div className="border-b border-[#c5c5d4]/10 bg-[#f2f3ff]/50 px-8 py-6">
                    <h4 className="font-headline text-lg font-bold text-[#131b2e]">Team Members</h4>
                  </div>

                  <div className="p-8">
                    {loadingMembers ? (
                      <div className="py-8 text-center text-[#565c84]">Loading members...</div>
                    ) : members.length === 0 ? (
                      <div className="py-8 text-center text-[#565c84]">No members found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#c5c5d4]/10">
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#565c84]">Member</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#565c84]">Email</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#565c84]">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#565c84]">Role</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#c5c5d4]/10">
                            {members.map((member) => (
                              <tr key={member._id} className="transition hover:bg-[#f2f3ff]/30">
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbe1ff] text-xs font-bold text-[#003aa0]">
                                        {(member.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                                      </div>
                                    )}
                                    <span className="font-medium text-[#131b2e]">{member.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-[#565c84]">{member.email}</td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                    member.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-[#f2f3ff] text-[#565c84]'
                                  }`}>
                                    {member.role}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-[#454652]">{member.roleTitle || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          <footer className="mt-auto border-t border-[#c5c5d4]/20 bg-[#faf8ff] py-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-[#565c84]">© 2026 ZeroDesk. All rights reserved.</span>
              <div className="flex items-center gap-3 md:justify-end">
                <ZeroDeskLogo className="h-8 w-8 rounded-lg" />
                <span className="font-headline font-bold text-[#131b2e]">ZeroDesk</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {showCropModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Crop Image</h3>
            <div className="mb-4 flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  src={imageSrc}
                  onLoad={onImageLoad}
                  alt="Crop"
                  className="max-h-[400px]"
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc(null);
                }}
                className="rounded-lg px-4 py-2 text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                disabled={saving}
                className={primaryBtnClass}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .font-headline {
          font-family: 'Manrope', sans-serif;
        }

        .font-body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
