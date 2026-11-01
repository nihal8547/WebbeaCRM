import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  KeyRound, Plus, Edit, Trash2, Eye, EyeOff, Copy, Search,
  Globe, User, Lock, ChevronRight, Briefcase,
  CreditCard, FileText, RefreshCw,
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

export interface Credential {
  id: number;
  clientId: number;
  label: string;
  platform?: string;
  url?: string;
  username: string;
  password: string;
  status?: string;
  lastChecked?: string;
  avatarUrl?: string;
  notes?: string;
  client?: { id: number; name: string; company?: string };
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; defaultUrl: (u: string) => string }> = {
  instagram: {
    label: 'Instagram',
    icon: '📸',
    color: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white',
    defaultUrl: (u) => `https://instagram.com/${u.replace(/^@/, '')}`,
  },
  facebook: {
    label: 'Facebook',
    icon: '👥',
    color: 'bg-blue-600 text-white',
    defaultUrl: (u) => `https://facebook.com/${u}`,
  },
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    color: 'bg-sky-700 text-white',
    defaultUrl: (u) => `https://linkedin.com/company/${u}`,
  },
  tiktok: {
    label: 'TikTok',
    icon: '🎵',
    color: 'bg-neutral-900 text-cyan-400',
    defaultUrl: (u) => `https://tiktok.com/@${u.replace(/^@/, '')}`,
  },
  twitter: {
    label: 'X / Twitter',
    icon: '𝕏',
    color: 'bg-black text-white',
    defaultUrl: (u) => `https://x.com/${u.replace(/^@/, '')}`,
  },
  other: {
    label: 'Website / Other',
    icon: '🌐',
    color: 'bg-slate-700 text-white',
    defaultUrl: () => '',
  },
};

