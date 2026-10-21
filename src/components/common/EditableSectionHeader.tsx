import React, { useState, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface EditableSectionHeaderProps {
  sectionKey: string;
  defaultTitle: string;
  customSubheaders?: Record<string, string>;
  icon?: React.ReactNode;
  isAdmin: boolean;
  onSaveSubheader: (sectionKey: string, newTitle: string) => Promise<void> | void;
  actionButton?: React.ReactNode;
  className?: string;
}

export const EditableSectionHeader: React.FC<EditableSectionHeaderProps> = ({
  sectionKey,
  defaultTitle,
  customSubheaders = {},
  icon,
  isAdmin,
  onSaveSubheader,
  actionButton,
  className = '',
}) => {
  const currentTitle = customSubheaders[sectionKey] || defaultTitle;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentTitle);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(currentTitle);
  }, [currentTitle]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editValue.trim() || editValue.trim() === currentTitle) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSaveSubheader(sectionKey, editValue.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update sub-header:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(currentTitle);
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-center justify-between pb-3 border-b border-slate-100 gap-3 ${className}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon && <div className="shrink-0">{icon}</div>}

        {isEditing ? (
          <form
            onSubmit={handleSave}
            className="flex items-center gap-1.5 flex-1 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Masukkan tajuk bahagian..."
              autoFocus
              className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-white border-2 border-indigo-500 rounded-lg px-2.5 py-1 focus:outline-hidden shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSaving}
              title="Simpan sub header"
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              title="Batal"
              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              {currentTitle}
            </h3>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actionButton}

        {/* Admin Pencil Icon at Top Right of Section */}
        {isAdmin && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Edit Sub Header Bahagian (Admin)"
            className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Sub Header</span>
          </button>
        )}
      </div>
    </div>
  );
};
