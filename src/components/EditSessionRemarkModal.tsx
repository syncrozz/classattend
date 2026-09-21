import React, { useState, useEffect, useRef } from 'react';
import { AttendanceSession } from '../types';
import { Pencil, X, Check, BookOpen, Sparkles, Tag, Calendar, Clock } from 'lucide-react';
import { soundService } from '../services/soundService';

interface EditSessionRemarkModalProps {
  isOpen: boolean;
  session: AttendanceSession | null;
  onClose: () => void;
  onSave: (updatedSession: AttendanceSession) => void;
}

export const EditSessionRemarkModal: React.FC<EditSessionRemarkModalProps> = ({
  isOpen,
  session,
  onClose,
  onSave
}) => {
  const [sessionName, setSessionName] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session && isOpen) {
      setSessionName(session.sessionName || '');
      setTopic(session.topic || '');
      setError(null);
      // Auto focus and select input text
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 80);
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  const handleQuickAppend = (suffix: string) => {
    soundService.playClick();
    setSessionName((prev) => {
      // If user clicks "a" or "b" and title ends in a number (e.g. "Minggu 6")
      if (suffix === 'a' || suffix === 'b') {
        const regex = /(\bMinggu\s+\d+)([a-zA-Z]?)/i;
        if (regex.test(prev)) {
          return prev.replace(regex, `$1${suffix}`);
        }
        return `${prev.trim()}${suffix}`;
      }
      // If appending a tag like "(Gantian)" or "(Amali)"
      if (prev.includes(suffix)) return prev;
      return `${prev.trim()} - ${suffix}`;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      setError('Sila masukkan tajuk atau remark sesi kuliah.');
      return;
    }

    const updatedSession: AttendanceSession = {
      ...session,
      sessionName: sessionName.trim(),
      topic: topic.trim() || undefined
    };

    onSave(updatedSession);
    soundService.playSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-session-modal-title" className="text-base sm:text-lg font-bold text-white">
                Kemaskini Remark / Tajuk Sesi
              </h2>
              <p className="text-xs text-slate-400">
                Ubah tajuk sesi contohnya dari <span className="text-indigo-300 font-medium">Minggu 6</span> kepada <span className="text-emerald-300 font-medium">Minggu 6a</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Session Context */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-mono font-bold text-indigo-300">{session.subjectCode}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-200 font-semibold">{session.subjectName}</span>
          </div>
          {session.className && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold text-[11px] border border-slate-700">
              Kelas: {session.className}
            </span>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-session-name-input" className="block text-xs font-bold text-slate-300">
              Tajuk / Remark Sesi Kuliah <span className="text-rose-400">*</span>
            </label>
            <input
              ref={inputRef}
              id="edit-session-name-input"
              type="text"
              value={sessionName}
              onChange={(e) => {
                setSessionName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="cth: Kuliah Minggu 6a"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </div>

          {/* Quick Preset Buttons (e.g. +a, +b, Kuliah Gantian, etc.) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilihan Pantas Remark:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAppend('a')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Tukar ke Minggu ...a (cth: Minggu 6a)"
              >
                Tambah &quot;a&quot;
              </button>
              <button
                type="button"
                onClick={() => handleQuickAppend('b')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Tukar ke Minggu ...b (cth: Minggu 6b)"
              >
                Tambah &quot;b&quot;
              </button>
              <button
                type="button"
                onClick={() => handleQuickAppend('Kuliah Gantian')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-600/30 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                Kuliah Gantian
              </button>
              <button
                type="button"
                onClick={() => handleQuickAppend('Amali')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                Amali / Makmal
              </button>
              <button
                type="button"
                onClick={() => handleQuickAppend('Tutorial')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                Tutorial
              </button>
            </div>
          </div>

          {/* Optional Topic or Details */}
          <div className="space-y-1.5">
            <label htmlFor="edit-session-topic-input" className="block text-xs font-bold text-slate-300">
              Topik Pembelajaran / Catatan Pensyarah <span className="text-slate-500 font-normal">(Pilihan)</span>
            </label>
            <input
              id="edit-session-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="cth: Bab 4: Hak Asasi dan Kewarganegaraan"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-save-session-remark"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Remark</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
