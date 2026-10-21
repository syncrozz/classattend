import React, { useState } from 'react';
import {
  PortalData,
  Announcement,
  ScheduleItem,
  EventCategory,
  PortalSettings,
} from '../../types';
import { EditableSectionHeader } from '../common/EditableSectionHeader';
import { CardPencilButton } from '../common/CardPencilButton';
import { PhaseBanner } from '../common/PhaseBanner';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import { ScheduleEditModal } from '../schedule/ScheduleEditModal';
import { CategoryEditModal } from '../events/CategoryEditModal';
import { AnnouncementEditModal } from '../announcements/AnnouncementEditModal';
import { QuickCardEditModal } from '../common/QuickCardEditModal';
import {
  Calendar,
  FileText,
  MapPin,
  Shield,
  Phone,
  AlertTriangle,
  ChevronRight,
  Clock,
  Pin,
  Send,
  Upload,
  Sparkles,
  Layers,
  Music,
  Drama,
  Radio,
  Megaphone,
  Award,
  Bus,
  Home,
  Eye,
} from 'lucide-react';

interface HomeModuleProps {
  data: PortalData;
  isAdmin: boolean;
  inlineEditMode: boolean;
  onNavigateTab: (tabId: string) => void;
  onEditSettings?: () => void;
  onOpenPublishModal: () => void;
  onOpenBatchUploadModal?: () => void;
  onUpdatePhase: (phase: 'pre-final' | 'during-final') => Promise<void>;
  onSaveSubheader: (sectionKey: string, newTitle: string) => Promise<void>;
  onSaveSchedule?: (schedule: Partial<ScheduleItem>) => Promise<void>;
  onSaveCategory?: (category: Partial<EventCategory>) => Promise<void>;
  onSaveAnnouncement?: (announcement: Partial<Announcement>) => Promise<void>;
  onUpdateSettings?: (settings: PortalSettings) => Promise<void>;
}

