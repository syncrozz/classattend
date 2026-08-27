import React from 'react';
import { BookOpen, Users, User, Play, X, Sparkles, Calendar } from 'lucide-react';
import { getClassBadgeColor } from '../utils/studentUtils';

interface StartAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectCode: string;
  subjectName: string;
  className: string;
  lecturerName: string;
  studentCount: number;
  onConfirmStart: () => void;
}

export const StartAttendanceModal: React.FC<StartAttendanceModalProps> = ({
  isOpen,
  onClose,
  subjectCode,
  subjectName,
  className,
  lecturerName,
  studentCount,
  onConfirmStart
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="start-attendance-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="start-attendance-modal-container"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Mula Sesi Kehadiran</h3>
              <p className="text-xs text-slate-400">Sahkan butiran sesi kelas</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-start-attendance"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Session Context Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3.5 relative z-10">
          {/* Subject */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subjek</div>
              <div className="text-sm font-bold text-white leading-snug">
                <span className="text-indigo-400 font-mono">{subjectCode}</span>
                {subjectName ? ` - ${subjectName}` : ''}
              </div>
            </div>
          </div>

          {/* Class Section */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Seksyen Kelas</div>
                <div className="text-sm font-bold text-white">Kelas {className}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${getClassBadgeColor(className)}`}>
                {className}
              </span>
            </div>
          </div>

          {/* Lecturer */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pensyarah</div>
              <div className="text-xs font-semibold text-slate-200">{lecturerName || 'Pensyarah Kursus'}</div>
            </div>
          </div>

          {/* Student Count */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">Jumlah Pelajar Sasaran:</span>
              <strong className="text-emerald-400 font-bold font-mono text-sm">
                {studentCount} Pelajar
              </strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            id="btn-cancel-start-attendance"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-start-attendance"
            onClick={onConfirmStart}
            className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Mulakan Kehadiran</span>
          </button>
        </div>
      </div>
    </div>
  );
};
