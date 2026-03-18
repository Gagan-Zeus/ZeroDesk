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

export default function ProfilePage() {
  const { user, fetchUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS.PROFILE);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  
  // Avatar state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Organization members state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

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
    setCrop({
      unit: 'px',
      width: size * 0.8,
      height: size * 0.8,
      x: x + size * 0.1,
      y: y + size * 0.1,
    });
  }, []);

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) {
      toast.error('Please select a crop area');
      return;
    }
    
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop, 'avatar.jpg');
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
    (o) => o.orgId?.toString() === user.currentOrganizationId?.toString()
  );

  const sidebarItemClass = (tab) =>
    `w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
      activeTab === tab
        ? 'bg-brand-50 text-brand-600 font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all';
  const btnClass = 'px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-50';

  return (
    <div 
      className={`fixed inset-0 bg-gray-50 z-50 transition-all duration-300 ease-out ${
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className={`min-h-screen flex transition-all duration-300 ease-out ${
          isVisible && !isExiting ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Left Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">Settings</h1>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <button className={sidebarItemClass(TABS.PROFILE)} onClick={() => setActiveTab(TABS.PROFILE)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
            <button className={sidebarItemClass(TABS.PASSWORD)} onClick={() => setActiveTab(TABS.PASSWORD)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Password
            </button>
            <button className={sidebarItemClass(TABS.ORGANIZATION)} onClick={() => setActiveTab(TABS.ORGANIZATION)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Organization
            </button>
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-8">
            {/* Profile Tab */}
            {activeTab === TABS.PROFILE && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
                  <p className="text-gray-500 mt-1">Manage your personal information</p>
                </div>

                {/* Avatar Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-brand-600 text-white flex items-center justify-center text-2xl font-bold border-4 border-gray-100">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                      >
                        Upload New Photo
                      </button>
                      <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>
                </div>

                {/* Name Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div className="pt-2">
                      <button onClick={handleSaveProfile} disabled={saving} className={btnClass}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auth Provider Info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Signed in with:</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 capitalize">
                      {user?.authProvider === 'google' && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      )}
                      {user?.authProvider === 'github' && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      )}
                      {user?.authProvider === 'email' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      )}
                      {user?.authProvider}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === TABS.PASSWORD && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Password</h2>
                  <p className="text-gray-500 mt-1">Update your password to keep your account secure</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  {user?.authProvider !== 'email' && !user?.hasPassword ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-2">You signed in with {user?.authProvider}</p>
                      <p className="text-sm text-gray-500">You can set a password to also sign in with email</p>
                    </div>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className={inputClass}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className={inputClass}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
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
                      <div className="pt-2">
                        <button type="submit" disabled={changingPassword} className={btnClass}>
                          {changingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === TABS.ORGANIZATION && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Organization</h2>
                  <p className="text-gray-500 mt-1">View organization details and team members</p>
                </div>

                {/* Org Info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h3>
                  {currentOrgData ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500">Organization Name</p>
                        <p className="font-medium text-gray-900 mt-1">{members[0]?.orgName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Your Role</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                            currentOrgData.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {currentOrgData.role}
                          </span>
                          {currentOrgData.roleTitle && (
                            <span className="text-sm text-gray-700">{currentOrgData.roleTitle}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Invite Code</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="font-mono text-brand-600 font-bold text-lg">{members[0]?.orgCode || 'N/A'}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(members[0]?.orgCode || '');
                              toast.success('Code copied!');
                            }}
                            className="text-xs text-brand-600 hover:text-brand-700 px-2 py-1 bg-brand-50 rounded-md"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Members</p>
                        <p className="font-medium text-gray-900 mt-1">{members.length}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No organization selected</p>
                  )}
                </div>

                {/* Members List */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
                  {loadingMembers ? (
                    <div className="text-center py-8 text-gray-500">Loading members...</div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No members found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {members.map((member) => (
                            <tr key={member._id} className="hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">
                                      {(member.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-900">{member.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-600">{member.email}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex px-2.5 py-1 text-xs rounded-full font-medium ${
                                  member.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {member.role}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-700">{member.roleTitle || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crop Image</h3>
            <div className="flex justify-center mb-4">
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
                onClick={() => { setShowCropModal(false); setImageSrc(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                disabled={saving}
                className={btnClass}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
