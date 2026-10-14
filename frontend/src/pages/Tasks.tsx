import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Calendar, ListTodo, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';

interface Task {
  id: number; title: string; description?: string; type: string;
  status: string; priority: string; groupId?: number;
  assignedToId?: number; startDate?: string; dueDate?: string; completedAt?: string;
  createdAt?: string;
  assignedTo?: { id: number; name: string };
  createdBy?: { id: number; name: string };
  group?: { id: number; name: string };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function Tasks() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<any>({ title: '', type: 'daily', status: 'pending', priority: 'medium' });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ['task-groups'],
    queryFn: () => api.get('/task-groups').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/tasks/${editing.id}`, data) : api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ title: '', type: 'daily', status: 'pending', priority: 'medium' }); setPanel(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ ...t, groupId: t.groupId || '', assignedToId: t.assignedToId || '', startDate: t.startDate?.split('T')[0] || '', dueDate: t.dueDate?.split('T')[0] || '' });
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); };

  const isOverdue = (t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  const filtered = tasks
    .filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || t.type === filterType;
      const matchStatus = !filterStatus || t.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority': return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        case 'dueDate_asc': return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
        case 'dueDate_desc': return (b.dueDate || '').localeCompare(a.dueDate || '');
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm">{tasks.length} total tasks</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4 cursor-pointer hover:border-yellow-200" onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}>
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <ListTodo size={22} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-blue-200" onClick={() => setFilterStatus(filterStatus === 'in_progress' ? '' : 'in_progress')}>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Loader size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'completed' ? '' : 'completed')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertCircle size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-36" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="one_time">One Time</option>
        </select>
        <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-input w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="dueDate_asc">Due Date (Soonest)</option>
          <option value="dueDate_desc">Due Date (Latest)</option>
          <option value="priority">By Priority</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tasks found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Task</th>
                <th className="table-header">Type</th>
                <th className="table-header">Assigned To</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-400 truncate max-w-48">{t.description}</p>}
                      {t.group && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Group: {t.group.name}</span>}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge bg-indigo-100 text-indigo-700 capitalize">{t.type.replace('_', ' ')}</span>
                  </td>
                  <td className="table-cell text-gray-600">{t.assignedTo?.name || '-'}</td>
                  <td className="table-cell">
                    {t.dueDate ? (
                      <div className={`flex items-center gap-1 text-sm ${isOverdue(t) ? 'text-red-600' : 'text-gray-600'}`}>
                        <Calendar size={12} />
                        {new Date(t.dueDate).toLocaleDateString()}
                        {isOverdue(t) && <span className="badge bg-red-100 text-red-700 ml-1">Late</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="table-cell">
                    <select
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${statusColors[t.status] || 'bg-gray-100'}`}
                      value={t.status}
                      onChange={(e) => updateStatus.mutate({ id: t.id, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                      <button onClick={() => del.mutate(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SlidePanel
        open={panel}
        onClose={closePanel}
        title={editing ? 'Edit Task' : 'Add Task'}
        subtitle={editing ? `Editing: ${editing.title}` : 'Create a new task and assign it'}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Task title..." value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type || 'daily'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status || 'pending'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Task Group</label>
              <select className="form-input" value={form.groupId || ''} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">No Group</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Assign To</label>
              <select className="form-input" value={form.assignedToId || ''} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={4} placeholder="Task details..." value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">{save.isPending ? 'Saving...' : editing ? 'Update Task' : 'Add Task'}</button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