const emptyForm = {
  clientId: '',
  label: '',
  platform: 'instagram',
  url: '',
  username: '',
  password: '',
  notes: '',
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
  const [testingId, setTestingId] = useState<number | null>(null);
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
      toast.success(editingCred ? 'Account updated' : 'Account connected successfully');
      setCredPanel(false);
      setEditingCred(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save account'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/credentials/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials', selectedClient?.id] });
      toast.success('Account deleted');
    },
    onError: () => toast.error('Failed to delete account'),
  });

  const testConnection = async (id: number) => {
    try {
      setTestingId(id);
      const res = await api.post(`/credentials/${id}/test-connection`);
      toast.success(res.data.message || 'Connection verified and active!');
      qc.invalidateQueries({ queryKey: ['credentials', selectedClient?.id] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const openClient = (client: Client) => {
    setSelectedClient(client);
    setDetailPanel(true);
    setActiveTab('credentials');
  };

  const openAddCred = () => {
    setEditingCred(null);
    setForm({ ...emptyForm, clientId: String(selectedClient?.id || '') });
    setCredPanel(true);
  };

  const openEditCred = (c: Credential) => {
    setEditingCred(c);
    setForm({
      clientId: String(c.clientId),
      label: c.label,
      platform: c.platform || 'instagram',
      url: c.url || '',
      username: c.username,
      password: c.password,
      notes: c.notes || '',
    });
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
            <KeyRound size={24} className="text-indigo-600" /> Client Social Accounts & Credentials
          </h1>
          <p className="text-gray-500 text-sm">Securely store social media accounts (Instagram, Facebook, LinkedIn) and credentials per client</p>
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
                      View Accounts <ChevronRight size={14} />
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
          <div className="flex border-b border-gray-200 px-6 pt-3 gap-2 bg-gray-50">
            {(['credentials', 'works', 'payments', 'quotations'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-3 px-3 text-xs font-semibold capitalize border-b-2 transition-all ${
                  activeTab === key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {key === 'credentials' ? 'Social Accounts & Credentials' : key}
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      Manage multiple social accounts (Instagram, Facebook, LinkedIn) for this client
                    </span>
                    <button onClick={openAddCred} className="btn-primary flex items-center gap-2 text-sm shadow-xs">
                      <Plus size={15} /> Add Social Account
                    </button>
                  </div>
                )}
                {credentials.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 card border-dashed">
                    <KeyRound size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-700">No social accounts connected yet</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Connect client's Instagram, Facebook, or LinkedIn using Username and Password to enable Auto-Publishing.
                    </p>
                    {isAdmin && (
                      <button onClick={openAddCred} className="btn-primary text-xs mt-3 inline-flex items-center gap-1.5">
                        <Plus size={13} /> Connect First Account
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credentials.map((cred) => {
                      const pCfg = PLATFORM_CONFIG[cred.platform || 'instagram'] || PLATFORM_CONFIG.other;
                      return (
                        <div key={cred.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs hover:border-indigo-300 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xs ${pCfg.color}`}>
                                {pCfg.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 text-sm">{cred.label}</p>
                                  <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Connected
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-mono font-medium text-gray-600">
                                    @{cred.username.replace(/^@/, '')}
                                  </span>
                                  {cred.url && (
                                    <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                                      <Globe size={10} /> Profile
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => testConnection(cred.id)}
                                disabled={testingId === cred.id}
                                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                title="Test connection status"
                              >
                                <RefreshCw size={12} className={testingId === cred.id ? 'animate-spin text-indigo-600' : ''} />
                                {testingId === cred.id ? 'Testing...' : 'Verify'}
                              </button>
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEditCred(cred)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                                  <button onClick={() => { if (window.confirm('Delete this social account?')) del.mutate(cred.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* Username */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-2 text-xs text-gray-700 min-w-0">
                                <User size={13} className="text-gray-400 shrink-0" />
                                <span className="font-mono truncate">{cred.username}</span>
                              </div>
                              <button onClick={() => copyToClipboard(cred.username, 'Username')} className="text-gray-400 hover:text-indigo-600 ml-2 shrink-0" title="Copy username">
                                <Copy size={13} />
                              </button>
                            </div>

                            {/* Password */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-2 text-xs text-gray-700 min-w-0">
                                <Lock size={13} className="text-gray-400 shrink-0" />
                                <span className="font-mono truncate">
                                  {revealedIds.has(cred.id) ? cred.password : '••••••••••••'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <button onClick={() => toggleReveal(cred.id)} className="text-gray-400 hover:text-indigo-600" title={revealedIds.has(cred.id) ? 'Hide' : 'Reveal'}>
                                  {revealedIds.has(cred.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button onClick={() => copyToClipboard(cred.password, 'Password')} className="text-gray-400 hover:text-indigo-600" title="Copy password">
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {cred.notes && <p className="text-[11px] text-gray-500 italic mt-1">Note: {cred.notes}</p>}
                        </div>
                      );
                    })}
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
                          <span className={`badge ${w.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {w.status}
                          </span>
                        </div>
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
        title={editingCred ? 'Edit Social Account' : 'Connect Social Media Account'}
        subtitle={selectedClient?.name}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
          {/* Platform Selector */}
          <div>
            <label className="form-label font-bold text-gray-900">Select Platform *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {Object.entries(PLATFORM_CONFIG).map(([pKey, pVal]) => {
                const isSelected = form.platform === pKey;
                return (
                  <button
                    type="button"
                    key={pKey}
                    onClick={() => {
                      const updated = { ...form, platform: pKey };
                      if (!form.label || form.label.includes('Instagram') || form.label.includes('Facebook')) {
                        updated.label = `${pVal.label} - @${(form.username || 'username').replace(/^@/, '')}`;
                      }
                      if (form.username && pVal.defaultUrl) {
                        updated.url = pVal.defaultUrl(form.username);
                      }
                      setForm(updated);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <span className="text-lg">{pVal.icon}</span>
                    <span className="text-[11px] truncate">{pVal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="form-label font-semibold text-gray-900">Account Label / Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Doha Branch IG, Official FB Page"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="form-label font-semibold text-gray-900">Username / Handle *</label>
            <div className="relative">
              <input
                className="form-input"
                placeholder="e.g. @webbeaqatar or official_page"
                value={form.username}
                onChange={(e) => {
                  const val = e.target.value;
                  const pCfg = PLATFORM_CONFIG[form.platform] || PLATFORM_CONFIG.instagram;
                  setForm({
                    ...form,
                    username: val,
                    url: pCfg.defaultUrl ? pCfg.defaultUrl(val) : form.url,
                  });
                }}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="form-label font-semibold text-gray-900">Password *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Account password (encrypted with AES-256)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="off"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Passwords are military-grade AES-256 encrypted and stored safely.
            </p>
          </div>

          <div>
            <label className="form-label">Profile / Page URL</label>
            <input
              className="form-input"
              placeholder="https://instagram.com/webbeaqatar"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Any 2FA backup codes, manager notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Connecting...' : editingCred ? 'Update Account' : 'Verify & Connect Account'}
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
