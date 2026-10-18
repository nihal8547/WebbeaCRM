import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  KeyRound, Plus, Edit, Trash2, Eye, EyeOff, Copy, Search,
  Globe, User, Lock, ChevronRight, Briefcase,
  CheckCircle, Clock, AlertCircle, CreditCard, FileText,
} from 'lucide-react';
import SlidePanel from '../components/SlidePanel';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: number; name: string; company?: string; email?: string; phone: string;
  status: string; notes?: string;
  works?: ClientWork[];
  payments?: Payment[];
  quotations?: Quotation[];
}

interface ClientWork {
  id: number; title: string; status: string; priority: string;
  startDate?: string; endDate?: string; completionPercent: number;
  assignedTo?: { id: number; name: string };
  works?: { id: number; title: string; status: string; workDate: string; hoursWorked?: number }[];
}

interface Payment {
  id: number; amount: number; status: string; method: string; createdAt: string;
}

interface Quotation {
  id: number; title: string; total: number; status: string; createdAt: string;
}

interface Credential {
  id: number; clientId: number; label: string; url?: string;
  username: string; password: string; notes?: string;
  client?: { id: number; name: string; company?: string };
}

const emptyForm = { clientId: '', label: '', url: '', username: '', password: '', notes: '' };

const workStatusColor: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Credentials() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailPanel, setDetailPanel] = useState(false);
  const [credPanel, setCredPanel] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'credentials' | 'works' | 'payments' | 'quotations'>('credentials');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const { data: clientDetail, isLoading: detailLoading } = useQuery<Client>({
    queryKey: ['client-detail', selectedClient?.id],
    queryFn: () => api.get(`/clients/${selectedClient!.id}`).then((r) => r.data),
    enabled: !!selectedClient,
  });

  const { data: credentials = [] } = useQuery<Credential[]>({
    queryKey: ['credentials', selectedClient?.id],
    queryFn: () => api.get(`/credentials?clientId=${selectedClient!.id}`).then((r) => r.data),
    enabled: !!selectedClient,
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      editingCred ? api.put(`/credentials/${editingCred.id}`, data) : api.post('/credentials', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials', selectedClient?.id] });
      toast.success(editingCred ? 'Credential updated' : 'Credential added');
      setCredPanel(false);
      setEditingCred(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/credentials/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials', selectedClient?.id] });
      toast.success('Credential deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openClient = (c: Client) => {
    setSelectedClient(c);
    setDetailPanel(true);
    setActiveTab('credentials');
    setRevealedIds(new Set());
  };

  const openAddCred = () => {
    setEditingCred(null);
    setForm({ ...emptyForm, clientId: String(selectedClient?.id || '') });
    setCredPanel(true);
  };

  const openEditCred = (c: Credential) => {
    setEditingCred(c);
    setForm({ clientId: String(c.clientId), label: c.label, url: c.url || '', username: c.username, password: c.password, notes: c.notes || '' });
    setCredPanel(true);
  };

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || c.phone.includes(q);
  });

  const works = clientDetail?.works || [];
  const payments = clientDetail?.payments || [];
  const quotations = clientDetail?.quotations || [];
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <KeyRound size={24} className="text-indigo-600" /> Client Credentials
          </h1>
          <p className="text-gray-500 text-sm">Securely store login credentials and view full client details</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search clients by name, company or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Client List */}
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
                <th className="table-header">Company</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Status</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openClient(c)}>
                  <td className="table-cell font-medium text-gray-900">{c.name}</td>
                  <td className="table-cell text-gray-500">{c.company || '—'}</td>
                  <td className="table-cell text-gray-500">{c.phone}</td>
                  <td className="table-cell">
                    <span className={`badge ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={(e) => { e.stopPropagation(); openClient(c); }}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Client Detail Panel */}
      <SlidePanel
        open={detailPanel}
        onClose={() => { setDetailPanel(false); setSelectedClient(null); }}
        title={selectedClient?.name || ''}
        subtitle={selectedClient?.company || selectedClient?.email || ''}
        width="max-w-3xl"
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 pt-4 gap-1 shrink-0">
            {([
              { key: 'credentials', label: 'Credentials', icon: KeyRound },
              { key: 'works', label: 'Works', icon: Briefcase },
              { key: 'payments', label: 'Payments', icon: CreditCard },
              { key: 'quotations', label: 'Quotations', icon: FileText },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${
                  activeTab === key
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} /> {label}
                {key === 'credentials' && credentials.length > 0 && (
                  <span className="ml-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{credentials.length}</span>
                )}
                {key === 'works' && works.length > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{works.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* ── CREDENTIALS TAB ── */}
            {activeTab === 'credentials' && (
              <>
                {isAdmin && (
                  <div className="flex justify-end">
                    <button onClick={openAddCred} className="btn-primary flex items-center gap-2 text-sm">
                      <Plus size={15} /> Add Credential
                    </button>
                  </div>
                )}
                {credentials.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <KeyRound size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>No credentials stored yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credentials.map((cred) => (
                      <div key={cred.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <KeyRound size={14} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{cred.label}</p>
                              {cred.url && (
                                <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                  <Globe size={10} /> {cred.url}
                                </a>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button onClick={() => openEditCred(cred)} className="text-blue-600 hover:text-blue-800"><Edit size={14} /></button>
                              <button onClick={() => del.mutate(cred.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {/* Username */}
                          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                              <User size={13} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-400 shrink-0">Username:</span>
                              <span className="font-mono truncate">{cred.username}</span>
                            </div>
                            <button onClick={() => copyToClipboard(cred.username, 'Username')} className="text-gray-400 hover:text-indigo-600 ml-2 shrink-0">
                              <Copy size={13} />
                            </button>
                          </div>
                          {/* Password */}
                          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                              <Lock size={13} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-400 shrink-0">Password:</span>
                              <span className="font-mono truncate">
                                {revealedIds.has(cred.id) ? cred.password : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                              <button onClick={() => toggleReveal(cred.id)} className="text-gray-400 hover:text-indigo-600">
                                {revealedIds.has(cred.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button onClick={() => copyToClipboard(cred.password, 'Password')} className="text-gray-400 hover:text-indigo-600">
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {cred.notes && <p className="text-xs text-gray-400 italic">{cred.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── WORKS TAB ── */}
            {activeTab === 'works' && (
              <>
                {detailLoading ? (
                  <div className="text-center py-10 text-gray-400">Loading...</div>
                ) : works.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Briefcase size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>No works found for this client</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {works.map((w) => (
                      <div key={w.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">{w.title}</p>
                            {w.assignedTo && (
                              <p className="text-xs text-gray-400 mt-0.5">Assigned: {w.assignedTo.name}</p>
                            )}
                          </div>
                          <span className={`badge shrink-0 ${workStatusColor[w.status] || 'bg-gray-100 text-gray-600'} capitalize`}>
                            {w.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{w.completionPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${w.completionPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          {w.startDate && <span>Start: {new Date(w.startDate).toLocaleDateString()}</span>}
                          {w.endDate && <span>Due: {new Date(w.endDate).toLocaleDateString()}</span>}
                        </div>

                        {/* Sub-works */}
                        {w.works && w.works.length > 0 && (
                          <div className="border-t border-gray-100 pt-2 space-y-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Logs</p>
                            {w.works.map((sw) => (
                              <div key={sw.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  {sw.status === 'completed' ? (
                                    <CheckCircle size={12} className="text-green-500" />
                                  ) : sw.status === 'in_progress' ? (
                                    <Clock size={12} className="text-blue-500" />
                                  ) : (
                                    <AlertCircle size={12} className="text-orange-400" />
                                  )}
                                  <span className="text-gray-700">{sw.title}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                  {sw.hoursWorked && <span>{sw.hoursWorked}h</span>}
                                  <span>{new Date(sw.workDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── PAYMENTS TAB ── */}
            {activeTab === 'payments' && (
              <>
                {payments.length > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">Total Received</span>
                    <span className="text-lg font-bold text-green-700">₹{totalPaid.toLocaleString()}</span>
                  </div>
                )}
                {payments.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <CreditCard size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>No payments found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">₹{p.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{p.method} · {new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`badge ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── QUOTATIONS TAB ── */}
            {activeTab === 'quotations' && (
              quotations.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No quotations found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quotations.map((q) => (
                    <div key={q.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.title}</p>
                        <p className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">₹{q.total?.toLocaleString()}</p>
                        <span className={`badge text-[10px] ${
                          q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{q.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </SlidePanel>

      {/* Add / Edit Credential Panel */}
      <SlidePanel
        open={credPanel}
        onClose={() => { setCredPanel(false); setEditingCred(null); }}
        title={editingCred ? 'Edit Credential' : 'Add Credential'}
        subtitle={selectedClient?.name}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
          <div>
            <label className="form-label">Label *</label>
            <input className="form-input" placeholder="e.g. Website Admin, Email, cPanel" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Website URL</label>
            <input className="form-input" placeholder="https://example.com" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Username / Email *</label>
            <input className="form-input" placeholder="username or email" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="off" />
          </div>
          <div>
            <label className="form-label">Password *</label>
            <input className="form-input" type="text" placeholder="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={3} placeholder="Any additional notes..."
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editingCred ? 'Update' : 'Save Credential'}
            </button>
            <button type="button" onClick={() => setCredPanel(false)} className="btn-secondary flex-1 py-2.5">
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
