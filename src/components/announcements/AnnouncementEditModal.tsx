import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Announcement, AnnouncementPriority } from '../../types';
import { isValidUrl } from '../../utils/drive';
import { AlertCircle } from 'lucide-react';

interface AnnouncementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ann: Partial<Announcement>) => Promise<void>;
  announcementToEdit: Announcement | null;
}

export const AnnouncementEditModal: React.FC<AnnouncementEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  announcementToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('general');
  const [category, setCategory] = useState('All');
  const [author, setAuthor] = useState('Secretariat KPMBP');
  const [isPinned, setIsPinned] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlLabel, setExternalUrlLabel] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcementToEdit) {
      setTitle(announcementToEdit.title || '');
      setContent(announcementToEdit.content || '');
      setPriority(announcementToEdit.priority || 'general');
      setCategory(announcementToEdit.category || 'All');
      setAuthor(announcementToEdit.author || 'Secretariat KPMBP');
      setIsPinned(Boolean(announcementToEdit.isPinned));
      setExternalUrl(announcementToEdit.externalUrl || '');
      setExternalUrlLabel(announcementToEdit.externalUrlLabel || '');
    } else {
      setTitle('');
      setContent('');
      setPriority('general');
      setCategory('All');
      setAuthor('Secretariat KPMBP');
      setIsPinned(false);
      setExternalUrl('');
      setExternalUrlLabel('');
    }
    setError(null);
  }, [announcementToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Announcement headline is required.');
      return;
    }
    if (!content.trim()) {
      setError('Announcement message content is required.');
      return;
    }

    if (externalUrl.trim() && !isValidUrl(externalUrl.trim())) {
      setError('Please provide a valid external URL (http:// or https://).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: announcementToEdit?.id,
        title: title.trim(),
        content: content.trim(),
        priority,
        category: category.trim(),
        author: author.trim(),
        isPinned,
        externalUrl: externalUrl.trim() || undefined,
        externalUrlLabel: externalUrlLabel.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcementToEdit ? 'Edit Announcement' : 'Post New Official Announcement'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Announcement Headline <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Perubahan Jadual Perlawanan Bola Sepak, Taklimat Pengurus Pasukan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="general">General Notice</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent / Immediate Action</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Audience / Category
            </label>
            <input
              type="text"
              placeholder="e.g. All, Athletes, Coaches"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Issuing Authority
            </label>
            <input
              type="text"
              placeholder="e.g. Secretariat KPMBP"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Announcement Content <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Write the full announcement message clearly for the contingent..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Reference Link
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/... or reference link"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link Button Label
            </label>
            <input
              type="text"
              placeholder="e.g. View Official Circular, Open Form"
              value={externalUrlLabel}
              onChange={(e) => setExternalUrlLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isPinnedAnn"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPinnedAnn" className="text-xs text-slate-700 font-medium">
            Pin to top of Announcement Feed
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Posting...' : 'Save Announcement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
