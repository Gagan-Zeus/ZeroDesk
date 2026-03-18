import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getOrg, getOrgMembers, updateMemberRole } from '../services/authService';
import toast from 'react-hot-toast';

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const STATUS_COLORS = {
  TODO: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createTask({ 
        title, 
        description, 
        assignedTo: assignedTo || null 
      });
      setTitle('');
      setDescription('');
      setAssignedTo('');
      await fetchTasks();
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      await fetchTasks();
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRole(memberId, newRole);
      await fetchMembers();
      toast.success(`Member role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
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
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-900">ZeroDesk</h1>
            {org && <p className="text-xs text-gray-500">{org.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isOwner ? 'bg-amber-100 text-amber-700' : 
              isAdmin ? 'bg-purple-100 text-purple-700' : 
              'bg-gray-100 text-gray-600'
            }`}>
              {currentUserRole}
            </span>
            {/* Profile Icon */}
            <button
              onClick={() => navigate('/profile')}
              className="focus:outline-none hover:opacity-80 transition hover:scale-105"
              title="Profile Settings"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-brand-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
                  {initials(user?.name)}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 140px)' }}>
          {/* Left Pane - Members (1/3) */}
          <aside className="w-1/3 bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Members
              <span className="ml-auto text-sm font-normal text-gray-500">{members.length}</span>
            </h2>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {members.length === 0 ? (
              <p className="text-gray-500 text-sm">No members found</p>
            ) : (
              <div className="space-y-3">
                {members
                  .filter(member => 
                    member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    member.email?.toLowerCase().includes(memberSearch.toLowerCase())
                  )
                  .map((member) => {
                    const taskCount = getTaskCountForMember(member._id);
                    const isSelf = member._id === user?._id;
                    const isMemberOwner = member.role === 'OWNER';
                  
                    return (
                      <div 
                        key={member._id} 
                        className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold">
                            {initials(member.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {member.name} {isSelf && <span className="text-gray-400">(You)</span>}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.roleTitle || member.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Task Count Badge */}
                          <div className="flex items-center gap-1.5 bg-brand-50 px-2.5 py-1 rounded-full">
                            <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-xs font-semibold text-brand-600">{taskCount}</span>
                          </div>
                          {/* Role Badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            member.role === 'OWNER' ? 'bg-amber-100 text-amber-700' : 
                            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      
                      {/* Promote/Demote controls (visible only to OWNER, not for self or other owners) */}
                      {isOwner && !isSelf && !isMemberOwner && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Role:</span>
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            )}
          </aside>

          {/* Right Pane - Tasks (2/3) */}
          <main className="flex-1 space-y-6">
            {/* Task Creation Form - Only visible to OWNER and ADMIN */}
            {canCreateTasks && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Task
                </h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Title</label>
                    <input
                      type="text"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                      placeholder="Enter task description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">Select a team member</option>
                      {members.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} {member.roleTitle ? `(${member.roleTitle})` : `(${member.role})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-medium disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Task'}
                  </button>
                </form>
              </div>
            )}

            {/* Task List */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
                      ? 'bg-brand-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {filterMyTasks ? 'Show All' : 'My Tasks Only'}
                </button>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 py-12">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg">No tasks yet</p>
                  <p className="text-sm mt-1">
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
                        className={`p-4 rounded-xl border transition ${
                          isAssignedToMe 
                            ? 'border-brand-200 bg-brand-50/30' 
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900">{task.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                              {isAssignedToMe && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
                                  Assigned to you
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Created by {task.createdBy?.name || 'Unknown'}
                              </span>
                              {task.assignedTo && (
                                <span className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
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
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
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
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
    </div>
  );
}
