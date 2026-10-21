import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { EventSection, EventSectionItem, EventSectionType } from '../../types';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface EventSectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: Partial<EventSection>) => Promise<void>;
  sectionToEdit: EventSection | null;
}

export const EventSectionEditModal: React.FC<EventSectionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sectionToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [type, setType] = useState<EventSectionType>('rundown');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<EventSectionItem[]>([]);
  const [rawContent, setRawContent] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sectionToEdit) {
      setTitle(sectionToEdit.title || '');
      setCategory(sectionToEdit.category || 'General');
      setType(sectionToEdit.type || 'rundown');
      setDescription(sectionToEdit.description || '');
      setItems(sectionToEdit.items || []);
      setRawContent(sectionToEdit.rawContent || '');
    } else {
      setTitle('');
      setCategory('General');
      setType('rundown');
      setDescription('');
      setItems([]);
      setRawContent('');
    }
    setError(null);
  }, [sectionToEdit, isOpen]);

  const handleAddItem = () => {
    const newItem: EventSectionItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      subtitle: '',
      detail: '',
      time: '',
      badge: '',
      contactNumber: '',
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof EventSectionItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Section title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: sectionToEdit?.id,
        title: title.trim(),
        category: category.trim(),
        type,
        description: description.trim() || undefined,
        items,
        rawContent: rawContent.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event information section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sectionToEdit ? 'Edit Event Section' : 'Add New Event Section'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atur Cara Rasmi, Pegawai Kontinjen, Syarat Am"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventSectionType)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="rundown">Program Rundown / Timeline</option>
              <option value="rules">Rules & Operational Guidelines</option>
              <option value="criteria">Competition Criteria & Categories</option>
              <option value="contacts">Contingent Officers & Emergency Contacts</option>
              <option value="text">General Descriptive Text</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Section Overview / Description
          </label>
          <input
            type="text"
            placeholder="Brief introduction for this section..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Structured Items List */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">
              Section Items / Entries ({items.length})
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-500">
              No entries added yet. Click &ldquo;Add Entry&rdquo; to add timetable points, rules, or contact cards.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">#{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={type === 'contacts' ? 'Officer Name' : type === 'rundown' ? 'Event / Activity' : 'Item Title'}
                      value={item.title}
                      onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />

                    {type === 'rundown' ? (
                      <input
                        type="text"
                        placeholder="Time (e.g. 08:00 - 09:30)"
                        value={item.time || ''}
                        onChange={(e) => handleItemChange(idx, 'time', e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    ) : type === 'contacts' ? (
                      <input
                        type="text"
                        placeholder="Contact Phone (e.g. +6012-3456789)"
                        value={item.contactNumber || ''}
                        onChange={(e) => handleItemChange(idx, 'contactNumber', e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Subtitle / Level / Note"
                        value={item.subtitle || ''}
                        onChange={(e) => handleItemChange(idx, 'subtitle', e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    )}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Detailed explanation, instructions, or role description..."
                    value={item.detail || ''}
                    onChange={(e) => handleItemChange(idx, 'detail', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional freeform note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Additional Section Text / Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Optional additional notes or announcements relevant to this section..."
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
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
            {saving ? 'Saving...' : 'Save Section'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
