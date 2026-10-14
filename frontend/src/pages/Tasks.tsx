import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Calendar } from 'lucide-react';

interface Task {
  id: number; title: string; description?: string; type: string;
  status: string; priority: string; groupId?: number;
  assignedToId?: number; startDate?: string; dueDate?: string; completedAt?: string;
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

export default function Tasks() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
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

  const openAdd = () => { setEditing(null); setForm({ title: '', type: 'daily', status: 'pending', priority: 'medium' }); setModal(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ ...t, groupId: t.groupId || '', assignedToId: t.assignedToId || '', startDate: t.startDate?.split('T')[0] || '', dueDate: t.dueDate?.split('T')[0] || '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || t.type === filterType;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const isOverdue = (t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';

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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Task' : 'Add Task'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
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
                <div>
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
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
