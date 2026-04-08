import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getOrg, getOrgMembers, updateMemberRole } from '../services/authService';
import InlineAlert from '../components/InlineAlert';

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const STATUS_COLORS = {
  TODO: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-[#dbe1ff] text-[#003aa0]',
  DONE: 'bg-emerald-100 text-emerald-700',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [org, setOrg] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [alert, setAlert] = useState(null);
  const clearAlert = () => setAlert(null);

  // Get current user's role in org
  const currentUserRole = user?.organizations?.find(
    (o) => o.orgId?.toString() === user?.currentOrganizationId?.toString()
  )?.role;

  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';
  const canCreateTasks = isOwner || isAdmin;

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const navigateWithTransition = (path) => {
    setIsVisible(false);
    setTimeout(() => navigate(path), 200);
  };

  const initials = (name) =>
    (name || 'U')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const fetchTasks = async () => {
    try {
      const { data } = await getTasks();
      setTasks(data.tasks);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load tasks' });
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

  const fetchMembers = async () => {
    try {
      const { data } = await getOrgMembers();
      setMembers(data.members || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchOrg();
    fetchMembers();
  }, []);

  // Calculate task counts per member
  const getTaskCountForMember = (memberId) => {
    return tasks.filter((task) => task.assignedTo?._id === memberId).length;
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    clearAlert();
    setCreating(true);
    try {
      await createTask({ 
        title, 
        description, 
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
      });
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDueDate('');
      await fetchTasks();
      setAlert({ type: 'success', message: 'Task created' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to create task' });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    clearAlert();
    try {
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update task' });
    }
  };

  const handleDelete = async (taskId) => {
    clearAlert();
    try {
      await deleteTask(taskId);
      await fetchTasks();
      setAlert({ type: 'success', message: 'Task deleted' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete task' });
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    clearAlert();
    try {
      await updateMemberRole(memberId, newRole);
      await fetchMembers();
      setAlert({ type: 'success', message: `Member role updated to ${newRole}` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update role' });
    }
  };

  // Check if current user can change status of a task
  const canChangeStatus = (task) => {
    return task.assignedTo?._id === user?._id;
  };

  // Check if current user can delete a task (OWNER only, and task must be DONE)
  const canDelete = (task) => {
    return isOwner && task.status === 'DONE';
  };

  return (
    <div className={`zd-shell flex min-h-screen flex-col transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="border-b border-[#c5c5d4]/20 bg-[#faf8ff]/90 px-6 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between">
          <button
            onClick={() => navigateWithTransition('/')}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003aa0] text-white shadow-[0px_12px_32px_rgba(0,58,160,0.18)]">
              <span className="text-sm font-bold">Z</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-[#131b2e]">ZeroDesk</h1>
              {org && <p className="text-[11px] uppercase tracking-[0.18em] text-[#565c84]">{org.name}</p>}
            </div>
          </button>
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isOwner ? 'bg-amber-100 text-amber-700' : 
              isAdmin ? 'bg-[#e2e7ff] text-[#003aa0]' : 
              'bg-[#eaedff] text-[#565c84]'
            }`}>
              {currentUserRole}
            </span>
            {/* Profile Icon */}
            <button
              onClick={() => navigate('/profile')}
              className="rounded-full p-0.5 transition hover:opacity-80 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#0053db]/10"
              title="Profile Settings"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-11 w-11 rounded-full border-2 border-[#dbe1ff] object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#003aa0] text-sm font-bold text-white">
                  {initials(user?.name)}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout 1:2 ratio */}
      <div className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-8">
        <InlineAlert alert={alert} onDismiss={clearAlert} className="mb-6" />
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left Pane - Members (1/3) */}
          <aside className="zd-subtle-panel self-start p-5">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#131b2e]">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Members
              <span className="ml-auto text-sm font-normal text-gray-500">{members.length}</span>
            </h2>
            
            {/* Search Input */}
            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#757684]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="zd-input pl-11 pr-10"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757684] transition hover:text-[#131b2e]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {(() => {
              const filteredMembers = members.filter(member => 
                member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                member.email?.toLowerCase().includes(memberSearch.toLowerCase())
              );
              
              if (members.length === 0) {
                return <p className="text-gray-500 text-sm py-8 text-center">No members found</p>;
              }
              
              if (filteredMembers.length === 0) {
                return (
                  <div className="text-center py-8 overflow-hidden">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500 text-sm">No members found</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2">
                  {filteredMembers.map((member) => {
                    const taskCount = getTaskCountForMember(member._id);
                    const isSelf = member._id === user?._id;
                    const isMemberOwner = member.role === 'OWNER';
                  
                    return (
                      <div 
                        key={member._id} 
                        className="rounded-[20px] bg-white p-4 shadow-[0px_12px_32px_rgba(19,27,46,0.04)] transition hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe1ff] text-sm font-bold text-[#003aa0]">
                              {initials(member.name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-[#131b2e]">
                              {member.name} {isSelf && <span className="text-gray-400">(You)</span>}
                            </p>
                            <p className="truncate text-xs text-[#565c84]">{member.roleTitle || member.role}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 rounded-full bg-[#dbe1ff] px-2.5 py-1">
                              <svg className="h-3 w-3 text-[#003aa0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="text-xs font-semibold text-[#003aa0]">{taskCount}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              member.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 
                              member.role === 'ADMIN' ? 'bg-[#e2e7ff] text-[#003aa0]' : 
                              'bg-[#eaedff] text-[#565c84]'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                        
                        {/* Promote/Demote controls (visible only to OWNER, not for self or other owners) */}
                        {isOwner && !isSelf && !isMemberOwner && (
                          <div className="mt-3 border-t border-[#c5c5d4]/20 pt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#565c84]">Role:</span>
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member._id, e.target.value)}
                                className="rounded-xl border border-[#c5c5d4]/30 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#0053db]/10"
                              >
                                <option value="MEMBER">Member</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </aside>

          {/* Right Pane - Tasks (2/3) */}
          <main className="min-w-0 space-y-6">
            {/* Task Creation Form - Only visible to OWNER and ADMIN */}
            {canCreateTasks && (
              <div className="zd-panel border border-[#c5c5d4]/20 p-6">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#131b2e]">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Task
                </h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">Task Title</label>
                    <input
                      type="text"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="zd-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">Description</label>
                    <textarea
                      placeholder="Enter task description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="zd-textarea resize-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">Assign To</label>
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="zd-select"
                      >
                        <option value="">Select a team member</option>
                        {members.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name} {member.roleTitle ? `(${member.roleTitle})` : `(${member.role})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-[#565c84]">Last date to complete</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="zd-input"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="zd-primary-btn"
                  >
                    {creating ? 'Creating...' : 'Create Task'}
                  </button>
                </form>
              </div>
            )}

            {/* Task List */}
            <div className="zd-panel border border-[#c5c5d4]/20 p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-[#131b2e]">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {filterMyTasks ? 'My Tasks' : 'All Tasks'}
                  <span className="text-sm font-normal text-gray-500">
                    {filterMyTasks 
                      ? tasks.filter(t => t.assignedTo?._id === user?._id).length 
                      : tasks.length} tasks
                  </span>
                </h2>
                <button
                  onClick={() => setFilterMyTasks(!filterMyTasks)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    filterMyTasks 
                      ? 'bg-[#003aa0] text-white shadow-[0px_12px_32px_rgba(0,58,160,0.18)]' 
                      : 'bg-[#e2e7ff] text-[#565c84] hover:bg-[#dae2fd]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {filterMyTasks ? 'Show All' : 'My Tasks Only'}
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-[#565c84]">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="py-12 text-center text-[#565c84]">
                  <svg className="mx-auto mb-3 h-12 w-12 text-[#c5c5d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-bold text-[#131b2e]">No tasks yet</p>
                  <p className="mt-1 text-sm text-[#565c84]">
                    {canCreateTasks ? 'Create your first task above' : 'Tasks will appear here when assigned to you'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(filterMyTasks 
                    ? tasks.filter(t => t.assignedTo?._id === user?._id) 
                    : tasks
                  ).map((task) => {
                    const canChangeThisStatus = canChangeStatus(task);
                    const canDeleteThis = canDelete(task);
                    const isAssignedToMe = task.assignedTo?._id === user?._id;
                    
                    return (
                      <div 
                        key={task._id} 
                        className={`rounded-[20px] border p-4 transition ${
                          isAssignedToMe 
                            ? 'border-[#b4c5ff] bg-[#eef2ff]' 
                            : 'border-white bg-white hover:border-[#dbe1ff]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[#131b2e]">{task.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                              {isAssignedToMe && (
                                <span className="rounded-full bg-[#dbe1ff] px-2.5 py-1 text-[11px] font-semibold text-[#003aa0]">
                                  Assigned to you
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-[#565c84]">{task.description}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#565c84]">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Created by {task.createdBy?.name || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                                </svg>
                                Created at {formatDateTime(task.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Last date {formatDate(task.dueDate)}
                              </span>
                              {task.assignedTo && (
                                <span className="flex items-center gap-1.5 rounded-full bg-[#dbe1ff] px-2.5 py-1 font-semibold text-[#003aa0]">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  {task.assignedTo.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status dropdown - only visible to assigned user */}
                            {canChangeThisStatus && (
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                className="rounded-xl border border-[#c5c5d4]/30 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0053db]/10"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            )}
                            {/* Delete button - only visible to OWNER and only when task is DONE */}
                            {canDeleteThis && (
                              <button
                                onClick={() => handleDelete(task._id)}
                                className="rounded-xl p-2 text-[#757684] transition hover:bg-red-50 hover:text-red-600"
                                title="Delete task"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#c5c5d4]/20 bg-[#faf8ff] py-8">
        <div className="mx-auto flex max-w-[1800px] flex-col items-center justify-between gap-4 px-6 text-center text-sm text-[#565c84] md:flex-row md:text-left">
          <span>© 2026 ZeroDesk. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#003aa0] text-white">
              <span className="text-[10px] font-bold">Z</span>
            </div>
            <span className="font-medium text-[#454652]">ZeroDesk</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