export const HomeModule: React.FC<HomeModuleProps> = ({
  data,
  isAdmin,
  inlineEditMode,
  onNavigateTab,
  onEditSettings,
  onOpenPublishModal,
  onOpenBatchUploadModal,
  onUpdatePhase,
  onSaveSubheader,
  onSaveSchedule,
  onSaveCategory,
  onSaveAnnouncement,
  onUpdateSettings,
}) => {
  const { settings, announcements, schedules, documents, locations, categories = [] } = data;
  const isPreFinal = settings.activePhase === 'pre-final';
  const customSubheaders = settings.customSubheaders || {};

  // Lightbox state for viewing posters
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

  // Admin Card Edit Modal States
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleItem | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<EventCategory | null>(null);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);

  // Quick Card Edit State for static/shortcut cards
  const [quickCardModal, setQuickCardModal] = useState<{
    isOpen: boolean;
    title: string;
    keyHeading: string;
    keyDesc?: string;
    initialHeading: string;
    initialDesc: string;
  }>({
    isOpen: false,
    title: '',
    keyHeading: '',
    initialHeading: '',
    initialDesc: '',
  });

  // Filter urgent & pinned announcements
  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');
  const latestUrgent = urgentAnnouncements[0];

  // Pinned or latest announcements (relevant to phase or 'all')
  const relevantAnnouncements = announcements.filter(
    (a) => a.phase === 'all' || a.phase === settings.activePhase
  );

  const pinnedAnnouncements = relevantAnnouncements.filter((a) => a.isPinned);
  const displayAnnouncements =
    pinnedAnnouncements.length > 0 ? pinnedAnnouncements : relevantAnnouncements.slice(0, 3);

  // Filter schedules relevant to active phase
  const phaseSchedules = schedules.filter(
    (s) => !s.phase || s.phase === 'all' || s.phase === settings.activePhase
  );

  // Posters & visual circulars (announcements that have imageUrl)
  const posterAnnouncements = announcements.filter((a) => !!a.imageUrl).slice(0, 4);

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'symphonic-duo':
        return <Music className="w-4 h-4 text-purple-600" />;
      case 'islamic-theatre':
        return <Drama className="w-4 h-4 text-emerald-600" />;
      case 'battle-of-the-bands':
        return <Radio className="w-4 h-4 text-rose-600" />;
      case 'tarian-zapin':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      case 'street-dakwah':
        return <Megaphone className="w-4 h-4 text-blue-600" />;
      case 'majlis-penutupan':
        return <Award className="w-4 h-4 text-indigo-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleSaveQuickCard = async (heading: string, description: string) => {
    if (!onUpdateSettings) return;
    const updatedCustom = {
      ...(settings.customSubheaders || {}),
      [quickCardModal.keyHeading]: heading,
      ...(quickCardModal.keyDesc ? { [quickCardModal.keyDesc]: description } : {}),
    };
    await onUpdateSettings({
      ...settings,
      customSubheaders: updatedCustom,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. URGENT ANNOUNCEMENT TICKER (Highest Priority) */}
      {latestUrgent && (
        <div className="relative bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          {/* Top Right Pencil for Urgent Card */}
          <CardPencilButton
            isAdmin={isAdmin}
            onClick={() => setAnnouncementToEdit(latestUrgent)}
            title="Edit Arahan Segera (Admin)"
          />

          <div className="flex items-start gap-3 pr-8 sm:pr-0">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">
                  {customSubheaders['urgent_badge'] || 'Arahan Segera'}
                </span>
                <span className="text-xs font-bold text-slate-900">{latestUrgent.title}</span>
              </div>
              <p className="text-xs text-slate-700 line-clamp-2 mt-0.5 whitespace-pre-line leading-relaxed">
                {latestUrgent.content}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 self-end sm:self-auto cursor-pointer shrink-0"
          >
            <span>Lihat Semua Hebahan</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. OPERATIONAL PHASE BANNER (Pre-Final vs During Final) */}
      <PhaseBanner
        settings={settings}
        isAdmin={isAdmin}
        onUpdatePhase={onUpdatePhase}
      />

      {/* ADMIN QUICK PUBLISHING BAR (Copy from Telegram / Upload Poster) */}
      {isAdmin && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                Pusat Terbitan Pantas Telegram
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Salin mesej teks atau muat naik poster terus dari Telegram untuk rujukan segera kontinjen.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onOpenBatchUploadModal && (
              <button
                type="button"
                onClick={onOpenBatchUploadModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Muat Naik Poster (AI)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenPublishModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-blue-300" />
              <span>Terbit dari Telegram</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. TODAY'S ACTIVITIES & NEXT SCHEDULE (Phase-focused) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <EditableSectionHeader
          sectionKey="home_schedule"
          defaultTitle={
            isPreFinal
              ? 'Jadual Raptai & Persediaan Terkini'
              : 'Jadual Perlawanan & Giliran Hari Ini'
          }
          customSubheaders={customSubheaders}
          icon={<Calendar className="w-4 h-4 text-indigo-600" />}
          isAdmin={isAdmin}
          onSaveSubheader={onSaveSubheader}
          actionButton={
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Jadual</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        {phaseSchedules.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs text-slate-500">
              {isPreFinal
                ? 'Jadual raptai dan taklimat akan dikemas kini oleh Urus Setia.'
                : 'Jadual pertandingan rasmi hari ini akan dipaparkan di sini.'}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + Tambah Jadual
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {phaseSchedules.slice(0, 3).map((sch) => (
              <div
                key={sch.id}
                onClick={() => onNavigateTab('schedule')}
                className="relative group p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Pencil on top right of schedule card */}
                <CardPencilButton
                  isAdmin={isAdmin}
                  onClick={() => setScheduleToEdit(sch)}
                  title="Edit Jadual / Sub-header Card (Admin)"
                />

                <div className="pr-6">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="text-xs font-bold text-slate-900">{sch.categoryName}</h4>
                    {sch.performanceOrder && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {sch.performanceOrder}
                      </span>
                    )}
                  </div>
                  {sch.subcategory && (
                    <p className="text-[11px] text-slate-500 mb-2">{sch.subcategory}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  {sch.time && (
                    <div className="flex items-center gap-1 font-mono text-indigo-600 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{sch.time}</span>
                    </div>
                  )}
                  {sch.venue && (
                    <div className="flex items-center gap-1 truncate max-w-[140px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{sch.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. SOAR 2026 EVENT CHANNELS (Direct access to Telegram-style categories) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <EditableSectionHeader
          sectionKey="home_events"
          defaultTitle="Saluran Acara & Pasukan SOAR 2026"
          customSubheaders={customSubheaders}
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
          isAdmin={isAdmin}
          onSaveSubheader={onSaveSubheader}
          actionButton={
            <button
              type="button"
              onClick={() => onNavigateTab('events')}
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Acara</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.slice(0, 6).map((cat) => (
            <div
              key={cat.id}
              className="relative group p-3 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => onNavigateTab('events')}
            >
              {/* Pencil on top right of category card */}
              <CardPencilButton
                isAdmin={isAdmin}
                onClick={() => setCategoryToEdit(cat)}
                title={`Edit Kategori ${cat.name} (Admin)`}
              />

              <div className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                {getCategoryIcon(cat.id)}
              </div>
              <div className="pr-4">
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{cat.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. POSTERS & INFOGRAPHICS GALLERY (Direct visual updates from Telegram) */}
      {posterAnnouncements.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <EditableSectionHeader
            sectionKey="home_posters"
            defaultTitle="Poster & Infografik Terkini"
            customSubheaders={customSubheaders}
            icon={<Upload className="w-4 h-4 text-indigo-600" />}
            isAdmin={isAdmin}
            onSaveSubheader={onSaveSubheader}
            actionButton={
              <button
                type="button"
                onClick={() => onNavigateTab('gallery')}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Galeri Poster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {posterAnnouncements.map((post) => (
              <div
                key={post.id}
                onClick={() =>
                  setLightbox({
                    isOpen: true,
                    imageUrl: post.imageUrl!,
                    title: post.title,
                    caption: post.imageCaption || post.content,
                    category: post.category,
                    author: post.author,
                  })
                }
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-3/4 cursor-pointer hover:shadow-md transition-all flex items-center justify-center p-1"
              >
                {/* Pencil on top right of poster card */}
                <CardPencilButton
                  isAdmin={isAdmin}
                  onClick={() => setAnnouncementToEdit(post)}
                  title="Edit Maklumat Poster (Admin)"
                />

                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end text-white">
                  <h4 className="text-xs font-bold line-clamp-2">{post.title}</h4>
                  <span className="text-[10px] text-white/70 mt-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Ketik untuk besarkan</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. LOGISTICS: ACCOMMODATION, TRANSPORT & VENUES SHORTCUTS */}
      <div className="space-y-3">
        <EditableSectionHeader
          sectionKey="home_logistics"
          defaultTitle="Panduan Logistik & Rujukan Kontinjen"
          customSubheaders={customSubheaders}
          icon={<Home className="w-4 h-4 text-indigo-600" />}
          isAdmin={isAdmin}
          onSaveSubheader={onSaveSubheader}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Penginapan & Bilik */}
          <div
            className="relative group bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
            onClick={() => onNavigateTab('locations')}
          >
            <CardPencilButton
              isAdmin={isAdmin}
              onClick={() =>
                setQuickCardModal({
                  isOpen: true,
                  title: 'Edit Card Penginapan',
                  keyHeading: 'shortcut_penginapan_title',
                  keyDesc: 'shortcut_penginapan_desc',
                  initialHeading:
                    customSubheaders['shortcut_penginapan_title'] || 'Penginapan & Bilik',
                  initialDesc:
                    customSubheaders['shortcut_penginapan_desc'] ||
                    'Penempatan kolej kediaman, waktu daftar & urus setia penginapan.',
                })
              }
              title="Edit Card Penginapan (Admin)"
            />
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
              <Home className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5 pr-6">
              {customSubheaders['shortcut_penginapan_title'] || 'Penginapan & Bilik'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {customSubheaders['shortcut_penginapan_desc'] ||
                'Penempatan kolej kediaman, waktu daftar & urus setia penginapan.'}
            </p>
          </div>

          {/* Card 2: Pengangkutan & Bas */}
          <div
            className="relative group bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
            onClick={() => onNavigateTab('locations')}
          >
            <CardPencilButton
              isAdmin={isAdmin}
              onClick={() =>
                setQuickCardModal({
                  isOpen: true,
                  title: 'Edit Card Pengangkutan',
                  keyHeading: 'shortcut_pengangkutan_title',
                  keyDesc: 'shortcut_pengangkutan_desc',
                  initialHeading:
                    customSubheaders['shortcut_pengangkutan_title'] || 'Pengangkutan & Bas',
                  initialDesc:
                    customSubheaders['shortcut_pengangkutan_desc'] ||
                    'Jadual pergerakan bas pergi-balik ke venue pertandingan.',
                })
              }
              title="Edit Card Pengangkutan (Admin)"
            />
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
              <Bus className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5 pr-6">
              {customSubheaders['shortcut_pengangkutan_title'] || 'Pengangkutan & Bas'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {customSubheaders['shortcut_pengangkutan_desc'] ||
                'Jadual pergerakan bas pergi-balik ke venue pertandingan.'}
            </p>
          </div>

          {/* Card 3: Buku Panduan & Syarat */}
          <div
            className="relative group bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
            onClick={() => onNavigateTab('documents')}
          >
            <CardPencilButton
              isAdmin={isAdmin}
              onClick={() =>
                setQuickCardModal({
                  isOpen: true,
                  title: 'Edit Card Buku Panduan',
                  keyHeading: 'shortcut_dokumen_title',
                  keyDesc: 'shortcut_dokumen_desc',
                  initialHeading:
                    customSubheaders['shortcut_dokumen_title'] || 'Buku Panduan & Syarat',
                  initialDesc:
                    customSubheaders['shortcut_dokumen_desc'] ||
                    'Buku panduan rasmi, borang teknikal dan peraturan SOAR 2026.',
                })
              }
              title="Edit Card Panduan (Admin)"
            />
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5 pr-6">
              {customSubheaders['shortcut_dokumen_title'] || 'Buku Panduan & Syarat'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {customSubheaders['shortcut_dokumen_desc'] ||
                'Buku panduan rasmi, borang teknikal dan peraturan SOAR 2026.'}
            </p>
          </div>
        </div>
      </div>

      {/* 7. LATEST TELEGRAM BULLETINS & ANNOUNCEMENTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <EditableSectionHeader
          sectionKey="home_announcements"
          defaultTitle="Hebahan Terkini dari Saluran Telegram"
          customSubheaders={customSubheaders}
          icon={<Send className="w-4 h-4 text-blue-500" />}
          isAdmin={isAdmin}
          onSaveSubheader={onSaveSubheader}
          actionButton={
            <button
              type="button"
              onClick={() => onNavigateTab('announcements')}
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Saluran Hebahan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        {displayAnnouncements.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center italic">
            Tiada mesej hebahan buat masa ini.
          </p>
        ) : (
          <div className="space-y-3">
            {displayAnnouncements.map((ann) => (
              <article
                key={ann.id}
                className="relative group p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all space-y-2 text-xs"
              >
                {/* Pencil on top right of announcement card */}
                <CardPencilButton
                  isAdmin={isAdmin}
                  onClick={() => setAnnouncementToEdit(ann)}
                  title="Edit Hebahan / Sub-header Card (Admin)"
                />

                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.isPinned && (
                        <span className="text-amber-500 font-bold flex items-center gap-1 text-[11px]">
                          <Pin className="w-3 h-3 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{ann.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="font-semibold text-indigo-600">{ann.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Oleh: {ann.author}</span>
                    </div>
                  </div>

                  {ann.priority === 'urgent' && (
                    <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                      Segera
                    </span>
                  )}
                </div>

                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>

                {ann.imageUrl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({
                          isOpen: true,
                          imageUrl: ann.imageUrl!,
                          title: ann.title,
                          caption: ann.imageCaption || ann.content,
                          category: ann.category,
                          author: ann.author,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Lampiran Poster / Imej</span>
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* 8. TALIAN KECEMASAN & URUS SETIA KONTINJEN */}
      <div className="relative group bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <CardPencilButton
          isAdmin={isAdmin}
          onClick={() =>
            setQuickCardModal({
              isOpen: true,
              title: 'Edit Maklumat Bilik Gerakan & Urus Setia',
              keyHeading: 'emergency_title',
              keyDesc: 'emergency_officer',
              initialHeading:
                customSubheaders['emergency_title'] ||
                'Talian Urus Setia & Bilik Gerakan Kontinjen KPMBP',
              initialDesc:
                customSubheaders['emergency_officer'] ||
                `Lokasi: ${settings.secretariatLocation || 'Bilik Gerakan Kontinjen KPMBP'} · Pegawai: ${settings.emergencyContactName}`,
            })
          }
          title="Edit Maklumat Urus Setia (Admin)"
        />

        <div className="flex items-center gap-3 pr-8 md:pr-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              {customSubheaders['emergency_title'] ||
                'Talian Urus Setia & Bilik Gerakan Kontinjen KPMBP'}
            </h4>
            <p className="text-xs text-slate-400">
              {customSubheaders['emergency_officer'] ||
                `Lokasi: ${settings.secretariatLocation || 'Bilik Gerakan Kontinjen KPMBP'} · Pegawai: ${settings.emergencyContactName}`}
            </p>
          </div>
        </div>

        {settings.emergencyContactPhone && (
          <a
            href={`tel:${settings.emergencyContactPhone.replace(/\s+/g, '')}`}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hubungi Urus Setia ({settings.emergencyContactPhone})</span>
          </a>
        )}
      </div>

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

      {/* Schedule Edit Modal */}
      {scheduleToEdit && onSaveSchedule && (
        <ScheduleEditModal
          isOpen={!!scheduleToEdit}
          onClose={() => setScheduleToEdit(null)}
          scheduleToEdit={scheduleToEdit}
          onSave={onSaveSchedule}
        />
      )}

      {/* Category Edit Modal */}
      {categoryToEdit && onSaveCategory && (
        <CategoryEditModal
          isOpen={!!categoryToEdit}
          onClose={() => setCategoryToEdit(null)}
          category={categoryToEdit}
          onSave={onSaveCategory}
        />
      )}

      {/* Announcement Edit Modal */}
      {announcementToEdit && onSaveAnnouncement && (
        <AnnouncementEditModal
          isOpen={!!announcementToEdit}
          onClose={() => setAnnouncementToEdit(null)}
          announcementToEdit={announcementToEdit}
          onSave={onSaveAnnouncement}
        />
      )}

      {/* Quick Card Edit Modal */}
      <QuickCardEditModal
        isOpen={quickCardModal.isOpen}
        onClose={() => setQuickCardModal({ ...quickCardModal, isOpen: false })}
        title={quickCardModal.title}
        initialHeading={quickCardModal.initialHeading}
        initialDescription={quickCardModal.initialDesc}
        onSave={handleSaveQuickCard}
      />
    </div>
  );
};
