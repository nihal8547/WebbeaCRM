import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, PlusCircle, MinusCircle } from 'lucide-react';

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
  const [modal, setModal] = useState(false);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/quotations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ subject: '', status: 'draft', discount: 0, tax: 0 }); setItems([{ ...emptyItem }]); setModal(true); };
  const openEdit = (q: any) => {
    setEditing(q);
    setForm({ ...q, clientId: q.clientId, validUntil: q.validUntil?.split('T')[0] || '' });
    setItems(q.items?.map((i: any) => ({ ...i })) || [{ ...emptyItem }]);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

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

  const filtered = quotations.filter((q) =>
    q.quotationNo.includes(search) ||
    q.subject.toLowerCase().includes(search.toLowerCase()) ||
    (q.client?.name || '').toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Quotation' : 'New Quotation'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate({ ...form, items }); }} className="p-6 space-y-5">
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
                  <input className="form-input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
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

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800">Line Items</h3>
                  <button type="button" onClick={() => setItems([...items, { ...emptyItem }])} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                    <PlusCircle size={16} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-2">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input className="form-input" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" required />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" className="form-input" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" className="form-input" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input className="form-input bg-gray-50" value={`₹${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}`} readOnly />
                      </div>
                      <div className="col-span-1">
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
              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Discount (%)</label>
                    <input type="number" min="0" max="100" className="form-input" value={form.discount || 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Tax (%)</label>
                    <input type="number" min="0" className="form-input" value={form.tax || 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({form.discount || 0}%)</span><span>-₹{discountAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Tax ({form.tax || 0}%)</span><span>+₹{taxAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                    <span>Total</span><span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Terms & Conditions</label>
                  <textarea className="form-input" rows={2} value={form.terms || ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
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
