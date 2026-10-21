import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import {
  Announcement,
  EventCategory,
  OperationalPhase,
  AnnouncementPriority,
  ContentStatus,
  BatchUploadItem,
  AIImageAnalysisResult,
} from '../../types';
import { api } from '../../services/api';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Layers,
  Tag,
  Calendar,
  Eye,
  Check,
  Loader2,
  FileImage,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface BatchImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: EventCategory[];
  activePhase?: OperationalPhase;
  onSaveBatch: (announcements: Partial<Announcement>[]) => Promise<void>;
}

export const BatchImageUploadModal: React.FC<BatchImageUploadModalProps> = ({
  isOpen,
  onClose,
  categories,
  activePhase = 'pre-final',
  onSaveBatch,
}) => {
  const [items, setItems] = useState<BatchUploadItem[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isCollectionGroup, setIsCollectionGroup] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Category Options: combines active event categories with operational functional categories
  const allCategoryOptions = [
    ...categories.map((c) => ({ id: c.id, name: c.name, group: 'Acara SOAR 2026' })),
    { id: 'pendaftaran', name: 'Pendaftaran Peserta', group: 'Operasi & Umum' },
    { id: 'jadual', name: 'Jadual Pertandingan', group: 'Operasi & Umum' },
    { id: 'peraturan', name: 'Peraturan & Syarat', group: 'Operasi & Umum' },
    { id: 'penginapan', name: 'Penginapan & Kebajikan', group: 'Operasi & Umum' },
    { id: 'pengangkutan', name: 'Pengangkutan & Bas', group: 'Operasi & Umum' },
    { id: 'lokasi', name: 'Lokasi & Venue', group: 'Operasi & Umum' },
    { id: 'keputusan', name: 'Keputusan Pertandingan', group: 'Operasi & Umum' },
    { id: 'majlis-penutupan', name: 'Majlis Penutup', group: 'Operasi & Umum' },
    { id: 'general', name: 'Pengumuman Umum / Urus Setia', group: 'Operasi & Umum' },
  ];

  // Match AI suggested category string to best matching category ID
  const mapSuggestedCategoryToId = (suggestedCat: string): string => {
    if (!suggestedCat) return 'general';
    const clean = suggestedCat.toLowerCase().trim();

    // Exact match by ID
    const foundById = allCategoryOptions.find((c) => c.id.toLowerCase() === clean);
    if (foundById) return foundById.id;

    // Partial match by name
    const foundByName = allCategoryOptions.find(
      (c) => c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase())
    );
    if (foundByName) return foundByName.id;

    if (clean.includes('duo') || clean.includes('symphonic')) return 'symphonic-duo';
    if (clean.includes('theatre') || clean.includes('teater')) return 'islamic-theatre';
    if (clean.includes('band') || clean.includes('kugiran')) return 'battle-of-the-bands';
    if (clean.includes('zapin') || clean.includes('tari')) return 'tarian-zapin';
    if (clean.includes('dakwah') || clean.includes('street')) return 'street-dakwah';
    if (clean.includes('daftar') || clean.includes('peserta')) return 'pendaftaran';
    if (clean.includes('jadual') || clean.includes('waktu') || clean.includes('masa')) return 'jadual';
    if (clean.includes('hotel') || clean.includes('bilik') || clean.includes('inap') || clean.includes('kolej')) return 'penginapan';
    if (clean.includes('bas') || clean.includes('transport') || clean.includes('kenderaan')) return 'pengangkutan';
    if (clean.includes('tutup') || clean.includes('istiadat')) return 'majlis-penutupan';

    return 'general';
  };

  // Trigger file analysis for an item
  const analyzeItemWithAI = async (item: BatchUploadItem) => {
    try {
      const result = await api.analyseImageWithAI(item.file, item.file.name, item.file.type);

      const matchedCategoryId = mapSuggestedCategoryToId(result.suggestedCategory);

      setItems((prev) =>
        prev.map((it) => {
          if (it.tempId !== item.tempId) return it;

          return {
            ...it,
            aiAnalyzing: false,
            aiSuggested: result,
            aiAccepted: true, // auto-fill as initial suggestion, admin can edit anytime
            title: result.suggestedTitle || it.title,
            description: result.suggestedDescription || it.description,
            category: matchedCategoryId,
            tags: result.suggestedTags && result.suggestedTags.length > 0 ? result.suggestedTags : it.tags,
            importantDates: result.extractedDatesAndInstructions || '',
            verificationRequired: Boolean(result.verificationRequired),
          };
        })
      );
    } catch {
      // Graceful fallback
      setItems((prev) =>
        prev.map((it) =>
          it.tempId === item.tempId
            ? {
                ...it,
                aiAnalyzing: false,
                aiSuggested: {
                  suggestedCategory: 'general',
                  suggestedTitle: it.title,
                  suggestedDescription: it.description,
                  suggestedTags: ['Poster'],
                  verificationRequired: true,
                  serviceUnavailable: true,
                  message: 'AI tidak tersedia. Sila lengkapkan maklumat manual.',
                },
                verificationRequired: true,
              }
            : it
        )
      );
    }
  };

  // Handle file selection (multiple)
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchUploadItem[] = [];

    Array.from(files).forEach((file) => {
      // Check file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        setError(`Fail ${file.name} melebihi had maksimum 15MB.`);
        return;
      }

      const tempId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);
      const cleanFileNameTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const item: BatchUploadItem = {
        tempId,
        file,
        previewUrl,
        title: cleanFileNameTitle,
        description: 'Hebahan visual rasmi kontinjen KPM Bandar Penawar.',
        category: 'general',
        phase: (activePhase as OperationalPhase) || 'pre-final',
        priority: 'general',
        tags: ['Poster', 'SOAR2026'],
        status: 'published',
        isPinned: false,
        aiAnalyzing: true,
        aiAccepted: false,
        selectedForAction: true,
      };

      newItems.push(item);
    });

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      // Trigger AI analysis asynchronously for each new image
      newItems.forEach((item) => {
        analyzeItemWithAI(item);
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update item fields
  const updateItemField = (tempId: string, field: keyof BatchUploadItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.tempId === tempId ? { ...it, [field]: value } : it))
    );
  };

  // Remove an item
  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  // Bulk: Select/Deselect all
  const toggleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, selectedForAction: select })));
  };

  // Bulk: Apply Category to selected
  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    setItems((prev) =>
      prev.map((it) => (it.selectedForAction ? { ...it, category: bulkCategory } : it))
    );
  };

  // Add tag to item
  const addTagToItem = (tempId: string, tagText: string) => {
    const cleanTag = tagText.trim();
    if (!cleanTag) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId !== tempId) return it;
        if (it.tags.includes(cleanTag)) return it;
        return { ...it, tags: [...it.tags, cleanTag] };
      })
    );
  };

  // Remove tag from item
  const removeTagFromItem = (tempId: string, tagToRemove: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId !== tempId) return it;
        return { ...it, tags: it.tags.filter((t) => t !== tagToRemove) };
      })
    );
  };

  // Accept or reject AI suggestions
  const handleToggleAcceptAISuggestion = (tempId: string, accept: boolean) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId !== tempId || !it.aiSuggested) return it;
        if (accept) {
          const matchedCategory = mapSuggestedCategoryToId(it.aiSuggested.suggestedCategory);
          return {
            ...it,
            aiAccepted: true,
            title: it.aiSuggested.suggestedTitle || it.title,
            description: it.aiSuggested.suggestedDescription || it.description,
            category: matchedCategory,
            tags: it.aiSuggested.suggestedTags || it.tags,
            importantDates: it.aiSuggested.extractedDatesAndInstructions || it.importantDates,
          };
        } else {
          return {
            ...it,
            aiAccepted: false,
          };
        }
      })
    );
  };

  // Save/Publish batch
  const handlePublishAll = async (forceDraft: boolean = false) => {
    const selectedItems = items.filter((it) => it.selectedForAction);
    if (selectedItems.length === 0) {
      setError('Sila pilih sekurang-kurangnya satu gambar untuk diterbitkan.');
      return;
    }

    setIsSubmitting(true);
    setIsUploadingFiles(true);
    setError(null);

    try {
      const announcementsToCreate: Partial<Announcement>[] = [];
      const commonCollectionId = isCollectionGroup
        ? `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        : undefined;

      // Upload each file permanently to backend /uploads
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        let uploadedUrl = item.uploadedUrl;

        if (!uploadedUrl) {
          const uploadRes = await api.uploadFile(item.file);
          uploadedUrl = uploadRes.url;
        }

        announcementsToCreate.push({
          title: item.title.trim() || 'Poster Rasmi',
          content: item.description.trim(),
          category: item.category,
          phase: item.phase,
          priority: item.priority,
          status: forceDraft ? 'draft' : item.status,
          isPinned: item.isPinned,
          author: 'Urus Setia Kontinjen KPMBP',
          imageUrl: uploadedUrl,
          imageCaption: item.description.trim(),
          tags: item.tags,
          collectionId: commonCollectionId,
          collectionName: isCollectionGroup ? (collectionName.trim() || 'Siri Infografik') : undefined,
          collectionIndex: isCollectionGroup ? i + 1 : undefined,
          importantDates: item.importantDates?.trim() || undefined,
          verificationRequired: Boolean(item.verificationRequired),
        });
      }

      await onSaveBatch(announcementsToCreate);
      onClose();
    } catch (err: any) {
      console.error('Batch save error:', err);
      setError(err.message || 'Gagal menyimpan dan menerbitkan imej berkelompok.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingFiles(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Muat Naik Poster Berkelompok & Analisis AI"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Header guidance */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900">
                Aliran Kerja AI Pintar: Muat Naik → Analisis AI → Semakan Pentadbir → Terbit Galeri
              </p>
              <p className="text-indigo-700/90 mt-0.5">
                AI mencadangkan kategori, tajuk, penerangan dan tag secara automatik. Anda mempunyai kuasa mutlak untuk meluluskan, mengubah suai atau menolak setiap cadangan sebelum diterbitkan.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone & File Selector */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 rounded-xl flex items-center justify-center mb-3 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Pilih satu atau beberapa imej / poster sekaligus
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tarik & lepaskan fail di sini, atau klik untuk melayari galeri telefon / komputer (JPG, PNG, WebP)
            </p>
          </div>
        </div>

        {/* Items List & Bulk Actions Bar */}
        {items.length > 0 && (
          <div className="space-y-4">
            {/* Bulk Toolbar */}
            <div className="bg-slate-100/80 border border-slate-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={items.every((it) => it.selectedForAction)}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pilih Semua ({items.filter((it) => it.selectedForAction).length}/{items.length})</span>
                </label>

                <div className="h-4 w-px bg-slate-300" />

                {/* Bulk Category Setter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="">-- Tetapkan Kategori Bersama --</option>
                    {allCategoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.group})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyBulkCategory}
                    disabled={!bulkCategory}
                    className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              {/* Group as Collection Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={isCollectionGroup}
                    onChange={(e) => setIsCollectionGroup(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kumpulkan sebagai Satu Siri/Koleksi</span>
                </label>

                {isCollectionGroup && (
                  <input
                    type="text"
                    placeholder="Nama Siri (cth: Panduan Pendaftaran)"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-48 text-slate-800"
                  />
                )}
              </div>
            </div>

            {/* List of Image Cards */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={item.tempId}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    item.selectedForAction
                      ? 'border-indigo-300 shadow-xs'
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Checkbox & Thumbnail */}
                    <div className="flex items-start gap-3 shrink-0">
                      <input
                        type="checkbox"
                        checked={item.selectedForAction}
                        onChange={(e) =>
                          updateItemField(item.tempId, 'selectedForAction', e.target.checked)
                        }
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div
                        onClick={() => setSelectedPreviewImage(item.previewUrl)}
                        className="relative w-28 h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer shrink-0"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                        {isCollectionGroup && (
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Fields */}
                    <div className="flex-1 w-full space-y-3">
                      {/* Top Bar: AI Status / Verification badge & Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.aiAnalyzing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-medium">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              Menganalisis dengan Gemini AI...
                            </span>
                          ) : item.aiSuggested ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-medium">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Cadangan AI Sedia
                              </span>
                              {item.verificationRequired && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-medium">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  Perlu Semakan
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.tempId)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Buang imej ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Title input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tajuk Poster / Infografik
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItemField(item.tempId, 'title', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Masukkan tajuk deskriptif..."
                        />
                      </div>

                      {/* Description input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Huraian / Penerangan Kandungan (Bahasa Melayu)
                        </label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateItemField(item.tempId, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Ringkasan kandungan infografik..."
                        />
                      </div>

                      {/* Category, Phase & Priority Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {/* Category */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Kategori Galeri
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => updateItemField(item.tempId, 'category', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            {allCategoryOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Phase */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Fasa Operasi
                          </label>
                          <select
                            value={item.phase}
                            onChange={(e) => updateItemField(item.tempId, 'phase', e.target.value as OperationalPhase)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            <option value="all">Semua Fasa</option>
                            <option value="pre-final">Fasa A: Pra-Final</option>
                            <option value="during-final">Fasa B: Semasa Final</option>
                          </select>
                        </div>

                        {/* Priority & Pin */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Status / Keutamaan
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              value={item.priority}
                              onChange={(e) => updateItemField(item.tempId, 'priority', e.target.value as AnnouncementPriority)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                            >
                              <option value="general">Biasa</option>
                              <option value="important">Penting</option>
                              <option value="urgent">Segera</option>
                            </select>
                            <label className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-600 shrink-0">
                              <input
                                type="checkbox"
                                checked={item.isPinned}
                                onChange={(e) => updateItemField(item.tempId, 'isPinned', e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Pin</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Important Dates / Instructions parsed by AI */}
                      {item.importantDates && (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Tarikh/Arahan Dikesan: </span>
                            <span>{item.importantDates}</span>
                          </div>
                        </div>
                      )}

                      {/* Tags Bar */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTagFromItem(item.tempId, tag)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="+ Tambah tag"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTagToItem(item.tempId, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="px-2 py-0.5 text-[10px] border border-slate-200 rounded bg-slate-50 text-slate-700 w-24 focus:w-32 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {items.length > 0 && (
              <span>
                {items.filter((it) => it.selectedForAction).length} daripada {items.length} imej dipilih untuk diterbitkan.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            {items.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handlePublishAll(true)}
                  disabled={isSubmitting || items.filter((it) => it.selectedForAction).length === 0}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Simpan sebagai Draf
                </button>

                <button
                  type="button"
                  onClick={() => handlePublishAll(false)}
                  disabled={isSubmitting || items.filter((it) => it.selectedForAction).length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isUploadingFiles ? 'Memuat Naik...' : 'Menerbitkan...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terbitkan Ke Galeri Sekarang</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Image Preview Lightbox */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPreviewImage}
              alt="Pratonton"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-2 right-2 text-white bg-black/60 p-2 rounded-full hover:bg-black/90 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
