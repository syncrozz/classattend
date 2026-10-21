import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Announcement, AnnouncementPriority, OperationalPhase, ContentStatus, EventCategory } from '../../types';
import { api } from '../../services/api';
import {
  Send,
  Upload,
  AlertCircle,
  FileImage,
  X,
  Pin,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TelegramPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ann: Partial<Announcement>) => Promise<void>;
  categories: EventCategory[];
  announcementToEdit?: Announcement | null;
  activePhase?: 'pre-final' | 'during-final';
}

export const TelegramPublishModal: React.FC<TelegramPublishModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  announcementToEdit,
  activePhase = 'pre-final',
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState<AnnouncementPriority>('general');
  const [phase, setPhase] = useState<OperationalPhase>('all');
  const [status, setStatus] = useState<ContentStatus>('published');
  const [isPinned, setIsPinned] = useState(false);
  const [author, setAuthor] = useState('Urus Setia KPMBP');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlLabel, setExternalUrlLabel] = useState('Buka di Telegram');

  // Direct Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [imageCaption, setImageCaption] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcementToEdit) {
      setTitle(announcementToEdit.title || '');
      setContent(announcementToEdit.content || '');
      setCategory(announcementToEdit.category || 'general');
      setPriority(announcementToEdit.priority || 'general');
      setPhase(announcementToEdit.phase || 'all');
      setStatus(announcementToEdit.status || 'published');
      setIsPinned(Boolean(announcementToEdit.isPinned));
      setAuthor(announcementToEdit.author || 'Urus Setia KPMBP');
      setExternalUrl(announcementToEdit.externalUrl || '');
      setExternalUrlLabel(announcementToEdit.externalUrlLabel || 'Buka di Telegram');
      setImagePreviewUrl(announcementToEdit.imageUrl || '');
      setImageCaption(announcementToEdit.imageCaption || '');
      setSelectedFile(null);
    } else {
      setTitle('');
      setContent('');
      setCategory(categories[0]?.id || 'general');
      setPriority('general');
      setPhase(activePhase || 'all');
      setStatus('published');
      setIsPinned(false);
      setAuthor('Urus Setia KPMBP');
      setExternalUrl('');
      setExternalUrlLabel('Buka di Telegram');
      setSelectedFile(null);
      setImagePreviewUrl('');
      setImageCaption('');
    }
    setError(null);
  }, [announcementToEdit, isOpen, categories, activePhase]);

  // Auto-detect title from first line of pasted Telegram message
  const handleContentChange = (val: string) => {
    setContent(val);
    if (!title && val.trim()) {
      const firstLine = val.trim().split('\n')[0].replace(/^[•\-\*#\s]+/, '').substring(0, 75);
      if (firstLine.length > 5) {
        setTitle(firstLine);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl('');
    setImageCaption('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Sila masukkan tajuk atau tajuk utama hebahan.');
      return;
    }
    if (!content.trim() && !imagePreviewUrl) {
      setError('Sila tampal mesej teks Telegram atau muat naik poster/imej.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let finalImageUrl = imagePreviewUrl;

      // Handle direct file upload if new file selected
      if (selectedFile) {
        setUploadingImage(true);
        const uploaded = await api.uploadFile(selectedFile);
        finalImageUrl = uploaded.url;
        setUploadingImage(false);
      }

      await onSave({
        id: announcementToEdit?.id,
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        phase,
        status,
        isPinned,
        author: author.trim() || 'Urus Setia KPMBP',
        imageUrl: finalImageUrl || undefined,
        imageCaption: imageCaption.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        externalUrlLabel: externalUrlLabel.trim() || undefined,
        telegramRawText: content.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menerbitkan hebahan.');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcementToEdit ? 'Kemaskini Mesej / Poster' : 'Terbit Mesej dari Telegram / Poster'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Telegram Direct Paste Box */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-500" />
              <span>Tampal Mesej Telegram (Copy & Paste)</span>
            </label>
            <span className="text-[11px] text-slate-400">Kekalkan format & emoji</span>
          </div>
          <textarea
            rows={5}
            placeholder="Salin teks dari Telegram dan tampal di sini terus... Contoh:
PERHATIAN KEPADA SEMUA PENGURUS PASUKAN TARIAN ZAPIN:
Raptai pentas utama akan bermula jam 2.30 petang di Dewan Sultan Ibrahim. Sila bawa audio minus-one."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-mono sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Headline */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Tajuk Utama / Headline <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Cth: Taklimat Pengurus Pasukan & Raptai Pentas Zapin"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Classification row: Category, Phase & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori / Acara SOAR
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="general">Urus Setia / Hebahan Am</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fasa Operasi
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as OperationalPhase)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="all">Semua Fasa (Sentiasa Papar)</option>
              <option value="pre-final">Fasa A (Pra-Final Persediaan)</option>
              <option value="during-final">Fasa B (Hari Final / Acara)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahap Keutamaan
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white font-medium"
            >
              <option value="general">Biasa (General)</option>
              <option value="important">Penting (Important)</option>
              <option value="urgent">SEGERA / CRITICAL (Urgent)</option>
            </select>
          </div>
        </div>

        {/* Direct Poster / Image Upload */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Muat Naik Poster / Imej Infografik</span>
            </span>
            <span className="text-[11px] text-slate-400">JPG, PNG, WebP (Maks 15MB)</span>
          </div>

          {imagePreviewUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black/5 flex items-center justify-center max-h-56">
                <img
                  src={imagePreviewUrl}
                  alt="Poster preview"
                  className="max-h-52 w-auto object-contain rounded"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                  title="Padam imej"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Kapsyen imej atau nota tambahan untuk poster ini (pilihan)..."
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg bg-white transition-colors">
              <FileImage className="w-8 h-8 text-slate-400 mb-1.5" />
              <label className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                <span>Pilih Fail Poster dari Peranti</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                Atau masukkan pautan gambar web sedia ada di bawah jika dihoskan di Drive
              </p>
              <input
                type="url"
                placeholder="https://drive.google.com/... atau URL imej luaran"
                value={imagePreviewUrl}
                onChange={(e) => setImagePreviewUrl(e.target.value)}
                className="mt-2 w-full max-w-sm px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-700"
              />
            </div>
          )}
        </div>

        {/* Telegram Link & Authority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pautan Mesej Telegram Asal (Pilihan)
            </label>
            <input
              type="url"
              placeholder="https://t.me/c/... atau pautan saluran"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pihak Mengeluarkan Hebahan
            </label>
            <input
              type="text"
              placeholder="Urus Setia KPMBP / Pengurus Pasukan"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Controls: Pin to home & Publish vs Draft */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>Pin ke atas Laman Utama</span>
              </span>
            </label>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${
                  status === 'published'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terbit (Published)
              </button>
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${
                  status === 'draft'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Draf (Draft)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {saving || uploadingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadingImage ? 'Memuat naik imej...' : 'Menyimpan...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{status === 'draft' ? 'Simpan Sebagai Draf' : 'Terbitkan Sekarang'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
