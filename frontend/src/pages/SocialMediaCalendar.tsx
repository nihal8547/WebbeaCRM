import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths, isToday
} from 'date-fns';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2,
  X, Check, Copy, ExternalLink, Image as ImageIcon, Video as VideoIcon,
  Play, Search, Building2, Phone, Mail, MapPin, Clock, Share2,
  SlidersHorizontal, Film, Eye, Sparkles, Download, Layers,
  Link as LinkIcon, MoveLeft, MoveRight, Maximize2, Upload
} from 'lucide-react';

export interface MediaItem {
  url: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size?: number;
  type: 'image' | 'video';
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  status: string;
  notes?: string;
}

interface SocialPost {
  id: number;
  clientId: number;
  client?: Client;
  title: string;
  caption?: string;
  scheduledDate: string;
  platforms: string[];
  postType: string;
  status: string;
  mediaUrls: MediaItem[];
  hashtags?: string;
  targetUrl?: string;
  notes?: string;
  createdAt?: string;
}

interface LightboxState {
  items: MediaItem[];
  currentIndex: number;
}

const AVAILABLE_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white', icon: '📸' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600 text-white', icon: '👥' },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-700 text-white', icon: '💼' },
  { id: 'twitter', name: 'X / Twitter', color: 'bg-neutral-900 text-white', icon: '𝕏' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-black text-cyan-400', icon: '🎵' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600 text-white', icon: '▶️' },
  { id: 'pinterest', name: 'Pinterest', color: 'bg-rose-600 text-white', icon: '📌' },
  { id: 'threads', name: 'Threads', color: 'bg-slate-800 text-white', icon: '🧵' },
];

