import { useState, useRef } from 'react';
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
  SlidersHorizontal, Film, Eye, Sparkles, Download
} from 'lucide-react';

interface MediaItem {
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
  { id: 'post', label: 'Feed Post', icon: ImageIcon },
  { id: 'reel', label: 'Reel / Short', icon: Film },
  { id: 'carousel', label: 'Carousel', icon: Sparkles },
  { id: 'story', label: 'Story', icon: Clock },
  { id: 'video', label: 'Long Video', icon: VideoIcon },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string; bg: string }> = {
  draft: { label: 'Draft', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', bg: 'border-l-amber-400' },
  in_review: { label: 'In Review', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', bg: 'border-l-blue-500' },
  approved: { label: 'Approved', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', bg: 'border-l-indigo-500' },
  scheduled: { label: 'Scheduled', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', bg: 'border-l-purple-500' },
  published: { label: 'Published', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bg: 'border-l-emerald-500' },
};

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [form, setForm] = useState(defaultForm);

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

  // Selected client object for details card
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

  // File Upload Handler (Image & Video)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('media', files[i]);
    }

    try {
      setIsUploading(true);
      const res = await api.post('/social-media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newMediaItems: MediaItem[] = res.data;
      setForm((prev) => ({
        ...prev,
        mediaUrls: [...prev.mediaUrls, ...newMediaItems],
      }));
      toast.success(`${newMediaItems.length} media file(s) uploaded`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }));
  };

  // Open Form
  const openNewPostModal = (dateStr?: string) => {
    setEditingPost(null);
    setForm({
      ...defaultForm,
      clientId: selectedClientFilter !== 'all' ? Number(selectedClientFilter) : (clients[0]?.id || ''),
      scheduledDate: dateStr || format(new Date(), 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  const openEditModal = (post: SocialPost) => {
    setEditingPost(post);
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

  // Toggle platform selection in form
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

  // Copy caption & hashtags to clipboard
  const handleCopyCaption = (post: SocialPost) => {
    const textToCopy = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    toast.success('Caption & hashtags copied to clipboard!');
  };

  // Client selected in the form modal
  const formClient = clients.find((c) => c.id === Number(form.clientId));

  // Calendar dates calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Filter posts based on search query
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
  const pendingCount = filteredPosts.filter((p) => p.status === 'draft' || p.status === 'in_review').length;

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
              <p className="text-xs text-gray-500">Plan, organize and preview client content across all platforms</p>
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
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{publishedCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check size={16} />
          </div>
        </div>
        <div className="card py-3 px-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Draft / Review</span>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{pendingCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
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

        {/* Selected Client Overview Card (Active Client Details) */}
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
                  className={`min-h-[140px] p-2 flex flex-col justify-between transition-colors relative group ${
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
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[115px] pr-0.5">
                    {dayPosts.map((post) => {
                      const statusInfo = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                      const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
                      const hasVideo = post.mediaUrls?.some((m) => m.type === 'video');
                      const firstImage = post.mediaUrls?.find((m) => m.type === 'image');

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

                          {/* Media Thumbnail snippet if present */}
                          {hasMedia && (
                            <div className="relative mb-1 rounded overflow-hidden h-10 bg-slate-900 flex items-center justify-center">
                              {firstImage ? (
                                <img
                                  src={firstImage.url}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-white text-[10px] flex items-center gap-1 font-semibold">
                                  <VideoIcon size={12} className="text-rose-400" /> Video
                                </div>
                              )}
                              {hasVideo && (
                                <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5 text-white">
                                  <Play size={10} fill="white" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Title */}
                          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                            {post.title}
                          </p>

                          {/* Client Name Badge */}
                          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                            <span className="truncate max-w-[80px] font-medium text-blue-600">
                              {post.client?.name}
                            </span>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
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
                        <div className="relative mb-3 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center group">
                          {firstMedia.type === 'video' ? (
                            <div className="w-full h-full relative">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/80 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play size={18} fill="currentColor" />
                                </div>
                              </div>
                              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                <VideoIcon size={10} /> Video
                              </span>
                            </div>
                          ) : (
                            <img
                              src={firstMedia.url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {post.mediaUrls.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              +{post.mediaUrls.length - 1} more
                            </span>
                          )}
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
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium uppercase">
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
                    <span className="text-xs text-gray-400">Click media to view full size</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePostDetails.mediaUrls.map((media, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 overflow-hidden bg-slate-950 shadow-sm relative group"
                      >
                        {media.type === 'video' ? (
                          <div className="w-full">
                            <video
                              src={media.url}
                              controls
                              className="w-full max-h-64 object-contain bg-black"
                            />
                            <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-xs">
                              <span className="truncate text-slate-300 max-w-[200px]">
                                {media.originalName}
                              </span>
                              <a
                                href={media.url}
                                download
                                className="text-blue-400 hover:text-white flex items-center gap-1"
                              >
                                <Download size={12} /> Save
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={media.url}
                              alt={media.originalName}
                              className="w-full h-56 object-cover cursor-pointer"
                              onClick={() => setPreviewMedia(media)}
                            />
                            <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-xs">
                              <span className="truncate text-slate-300 max-w-[200px]">
                                {media.originalName}
                              </span>
                              <button
                                onClick={() => setPreviewMedia(media)}
                                className="text-blue-400 hover:text-white flex items-center gap-1"
                              >
                                <Eye size={12} /> Expand
                              </button>
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
      {/* LIGHTBOX FOR FULL IMAGE PREVIEW */}
      {/* ============================================================== */}
      {previewMedia && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
            >
              <X size={24} />
            </button>
            <img
              src={previewMedia.url}
              alt={previewMedia.originalName}
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
            />
            <p className="text-white text-xs mt-3 text-center">{previewMedia.originalName}</p>
          </div>
        </div>
      )}

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
              {/* IMAGE AND VIDEO UPLOAD SECTION */}
              {/* ============================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="form-label font-semibold text-gray-900 mb-0">
                    Images & Videos Attachments
                  </label>
                  <span className="text-xs text-gray-400">
                    Images (JPG, PNG, WEBP) & Videos (MP4, MOV, WEBM) up to 150MB
                  </span>
                </div>

                {/* Upload Trigger Area */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="media-file-input"
                />

                <label
                  htmlFor="media-file-input"
                  className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isUploading
                      ? 'border-blue-400 bg-blue-50/50'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                    {isUploading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                    ) : (
                      <Share2 size={18} />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    {isUploading ? 'Uploading media...' : 'Click to upload or drag & drop images and videos'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Select multiple images for carousels or high quality videos for reels & posts
                  </p>
                </label>

                {/* Uploaded Media Previews */}
                {form.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {form.mediaUrls.map((media, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl border border-gray-200 overflow-hidden bg-slate-900 group aspect-video flex items-center justify-center"
                      >
                        {media.type === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center">
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play size={20} className="text-white" fill="white" />
                            </div>
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                              Video
                            </span>
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={media.originalName}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow-md transition-opacity"
                          title="Remove media"
                        >
                          <X size={12} />
                        </button>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-white text-[10px] truncate">
                          {media.originalName}
                        </div>
                      </div>
                    ))}
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
