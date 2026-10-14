import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Clock, FileText, CheckCircle, Send, Link2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SlidePanel from '../components/SlidePanel';

export default function Reports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('reportDate_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ title: '', type: 'daily', description: '', hoursWorked: '', status: 'submitted', reportDate: new Date().toISOString().split('T')[0] });

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then((r) => r.data),
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: works = [] } = useQuery<any[]>({
    queryKey: ['works'],
    queryFn: () => api.get('/works').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/reports/${editing.id}`, data) : api.post('/reports', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); closePanel(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', type: 'daily', description: '', hoursWorked: '', status: 'submitted', reportDate: new Date().toISOString().split('T')[0] });
    setPanel(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r, reportDate: r.reportDate?.split('T')[0] || '', taskId: r.taskId || '', workId: r.workId || '' });
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); };

  const submittedCount = reports.filter((r) => r.status === 'submitted').length;
  const approvedCount = reports.filter((r) => r.status === 'approved').length;
  const totalHours = reports.reduce((s, r) => s + (r.hoursWorked || 0), 0);

  const filtered = reports
    .filter((r) => {
      const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.user?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || r.type === filterType;
      const matchStatus = !filterStatus || r.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'reportDate_asc': return (a.reportDate || '').localeCompare(b.reportDate || '');
        case 'createdAt_desc': return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'hours_desc': return (b.hoursWorked || 0) - (a.hoursWorked || 0);
        case 'employee_asc': return (a.user?.name || '').localeCompare(b.user?.name || '');
        default: return (b.reportDate || '').localeCompare(a.reportDate || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Reports</h1>
          <p className="text-gray-500 text-sm">{reports.length} total reports</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Submit Report
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            <p className="text-sm text-gray-500">Total Reports</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-blue-200" onClick={() => setFilterStatus(filterStatus === 'submitted' ? '' : 'submitted')}>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Send size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
            <p className="text-sm text-gray-500">Submitted</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'approved' ? '' : 'approved')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            <p className="text-sm text-gray-500">Approved</p>
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
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-36" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="form-input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="reportDate_desc">Report Date (Recent)</option>
          <option value="reportDate_asc">Report Date (Oldest)</option>
          <option value="hours_desc">Hours (Highest)</option>
          <option value="employee_asc">Employee A–Z</option>
          <option value="createdAt_desc">Submitted (Recent)</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No reports found</div> : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Report</th>
                  <th className="table-header">Employee</th>
                  <th className="table-header">Linked To</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Hours</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-48">{r.description}</p>
                    </td>
                    <td className="table-cell text-gray-700">{r.user?.name}</td>
                    <td className="table-cell">
                      {r.task ? (
                        <span className="badge bg-indigo-100 text-indigo-700 flex items-center gap-1 w-fit">
                          <Link2 size={10} /> {r.task.title}
                        </span>
                      ) : r.work ? (
                        <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1 w-fit">
                          <Link2 size={10} /> {r.work.title}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">{new Date(r.reportDate).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className="badge bg-indigo-100 text-indigo-700 capitalize">{r.type}</span>
                    </td>
                    <td className="table-cell">
                      {r.hoursWorked ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={12} /> {r.hoursWorked}h
                        </div>
                      ) : '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${r.status === 'submitted' ? 'bg-blue-100 text-blue-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {(user?.role === 'admin' || user?.id === r.userId) && (
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                        )}
                        {user?.role === 'admin' && (
                          <button onClick={() => del.mutate(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                        )}
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
        title={editing ? 'Edit Report' : 'Submit Work Report'}
        subtitle={editing ? `Editing: ${editing.title}` : 'Submit your work report for the day'}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Report title..." value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          {/* Attach Task */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <Link2 size={14} /> Attach a Task <span className="font-normal text-indigo-400">(optional)</span>
            </p>
            <select
              className="form-input"
              value={form.taskId || ''}
              onChange={(e) => setForm({ ...form, taskId: e.target.value, workId: e.target.value ? '' : form.workId })}
            >
              <option value="">— No Task —</option>
              {tasks.map((t: any) => (
                <option key={t.id} value={t.id}>[{t.status.replace('_', ' ')}] {t.title}</option>
              ))}
            </select>
          </div>

          {/* Attach Work */}
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <Link2 size={14} /> Attach a Work Entry <span className="font-normal text-purple-400">(optional)</span>
            </p>
            <select
              className="form-input"
              value={form.workId || ''}
              onChange={(e) => setForm({ ...form, workId: e.target.value, taskId: e.target.value ? '' : form.taskId })}
            >
              <option value="">— No Work Entry —</option>
              {works.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {new Date(w.workDate).toLocaleDateString()} – {w.title}
                  {w.hoursWorked ? ` (${w.hoursWorked}h)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Report Date *</label>
              <input type="date" className="form-input" value={form.reportDate || ''} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type || 'daily'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="form-label">Hours Worked</label>
              <input type="number" min="0" max="24" step="0.5" className="form-input" value={form.hoursWorked || ''} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} />
            </div>
            {user?.role === 'admin' && (
              <div>
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status || 'submitted'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Work Description *</label>
            <textarea className="form-input" rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the work done..." />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editing ? 'Update Report' : 'Submit Report'}
            </button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
