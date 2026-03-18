import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getOrg } from '../services/authService';
import toast from 'react-hot-toast';

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const STATUS_COLORS = {
  TODO: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
};

function ProfileMenu({ user, org, onLogout, onSwitchOrg }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyCode = () => {
    if (org?.code) {
      navigator.clipboard.writeText(org.code);
      toast.success('Organization code copied!');
    }
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currentRole = user?.organizations?.find(
    (o) => o.orgId?.toString() === user.currentOrganizationId?.toString()
  )?.role;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 focus:outline-none"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-9 h-9 rounded-full border-2 border-brand-200" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
            {initials}
          </div>
        )}
        <svg className={`w-4 h-4 text-gray-500 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full font-medium uppercase">
              {user?.authProvider} account
            </span>
          </div>

          {/* Organization info */}
          {org && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5">Organization</p>
              <p className="font-semibold text-gray-900 text-sm">{org.name}</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Invite Code</p>
                  <p className="font-mono text-sm font-bold text-brand-600 tracking-widest">{org.code}</p>
                </div>
                <button
                  onClick={copyCode}
                  className="px-3 py-1.5 text-xs bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition font-medium"
                >
                  Copy Code
                </button>
              </div>
              {currentRole && (
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                  currentRole === 'OWNER' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {currentRole}
                </span>
              )}
              {org.members && (
                <p className="text-xs text-gray-400 mt-1">{org.members.length} member{org.members.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); onSwitchOrg(); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <span>🏢</span> Switch / Join Organization
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [org, setOrg] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    try {
      const { data } = await getTasks();
      setTasks(data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrg = async () => {
    if (!user?.currentOrganizationId) return;
    try {
      const { data } = await getOrg(user.currentOrganizationId);
      setOrg(data.organization);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchOrg();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createTask({ title, description });
      setTitle('');
      setDescription('');
      await fetchTasks();
      toast.success('Task created');
    } catch (err) {
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      await fetchTasks();
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-900">ZeroDesk</h1>
            {org && <p className="text-xs text-gray-500">{org.name}</p>}
          </div>
          <ProfileMenu
            user={user}
            org={org}
            onLogout={logout}
            onSwitchOrg={() => navigate('/onboarding/org')}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Create Task */}
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">New Task</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Task'}
            </button>
          </div>
        </form>

        {/* Task List */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No tasks yet</p>
            <p className="text-sm mt-1">Create your first task above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      by {task.createdBy?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="text-red-400 hover:text-red-600 text-sm p-1"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
