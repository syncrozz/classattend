import React, { useState } from 'react';
import { Announcement, EventCategory, OperationalPhase } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import {
  Bell,
  Search,
  Pin,
  ExternalLink,
  Plus,
  AlertTriangle,
  Clock,
  User,
  Send,
  Upload,
  Copy,
  Check,
  Eye,
  Filter,
  Sparkles,
} from 'lucide-react';

interface AnnouncementsModuleProps {
  announcements: Announcement[];
  categories: EventCategory[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  activePhase?: 'pre-final' | 'during-final';
  onOpenTelegramPublish: (defaultCategory?: string, editItem?: Announcement | null) => void;
  onOpenBatchUploadModal?: () => void;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
}

export const AnnouncementsModule: React.FC<AnnouncementsModuleProps> = ({
  announcements,
  categories,
  isAdmin,
  inlineEditMode,
  activePhase = 'pre-final',
  onOpenTelegramPublish,
  onOpenBatchUploadModal,
  onDeleteAnnouncement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    caption?: string;
    category?: string;
    author?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ann.category === categoryFilter;
    const matchesPhase = phaseFilter === 'all' || ann.phase === 'all' || ann.phase === phaseFilter;
    const matchesStatus = statusFilter === 'all' || ann.status === statusFilter;

    return matchesSearch && matchesPriority && matchesCategory && matchesPhase && matchesStatus;
  });

  // Sort pinned first, then by timestamp
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ms-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Hebahan Rasmi & Telegram Feed
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Saluran mesej segera, arahan terkini kontinjen, dan poster infografik SOAR 2026.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onOpenBatchUploadModal && (
              <button
                type="button"
                onClick={onOpenBatchUploadModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Muat Naik Poster (AI)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenTelegramPublish()}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-blue-200" />
              <span>Terbit dari Telegram</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mesej arahan, kata kunci, atau acara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Phase Filter */}
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="all">Semua Fasa Operasi</option>
            <option value="pre-final">Fasa A: Pra-Final Persediaan</option>
            <option value="during-final">Fasa B: Semasa Final</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="all">Semua Acara / Kategori</option>
            <option value="general">Urus Setia / Hebahan Am</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="all">Semua Keutamaan</option>
            <option value="urgent">Segera / Urgent Sahaja</option>
            <option value="important">Penting Sahaja</option>
            <option value="general">Biasa</option>
          </select>

          {/* Admin Draft Filter */}
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">Status: Semua (Termasuk Draf)</option>
              <option value="published">Diterbitkan Sahaja</option>
              <option value="draft">Draf Sahaja (Belum Terbit)</option>
            </select>
          )}
        </div>
      </div>

      {/* Announcements Feed */}
      {sortedAnnouncements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {searchQuery || categoryFilter !== 'all' || phaseFilter !== 'all'
              ? 'Tiada Mesej Sepadan'
              : 'Belum Ada Mesej Diterbitkan'}
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {searchQuery || categoryFilter !== 'all' || phaseFilter !== 'all'
              ? 'Sila ubah kata kunci atau pilihan tapisan anda.'
              : 'Mesej, arahan segera, dan poster infografik dari Telegram akan dipaparkan di sini.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onOpenTelegramPublish()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Terbitkan Mesej Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAnnouncements.map((ann) => {
            const isUrgent = ann.priority === 'urgent';
            const isImportant = ann.priority === 'important';
            const isDraft = ann.status === 'draft';
            const categoryObj = categories.find((c) => c.id === ann.category);
            const categoryLabel = categoryObj?.name || ann.category;

            return (
              <article
                key={ann.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all space-y-3 ${
                  isDraft
                    ? 'border-amber-300 bg-amber-50/20'
                    : isUrgent
                    ? 'border-rose-200 bg-rose-50/20'
                    : isImportant
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isDraft && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                          Draf (Belum Terbit)
                        </span>
                      )}
                      {ann.isPinned && (
                        <span title="Pinned notice" className="text-amber-500 flex items-center gap-1 text-[11px] font-bold">
                          <Pin className="w-3.5 h-3.5 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Segera</span>
                        </span>
                      )}

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {ann.title}
                      </h3>
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {categoryLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(ann.timestamp)}</span>
                      </div>
                      <span aria-hidden="true">·</span>
                      <span>Oleh: {ann.author}</span>
                      {ann.phase && ann.phase !== 'all' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-slate-600">
                            {ann.phase === 'pre-final' ? 'Fasa Pra-Final' : 'Fasa Final'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <InlineEditTrigger
                        onClick={() => onOpenTelegramPublish(ann.category, ann)}
                        size="sm"
                        label="Edit"
                      />
                    </div>
                  )}
                </div>

                {/* Message Content (Telegram-style raw preservation) */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 font-sans">
                  {ann.content}
                </div>

                {/* Attached Poster / Image if present */}
                {ann.imageUrl && (
                  <div className="pt-1">
                    <div
                      onClick={() =>
                        setLightbox({
                          isOpen: true,
                          imageUrl: ann.imageUrl!,
                          title: ann.title,
                          caption: ann.imageCaption || ann.content,
                          category: categoryLabel,
                          author: ann.author,
                        })
                      }
                      className="inline-block relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 cursor-pointer group max-w-sm"
                    >
                      <img
                        src={ann.imageUrl}
                        alt={ann.title}
                        className="max-h-64 w-auto object-contain rounded-lg group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Ketik untuk Besarkan Poster</span>
                      </div>
                    </div>
                    {ann.imageCaption && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">{ann.imageCaption}</p>
                    )}
                  </div>
                )}

                {/* Bottom action row: Copy text & Telegram link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopyText(ann.id, `${ann.title}\n\n${ann.content}`)}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {copiedId === ann.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Teks Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Salin Teks Mesej</span>
                      </>
                    )}
                  </button>

                  {ann.externalUrl && (
                    <a
                      href={ann.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                    >
                      <span>{ann.externalUrlLabel || 'Buka di Telegram'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Poster Lightbox Modal */}
      <PosterLightboxModal
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox({ ...lightbox, isOpen: false })}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        caption={lightbox.caption}
        category={lightbox.category}
        author={lightbox.author}
      />
    </div>
  );
};
