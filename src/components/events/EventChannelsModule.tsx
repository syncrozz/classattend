import React, { useState } from 'react';
import {
  EventCategory,
  Announcement,
  ScheduleItem,
  DocumentItem,
  EventSection,
} from '../../types';
import {
  Music,
  Drama,
  Radio,
  Sparkles,
  Megaphone,
  Award,
  Home,
  Bus,
  Phone,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  Send,
  Eye,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';

interface EventChannelsModuleProps {
  categories: EventCategory[];
  announcements: Announcement[];
  schedules: ScheduleItem[];
  documents: DocumentItem[];
  eventSections: EventSection[];
  isAdmin: boolean;
  onOpenPublish: (defaultCategory?: string) => void;
  onOpenScheduleEdit: (categoryName?: string) => void;
}

export const EventChannelsModule: React.FC<EventChannelsModuleProps> = ({
  categories,
  announcements,
  schedules,
  documents,
  eventSections,
  isAdmin,
  onOpenPublish,
  onOpenScheduleEdit,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'symphonic-duo');

  const activeCategory = categories.find((c) => c.id === selectedCatId) || categories[0];

  // Filter content for this category
  const categoryAnnouncements = announcements.filter(
    (a) => a.category === selectedCatId || a.category.toLowerCase().includes(activeCategory?.name.toLowerCase() || '')
  );

  const categorySchedules = schedules.filter(
    (s) =>
      s.categoryName.toLowerCase().includes(activeCategory?.name.toLowerCase() || '') ||
      s.subcategory?.toLowerCase().includes(activeCategory?.name.toLowerCase() || '')
  );

  const categoryDocs = documents.filter(
    (d) =>
      d.category.toLowerCase().includes(activeCategory?.name.toLowerCase() || '') ||
      d.title.toLowerCase().includes(activeCategory?.name.toLowerCase() || '')
  );

  const categorySections = eventSections.filter(
    (e) =>
      e.category.toLowerCase().includes(activeCategory?.name.toLowerCase() || '') ||
      e.title.toLowerCase().includes(activeCategory?.name.toLowerCase() || '')
  );

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
      case 'penginapan':
        return <Home className="w-4 h-4 text-teal-600" />;
      case 'pengangkutan':
        return <Bus className="w-4 h-4 text-orange-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Saluran Acara SOAR 2026</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pusat maklumat khusus setiap acara pertandingan, giliran persembahan & pegawai pengiring.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onOpenPublish(selectedCatId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Terbit Hebahan untuk Acara Ini</span>
          </button>
        )}
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {getCategoryIcon(cat.id)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Category Detail Panel */}
      {activeCategory && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          {/* Header of Active Category */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  {getCategoryIcon(activeCategory.id)}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{activeCategory.name}</h3>
                {activeCategory.shortCode && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {activeCategory.shortCode}
                  </span>
                )}
              </div>
              {activeCategory.description && (
                <p className="text-xs text-slate-500">{activeCategory.description}</p>
              )}
            </div>

            {activeCategory.managerPhone && (
              <a
                href={`tel:${activeCategory.managerPhone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {activeCategory.managerName ? `${activeCategory.managerName}: ` : 'Pengurus: '}
                  {activeCategory.managerPhone}
                </span>
              </a>
            )}
          </div>

          {/* Grid Layout: Announcements & Telegram Feed vs Schedules/Performance Order */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Announcements for this event */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-500" />
                  <span>Hebahan & Arahan Terkini ({categoryAnnouncements.length})</span>
                </h4>
              </div>

              {categoryAnnouncements.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  <p>Tiada hebahan khusus untuk acara ini lagi.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onOpenPublish(activeCategory.id)}
                      className="mt-2 text-indigo-600 hover:underline font-semibold"
                    >
                      + Tampal Mesej Telegram
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-bold text-slate-900 text-sm">{ann.title}</h5>
                        {ann.priority === 'urgent' && (
                          <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            Segera
                          </span>
                        )}
                      </div>

                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {ann.content}
                      </p>

                      {ann.imageUrl && (
                        <div className="pt-2">
                          <img
                            src={ann.imageUrl}
                            alt={ann.title}
                            className="max-h-48 w-auto rounded-lg border border-slate-200 object-contain bg-white"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Oleh: {ann.author}</span>
                        {ann.externalUrl && (
                          <a
                            href={ann.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>Telegram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Schedule, Giliran Persembahan & Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jadual & Giliran Persembahan</span>
                </h4>
              </div>

              {categorySchedules.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  <p>Jadual perlawanan / giliran belum dimuat naik.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onOpenScheduleEdit(activeCategory.name)}
                      className="mt-2 text-indigo-600 hover:underline font-semibold"
                    >
                      + Tambah Jadual / Giliran
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {categorySchedules.map((sch) => (
                    <div
                      key={sch.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{sch.categoryName}</span>
                        {sch.performanceOrder && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {sch.performanceOrder}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
                        {sch.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{sch.date}</span>
                          </div>
                        )}
                        {sch.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{sch.time}</span>
                          </div>
                        )}
                        {sch.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{sch.venue}</span>
                          </div>
                        )}
                      </div>

                      {sch.notes && <p className="text-slate-600 italic">{sch.notes}</p>}

                      {sch.imageUrl && (
                        <div className="pt-2">
                          <img
                            src={sch.imageUrl}
                            alt="Jadual"
                            className="max-h-48 w-auto rounded border border-slate-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Supporting reference documents for this category */}
              {categoryDocs.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-700 mb-2">Dokumen Syarat & Rujukan:</h5>
                  <div className="space-y-1.5">
                    {categoryDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-medium text-slate-800">{doc.title}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
