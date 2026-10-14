import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, PlusCircle, MinusCircle, FileText, Send, CheckCircle, XCircle } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const emptyItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

export default function Quotations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ subject: '', status: 'draft', discount: 0, tax: 0 });
  const [items, setItems] = useState<any[]>([{ ...emptyItem }]);

  const { data: quotations = [], isLoading } = useQuery<any[]>({
    queryKey: ['quotations'],
    queryFn: () => api.get('/quotations').then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/quotations/${editing.id}`, data) : api.post('/quotations', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); closePanel(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/quotations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ subject: '', status: 'draft', discount: 0, tax: 0 });
    setItems([{ ...emptyItem }]);
    setPanel(true);
  };
  const openEdit = (q: any) => {
    setEditing(q);
    setForm({ ...q, clientId: q.clientId, validUntil: q.validUntil?.split('T')[0] || '' });
    setItems(q.items?.map((i: any) => ({ ...i })) || [{ ...emptyItem }]);
    setPanel(true);
  };
  const closePanel = () => { setPanel(false); setEditing(null); };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      updated[idx].total = Number(updated[idx].quantity) * Number(updated[idx].unitPrice);
    }
    setItems(updated);
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const discountAmt = subtotal * (Number(form.discount) || 0) / 100;
  const taxAmt = subtotal * (Number(form.tax) || 0) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const draftCount = quotations.filter((q) => q.status === 'draft').length;
  const sentCount = quotations.filter((q) => q.status === 'sent').length;
  const acceptedCount = quotations.filter((q) => q.status === 'accepted').length;
  const totalValue = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);

  const filtered = quotations
    .filter((q) => {
      const matchSearch =
        q.quotationNo.includes(search) ||
        q.subject.toLowerCase().includes(search.toLowerCase()) ||
        (q.client?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || q.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount_desc': return b.totalAmount - a.totalAmount;
        case 'amount_asc': return a.totalAmount - b.totalAmount;
        case 'client_asc': return (a.client?.name || '').localeCompare(b.client?.name || '');
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-500 text-sm">{quotations.length} total quotations</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Quotation
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-gray-300" onClick={() => setFilterStatus(filterStatus === 'draft' ? '' : 'draft')}>
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{draftCount}</p>
            <p className="text-sm text-gray-500">Drafts</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-blue-200" onClick={() => setFilterStatus(filterStatus === 'sent' ? '' : 'sent')}>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Send size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{sentCount}</p>
            <p className="text-sm text-gray-500">Sent</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 cursor-pointer hover:border-green-200" onClick={() => setFilterStatus(filterStatus === 'accepted' ? '' : 'accepted')}>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">₹{(totalValue / 1000).toFixed(0)}k</p>
            <p className="text-sm text-gray-500">{acceptedCount} Accepted</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="form-input w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="amount_desc">Amount (Highest)</option>
          <option value="amount_asc">Amount (Lowest)</option>
          <option value="client_asc">Client A–Z</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No quotations found</div> : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Quote No</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono font-medium text-blue-700">{q.quotationNo}</td>
                    <td className="table-cell font-medium text-gray-900">{q.client?.name}</td>
                    <td className="table-cell text-gray-600">{q.subject}</td>
                    <td className="table-cell font-semibold text-gray-900">₹{q.totalAmount.toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={`badge ${statusColors[q.status] || 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(q)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                        <button onClick={() => del.mutate(q.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Full-page slide panel */}
      <SlidePanel
        open={panel}
        onClose={closePanel}
        title={editing ? 'Edit Quotation' : 'New Quotation'}
        subtitle={editing ? `Editing ${editing.quotationNo}` : 'Create a new quotation for a client'}
        width="max-w-3xl"
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate({ ...form, items }); }} className="p-6 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Client *</label>
              <select className="form-input" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                <option value="">Select Client</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="e.g. Website Development Project" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="form-label">Valid Until</label>
              <input type="date" className="form-input" value={form.validUntil || ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Line Items</h3>
              <button type="button" onClick={() => setItems([...items, { ...emptyItem }])} className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 text-sm font-medium">
                <PlusCircle size={16} /> Add Item
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-0 text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 bg-gray-50">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 border-t border-gray-100">
                  <div className="col-span-5">
                    <input className="form-input" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item description" required />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" className="form-input text-center" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" className="form-input text-right" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-semibold text-gray-700 pr-2">
                    ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                        <MinusCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="form-label">Discount (%)</label>
                <input type="number" min="0" max="100" className="form-input" value={form.discount || 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Tax (%)</label>
                <input type="number" min="0" className="form-input" value={form.tax || 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-input" rows={2} value={form.terms || ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="bg-gray-50 rounded-xl p-5 space-y-3 sticky top-4">
                <h4 className="font-semibold text-gray-800 mb-4">Summary</h4>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount ({form.discount || 0}%)</span>
                  <span>-₹{discountAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Tax ({form.tax || 0}%)</span>
                  <span>+₹{taxAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editing ? 'Update Quotation' : 'Create Quotation'}
            </button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
