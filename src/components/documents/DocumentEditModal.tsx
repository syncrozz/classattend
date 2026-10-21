import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DocumentItem, DocumentType } from '../../types';
import { parseGoogleDriveUrl, isValidUrl } from '../../utils/drive';
import { AlertCircle } from 'lucide-react';

interface DocumentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Partial<DocumentItem>) => Promise<void>;
  documentToEdit: DocumentItem | null;
}

export const DocumentEditModal: React.FC<DocumentEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Rules & Regulations');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<DocumentType>('drive');
  const [isPinned, setIsPinned] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentToEdit) {
      setTitle(documentToEdit.title || '');
      setCategory(documentToEdit.category || 'Rules & Regulations');
      setDescription(documentToEdit.description || '');
      setFileUrl(documentToEdit.fileUrl || '');
      setFileType(documentToEdit.fileType || 'drive');
      setIsPinned(Boolean(documentToEdit.isPinned));
    } else {
      setTitle('');
      setCategory('Rules & Regulations');
      setDescription('');
      setFileUrl('');
      setFileType('drive');
      setIsPinned(false);
    }
    setError(null);
  }, [documentToEdit, isOpen]);

  // Auto-detect file type if Drive link pasted
  const handleUrlChange = (val: string) => {
    setFileUrl(val);
    const parsed = parseGoogleDriveUrl(val);
    if (parsed.isDrive) {
      if (parsed.fileType === 'sheet') setFileType('sheet');
      else if (parsed.fileType === 'doc') setFileType('doc');
      else if (parsed.fileType === 'pdf') setFileType('pdf');
      else setFileType('drive');
    } else if (val.toLowerCase().endsWith('.pdf')) {
      setFileType('pdf');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!fileUrl.trim() || !isValidUrl(fileUrl.trim())) {
      setError('Please provide a valid document URL or Google Drive link.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: documentToEdit?.id,
        title: title.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        fileUrl: fileUrl.trim(),
        fileType,
        isPinned,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save document reference.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={documentToEdit ? 'Edit Document Reference' : 'Add New Document / File'}
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
            Document Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Buku Panduan Kontinjen KPMBP, Peraturan Pertandingan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category
            </label>
            <input
              type="text"
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Select or enter category"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
            <datalist id="category-suggestions">
              <option value="Rules & Regulations" />
              <option value="Score Sheets & Forms" />
              <option value="Handbook & Guidelines" />
              <option value="Medical & Consent" />
              <option value="Movement Orders" />
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Format / Type
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="drive">Google Drive Document</option>
              <option value="pdf">PDF File</option>
              <option value="sheet">Google Sheet / Excel</option>
              <option value="doc">Google Doc / Word</option>
              <option value="link">External Portal / Website</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            File URL or Google Drive Link <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            required
            placeholder="https://drive.google.com/file/d/... or link to document"
            value={fileUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Google Drive share links will automatically generate in-browser previews and direct Drive navigation.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description / Briefing Note
          </label>
          <textarea
            rows={2}
            placeholder="Summary of document contents, version number, or target recipients..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isPinnedDoc"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPinnedDoc" className="text-xs text-slate-700 font-medium">
            Pin to top of Documents & References
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
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
