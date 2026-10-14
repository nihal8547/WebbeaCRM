import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ title: '', type: 'daily', description: '', hoursWorked: '', status: 'submitted', reportDate: new Date().toISOString().split('T')[0] });

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/reports/${editing.id}`, data) : api.post('/reports', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', type: 'daily', description: '', hoursWorked: '', status: 'submitted', reportDate: new Date().toISOString().split('T')[0] });
    setModal(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r, reportDate: r.reportDate?.split('T')[0] || '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const filtered = reports.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.user?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || r.type === filterType;
    return matchSearch && matchType;
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
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No reports found</div> : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Report</th>
                  <th className="table-header">Employee</th>
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Report' : 'Submit Work Report'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
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
                <div className="col-span-2">
                  <label className="form-label">Work Description *</label>
                  <textarea className="form-input" rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the work done today..." />
                </div>
              </div>
              <div className="flex gap-3">
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
