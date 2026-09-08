import React from 'react';
import { BookOpen, Users, User, Play, X, Sparkles, Calendar, Check, Layers } from 'lucide-react';
import { getClassBadgeColor } from '../utils/studentUtils';

interface StartAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectCode: string;
  subjectName: string;
  className: string;
  lecturerName: string;
  studentCount: number;
  availableClasses?: string[];
  classStudentCounts?: Record<string, number>;
  totalStudentsCount?: number;
  onSelectClass?: (newClass: string) => void;
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
  availableClasses,
  classStudentCounts,
  totalStudentsCount,
  onSelectClass,
  onConfirmStart
}) => {
  if (!isOpen) return null;

  const totalEnrolled = totalStudentsCount || studentCount;

  return (
    <div
      id="start-attendance-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="start-attendance-modal-container"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
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
              <p className="text-xs text-slate-400">Sahkan butiran sesi kelas & sasaran kehadiran</p>
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
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subjek / Kursus</div>
              <div className="text-sm font-bold text-white leading-snug">
                <span className="text-indigo-400 font-mono font-bold mr-1.5">{subjectCode}</span>
                {subjectName ? `- ${subjectName}` : ''}
              </div>
            </div>
          </div>

          {/* Multiple-Choice Class Selection */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Seksyen Kelas Sasaran</div>
                  <div className="text-sm font-bold text-white">
                    {className === 'ALL' ? 'Semua Kelas (Sesi Khas)' : `Kelas ${className.replace('_', ' ')}`}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                  className === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : getClassBadgeColor(className)
                }`}>
                  {className === 'ALL' ? 'SEMUA KELAS' : className}
                </span>
              </div>

              {/* Multiple-choice option list */}
              {availableClasses && availableClasses.length > 1 && onSelectClass && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Pilih kelas sasaran (satu pilihan):</span>
                    <span className="text-[10px] text-teal-400 font-medium">Klik untuk tukar</span>
                  </div>

                  {/* Daily Classes Options (Radio semantics) */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableClasses.map((cls) => {
                      const isSelected = className.toUpperCase() === cls.toUpperCase();
                      const count = classStudentCounts ? classStudentCounts[cls] : undefined;

                      return (
                        <div
                          key={`modal-choice-cls-${cls}`}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => onSelectClass(cls)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectClass(cls);
                            }
                          }}
                          className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                            isSelected
                              ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/10 border-teal-400 text-teal-100 ring-1 ring-teal-400/40 font-bold'
                              : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Left: Radio Circle + Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'border-teal-400 bg-teal-500/20' : 'border-slate-600 bg-slate-900'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-teal-400" />}
                            </div>
                            <span className="text-xs font-mono font-bold truncate">
                              {cls.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Right: Student count + Check icon */}
                          <div className="flex items-center gap-2 shrink-0">
                            {count !== undefined && (
                              <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                                isSelected ? 'bg-teal-500/30 text-teal-200 border border-teal-500/40 font-bold' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {count} Pelajar
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-teal-400 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sesi Khas Gabungan (Ujian / Taklimat) */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <div
                      role="radio"
                      aria-checked={className === 'ALL'}
                      tabIndex={0}
                      onClick={() => onSelectClass(className === 'ALL' ? (availableClasses[0] || 'ALL') : 'ALL')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectClass(className === 'ALL' ? (availableClasses[0] || 'ALL') : 'ALL');
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99] ${
                        className === 'ALL'
                          ? 'bg-gradient-to-r from-amber-500/25 via-indigo-500/20 to-purple-500/20 border-amber-500 text-amber-100 ring-1 ring-amber-400/40 font-bold'
                          : 'bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            className === 'ALL' ? 'border-amber-400 bg-amber-500/20' : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {className === 'ALL' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Layers className={`w-3.5 h-3.5 shrink-0 ${className === 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              SEMUA KELAS (GABUNGAN)
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-5">
                            Sesi khas — Ujian / Taklimat
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                          className === 'ALL' ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {totalEnrolled} Pelajar
                        </span>
                        {className === 'ALL' && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            className={`flex-2 py-3 px-4 rounded-xl text-white text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              className === 'ALL'
                ? 'bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 shadow-amber-900/40'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Sahkan & Mula Sesi ({className === 'ALL' ? 'Semua' : className.replace('_', ' ')})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
