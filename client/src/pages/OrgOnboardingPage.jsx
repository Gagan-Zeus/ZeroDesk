import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrg, joinOrg } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OrgOnboardingPage() {
  const [mode, setMode] = useState('choose');
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
    <div className="zd-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[#c5c5d4]/20 bg-[#faf8ff]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003aa0] text-white shadow-[0px_12px_32px_rgba(0,58,160,0.18)]">
              <span className="text-sm font-bold">Z</span>
            </div>
            <div>
              <p className="font-['Manrope'] text-lg font-extrabold tracking-tight text-[#131b2e]">ZeroDesk</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#565c84]">Workspace setup</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#565c84]">Step 02 of 04</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#e2e7ff]">
              <div className="h-full w-1/2 rounded-full bg-[#003aa0]" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 md:px-8 md:py-14">
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:gap-14">
          <section className="space-y-8 lg:col-span-5">
            <div className="space-y-4">
              <p className="inline-flex rounded-full bg-[#e2e7ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003aa0]">
                Organization onboarding
              </p>
              <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#131b2e] md:text-5xl">
                Let’s configure your <span className="text-[#003aa0]">workspace foundation</span>.
              </h1>
              <p className="max-w-lg text-base leading-7 text-[#565c84]">
                Create a fresh organization or join an existing one. Your projects, members, and dashboards will live inside this workspace.
              </p>
            </div>

            <div className="space-y-4">
              {[
                ['Dedicated domain', 'Reserve a secure home for your workspace and team identity.'],
                ['Scalable teams', 'Invite members later and manage growth without redoing setup.'],
                ['Secure by default', 'ZeroDesk keeps auth and organization flows aligned with your backend.'],
              ].map(([title, description]) => (
                <div key={title} className="flex items-start gap-4 rounded-[20px] bg-[#f2f3ff] px-5 py-4 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dbe1ff] text-[#003aa0]">
                    <span className="text-lg font-bold">•</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#131b2e]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#565c84]">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[24px] bg-[#f2f3ff] p-6 shadow-[0px_12px_32px_rgba(19,27,46,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#565c84]">Why this matters</p>
              <p className="mt-3 text-sm leading-7 text-[#454652]">
                A clean organization setup keeps your auth, members, and task ownership in sync from day one. No fake setup flow, just the real one with a better UI.
              </p>
            </div>
          </section>

          <section className="lg:col-span-7">
            <div className="zd-panel border border-[#c5c5d4]/20 p-6 md:p-8">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f2f3ff] p-1">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    mode === 'create' || mode === 'choose'
                      ? 'bg-white text-[#003aa0] shadow-sm'
                      : 'text-[#565c84] hover:text-[#131b2e]'
                  }`}
                >
                  Create New
                </button>
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    mode === 'join' ? 'bg-white text-[#003aa0] shadow-sm' : 'text-[#565c84] hover:text-[#131b2e]'
                  }`}
                >
                  Join Existing
                </button>
              </div>

              {(mode === 'choose' || mode === 'create') && (
                <form onSubmit={handleCreate} className="mt-8 space-y-6">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      maxLength={120}
                      className="zd-input"
                    />
                  </div>

                  <div className="rounded-[20px] bg-[#f2f3ff] p-4 text-sm text-[#565c84]">
                    After creation, ZeroDesk will automatically attach you to the new organization and send you straight to the dashboard.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button type="submit" disabled={loading} className="zd-primary-btn w-full sm:w-auto">
                      {loading ? 'Creating...' : 'Create Organization'}
                    </button>
                    {mode !== 'choose' && (
                      <button type="button" onClick={() => setMode('choose')} className="zd-ghost-btn w-full sm:w-auto">
                        Back
                      </button>
                    )}
                  </div>
                </form>
              )}

              {mode === 'join' && (
                <form onSubmit={handleJoin} className="mt-8 space-y-6">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">
                      Organization Code
                    </label>
                    <input
                      type="text"
                      placeholder="A1B2C3D4"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                      required
                      className="zd-input text-center font-mono uppercase tracking-[0.28em]"
                    />
                    <p className="mt-2 text-xs text-[#565c84]">Enter the invite code shared by your organization owner or admin.</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button type="submit" disabled={loading} className="zd-primary-btn w-full sm:w-auto">
                      {loading ? 'Joining...' : 'Join Organization'}
                    </button>
                    <button type="button" onClick={() => setMode('choose')} className="zd-ghost-btn w-full sm:w-auto">
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#c5c5d4]/20 bg-[#faf8ff] py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center text-sm text-[#565c84] md:flex-row md:px-8 md:text-left">
          <span>© 2026 ZeroDesk. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#003aa0] text-[10px] font-bold text-white">Z</div>
            <span className="font-medium text-[#454652]">ZeroDesk</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
