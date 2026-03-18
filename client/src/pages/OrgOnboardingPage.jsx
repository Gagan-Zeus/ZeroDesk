import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrg, joinOrg, listOrgs, selectOrg } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OrgOnboardingPage() {
  const [mode, setMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchUser } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createOrg(orgName);
      toast.success(`Organization "${data.organization.name}" created! Code: ${data.organization.code}`);
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await joinOrg(orgCode);
      toast.success(`Joined "${data.organization.name}"!`);
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid organization code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-50 to-white">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <span className="text-xl font-bold text-brand-900">ZeroDesk</span>
            </div>
            <h1 className="text-2xl font-bold text-brand-900">Your Organization</h1>
            <p className="text-gray-500 mt-2 text-sm">Create a new workspace or join an existing one</p>
          </div>

          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full px-4 py-4 border-2 border-brand-500 rounded-xl hover:bg-brand-50 transition text-left"
              >
                <div className="font-semibold text-brand-900">Create Organization</div>
                <div className="text-sm text-gray-500 mt-1">Start a new workspace and invite your team</div>
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition text-left"
              >
                <div className="font-semibold text-gray-900">Join Organization</div>
                <div className="text-sm text-gray-500 mt-1">Enter an invite code to join an existing workspace</div>
              </button>
            </div>
          )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              maxLength={120}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-sm text-gray-500 hover:text-brand-600">
              ← Back
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Organization Code (e.g., A1B2C3D4)"
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none font-mono tracking-widest text-center uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Organization'}
            </button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-sm text-gray-500 hover:text-brand-600">
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>

    {/* Footer */}
    <footer className="border-t border-gray-100 bg-white py-6">
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
  </div>
  );
}
