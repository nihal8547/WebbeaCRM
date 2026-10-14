import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Plus, Edit, Trash2, Search, Package, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import SlidePanel from '../components/SlidePanel';

interface Product {
  id: number;
  name: string;
  description?: string;
  unit: string;
  price: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>({ name: '', unit: 'piece', price: 0, isActive: true });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/products/${editing.id}`, data) : api.post('/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success(editing ? 'Product updated' : 'Product added'); closePanel(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const toggleActive = useMutation({
    mutationFn: (p: Product) => api.put(`/products/${p.id}`, { ...p, isActive: !p.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', unit: 'piece', price: 0, isActive: true });
    setPanel(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    setPanel(true);
  };

  const closePanel = () => { setPanel(false); setEditing(null); };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = products.filter((p) => p.isActive).length;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
          <p className="text-gray-500 text-sm">{products.length} total · {activeCount} active</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-sm text-gray-500">Total Products</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <ToggleRight size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Tag size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            <p className="text-sm text-gray-500">Categories</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No products found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Product / Service</th>
                <th className="table-header">Category</th>
                <th className="table-header">Unit</th>
                <th className="table-header">Price</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-56">{p.description}</p>}
                  </td>
                  <td className="table-cell">
                    {p.category ? (
                      <span className="badge bg-purple-100 text-purple-700">{p.category}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="table-cell text-sm text-gray-600">{p.unit}</td>
                  <td className="table-cell font-semibold text-gray-900">₹{p.price.toLocaleString()}</td>
                  <td className="table-cell">
                    <button onClick={() => toggleActive.mutate(p)} className="flex items-center gap-1 text-sm">
                      {p.isActive ? (
                        <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">Active</span></>
                      ) : (
                        <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>
                      )}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>
                      <button onClick={() => { if (confirm('Delete product?')) del.mutate(p.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SlidePanel open={panel} onClose={closePanel} title={editing ? 'Edit Product' : 'Add Product'} subtitle={editing ? `Editing: ${editing.name}` : 'Add a new product or service'}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
          <div>
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Unit</label>
              <select className="form-input" value={form.unit || 'piece'} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="piece">Piece</option>
                <option value="service">Service</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="kg">KG</option>
                <option value="litre">Litre</option>
              </select>
            </div>
            <div>
              <label className="form-label">Price (₹) *</label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="form-label">Category</label>
            <input className="form-input" placeholder="e.g. Software, Hardware, Consulting..." value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active (available for quotations)</label>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 py-2.5">
              {save.isPending ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
            </button>
            <button type="button" onClick={closePanel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
