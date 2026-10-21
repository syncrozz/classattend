import React, { useState } from 'react';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { Modal } from '../common/Modal';
import { FileText, Plus } from 'lucide-react';

interface CustomTabModuleProps {
  tabId: string;
  tabLabel: string;
  content: string;
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveContent: (tabId: string, content: string) => Promise<void>;
}

export const CustomTabModule: React.FC<CustomTabModuleProps> = ({
  tabId,
  tabLabel,
  content,
  isAdmin,
  inlineEditMode,
  onSaveContent,
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [saving, setSaving] = useState(false);

  const handleOpenEdit = () => {
    setEditValue(content);
    setIsEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveContent(tabId, editValue);
      setIsEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{tabLabel}</h2>
          {isAdmin && inlineEditMode && (
            <InlineEditTrigger onClick={handleOpenEdit} label="Edit Content" size="sm" />
          )}
        </div>
      </div>

      {!content ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Section is Empty</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Content has not been written for this tab yet.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Write Content</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      )}

      {/* Edit Content Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Content: ${tabLabel}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Page Content
            </label>
            <textarea
              rows={12}
              required
              placeholder="Enter page text, guidelines, or instructions..."
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
