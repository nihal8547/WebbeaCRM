import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Phone, Calendar } from 'lucide-react';

const statusColors: Record<string, string> = {
  new: 'bg-purple-100 text-purple-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-cyan-100 text-cyan-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

export default function Enquiries() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', phone: '', subject: '', status: 'new', priority: 'medium' });

  const { data: enquiries = [], isLoading } = useQuery<any[]>({
    queryKey: ['enquiries'],
    queryFn: () => api.get('/enquiries').then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/enquiries/${editing.id}`, data) : api.post('/enquiries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enquiries'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/enquiries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/enquiries/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', subject: '', status: 'new', priority: 'medium' }); setModal(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ ...e, clientId: e.clientId || '', followUpDate: e.followUpDate?.split('T')[0] || '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const filtered = enquiries.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search) || e.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-gray-500 text-sm">{enquiries.length} total enquiries</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Enquiry
        </button>
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search enquiries..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No enquiries found</div> : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Enquiry</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Follow Up</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-48">{e.subject}</p>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone size={12} /> {e.phone}
                      </div>
                      {e.email && <p className="text-xs text-gray-400">{e.email}</p>}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">{e.source || '-'}</td>
                    <td className="table-cell">
                      {e.followUpDate ? (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <Calendar size={12} />
                          {new Date(e.followUpDate).toLocaleDateString()}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="table-cell">
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${statusColors[e.status] || 'bg-gray-100'}`}
                        value={e.status}
                        onChange={(ev) => updateStatus.mutate({ id: e.id, status: ev.target.value })}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                        <button onClick={() => del.mutate(e.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Enquiry' : 'New Enquiry'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Phone *</label>
                  <input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Subject *</label>
                  <input className="form-input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Source</label>
                  <select className="form-input" value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                    <option value="">Select Source</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="walk_in">Walk In</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status || 'new'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Follow Up Date</label>
                  <input type="date" className="form-input" value={form.followUpDate || ''} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Link to Client</label>
                  <select className="form-input" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">No Client</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
