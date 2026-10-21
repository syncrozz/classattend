import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ScheduleItem, OperationalPhase, ContentStatus } from '../../types';
import { parseGoogleDriveUrl, isValidUrl } from '../../utils/drive';
import { api } from '../../services/api';
import { ExternalLink, Image as ImageIcon, AlertCircle, Upload, X, Loader2 } from 'lucide-react';

interface ScheduleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Partial<ScheduleItem>) => Promise<void>;
  scheduleToEdit: ScheduleItem | null;
  defaultCategoryName?: string;
}

export const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  scheduleToEdit,
  defaultCategoryName = '',
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [performanceOrder, setPerformanceOrder] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceDocUrl, setSourceDocUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<OperationalPhase>('all');
  const [status, setStatus] = useState<ContentStatus>('published');

  // Direct upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (scheduleToEdit) {
      setCategoryName(scheduleToEdit.categoryName || '');
      setSubcategory(scheduleToEdit.subcategory || '');
      setPerformanceOrder(scheduleToEdit.performanceOrder || '');
      setDate(scheduleToEdit.date || '');
      setTime(scheduleToEdit.time || '');
      setVenue(scheduleToEdit.venue || '');
      setImageUrl(scheduleToEdit.imageUrl || '');
      setSourceDocUrl(scheduleToEdit.sourceDocUrl || '');
      setNotes(scheduleToEdit.notes || '');
      setPhase(scheduleToEdit.phase || 'all');
      setStatus(scheduleToEdit.status || 'published');
    } else {
      setCategoryName(defaultCategoryName || '');
      setSubcategory('');
      setPerformanceOrder('');
      setDate('');
      setTime('');
      setVenue('');
      setImageUrl('');
      setSourceDocUrl('');
      setNotes('');
      setPhase('all');
      setStatus('published');
    }
    setSelectedFile(null);
    setError(null);
    setPreviewError(false);
  }, [scheduleToEdit, isOpen, defaultCategoryName]);

  const parsedDrive = parseGoogleDriveUrl(imageUrl);
  const effectivePreviewSrc = parsedDrive.isDrive ? parsedDrive.imageUrl : imageUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImageUrl(URL.createObjectURL(file));
      setPreviewError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Nama kategori / acara adalah wajib.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        setUploadingImage(true);
        const uploaded = await api.uploadFile(selectedFile);
        finalImageUrl = uploaded.url;
        setUploadingImage(false);
      }

      await onSave({
        id: scheduleToEdit?.id,
        categoryName: categoryName.trim(),
        subcategory: subcategory.trim() || undefined,
        performanceOrder: performanceOrder.trim() || undefined,
        date: date.trim(),
        time: time.trim() || undefined,
        venue: venue.trim(),
        imageUrl: finalImageUrl.trim(),
        sourceDocUrl: sourceDocUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        phase,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan jadual.');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheduleToEdit ? 'Kemaskini Jadual & Giliran' : 'Tambah Jadual / Giliran Acara'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Acara / Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tarian Zapin, Battle of the Bands"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subkategori / Peringkat
            </label>
            <input
              type="text"
              placeholder="e.g. Pusingan Akhir, Kategori Terbuka"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giliran Persembahan (Jika Ada)
            </label>
            <input
              type="text"
              placeholder="e.g. Giliran ke-3"
              value={performanceOrder}
              onChange={(e) => setPerformanceOrder(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-semibold text-amber-900 bg-amber-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tarikh</label>
            <input
              type="text"
              placeholder="e.g. 15 Mei 2026"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Masa / Sesi</label>
            <input
              type="text"
              placeholder="e.g. 08:30 - 12:00"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Gelanggang</label>
            <input
              type="text"
              placeholder="e.g. Dewan Utama / Pentas Terbuka"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fasa Operasi</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as OperationalPhase)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="all">Semua Fasa</option>
              <option value="pre-final">Fasa A: Pra-Final</option>
              <option value="during-final">Fasa B: Semasa Final</option>
            </select>
          </div>
        </div>

        {/* Poster / Jadual Image Upload */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Muat Naik Carta Jadual / Imej / Pautan Drive
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-indigo-200">
              <Upload className="w-3.5 h-3.5" />
              <span>Muat Naik Imej Fail</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder="Atau tampal URL imej / pautan Google Drive"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setSelectedFile(null);
              }}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            />
          </div>

          {imageUrl && (
            <div className="h-40 w-full bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden relative">
              <img
                src={effectivePreviewSrc || ''}
                alt="Preview"
                onError={() => setPreviewError(true)}
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setSelectedFile(null);
                }}
                className="absolute top-2 right-2 p-1 bg-slate-900/70 text-white rounded-full hover:bg-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pautan Dokumen Asal / Google Sheet (Pilihan)
          </label>
          <input
            type="url"
            placeholder="https://drive.google.com/... atau fail PDF"
            value={sourceDocUrl}
            onChange={(e) => setSourceDocUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nota Operasi / Peringatan
          </label>
          <textarea
            rows={2}
            placeholder="Peringatan masa berkumpul, pakaian, alatan yang perlu dibawa..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setStatus('published')}
              className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer ${
                status === 'published' ? 'bg-emerald-600 text-white' : 'text-slate-600'
              }`}
            >
              Terbit
            </button>
            <button
              type="button"
              onClick={() => setStatus('draft')}
              className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer ${
                status === 'draft' ? 'bg-amber-600 text-white' : 'text-slate-600'
              }`}
            >
              Draf
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving || uploadingImage ? 'Menyimpan...' : 'Simpan Jadual'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
