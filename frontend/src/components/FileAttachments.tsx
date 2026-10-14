import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from 'lucide-react';

interface FileAttachment {
  id: number;
  fileName: string;
  originalName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  user?: { name: string };
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return File;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function FileAttachments({ module, entityId }: { module: string; entityId: number }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery<FileAttachment[]>({
    queryKey: ['files', module, entityId],
    queryFn: () => api.get(`/files/${module}/${entityId}`).then((r) => r.data),
    enabled: !!entityId,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', module, entityId] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', module);
      fd.append('entityId', String(entityId));
      await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries({ queryKey: ['files', module, entityId] });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = (file: FileAttachment) => {
    const link = document.createElement('a');
    link.href = `${api.defaults.baseURL?.replace('/api', '')}/uploads/${file.fileName}`;
    link.download = file.originalName;
    link.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Paperclip size={14} /> Files ({files.length})
        </h4>
        <label className="cursor-pointer flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Upload size={13} />
          {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-gray-400 py-2 text-center border border-dashed border-gray-200 rounded-lg">
          No files attached
        </p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => {
            const Icon = getFileIcon(f.mimeType);
            return (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 group">
                <Icon size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{f.originalName}</p>
                  <p className="text-[10px] text-gray-400">
                    {formatSize(f.fileSize)} · {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownload(f)} className="p-1 text-blue-500 hover:text-blue-700">
                    <Download size={13} />
                  </button>
                  <button onClick={() => del.mutate(f.id)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
