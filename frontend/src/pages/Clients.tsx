import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Building2, Phone, Mail, Users, UserCheck, UserX } from 'lucide-react';

interface Client {
  id: number; name: string; email?: string; phone: string;
  company?: string; address?: string; gst?: string; status: string; notes?: string;
  createdAt?: string;
}

const defaultForm: Partial<Client> = { name: '', email: '', phone: '', company: '', address: '', gst: '', status: 'active', notes: '' };

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client>>(defaultForm);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Client>) =>
      editing ? api.put(`/clients/${editing.id}`, data) : api.post('/clients', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  const openAdd = () => { setEditing(null); setForm(defaultForm); setModal(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm(c); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(defaultForm); };

  const activeCount = clients.filter((c) => c.status === 'active').length;
  const inactiveCount = clients.filter((c) => c.status === 'inactive').length;

  const filtered = clients
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.company || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || c.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{clients.length} total clients</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            <p className="text-sm text-gray-500">Total Clients</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'active' ? '' : 'active')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <UserCheck size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-gray-300" onClick={() => setFilterStatus(filterStatus === 'inactive' ? '' : 'inactive')}>
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <UserX size={22} className="text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
            <p className="text-sm text-gray-500">Inactive</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by name, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="form-input w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No clients found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Client</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Company</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{c.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.gst && <p className="text-xs text-gray-400">GST: {c.gst}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone size={12} /> {c.phone}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail size={12} /> {c.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 size={14} className="text-gray-400" />
                      {c.company || '-'}
                    </div>
                    {c.address && <p className="text-xs text-gray-400 mt-0.5">{c.address}</p>}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => del.mutate(c.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Client' : 'Add Client'}</h2>
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
                <div>
                  <label className="form-label">Company</label>
                  <input className="form-input" value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">GST Number</label>
                  <input className="form-input" value={form.gst || ''} onChange={(e) => setForm({ ...form, gst: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">
                  {save.isPending ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
