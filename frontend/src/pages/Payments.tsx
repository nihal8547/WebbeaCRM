import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, TrendingUp, Clock, CreditCard, AlertTriangle } from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function Payments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ amount: '', method: 'cash', status: 'pending' });

  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['quotations'],
    queryFn: () => api.get('/quotations').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/payments/${editing.id}`, data) : api.post('/payments', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/payments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ amount: '', method: 'cash', status: 'pending' }); setModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ ...p, clientId: p.clientId, quotationId: p.quotationId || '', paidDate: p.paidDate?.split('T')[0] || '', dueDate: p.dueDate?.split('T')[0] || '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);

  const filtered = payments
    .filter((p) => {
      const matchSearch =
        p.paymentNo.includes(search) ||
        (p.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || p.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'paidDate_desc': return (b.paidDate || '').localeCompare(a.paidDate || '');
        case 'paidDate_asc': return (a.paidDate || '9999').localeCompare(b.paidDate || '9999');
        case 'client_asc': return (a.client?.name || '').localeCompare(b.client?.name || '');
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm">{payments.length} total payments</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <CreditCard size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            <p className="text-sm text-gray-500">Total Records</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'paid' ? '' : 'paid')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">₹{totalPaid.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Collected</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-yellow-200" onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}>
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Clock size={22} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">₹{totalPending.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-red-200" onClick={() => setFilterStatus(filterStatus === 'overdue' ? '' : 'overdue')}>
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">₹{totalOverdue.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
        </select>
        <select className="form-input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="amount_desc">Amount (Highest)</option>
          <option value="amount_asc">Amount (Lowest)</option>
          <option value="paidDate_desc">Paid Date (Recent)</option>
          <option value="client_asc">Client A–Z</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No payments found</div> : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Payment No</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-blue-700 font-medium">{p.paymentNo}</td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">{p.client?.name}</p>
                      {p.quotation && <p className="text-xs text-gray-400">Ref: {p.quotation.quotationNo}</p>}
                    </td>
                    <td className="table-cell font-bold text-gray-900">₹{p.amount.toLocaleString()}</td>
                    <td className="table-cell capitalize text-gray-600">{p.method}</td>
                    <td className="table-cell text-gray-500 text-sm">
                      {p.paidDate ? new Date(p.paidDate).toLocaleDateString() :
                        p.dueDate ? `Due: ${new Date(p.dueDate).toLocaleDateString()}` : '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${statusColors[p.status] || 'bg-gray-100'}`}>{p.status}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                        <button onClick={() => del.mutate(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Payment' : 'Record Payment'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Client *</label>
                  <select className="form-input" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                    <option value="">Select Client</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" min="0" className="form-input" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Method</label>
                  <select className="form-input" value={form.method || 'cash'} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status || 'pending'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Link Quotation</label>
                  <select className="form-input" value={form.quotationId || ''} onChange={(e) => setForm({ ...form, quotationId: e.target.value })}>
                    <option value="">None</option>
                    {quotations.map((q: any) => <option key={q.id} value={q.id}>{q.quotationNo} - {q.subject}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Paid Date</label>
                  <input type="date" className="form-input" value={form.paidDate || ''} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Receipt Number</label>
                  <input className="form-input" value={form.receiptNumber || ''} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
