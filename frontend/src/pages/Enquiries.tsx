import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Phone, Calendar, Inbox, MessageSquare, TrendingUp, XCircle, LayoutList, Columns } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';

const statusColors: Record<string, string> = {
  new: 'bg-purple-100 text-purple-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-cyan-100 text-cyan-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const pipelineColumns = [
  { key: 'new', label: 'New', color: 'border-purple-300', headerBg: 'bg-purple-50', dot: 'bg-purple-500' },
  { key: 'contacted', label: 'Contacted', color: 'border-blue-300', headerBg: 'bg-blue-50', dot: 'bg-blue-500' },
  { key: 'qualified', label: 'Qualified', color: 'border-cyan-300', headerBg: 'bg-cyan-50', dot: 'bg-cyan-500' },
  { key: 'converted', label: 'Converted', color: 'border-green-300', headerBg: 'bg-green-50', dot: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'border-red-300', headerBg: 'bg-red-50', dot: 'bg-red-400' },
];

export default function Enquiries() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [panel, setPanel] = useState(false);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enquiries'] }); closePanel(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/enquiries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/enquiries/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', subject: '', status: 'new', priority: 'medium' }); setPanel(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ ...e, clientId: e.clientId || '', followUpDate: e.followUpDate?.split('T')[0] || '' });
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); };

  const newCount = enquiries.filter((e) => e.status === 'new').length;
  const contactedCount = enquiries.filter((e) => e.status === 'contacted').length;
  const convertedCount = enquiries.filter((e) => e.status === 'converted').length;
  const lostCount = enquiries.filter((e) => e.status === 'lost').length;

  const filtered = enquiries
    .filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search) || e.subject.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || e.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'followUp_asc': return (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999');
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-gray-500 text-sm">{enquiries.length} total enquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutList size={15} /> List
            </button>
            <button
              onClick={() => setView('pipeline')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'pipeline' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Columns size={15} /> Pipeline
            </button>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Enquiry
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4 cursor-pointer hover:border-purple-200" onClick={() => setFilterStatus(filterStatus === 'new' ? '' : 'new')}>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Inbox size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{newCount}</p>
            <p className="text-sm text-gray-500">New</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-blue-200" onClick={() => setFilterStatus(filterStatus === 'contacted' ? '' : 'contacted')}>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquare size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{contactedCount}</p>
            <p className="text-sm text-gray-500">Contacted</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'converted' ? '' : 'converted')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{convertedCount}</p>
            <p className="text-sm text-gray-500">Converted</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-red-200" onClick={() => setFilterStatus(filterStatus === 'lost' ? '' : 'lost')}>
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <XCircle size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{lostCount}</p>
            <p className="text-sm text-gray-500">Lost</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search enquiries..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {view === 'list' && (
          <>
            <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
            <select className="form-input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="followUp_asc">Follow-Up Date</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </>
        )}
      </div>

      {/* List View */}
      {view === 'list' && (
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
                      <td className="table-cell text-gray-500 text-sm capitalize">{e.source?.replace('_', ' ') || '-'}</td>
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
      )}

      {/* Pipeline View */}
      {view === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="flex gap-4 min-w-max">
              {pipelineColumns.map((col) => {
                const colEnquiries = filtered.filter((e) => e.status === col.key);
                return (
                  <div key={col.key} className={`w-64 flex flex-col rounded-xl border-2 ${col.color} bg-white`}>
                    <div className={`px-4 py-3 rounded-t-xl ${col.headerBg} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                        <span className="font-semibold text-gray-800 text-sm">{col.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{colEnquiries.length}</span>
                    </div>
                    <div className="flex-1 p-3 space-y-3 min-h-32">
                      {colEnquiries.length === 0 && (
                        <p className="text-center text-xs text-gray-300 py-6">No enquiries</p>
                      )}
                      {colEnquiries.map((e) => (
                        <div
                          key={e.id}
                          className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => openEdit(e)}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{e.name}</p>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); del.mutate(e.id); }}
                              className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-2">{e.subject}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Phone size={10} /> {e.phone}
                          </div>
                          {e.followUpDate && (
                            <div className="flex items-center gap-1 text-xs text-orange-500">
                              <Calendar size={10} />
                              {new Date(e.followUpDate).toLocaleDateString()}
                            </div>
                          )}
                          <div className="mt-2 pt-2 border-t border-gray-50">
                            <select
                              className="w-full text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 bg-gray-50 cursor-pointer"
                              value={e.status}
                              onClick={(ev) => ev.stopPropagation()}
                              onChange={(ev) => updateStatus.mutate({ id: e.id, status: ev.target.value })}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="converted">Converted</option>
                              <option value="lost">Lost</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SlidePanel
        open={panel}
        onClose={closePanel}
        title={editing ? 'Edit Enquiry' : 'New Enquiry'}
        subtitle={editing ? `Editing: ${editing.name}` : 'Add a new lead or enquiry'}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
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
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">{save.isPending ? 'Saving...' : editing ? 'Update Enquiry' : 'Add Enquiry'}</button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
