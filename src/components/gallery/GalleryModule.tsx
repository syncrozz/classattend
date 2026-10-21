import React, { useState, useMemo } from 'react';
import {
  Announcement,
  EventCategory,
  OperationalPhase,
} from '../../types';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import { CardPencilButton } from '../common/CardPencilButton';
import { AnnouncementEditModal } from '../announcements/AnnouncementEditModal';
import {
  Image as ImageIcon,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Calendar,
  Clock,
  Pin,
  Tag,
  Eye,
  Layers,
  Archive,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  FolderOpen,
  AlertTriangle,
  ChevronRight,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface GalleryModuleProps {
  announcements: Announcement[];
  categories: EventCategory[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  activePhase?: 'pre-final' | 'during-final';
  onOpenBatchUploadModal: () => void;
  onOpenTelegramPublishModal: () => void;
  onUpdateAnnouncement: (ann: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onSupersedeAnnouncement: (id: string, isSuperseded: boolean, reason?: string) => Promise<void>;
}

export const GalleryModule: React.FC<GalleryModuleProps> = ({
  announcements,
  categories,
  isAdmin,
  inlineEditMode,
  activePhase = 'pre-final',
  onOpenBatchUploadModal,
  onOpenTelegramPublishModal,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onSupersedeAnnouncement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [showSuperseded, setShowSuperseded] = useState(false);

  // Quick category changer modal state
  const [movingItem, setMovingItem] = useState<Announcement | null>(null);
  const [newCategoryTarget, setNewCategoryTarget] = useState<string>('');
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  // Lightbox Modal state
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

  // Master category dictionary
  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; description?: string }>();
    categories.forEach((c) => {
      map.set(c.id, { name: c.name, description: c.description });
    });
    // Add operational categories
    map.set('pendaftaran', { name: 'Pendaftaran Peserta', description: 'Infografik pendaftaran, kad matrik & semakan kelayakan' });
    map.set('jadual', { name: 'Jadual Pertandingan', description: 'Jadual carta rasmi, masa bertanding & giliran' });
    map.set('peraturan', { name: 'Peraturan & Syarat', description: 'Syarat pertandingan, etika & garis panduan kontinjen' });
    map.set('penginapan', { name: 'Penginapan & Kebajikan', description: 'Kolej kediaman, peraturan bilik & keselamatan' });
    map.set('pengangkutan', { name: 'Pengangkutan & Bas', description: 'Jadual bas kontinjen, laluan & masa berlepas' });
    map.set('lokasi', { name: 'Lokasi & Venue', description: 'Pelan lantai, arah lokasi & bilik menunggu' });
    map.set('keputusan', { name: 'Keputusan Pertandingan', description: 'Keputusan rasmi, markah & senarai pemenang' });
    map.set('majlis-penutupan', { name: 'Majlis Penutup', description: 'Atur cara penutup, perarakan & raptai istiadat' });
    map.set('general', { name: 'Pengumuman Umum', description: 'Hebahan am dan notis rasmi Urus Setia Kontinjen' });
    return map;
  }, [categories]);

  const getCategoryTitle = (catId: string) => {
    return categoryMap.get(catId)?.name || catId;
  };

  // Filter announcements that actually have images
  const posterItems = useMemo(() => {
    return announcements.filter((a) => {
      // Must have an image URL
      if (!a.imageUrl) return false;

      // Draft protection: non-admins never see drafts
      if (!isAdmin && a.status === 'draft') return false;

      // Superseded / Archive filter
      if (!showSuperseded && a.isSuperseded) return false;

      // Phase filter
      if (phaseFilter !== 'all' && a.phase !== 'all' && a.phase !== phaseFilter) return false;

      // Category filter
      if (selectedCategoryFilter !== 'all' && a.category !== selectedCategoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = a.title?.toLowerCase().includes(query);
        const descMatch = a.content?.toLowerCase().includes(query);
        const catMatch = getCategoryTitle(a.category).toLowerCase().includes(query);
        const tagsMatch = a.tags?.some((t) => t.toLowerCase().includes(query));
        const datesMatch = a.importantDates?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !catMatch && !tagsMatch && !datesMatch) return false;
      }

      return true;
    });
  }, [announcements, isAdmin, showSuperseded, phaseFilter, selectedCategoryFilter, searchQuery, categoryMap]);

  // Group items by category for vertical scrolling
  const groupedCategories = useMemo(() => {
    const groups: { categoryId: string; categoryName: string; description?: string; items: Announcement[] }[] = [];
    const categoryBuckets = new Map<string, Announcement[]>();

    posterItems.forEach((item) => {
      const cat = item.category || 'general';
      if (!categoryBuckets.has(cat)) {
        categoryBuckets.set(cat, []);
      }
      categoryBuckets.get(cat)!.push(item);
    });

    // Sort categories consistently: standard categories first, then events
    categoryBuckets.forEach((items, catId) => {
      const catInfo = categoryMap.get(catId);
      groups.push({
        categoryId: catId,
        categoryName: catInfo?.name || catId,
        description: catInfo?.description,
        items,
      });
    });

    // Sort groups alphabetically by name
    return groups.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [posterItems, categoryMap]);

  // Distinct category list for filter tabs with count
  const categoryFiltersWithCount = useMemo(() => {
    const counts = new Map<string, number>();
    announcements
      .filter((a) => !!a.imageUrl && (isAdmin || a.status !== 'draft'))
      .forEach((a) => {
        counts.set(a.category, (counts.get(a.category) || 0) + 1);
      });

    return Array.from(counts.entries()).map(([catId, count]) => ({
      id: catId,
      name: getCategoryTitle(catId),
      count,
    }));
  }, [announcements, isAdmin, categoryMap]);

  // Handle move category
  const handleConfirmMoveCategory = async () => {
    if (!movingItem || !newCategoryTarget) return;
    try {
      await onUpdateAnnouncement({
        id: movingItem.id,
        category: newCategoryTarget,
      });
      setMovingItem(null);
    } catch (err) {
      console.error('Error moving category:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Hero / Header Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <ImageIcon className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Galeri Poster & Infografik Kontinjen
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Pusat rujukan visual rasmi: jadual pertandingan, panduan pendaftaran, penginapan dan hebahan acara SOAR 2026.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Fast Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={onOpenBatchUploadModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Muat Naik Poster (AI Assisted)</span>
              </button>

              <button
                type="button"
                onClick={onOpenTelegramPublishModal}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mesej Telegram</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tajuk, huraian, tag atau kategori..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Phase Filter & Superseded Toggle */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Phase Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-medium text-slate-500">Fasa:</span>
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Fasa</option>
                <option value="pre-final">Fasa A: Pra-Final</option>
                <option value="during-final">Fasa B: Semasa Final</option>
              </select>
            </div>

            {/* Show Superseded Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={showSuperseded}
                onChange={(e) => setShowSuperseded(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Termasuk Poster Diganti / Arkib</span>
            </label>
          </div>
        </div>

        {/* Quick Category Jump-To Bar */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            Semua ({posterItems.length})
          </button>

          {categoryFiltersWithCount.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedCategoryFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategoryFilter === cat.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Categorized Display */}
      {groupedCategories.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Tiada Poster atau Infografik</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `Tiada poster sepadan dengan carian "${searchQuery}". Cuba kata kunci lain.`
              : 'Belum ada poster atau infografik diterbitkan bagi kategori ini.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenBatchUploadModal}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
            >
              Muat Naik Gambar Sekarang
            </button>
          )}
        </div>
      ) : (
        /* Continuous Vertical Scroll of All Categories */
        <div className="space-y-10">
          {groupedCategories.map((group) => (
            <section
              key={group.categoryId}
              id={`category-${group.categoryId}`}
              className="space-y-4"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {group.categoryName}
                  </h2>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {group.items.length} {group.items.length === 1 ? 'poster' : 'poster'}
                  </span>
                </div>
                {group.description && (
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {group.description}
                  </p>
                )}
              </div>

              {/* Grid of Posters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`relative bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group ${
                      item.isSuperseded ? 'border-amber-200 bg-amber-50/20 opacity-80' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Right Pencil for Admin */}
                    <CardPencilButton
                      isAdmin={isAdmin}
                      onClick={() => setEditingItem(item)}
                      title="Edit Maklumat Poster / Sub-header (Admin)"
                    />

                    {/* Poster Image Container - STRICT ASPECT RATIO PRESERVATION & NO CROP */}
                    <div
                      onClick={() =>
                        setLightbox({
                          isOpen: true,
                          imageUrl: item.imageUrl!,
                          title: item.title,
                          caption: item.content,
                          category: group.categoryName,
                          author: item.author,
                        })
                      }
                      className="relative w-full aspect-3/4 sm:aspect-4/5 bg-slate-900/5 cursor-pointer overflow-hidden flex items-center justify-center p-2"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />

                      {/* Zoom Overlay Hint */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-xs rounded-full text-xs font-semibold">
                          <Eye className="w-4 h-4" />
                          <span>Buka Penuh</span>
                        </span>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 pointer-events-none">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold shadow-xs">
                            <Pin className="w-3 h-3" />
                            PIN
                          </span>
                        )}
                        {item.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-bold shadow-xs">
                            SEGERA
                          </span>
                        )}
                        {item.isSuperseded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-bold shadow-xs">
                            <Archive className="w-3 h-3" />
                            DIGANTI
                          </span>
                        )}
                      </div>

                      {/* Collection badge */}
                      {item.collectionName && (
                        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded-md text-[10px] font-medium">
                            <Layers className="w-3 h-3 text-indigo-300" />
                            {item.collectionName}
                            {item.collectionIndex && ` #${item.collectionIndex}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Description Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {item.title}
                        </h3>

                        {item.content && (
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {item.content}
                          </p>
                        )}

                        {/* Extracted Dates Notice */}
                        {item.importantDates && (
                          <div className="mt-2 p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span className="leading-tight">{item.importantDates}</span>
                          </div>
                        )}

                        {/* Superseded Reason note */}
                        {item.isSuperseded && item.supersededReason && (
                          <div className="mt-2 p-2 bg-slate-100 rounded-lg text-[11px] text-slate-600 italic">
                            Nota: {item.supersededReason}
                          </div>
                        )}
                      </div>

                      {/* Footer Info: Tags, Date & External Link */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{item.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Date and External link button */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.timestamp ? item.timestamp.split(',')[0] : 'Terkini'}
                          </span>

                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                            >
                              <span>{item.externalUrlLabel || 'Saluran Telegram'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Admin Inline Action Controls */}
                        {isAdmin && (
                          <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setMovingItem(item);
                                setNewCategoryTarget(item.category);
                              }}
                              className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 p-1 hover:bg-slate-50 rounded cursor-pointer"
                              title="Tukar Kategori"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Alih Kategori</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onSupersedeAnnouncement(
                                  item.id,
                                  !item.isSuperseded,
                                  item.isSuperseded ? undefined : 'Diganti oleh infografik terkini'
                                )
                              }
                              className={`font-medium flex items-center gap-1 p-1 rounded cursor-pointer ${
                                item.isSuperseded
                                  ? 'text-emerald-700 hover:bg-emerald-50'
                                  : 'text-amber-700 hover:bg-amber-50'
                              }`}
                              title={item.isSuperseded ? 'Aktifkan Semula' : 'Tanda Sebagai Diganti'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>{item.isSuperseded ? 'Pulihkan' : 'Diganti'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Adakah anda pasti ingin memadam poster ini?')) {
                                  onDeleteAnnouncement(item.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer"
                              title="Padam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox.isOpen && (
        <PosterLightboxModal
          isOpen={lightbox.isOpen}
          onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
          imageUrl={lightbox.imageUrl}
          title={lightbox.title}
          caption={lightbox.caption}
          category={lightbox.category}
          author={lightbox.author}
        />
      )}

      {/* Move Category Quick Modal */}
      {movingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Pindahkan Kategori Poster
            </h3>
            <p className="text-xs text-slate-500">
              Pilih kategori destinasi untuk poster <strong className="text-slate-800">"{movingItem.title}"</strong>:
            </p>

            <select
              value={newCategoryTarget}
              onChange={(e) => setNewCategoryTarget(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {Array.from(categoryMap.entries()).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveCategory}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingItem && (
        <AnnouncementEditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          announcementToEdit={editingItem}
          onSave={onUpdateAnnouncement}
        />
      )}
    </div>
  );
};
