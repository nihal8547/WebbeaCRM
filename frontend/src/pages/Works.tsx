import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Clock, CheckCircle, Loader, Calendar, Link2 } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';
import { useAuth } from '../contexts/AuthContext';

interface Work {
  id: number;
  userId: number;
  taskId?: number;
  clientWorkId?: number;
  title: string;
  description?: string;
  workDate: string;
  hoursWorked?: number;
  status: string;
  createdAt: string;
  user?: { id: number; name: string };
  task?: { id: number; title: string; status: string };
  clientWork?: { id: number; title: string; client?: { id: number; name: string } };
}

const statusColors: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

export default function Works() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('workDate_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<Work | null>(null);
  const [form, setForm] = useState<any>({
    title: '', status: 'in_progress', workDate: new Date().toISOString().split('T')[0],
  });

  const { data: works = [], isLoading } = useQuery<Work[]>({
    queryKey: ['works'],
    queryFn: () => api.get('/works').then((r) => r.data),
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: clientWorks = [] } = useQuery<any[]>({
    queryKey: ['client-works'],
    queryFn: () => api.get('/client-works').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/works/${editing.id}`, data) : api.post('/works', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['works'] }); closePanel(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/works/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['works'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', status: 'in_progress', workDate: new Date().toISOString().split('T')[0] });
    setPanel(true);
  };
  const openEdit = (w: Work) => {
    setEditing(w);
    setForm({
      ...w,
      workDate: w.workDate?.split('T')[0] || '',
      taskId: w.taskId || '',
      clientWorkId: w.clientWorkId || '',
    });
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); };

  const totalHours = works.reduce((s, w) => s + (w.hoursWorked || 0), 0);
  const inProgressCount = works.filter((w) => w.status === 'in_progress').length;
  const completedCount = works.filter((w) => w.status === 'completed').length;
  const linkedCount = works.filter((w) => w.taskId || w.clientWorkId).length;

  const filtered = works
    .filter((w) => {
      const matchSearch = w.title.toLowerCase().includes(search.toLowerCase()) ||
        (w.task?.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.clientWork?.title || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || w.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'workDate_asc': return (a.workDate || '').localeCompare(b.workDate || '');
        case 'hours_desc': return (b.hoursWorked || 0) - (a.hoursWorked || 0);
        case 'title_asc': return a.title.localeCompare(b.title);
        default: return (b.workDate || '').localeCompare(a.workDate || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Works</h1>
          <p className="text-gray-500 text-sm">{works.length} total work entries</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Log Work
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Clock size={22} className="text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            <p className="text-sm text-gray-500">Total Hours</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Link2 size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{linkedCount}</p>
            <p className="text-sm text-gray-500">Linked to Task/Work</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search works..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
        <select className="form-input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="workDate_desc">Work Date (Recent)</option>
          <option value="workDate_asc">Work Date (Oldest)</option>
          <option value="hours_desc">Hours (Highest)</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No work entries found. Click "Log Work" to add one.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Work Title</th>
                {user?.role === 'admin' && <th className="table-header">Employee</th>}
                <th className="table-header">Linked To</th>
                <th className="table-header">Date</th>
                <th className="table-header">Hours</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{w.title}</p>
                    {w.description && <p className="text-xs text-gray-400 truncate max-w-56">{w.description}</p>}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="table-cell text-gray-600 text-sm">{w.user?.name || '-'}</td>
                  )}
                  <td className="table-cell">
                    {w.task ? (
                      <div className="flex items-center gap-1">
                        <span className="badge bg-indigo-100 text-indigo-700 flex items-center gap-1">
                          <Link2 size={10} /> Task: {w.task.title}
                        </span>
                      </div>
                    ) : w.clientWork ? (
                      <div className="flex items-center gap-1">
                        <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Link2 size={10} /> {w.clientWork.client?.name}: {w.clientWork.title}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar size={12} />
                      {new Date(w.workDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="table-cell">
                    {w.hoursWorked ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={12} /> {w.hoursWorked}h
                      </div>
                    ) : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[w.status] || 'bg-gray-100 text-gray-600'} capitalize`}>
                      {w.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(w)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                      <button onClick={() => del.mutate(w.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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
        title={editing ? 'Edit Work Entry' : 'Log Work'}
        subtitle={editing ? `Editing: ${editing.title}` : 'Record what you worked on today'}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
          <div>
            <label className="form-label">Work Title *</label>
            <input
              className="form-input"
              placeholder="What did you work on?"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Link to Task */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <Link2 size={14} /> Link to a Task
            </p>
            <select
              className="form-input"
              value={form.taskId || ''}
              onChange={(e) => setForm({ ...form, taskId: e.target.value, clientWorkId: e.target.value ? '' : form.clientWorkId })}
            >
              <option value="">— No Task —</option>
              {tasks.map((t: any) => (
                <option key={t.id} value={t.id}>
                  [{t.status.replace('_', ' ')}] {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Link to Client Work */}
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <Link2 size={14} /> Link to Client Work
            </p>
            <select
              className="form-input"
              value={form.clientWorkId || ''}
              onChange={(e) => setForm({ ...form, clientWorkId: e.target.value, taskId: e.target.value ? '' : form.taskId })}
            >
              <option value="">— No Client Work —</option>
              {clientWorks.map((cw: any) => (
                <option key={cw.id} value={cw.id}>
                  {cw.client?.name ? `${cw.client.name} – ` : ''}{cw.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Work Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.workDate || ''}
                onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Hours Worked</label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                className="form-input"
                placeholder="e.g. 3.5"
                value={form.hoursWorked || ''}
                onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status || 'in_progress'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Describe the work done..."
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editing ? 'Update Work' : 'Log Work'}
            </button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
