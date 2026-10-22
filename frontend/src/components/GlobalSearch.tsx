import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Search, X, Building2, ClipboardList, MessageSquare, FileText, Users } from 'lucide-react';

interface SearchResult {
  type: 'client' | 'task' | 'enquiry' | 'quotation' | 'user';
  id: number;
  title: string;
  subtitle?: string;
  path: string;
}

const typeIcons: Record<string, any> = {
  client: Building2,
  task: ClipboardList,
  enquiry: MessageSquare,
  quotation: FileText,
  user: Users,
};

const typeColors: Record<string, string> = {
  client: 'text-emerald-600 bg-emerald-50',
  task: 'text-blue-600 bg-blue-50',
  enquiry: 'text-purple-600 bg-purple-50',
  quotation: 'text-orange-600 bg-orange-50',
  user: 'text-indigo-600 bg-indigo-50',
};

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [clients, tasks, enquiries, quotations] = await Promise.all([
          api.get(`/clients?search=${query}`).then((r) => r.data).catch(() => []),
          api.get(`/tasks?search=${query}`).then((r) => r.data).catch(() => []),
          api.get(`/enquiries?search=${query}`).then((r) => r.data).catch(() => []),
          api.get(`/quotations?search=${query}`).then((r) => r.data).catch(() => []),
        ]);

        const mapped: SearchResult[] = [
          ...clients.slice(0, 3).map((c: any) => ({
            type: 'client' as const, id: c.id,
            title: c.name, subtitle: c.email || c.phone,
            path: '/clients',
          })),
          ...tasks.slice(0, 3).map((t: any) => ({
            type: 'task' as const, id: t.id,
            title: t.title, subtitle: `Status: ${t.status}`,
            path: '/tasks',
          })),
          ...enquiries.slice(0, 3).map((e: any) => ({
            type: 'enquiry' as const, id: e.id,
            title: e.name, subtitle: e.subject,
            path: '/enquiries',
          })),
          ...quotations.slice(0, 3).map((q: any) => ({
            type: 'quotation' as const, id: q.id,
            title: q.quotationNo, subtitle: q.client?.name,
            path: '/quotations',
          })),
        ];
        setResults(mapped);
        setSelected(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].path);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (r: SearchResult) => {
    navigate(r.path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 outline-none text-gray-800 text-sm placeholder-gray-400"
            placeholder="Search clients, tasks, enquiries, quotations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => {
              const Icon = typeIcons[r.type];
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[r.type]}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${typeColors[r.type]}`}>
                    {r.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No results for "{query}"</div>
        )}

        {!query && (
          <div className="px-4 py-4 text-center text-xs text-gray-400">
            Type to search · <kbd className="bg-gray-100 px-1.5 py-0.5 rounded">↑↓</kbd> navigate · <kbd className="bg-gray-100 px-1.5 py-0.5 rounded">Enter</kbd> open · <kbd className="bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd> close
          </div>
        )}
      </div>
    </div>
  );
}