const POST_TYPES = [
  { id: 'post', label: 'Feed Post (Image)', icon: ImageIcon },
  { id: 'reel', label: 'Reel / Short (Video)', icon: Film },
  { id: 'carousel', label: 'Carousel (Multiple Images)', icon: Sparkles },
  { id: 'story', label: 'Story', icon: Clock },
  { id: 'video', label: 'Long Video Post', icon: VideoIcon },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string; bg: string }> = {
  draft: { label: 'Draft', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', bg: 'border-l-amber-400' },
  in_review: { label: 'In Review', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', bg: 'border-l-blue-500' },
  approved: { label: 'Approved', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', bg: 'border-l-indigo-500' },
  scheduled: { label: 'Scheduled', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', bg: 'border-l-purple-500' },
  published: { label: 'Published', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bg: 'border-l-emerald-500' },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';
  if (base && url.startsWith('/')) {
    return `${base}${url}`;
  }
  return url;
}

const defaultForm: {
  clientId: number | '';
  title: string;
  caption: string;
  scheduledDate: string;
  scheduledTime: string;
  platforms: string[];
  postType: string;
  status: string;
  mediaUrls: MediaItem[];
  hashtags: string;
  targetUrl: string;
  notes: string;
} = {
  clientId: '',
  title: '',
  caption: '',
  scheduledDate: format(new Date(), 'yyyy-MM-dd'),
  scheduledTime: '10:00',
  platforms: ['instagram', 'facebook'],
  postType: 'post',
  status: 'draft',
  mediaUrls: [],
  hashtags: '',
  targetUrl: '',
  notes: '',
};

export default function SocialMediaCalendar() {
  const qc = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Filters & State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [activePostDetails, setActivePostDetails] = useState<SocialPost | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload Option Set State
  const [uploadOptionTab, setUploadOptionTab] = useState<'images' | 'video' | 'url'>('images');
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlMediaType, setUrlMediaType] = useState<'image' | 'video'>('image');
  const [urlName, setUrlName] = useState('');

  // Form State
  const [form, setForm] = useState(defaultForm);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxItem();
      if (e.key === 'ArrowLeft') prevLightboxItem();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  // Queries
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ['social-posts', selectedClientFilter, selectedPlatformFilter, selectedStatusFilter],
    queryFn: () => {
      const params: any = {};
      if (selectedClientFilter !== 'all') params.clientId = selectedClientFilter;
      if (selectedPlatformFilter !== 'all') params.platform = selectedPlatformFilter;
      if (selectedStatusFilter !== 'all') params.status = selectedStatusFilter;
      return api.get('/social-media', { params }).then((r) => r.data);
    },
  });

  const activeFilteredClient = selectedClientFilter !== 'all'
    ? clients.find((c) => c.id === Number(selectedClientFilter))
    : null;

  // Mutations
  const savePostMutation = useMutation({
    mutationFn: (data: any) => {
      const fullDate = `${data.scheduledDate}T${data.scheduledTime || '10:00'}:00`;
      const payload = {
        ...data,
        scheduledDate: new Date(fullDate).toISOString(),
      };
      return editingPost
        ? api.put(`/social-media/${editingPost.id}`, payload)
        : api.post('/social-media', payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success(editingPost ? 'Post updated successfully' : 'Post scheduled successfully');
      setIsFormOpen(false);
      setEditingPost(null);
      if (activePostDetails && editingPost && activePostDetails.id === editingPost.id) {
        setActivePostDetails(res.data);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save post');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/social-media/${id}/status`, { status }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success('Status updated');
      if (activePostDetails && activePostDetails.id === res.data.id) {
        setActivePostDetails(res.data);
      }
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/social-media/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast.success('Post deleted');
      setActivePostDetails(null);
    },
    onError: () => toast.error('Failed to delete post'),
  });

  // Media Upload & Management Handlers
  const handleFilesUpload = async (filesList: FileList | File[]) => {
    if (!filesList || filesList.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < filesList.length; i++) {
      formData.append('media', filesList[i]);
    }

    try {
      setIsUploading(true);
      const res = await api.post('/social-media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newMediaItems: MediaItem[] = res.data;

      const hasVideo = newMediaItems.some((m) => m.type === 'video');

      setForm((prev) => {
        let updatedPostType = prev.postType;
        if (hasVideo && (prev.postType === 'post' || !prev.postType)) {
          updatedPostType = 'reel';
        } else if (!hasVideo && newMediaItems.length + prev.mediaUrls.length > 1 && prev.postType === 'post') {
          updatedPostType = 'carousel';
        }
        return {
          ...prev,
          postType: updatedPostType,
          mediaUrls: [...prev.mediaUrls, ...newMediaItems],
        };
      });

      if (hasVideo) {
        toast.success(`${newMediaItems.length} media file(s) uploaded. Type updated to Reel/Video.`, { icon: '🎬' });
      } else {
        toast.success(`${newMediaItems.length} media file(s) uploaded successfully`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Media upload failed');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesUpload(e.target.files);
    }
  };

  const handleFilesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleAddUrlMedia = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isDetectedVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.m4v');
    const finalType: 'image' | 'video' = isDetectedVideo ? 'video' : urlMediaType;

    const newMedia: MediaItem = {
      url,
      originalName: urlName.trim() || url.split('/').pop()?.split('?')[0] || (finalType === 'video' ? 'video-stream.mp4' : 'media-image.jpg'),
      fileName: `url-${Date.now()}`,
      mimeType: finalType === 'video' ? 'video/mp4' : 'image/jpeg',
      type: finalType,
    };

    setForm((prev) => ({
      ...prev,
      postType: finalType === 'video' && prev.postType === 'post' ? 'reel' : prev.postType,
      mediaUrls: [...prev.mediaUrls, newMedia],
    }));

    setUrlInput('');
    setUrlName('');
    toast.success(`Attached ${finalType === 'video' ? 'video' : 'image'} link successfully`);
  };

  const removeMedia = (index: number) => {
    setForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }));
  };

  const moveMedia = (fromIndex: number, toIndex: number) => {
    setForm((prev) => {
      const list = [...prev.mediaUrls];
      if (toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, mediaUrls: list };
    });
  };

  // Lightbox handlers
  const openLightbox = (items: MediaItem[], startIndex = 0) => {
    if (!items || items.length === 0) return;
    setLightbox({ items, currentIndex: startIndex });
  };

  const closeLightbox = () => setLightbox(null);

  const nextLightboxItem = () => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.items.length } : null
    );
  };

  const prevLightboxItem = () => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length } : null
    );
  };

  // Open Form Modals
  const openNewPostModal = (dateStr?: string) => {
    setEditingPost(null);
    setUploadOptionTab('images');
    setForm({
      ...defaultForm,
      clientId: selectedClientFilter !== 'all' ? Number(selectedClientFilter) : (clients[0]?.id || ''),
      scheduledDate: dateStr || format(new Date(), 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  const openEditModal = (post: SocialPost) => {
    setEditingPost(post);
    setUploadOptionTab(post.mediaUrls.some((m) => m.type === 'video') ? 'video' : 'images');
    const dateObj = new Date(post.scheduledDate);
    setForm({
      clientId: post.clientId,
      title: post.title,
      caption: post.caption || '',
      scheduledDate: format(dateObj, 'yyyy-MM-dd'),
      scheduledTime: format(dateObj, 'HH:mm'),
      platforms: post.platforms || [],
      postType: post.postType || 'post',
      status: post.status || 'draft',
      mediaUrls: post.mediaUrls || [],
      hashtags: post.hashtags || '',
      targetUrl: post.targetUrl || '',
      notes: post.notes || '',
    });
    setIsFormOpen(true);
  };

  const togglePlatform = (platId: string) => {
    setForm((prev) => {
      const exists = prev.platforms.includes(platId);
      if (exists) {
        return { ...prev, platforms: prev.platforms.filter((p) => p !== platId) };
      } else {
        return { ...prev, platforms: [...prev.platforms, platId] };
      }
    });
  };

  const handleCopyCaption = (post: SocialPost) => {
    const textToCopy = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    toast.success('Caption & hashtags copied to clipboard!');
  };

  const formClient = clients.find((c) => c.id === Number(form.clientId));

  // Calendar dates
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.caption && p.caption.toLowerCase().includes(q)) ||
      (p.hashtags && p.hashtags.toLowerCase().includes(q)) ||
      (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
      (p.client?.company && p.client.company.toLowerCase().includes(q))
    );
  });

  const getPostsForDay = (day: Date) =>
    filteredPosts.filter((p) => isSameDay(new Date(p.scheduledDate), day));

  // Stats
  const totalPostsCount = filteredPosts.length;
  const scheduledCount = filteredPosts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = filteredPosts.filter((p) => p.status === 'published').length;
  const videoPostsCount = filteredPosts.filter((p) => p.mediaUrls?.some((m) => m.type === 'video')).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Share2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Social Media Calendar</h1>
              <p className="text-xs text-gray-500">Plan, organize and preview client content across all platforms (Photos, Carousels & High-Res Videos)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <CalendarIcon size={14} /> Month
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <SlidersHorizontal size={14} /> Feed / List
            </button>
          </div>

          <button
            onClick={() => openNewPostModal()}
            className="btn-primary flex items-center gap-2 shadow-xs"
          >
            <Plus size={16} /> Schedule Post
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card py-3 px-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Posts</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalPostsCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Share2 size={16} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Scheduled</span>
            <p className="text-xl font-bold text-purple-700 mt-0.5">{scheduledCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Published</span>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{publishedCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check size={16} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reels & Videos</span>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{videoPostsCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Film size={16} />
          </div>
        </div>
      </div>

      {/* Filter & Client Detail Banner */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Client Filter Dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Building2 size={16} className="text-gray-400" />
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              aria-label="Filter by Client"
              className="form-input text-sm font-medium py-1.5"
            >
              <option value="all">🌐 All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform:</span>
            <button
              onClick={() => setSelectedPlatformFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedPlatformFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {AVAILABLE_PLATFORMS.map((plat) => (
              <button
                key={plat.id}
                onClick={() => setSelectedPlatformFilter(plat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                  selectedPlatformFilter === plat.id
                    ? 'ring-2 ring-blue-500 font-bold ' + plat.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{plat.icon}</span>
                <span>{plat.name}</span>
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status:</span>
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                selectedStatusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(STATUS_CONFIG).map(([stKey, stCfg]) => (
              <button
                key={stKey}
                onClick={() => setSelectedStatusFilter(stKey)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                  selectedStatusFilter === stKey
                    ? 'ring-2 ring-blue-500 font-bold bg-white text-gray-900 shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stCfg.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts, tags, caption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs"
            />
          </div>
        </div>

        {/* Selected Client Overview Card */}
        {activeFilteredClient && (
          <div className="mt-2 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {activeFilteredClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900">{activeFilteredClient.name}</h3>
                  {activeFilteredClient.company && (
                    <span className="badge bg-white text-blue-700 border border-blue-200 text-xs">
                      {activeFilteredClient.company}
                    </span>
                  )}
                  <span className={`badge text-xs ${activeFilteredClient.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                    {activeFilteredClient.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Phone size={12} className="text-blue-500" />
                    <span>{activeFilteredClient.phone}</span>
                  </div>
                  {activeFilteredClient.email && (
                    <div className="flex items-center gap-1">
                      <Mail size={12} className="text-indigo-500" />
                      <span>{activeFilteredClient.email}</span>
                    </div>
                  )}
                  {activeFilteredClient.address && (
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500" />
                      <span>{activeFilteredClient.address}</span>
                    </div>
                  )}
                </div>
                {activeFilteredClient.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Note: {activeFilteredClient.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`tel:${activeFilteredClient.phone}`}
                className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5"
              >
                <Phone size={12} /> Call Client
              </a>
              <a
                href={`https://wa.me/${activeFilteredClient.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                WhatsApp
              </a>
              <button
                onClick={() => openNewPostModal()}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5"
              >
                <Plus size={14} /> New Post for {activeFilteredClient.name.split(' ')[0]}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main View: Calendar or Feed/List */}
      {viewMode === 'calendar' ? (
        <div className="card p-0 overflow-hidden border border-gray-200 shadow-sm">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                {isLoading && <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />}
                {isLoading ? 'Loading posts...' : `${filteredPosts.length} posts`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="btn-secondary text-xs px-3 py-1.5 font-medium"
              >
                Today
              </button>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  className="p-1.5 hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  className="p-1.5 hover:bg-gray-100 text-gray-600 transition-colors border-l border-gray-200"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100">
            {calendarDays.map((day) => {
              const dayPosts = getPostsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const formattedDateStr = format(day, 'yyyy-MM-dd');

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[145px] p-2 flex flex-col justify-between transition-colors relative group ${
                    inMonth ? 'bg-white hover:bg-blue-50/20' : 'bg-gray-50/60 opacity-60'
                  }`}
                >
                  {/* Day cell header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isCurrentDay
                          ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                          : inMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openNewPostModal(formattedDateStr)}
                        className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-xs"
                        title="Add post for this day"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Posts Cards Inside Day */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[120px] pr-0.5">
                    {dayPosts.map((post) => {
                      const statusInfo = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                      const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
                      const hasVideo = post.mediaUrls?.some((m) => m.type === 'video');
                      const firstMedia = hasMedia ? post.mediaUrls[0] : null;

                      return (
                        <div
                          key={post.id}
                          onClick={() => setActivePostDetails(post)}
                          className={`p-1.5 rounded-lg bg-white border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer border-l-4 ${statusInfo.bg}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            {/* Platform badges */}
                            <div className="flex items-center gap-0.5 flex-wrap">
                              {post.platforms?.map((platId) => {
                                const pCfg = AVAILABLE_PLATFORMS.find((p) => p.id === platId);
                                return pCfg ? (
                                  <span
                                    key={platId}
                                    className={`text-[9px] px-1 py-0.2 rounded font-bold ${pCfg.color}`}
                                    title={pCfg.name}
                                  >
                                    {pCfg.icon}
                                  </span>
                                ) : null;
                              })}
                            </div>

                            <span className="text-[10px] text-gray-500 font-medium">
                              {format(new Date(post.scheduledDate), 'HH:mm')}
                            </span>
                          </div>

                          {/* Media Thumbnail snippet with Video/Image tags */}
                          {hasMedia && firstMedia && (
                            <div className="relative mb-1 rounded overflow-hidden h-11 bg-slate-900 flex items-center justify-center">
                              {firstMedia.type === 'video' ? (
                                <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                                  <video
                                    src={getMediaUrl(firstMedia.url)}
                                    className="w-full h-full object-cover opacity-80"
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-5 h-5 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow">
                                      <Play size={10} fill="white" />
                                    </div>
                                  </div>
                                  <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-rose-300 uppercase tracking-wider">
                                    Reel
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={getMediaUrl(firstMedia.url)}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {post.mediaUrls.length > 1 && (
                                <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
                                  +{post.mediaUrls.length - 1}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Title */}
                          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                            {post.title}
                          </p>

                          {/* Client Name Badge */}
                          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                            <span className="truncate max-w-[85px] font-medium text-blue-600">
                              {post.client?.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {hasVideo && (
                                <span title="Contains video">
                                  <Film size={10} className="text-rose-500" />
                                </span>
                              )}
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List / Feed View */
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="card text-center py-12">
              <Share2 size={36} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No scheduled posts found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No social media posts match your current client, platform, or search filters.
              </p>
              <button
                onClick={() => openNewPostModal()}
                className="btn-primary mt-4 text-xs inline-flex items-center gap-2"
              >
                <Plus size={14} /> Schedule First Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => {
                const statusInfo = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
                const firstMedia = hasMedia ? post.mediaUrls[0] : null;

                return (
                  <div
                    key={post.id}
                    className="card p-4 hover:shadow-md transition-shadow border-slate-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar: Client & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 size={14} className="text-blue-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-800 truncate">
                            {post.client?.name}
                          </span>
                          {post.client?.company && (
                            <span className="text-[10px] text-gray-400 truncate">
                              • {post.client.company}
                            </span>
                          )}
                        </div>
                        <span className={`badge border text-[10px] ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Media Preview Box */}
                      {hasMedia && firstMedia && (
                        <div
                          onClick={() => openLightbox(post.mediaUrls, 0)}
                          className="relative mb-3 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center group cursor-pointer"
                        >
                          {firstMedia.type === 'video' ? (
                            <div className="w-full h-full relative">
                              <video
                                src={getMediaUrl(firstMedia.url)}
                                className="w-full h-full object-cover opacity-90"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                                <div className="w-11 h-11 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play size={20} fill="white" className="ml-0.5" />
                                </div>
                              </div>
                              <span className="absolute bottom-2 right-2 bg-rose-600/90 text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow">
                                <VideoIcon size={11} /> Video / Reel
                              </span>
                            </div>
                          ) : (
                            <img
                              src={getMediaUrl(firstMedia.url)}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {post.mediaUrls.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                              +{post.mediaUrls.length - 1} more
                            </span>
                          )}
                          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                            <Maximize2 size={11} /> Click to preview
                          </div>
                        </div>
                      )}

                      {/* Title & Platforms */}
                      <h4 className="text-sm font-bold text-gray-900 leading-snug mb-1">
                        {post.title}
                      </h4>

                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {post.platforms?.map((platId) => {
                          const pCfg = AVAILABLE_PLATFORMS.find((p) => p.id === platId);
                          return pCfg ? (
                            <span
                              key={platId}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${pCfg.color}`}
                            >
                              {pCfg.icon} {pCfg.name}
                            </span>
                          ) : null;
                        })}
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium uppercase flex items-center gap-1">
                          {post.postType === 'reel' || post.postType === 'video' ? (
                            <Film size={10} className="text-rose-500" />
                          ) : post.postType === 'carousel' ? (
                            <Sparkles size={10} className="text-amber-500" />
                          ) : (
                            <ImageIcon size={10} className="text-blue-500" />
                          )}
                          {post.postType}
                        </span>
                      </div>

                      {/* Caption excerpt */}
                      {post.caption && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2 font-normal">
                          {post.caption}
                        </p>
                      )}

                      {/* Hashtags */}
                      {post.hashtags && (
                        <p className="text-[11px] text-blue-600 font-medium truncate mb-2">
                          {post.hashtags}
                        </p>
                      )}
                    </div>

                    {/* Bottom row: Scheduled date + actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-500 font-medium">
                        <Clock size={13} className="text-gray-400" />
                        <span>{format(new Date(post.scheduledDate), 'dd MMM yyyy, HH:mm')}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyCaption(post)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Copy Caption"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setActivePostDetails(post)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(post)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this post?')) {
                              deletePostMutation.mutate(post.id);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* POST DETAILS & FULL PREVIEW MODAL */}
      {/* ============================================================== */}
      {activePostDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
                  <Share2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-snug">{activePostDetails.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>{format(new Date(activePostDetails.scheduledDate), 'EEEE, MMMM d, yyyy • HH:mm')}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-semibold tracking-wider text-blue-400">
                      {activePostDetails.postType}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActivePostDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Client Details Section */}
              {activePostDetails.client && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      Associated Client
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-0.5">
                      {activePostDetails.client.name}
                      {activePostDetails.client.company && (
                        <span className="text-gray-500 text-xs font-normal ml-2">
                          ({activePostDetails.client.company})
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Phone size={12} className="text-blue-500" />
                        {activePostDetails.client.phone}
                      </span>
                      {activePostDetails.client.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-indigo-500" />
                          {activePostDetails.client.email}
                        </span>
                      )}
                      {activePostDetails.client.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-500" />
                          {activePostDetails.client.address}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${activePostDetails.client.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      WhatsApp Client
                    </a>
                  </div>
                </div>
              )}

              {/* Status & Quick Changer */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Post Status:</span>
                  <span className={`badge border ${STATUS_CONFIG[activePostDetails.status]?.badge}`}>
                    {STATUS_CONFIG[activePostDetails.status]?.label || activePostDetails.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">Quick Change:</span>
                  <select
                    value={activePostDetails.status}
                    onChange={(e) => updateStatusMutation.mutate({ id: activePostDetails.id, status: e.target.value })}
                    className="form-input text-xs py-1 px-2 font-medium w-auto bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Target Platforms
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {activePostDetails.platforms?.map((platId) => {
                    const pCfg = AVAILABLE_PLATFORMS.find((p) => p.id === platId);
                    return pCfg ? (
                      <div
                        key={platId}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs ${pCfg.color}`}
                      >
                        <span>{pCfg.icon}</span>
                        <span>{pCfg.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Media Gallery / Player (Images & Videos) */}
              {activePostDetails.mediaUrls && activePostDetails.mediaUrls.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Uploaded Media ({activePostDetails.mediaUrls.length})
                    </span>
                    <span className="text-xs text-gray-400">Click any media to expand or play fullscreen</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePostDetails.mediaUrls.map((media, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 overflow-hidden bg-slate-950 shadow-sm relative group"
                      >
                        {media.type === 'video' ? (
                          <div className="w-full flex flex-col">
                            <div className="relative bg-black flex items-center justify-center max-h-64 overflow-hidden">
                              <video
                                src={getMediaUrl(media.url)}
                                controls
                                preload="metadata"
                                className="w-full max-h-64 object-contain bg-black"
                              />
                            </div>
                            <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-2">
                                <span className="truncate block font-medium text-slate-200">
                                  {media.originalName}
                                </span>
                                <span className="text-[10px] text-rose-400 font-semibold">
                                  🎬 Video {media.size ? `• ${formatFileSize(media.size)}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openLightbox(activePostDetails.mediaUrls, idx)}
                                  className="text-blue-400 hover:text-white flex items-center gap-1 p-1"
                                  title="Expand Fullscreen"
                                >
                                  <Maximize2 size={13} />
                                </button>
                                <a
                                  href={getMediaUrl(media.url)}
                                  download={media.originalName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:text-white flex items-center gap-1 p-1"
                                  title="Download Video"
                                >
                                  <Download size={13} />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative flex flex-col">
                            <div
                              onClick={() => openLightbox(activePostDetails.mediaUrls, idx)}
                              className="relative cursor-pointer overflow-hidden group/img h-56 bg-slate-900"
                            >
                              <img
                                src={getMediaUrl(media.url)}
                                alt={media.originalName}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-white/90 text-gray-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                  <Eye size={13} /> Expand Photo
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-2">
                                <span className="truncate block font-medium text-slate-200">
                                  {media.originalName}
                                </span>
                                <span className="text-[10px] text-blue-400 font-semibold">
                                  🖼️ Image {media.size ? `• ${formatFileSize(media.size)}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openLightbox(activePostDetails.mediaUrls, idx)}
                                  className="text-blue-400 hover:text-white flex items-center gap-1 p-1"
                                  title="Expand Photo"
                                >
                                  <Maximize2 size={13} />
                                </button>
                                <a
                                  href={getMediaUrl(media.url)}
                                  download={media.originalName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:text-white flex items-center gap-1 p-1"
                                  title="Download Image"
                                >
                                  <Download size={13} />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption & Hashtags */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Post Caption & Copy
                  </span>
                  <button
                    onClick={() => handleCopyCaption(activePostDetails)}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
                  >
                    <Copy size={13} /> Copy All
                  </button>
                </div>

                {activePostDetails.caption ? (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {activePostDetails.caption}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No caption provided.</p>
                )}

                {activePostDetails.hashtags && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-700 font-medium">
                    {activePostDetails.hashtags}
                  </div>
                )}

                {activePostDetails.targetUrl && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-500">CTA Link:</span>
                    <a
                      href={activePostDetails.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      {activePostDetails.targetUrl} <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {activePostDetails.notes && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <span className="font-bold">Team / Client Notes: </span>
                    {activePostDetails.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  if (window.confirm('Delete this social media post?')) {
                    deletePostMutation.mutate(activePostDetails.id);
                  }
                }}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(activePostDetails)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Edit size={14} /> Edit Post
                </button>
                <button
                  onClick={() => setActivePostDetails(null)}
                  className="btn-primary text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULLSCREEN MEDIA LIGHTBOX (IMAGE & VIDEO PLAYER) */}
      {/* ============================================================== */}
      {lightbox && lightbox.items.length > 0 && (() => {
        const currentMedia = lightbox.items[lightbox.currentIndex];
        if (!currentMedia) return null;
        const isVideo = currentMedia.type === 'video';

        return (
          <div className="fixed inset-0 z-70 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            {/* Top action bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-20">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md">
                  {lightbox.currentIndex + 1} of {lightbox.items.length}
                </span>
                <span className="text-sm font-semibold truncate max-w-[280px] sm:max-w-md text-gray-200">
                  {currentMedia.originalName}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase ${isVideo ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {isVideo ? '🎬 Video' : '🖼️ Image'}
                </span>
                {currentMedia.size && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {formatFileSize(currentMedia.size)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getMediaUrl(currentMedia.url)}
                  download={currentMedia.originalName}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="Download File"
                >
                  <Download size={16} /> Download
                </a>
                <button
                  onClick={closeLightbox}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Close (Esc)"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Navigation: Previous */}
            {lightbox.items.length > 1 && (
              <button
                onClick={prevLightboxItem}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
                title="Previous (Left Arrow)"
              >
                <ChevronLeft size={36} />
              </button>
            )}

            {/* Main Media Player / Viewer */}
            <div className="max-w-5xl max-h-[80vh] w-full flex items-center justify-center p-2">
              {isVideo ? (
                <video
                  key={currentMedia.url}
                  src={getMediaUrl(currentMedia.url)}
                  controls
                  autoPlay
                  className="max-h-[78vh] max-w-full rounded-xl shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={getMediaUrl(currentMedia.url)}
                  alt={currentMedia.originalName}
                  className="max-h-[78vh] max-w-full rounded-xl shadow-2xl object-contain"
                />
              )}
            </div>

            {/* Navigation: Next */}
            {lightbox.items.length > 1 && (
              <button
                onClick={nextLightboxItem}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
                title="Next (Right Arrow)"
              >
                <ChevronRight size={36} />
              </button>
            )}

            {/* Bottom thumbnail strip if multi-media */}
            {lightbox.items.length > 1 && (
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 p-2 overflow-x-auto z-20">
                {lightbox.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightbox((p) => p ? { ...p, currentIndex: idx } : null)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all relative shrink-0 ${
                      idx === lightbox.currentIndex ? 'border-blue-500 scale-105 shadow-lg ring-2 ring-blue-400/50' : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white">
                        <Play size={14} fill="white" />
                      </div>
                    ) : (
                      <img src={getMediaUrl(item.url)} alt={item.originalName} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* ADD / EDIT SOCIAL POST MODAL */}
      {/* ============================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <Share2 size={20} />
                <h3 className="font-bold text-base">
                  {editingPost ? 'Edit Social Media Post' : 'Schedule New Social Media Post'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.clientId) {
                  toast.error('Please select a client');
                  return;
                }
                if (!form.title.trim()) {
                  toast.error('Please enter a post title');
                  return;
                }
                if (!form.scheduledDate) {
                  toast.error('Please select a scheduled date');
                  return;
                }
                savePostMutation.mutate(form);
              }}
              className="p-6 overflow-y-auto space-y-5 flex-1"
            >
              {/* Client Selection */}
              <div>
                <label className="form-label font-semibold text-gray-900">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: Number(e.target.value) })}
                  className="form-input"
                  required
                >
                  <option value="">-- Choose a Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} - {c.phone}
                    </option>
                  ))}
                </select>

                {/* Instant Client Details Card Preview */}
                {formClient && (
                  <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {formClient.name.charAt(0)}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-gray-900">
                        {formClient.name} {formClient.company ? `• ${formClient.company}` : ''}
                      </p>
                      <div className="flex items-center gap-3 text-gray-600 flex-wrap">
                        <span>📞 {formClient.phone}</span>
                        {formClient.email && <span>✉️ {formClient.email}</span>}
                        {formClient.address && <span>📍 {formClient.address}</span>}
                      </div>
                      {formClient.notes && (
                        <p className="text-gray-500 italic mt-0.5">Notes: {formClient.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Post Title */}
              <div>
                <label className="form-label font-semibold text-gray-900">
                  Post Title / Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Promo Carousel or Brand Story Video"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* Scheduled Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold text-gray-900">
                    Schedule Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label font-semibold text-gray-900">
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Target Platforms */}
              <div>
                <label className="form-label font-semibold text-gray-900 block mb-1.5">
                  Target Platforms
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_PLATFORMS.map((plat) => {
                    const isSelected = form.platforms.includes(plat.id);
                    return (
                      <button
                        type="button"
                        key={plat.id}
                        onClick={() => togglePlatform(plat.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{plat.icon}</span>
                          <span>{plat.name}</span>
                        </span>
                        {isSelected && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Post Type & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold text-gray-900">
                    Post Type
                  </label>
                  <select
                    value={form.postType}
                    onChange={(e) => setForm({ ...form, postType: e.target.value })}
                    className="form-input"
                  >
                    {POST_TYPES.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label font-semibold text-gray-900">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="draft">Draft (Planning)</option>
                    <option value="in_review">In Review (Client Feedback)</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* ============================================================== */}
              {/* IMAGE AND VIDEO UPLOAD STUDIO (OPTION SET) */}
              {/* ============================================================== */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="form-label font-bold text-gray-900 mb-0 flex items-center gap-2">
                      <Layers size={16} className="text-blue-600" /> Media Attachments (Photos & Videos)
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Upload single or multi-photo carousels, or upload high-definition video reels
                    </p>
                  </div>
                  {form.mediaUrls.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {form.mediaUrls.length} {form.mediaUrls.length === 1 ? 'media item' : 'media items'}
                    </span>
                  )}
                </div>

                {/* Option Set Segmented Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUploadOptionTab('images')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      uploadOptionTab === 'images'
                        ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-100'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon size={14} className={uploadOptionTab === 'images' ? 'text-blue-600' : 'text-gray-400'} />
                    <span>Upload Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadOptionTab('video')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      uploadOptionTab === 'video'
                        ? 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-100'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Film size={14} className={uploadOptionTab === 'video' ? 'text-rose-600' : 'text-gray-400'} />
                    <span>Upload Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadOptionTab('url')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      uploadOptionTab === 'url'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-100'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <LinkIcon size={14} className={uploadOptionTab === 'url' ? 'text-indigo-600' : 'text-gray-400'} />
                    <span>Link / URL</span>
                  </button>
                </div>

                {/* Tab 1: Image Upload */}
                {uploadOptionTab === 'images' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFilesDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                        : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
                      onChange={handleFileUploadInput}
                      className="hidden"
                      id="image-file-upload-input"
                    />
                    <label htmlFor="image-file-upload-input" className="cursor-pointer flex flex-col items-center w-full">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                        {isUploading ? (
                          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                        ) : (
                          <Upload size={20} />
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        {isUploading ? 'Uploading photos...' : 'Click to select or drag & drop images'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm">
                        JPG, PNG, WEBP, GIF, SVG • Multiple photos supported for Carousels
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 flex-wrap justify-center">
                        <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">1:1 Square (1080×1080)</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">4:5 Portrait (1080×1350)</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">9:16 Story (1080×1920)</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Tab 2: Video Upload */}
                {uploadOptionTab === 'video' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFilesDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                      isDragging
                        ? 'border-rose-500 bg-rose-50/70 scale-[0.99]'
                        : 'border-rose-200 bg-rose-50/20 hover:border-rose-400 hover:bg-rose-50/40'
                    }`}
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      multiple
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,.mp4,.mov,.webm,.m4v,.mkv"
                      onChange={handleFileUploadInput}
                      className="hidden"
                      id="video-file-upload-input"
                    />
                    <label htmlFor="video-file-upload-input" className="cursor-pointer flex flex-col items-center w-full">
                      <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-2 shadow-xs">
                        {isUploading ? (
                          <div className="animate-spin w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full" />
                        ) : (
                          <Film size={20} />
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        {isUploading ? 'Uploading video file...' : 'Click to select or drag & drop video files'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm">
                        MP4, MOV, WEBM up to 150MB • Reels, Shorts, TikToks & Video Posts
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-rose-600 font-medium">
                        <span className="px-2 py-0.5 rounded bg-rose-100/70 border border-rose-200">🎬 Reels & Shorts (9:16)</span>
                        <span className="px-2 py-0.5 rounded bg-rose-100/70 border border-rose-200">🎥 Landscape Video (16:9)</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Tab 3: Media Link / URL */}
                {uploadOptionTab === 'url' && (
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">Media Direct URL / CDN Link</label>
                        <input
                          type="url"
                          placeholder="https://example.com/video.mp4 or https://images.unsplash.com/..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="form-input text-xs mt-1"
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">Media Type</label>
                        <select
                          value={urlMediaType}
                          onChange={(e) => setUrlMediaType(e.target.value as 'image' | 'video')}
                          className="form-input text-xs mt-1 font-medium"
                        >
                          <option value="image">🖼️ Image</option>
                          <option value="video">🎬 Video</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional media title (e.g. Hero Video)"
                        value={urlName}
                        onChange={(e) => setUrlName(e.target.value)}
                        className="form-input text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddUrlMedia}
                        disabled={!urlInput.trim()}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                      >
                        <Plus size={13} /> Add Link
                      </button>
                    </div>
                  </div>
                )}

                {/* Uploaded Media Manager & Previews */}
                {form.mediaUrls.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Attached Media ({form.mediaUrls.length})
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400">Use arrows to rearrange carousel order</span>
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, mediaUrls: [] }))}
                          className="text-[11px] text-red-600 hover:underline font-medium"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {form.mediaUrls.map((media, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-xl border border-gray-200 overflow-hidden bg-slate-900 group aspect-video flex items-center justify-center shadow-xs"
                        >
                          {media.type === 'video' ? (
                            <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                              <video
                                src={getMediaUrl(media.url)}
                                className="w-full h-full object-cover opacity-80"
                                preload="metadata"
                              />
                              <div
                                onClick={() => openLightbox(form.mediaUrls, idx)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group-hover:bg-black/20 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                                  <Play size={14} fill="white" className="ml-0.5" />
                                </div>
                              </div>
                              <span className="absolute bottom-1 left-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                🎬 Video
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => openLightbox(form.mediaUrls, idx)}
                              className="w-full h-full cursor-pointer relative"
                            >
                              <img
                                src={getMediaUrl(media.url)}
                                alt={media.originalName}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow">
                                🖼️ Image
                              </span>
                            </div>
                          )}

                          {/* Slide Order Badge */}
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                            {idx === 0 ? (
                              <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                #1 Cover
                              </span>
                            ) : (
                              <span className="bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Quick Actions (Move & Delete) */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveMedia(idx, idx - 1)}
                                className="w-6 h-6 rounded-full bg-white/90 text-gray-800 flex items-center justify-center hover:bg-white shadow transition-transform hover:scale-110"
                                title="Move Left / Earlier"
                              >
                                <MoveLeft size={11} />
                              </button>
                            )}
                            {idx < form.mediaUrls.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveMedia(idx, idx + 1)}
                                className="w-6 h-6 rounded-full bg-white/90 text-gray-800 flex items-center justify-center hover:bg-white shadow transition-transform hover:scale-110"
                                title="Move Right / Later"
                              >
                                <MoveRight size={11} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(idx)}
                              className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow transition-transform hover:scale-110"
                              title="Remove media"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* File info footer */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-1.5 text-white flex items-center justify-between text-[10px]">
                            <span className="truncate max-w-[110px]" title={media.originalName}>
                              {media.originalName}
                            </span>
                            {media.size && (
                              <span className="text-[9px] text-gray-300 font-mono">
                                {formatFileSize(media.size)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label font-semibold text-gray-900 mb-0">
                    Caption / Copy Text
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {form.caption.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Write captivating caption, hook, emojis, call to action..."
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  className="form-input text-sm leading-relaxed"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="form-label font-semibold text-gray-900">
                  Hashtags
                </label>
                <input
                  type="text"
                  placeholder="#branding #marketing #business #qatar #socialmedia"
                  value={form.hashtags}
                  onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              {/* CTA Link / URL */}
              <div>
                <label className="form-label font-semibold text-gray-900">
                  Target Link / Call To Action URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/landing-page"
                  value={form.targetUrl}
                  onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label font-semibold text-gray-900">
                  Internal / Client Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Client feedback, specific instructions, designer notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savePostMutation.isPending || isUploading}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {savePostMutation.isPending ? 'Saving...' : editingPost ? 'Update Post' : 'Schedule Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
