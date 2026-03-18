import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '🏢',
    title: 'Multi-Organization Workspaces',
    desc: 'Create or join multiple organizations. Each workspace is fully isolated with its own tasks, members, and roles.',
  },
  {
    icon: '🔐',
    title: 'Bank-Grade Security',
    desc: 'OAuth 2.0 with Google & GitHub, email OTP verification, encrypted passwords, and JWT session tokens.',
  },
  {
    icon: '👥',
    title: 'Role-Based Access Control',
    desc: 'Owners manage the workspace and see everything. Members focus on their own tasks. Clear permissions, zero confusion.',
  },
  {
    icon: '📋',
    title: 'Task Management',
    desc: 'Create, assign, and track tasks with status workflows — To Do, In Progress, and Done — all scoped to your org.',
  },
  {
    icon: '🚀',
    title: 'Instant Onboarding',
    desc: 'Sign up in seconds. Create an organization or join one with an invite code. Start collaborating immediately.',
  },
  {
    icon: '🛡️',
    title: 'Data Isolation',
    desc: 'Strict multi-tenant architecture ensures your organization\'s data is never visible to outsiders. Ever.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasOrganization } = useAuth();

  const handleAuthClick = () => {
    if (isAuthenticated && hasOrganization) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-xl font-bold text-brand-900">ZeroDesk</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAuthClick}
              className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition"
            >
              Sign In
            </button>
            <button
              onClick={handleAuthClick}
              className="px-5 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 bg-brand-50 text-brand-600 text-sm font-medium rounded-full mb-6">
          ✨ Task management, reimagined for teams
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Organize work.<br />
          <span className="text-brand-600">Zero friction.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          ZeroDesk is the secure, multi-organization task platform that lets your team
          create workspaces, manage tasks, and collaborate — all with enterprise-grade
          authentication and strict data isolation.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={handleAuthClick}
            className="px-8 py-3.5 bg-brand-600 text-white text-base font-semibold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-600/25"
          >
            Start for Free →
          </button>
          <a
            href="#features"
            className="px-8 py-3.5 text-base font-semibold text-gray-700 border border-gray-200 rounded-xl hover:border-brand-300 hover:text-brand-600 transition"
          >
            See Features
          </a>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex items-center justify-center gap-8 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">🔒 OTP Verified Sessions</span>
          <span className="flex items-center gap-1.5">🏢 Multi-Tenant Isolation</span>
          <span className="flex items-center gap-1.5">⚡ Real-time Updates</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Everything your team needs</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Built from the ground up for security, collaboration, and simplicity.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="group p-6 bg-white border border-gray-100 rounded-2xl hover:border-brand-200 hover:shadow-lg hover:shadow-brand-50 transition-all duration-300"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-brand-900 rounded-3xl px-8 py-16">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get organized?</h2>
          <p className="text-brand-100 mb-8 max-w-md mx-auto">
            Join teams already using ZeroDesk to streamline their workflow with secure, isolated workspaces.
          </p>
          <button
            onClick={handleAuthClick}
            className="px-8 py-3.5 bg-white text-brand-900 font-semibold rounded-xl hover:bg-brand-50 transition shadow-lg"
          >
            Get Started Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
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
