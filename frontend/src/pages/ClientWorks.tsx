import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Calendar, Clock, User, Briefcase, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';

interface ClientWork {
  id: number; clientId: number; title: string; description?: string;
  assignedToId?: number; status: string; priority: string;
  startDate?: string; endDate?: string; actualStart?: string; actualEnd?: string;
  durationDays?: number; completionPercent: number; notes?: string;
  createdAt?: string;
  client?: { id: number; name: string; phone: string; company?: string };
  assignedTo?: { id: number; name: string };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const defaultForm = { title: '', description: '', status: 'pending', priority: 'medium', completionPercent: 0 };

export default function ClientWorks() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<ClientWork | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: works = [], isLoading } = useQuery<ClientWork[]>({
    queryKey: ['client-works'],
    queryFn: () => api.get('/client-works').then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      editing ? api.put(`/client-works/${editing.id}`, data) : api.post('/client-works', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-works'] }); closePanel(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/client-works/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-works'] }),
  });

  const openAdd = () => { setEditing(null); setForm(defaultForm); setPanel(true); };
  const openEdit = (w: ClientWork) => {
    setEditing(w);
    setForm({
      ...w, clientId: w.clientId, assignedToId: w.assignedToId || '',
      startDate: w.startDate ? w.startDate.split('T')[0] : '',
      endDate: w.endDate ? w.endDate.split('T')[0] : '',
      actualStart: w.actualStart ? w.actualStart.split('T')[0] : '',
      actualEnd: w.actualEnd ? w.actualEnd.split('T')[0] : '',
    });
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); setForm(defaultForm); };

  const isOverdue = (w: ClientWork) =>
    w.endDate && new Date(w.endDate) < new Date() && !['completed', 'cancelled'].includes(w.status);

  const inProgressCount = works.filter((w) => w.status === 'in_progress').length;
  const completedCount = works.filter((w) => w.status === 'completed').length;
  const overdueCount = works.filter((w) => isOverdue(w)).length;

  const filtered = works
    .filter((w) => {
      const matchSearch = w.title.toLowerCase().includes(search.toLowerCase()) ||
        (w.client?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || w.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'client_asc': return (a.client?.name || '').localeCompare(b.client?.name || '');
        case 'endDate_asc': return (a.endDate || '9999').localeCompare(b.endDate || '9999');
        case 'progress_desc': return b.completionPercent - a.completionPercent;
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Works</h1>
          <p className="text-gray-500 text-sm">{works.length} total works</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Work
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Briefcase size={22} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{works.length}</p>
            <p className="text-sm text-gray-500">Total Works</p>
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

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search works..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-48" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="endDate_asc">Deadline (Soonest)</option>
          <option value="progress_desc">Progress (Highest)</option>
          <option value="client_asc">Client A–Z</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 p-8 text-center text-gray-400">Loading...</div>}
        {!isLoading && filtered.length === 0 && <div className="col-span-3 p-8 text-center text-gray-400">No works found</div>}
        {filtered.map((w) => (
          <div key={w.id} className={`card hover:shadow-md transition-shadow ${isOverdue(w) ? 'border-red-200' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{w.title}</h3>
                <p className="text-sm text-blue-600 font-medium">{w.client?.name}</p>
                {w.client?.company && <p className="text-xs text-gray-400">{w.client.company}</p>}
              </div>
              <div className="flex gap-1 ml-2">
                <button onClick={() => openEdit(w)} className="text-blue-600 hover:text-blue-800 p-1">
                  <Edit size={14} />
                </button>
                <button onClick={() => del.mutate(w.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {w.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{w.description}</p>}

            <div className="flex gap-2 mb-3 flex-wrap">
              <span className={`badge ${statusColors[w.status] || 'bg-gray-100 text-gray-600'}`}>{w.status.replace('_', ' ')}</span>
              <span className={`badge ${priorityColors[w.priority] || 'bg-gray-100 text-gray-600'}`}>{w.priority}</span>
              {isOverdue(w) && <span className="badge bg-red-100 text-red-700">Overdue</span>}
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{w.completionPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${w.completionPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-500">
              {(w.startDate || w.endDate) && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    {w.startDate ? new Date(w.startDate).toLocaleDateString() : '?'}
                    {' → '}
                    {w.endDate ? new Date(w.endDate).toLocaleDateString() : '?'}
                  </span>
                  {w.durationDays && <span className="text-blue-500">({w.durationDays}d)</span>}
                </div>
              )}
              {w.assignedTo && (
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{w.assignedTo.name}</span>
                </div>
              )}
              {w.actualStart && w.actualEnd && (
                <div className="flex items-center gap-1 text-green-600">
                  <Clock size={12} />
                  <span>
                    Actual: {new Date(w.actualStart).toLocaleDateString()} → {new Date(w.actualEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <SlidePanel
        open={panel}
        onClose={closePanel}
        title={editing ? 'Edit Work' : 'Add Client Work'}
        subtitle={editing ? `Editing: ${editing.title}` : 'Create a new client work entry'}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Client *</label>
            <select className="form-input" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Select Client</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status || 'pending'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
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
              <label className="form-label">Assigned To</label>
              <select className="form-input" value={form.assignedToId || ''} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Completion %</label>
              <input type="number" min="0" max="100" className="form-input" value={form.completionPercent || 0} onChange={(e) => setForm({ ...form, completionPercent: Number(e.target.value) })} />
            </div>
            <div>
              <label className="form-label">Planned Start</label>
              <input type="date" className="form-input" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Planned End</label>
              <input type="date" className="form-input" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Actual Start</label>
              <input type="date" className="form-input" value={form.actualStart || ''} onChange={(e) => setForm({ ...form, actualStart: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Actual End</label>
              <input type="date" className="form-input" value={form.actualEnd || ''} onChange={(e) => setForm({ ...form, actualEnd: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editing ? 'Update Work' : 'Add Work'}
            </button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
