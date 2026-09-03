import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Check,
  Save,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Lecturer, Subject } from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';

interface SubjectGroupState {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  department?: string;
  selectedClasses: string[];
}

interface LecturerManageSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecturer: Lecturer;
  allSubjects: Subject[];
  allClasses?: string[];
  onSaved?: () => void;
}

const DEFAULT_CLASSES = [
  'DIA_1A', 'DIA_1B',
  'DIA_2A', 'DIA_2B',
  'DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D',
  'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'
];

export const LecturerManageSubjectsModal: React.FC<LecturerManageSubjectsModalProps> = ({
  isOpen,
  onClose,
  lecturer,
  allSubjects,
  allClasses = DEFAULT_CLASSES,
  onSaved
}) => {
  const [selectedGroups, setSelectedGroups] = useState<SubjectGroupState[]>([]);
  const [currentlyAddingCode, setCurrentlyAddingCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Initialize selected subjects from current lecturer assignments
  useEffect(() => {
    if (isOpen && lecturer) {
      setErrorMsg(null);
      setSaveSuccessMsg(null);

      // Get current teaching assignments for this lecturer
      const currentAssignments = attendanceEngine.getTeachingAssignmentsForLecturer(lecturer.id || lecturer.email);
      const groupsMap = new Map<string, SubjectGroupState>();

      if (currentAssignments.length > 0) {
        currentAssignments.forEach((ta) => {
          const code = ta.subjectCode.toUpperCase();
          if (!groupsMap.has(code)) {
            const matchedMaster = allSubjects.find((s) => s.code.toUpperCase() === code);
            groupsMap.set(code, {
              subjectId: ta.subjectId || `SUB-${code}`,
              subjectCode: code,
              subjectName: ta.subjectName || matchedMaster?.name || code,
              department: matchedMaster?.department || lecturer.department,
              selectedClasses: [ta.className]
            });
          } else {
            const grp = groupsMap.get(code)!;
            if (!grp.selectedClasses.includes(ta.className)) {
              grp.selectedClasses.push(ta.className);
            }
          }
        });
      } else if (lecturer.assignedSubjects && lecturer.assignedSubjects.length > 0) {
        // Fallback to lecturer.assignedSubjects
        const defaultCls = lecturer.assignedClasses && lecturer.assignedClasses.length > 0 ? lecturer.assignedClasses : [];
        lecturer.assignedSubjects.forEach((subStr) => {
          const code = subStr.includes('-') ? subStr.split('-')[0].trim().toUpperCase() : subStr.trim().toUpperCase();
          const name = subStr.includes('-') ? subStr.split('-')[1].trim() : subStr;
          const matchedMaster = allSubjects.find((s) => s.code.toUpperCase() === code);
          groupsMap.set(code, {
            subjectId: matchedMaster?.id || `SUB-${code}`,
            subjectCode: code,
            subjectName: matchedMaster?.name || name,
            department: matchedMaster?.department || lecturer.department,
            selectedClasses: [...defaultCls]
          });
        });
      }

      setSelectedGroups(Array.from(groupsMap.values()));
    }
  }, [isOpen, lecturer, allSubjects]);

  if (!isOpen) return null;

  const handleAddSubject = (subjectCode: string) => {
    if (!subjectCode) return;
    const matched = allSubjects.find((s) => s.code.toUpperCase() === subjectCode.toUpperCase());
    if (!matched) return;

    if (selectedGroups.some((g) => g.subjectCode.toUpperCase() === matched.code.toUpperCase())) {
      setErrorMsg(`Subjek [${matched.code}] sudah berada dalam senarai pilihan anda.`);
      return;
    }

    setErrorMsg(null);
    setSelectedGroups((prev) => [
      ...prev,
      {
        subjectId: matched.id,
        subjectCode: matched.code,
        subjectName: matched.name,
        department: matched.department,
        selectedClasses: [] // Lecturer ticks which classes they teach
      }
    ]);
    setCurrentlyAddingCode('');
  };

  const handleRemoveSubject = (subjectCode: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g.subjectCode.toUpperCase() !== subjectCode.toUpperCase()));
  };

  const handleToggleClass = (subjectCode: string, className: string) => {
    setSelectedGroups((prev) =>
      prev.map((g) => {
        if (g.subjectCode.toUpperCase() !== subjectCode.toUpperCase()) return g;
        const exists = g.selectedClasses.includes(className);
        return {
          ...g,
          selectedClasses: exists
            ? g.selectedClasses.filter((c) => c !== className)
            : [...g.selectedClasses, className]
        };
      })
    );
  };

  const handleSelectAllClasses = (subjectCode: string) => {
    setSelectedGroups((prev) =>
      prev.map((g) => {
        if (g.subjectCode.toUpperCase() !== subjectCode.toUpperCase()) return g;
        return { ...g, selectedClasses: [...allClasses] };
      })
    );
  };

  const handleClearClasses = (subjectCode: string) => {
    setSelectedGroups((prev) =>
      prev.map((g) => {
        if (g.subjectCode.toUpperCase() !== subjectCode.toUpperCase()) return g;
        return { ...g, selectedClasses: [] };
      })
    );
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    // Validate that each chosen subject has at least one class
    const emptySubject = selectedGroups.find((g) => g.selectedClasses.length === 0);
    if (emptySubject) {
      setErrorMsg(`Sila tandakan sekurang-kurangnya satu kelas bagi subjek [${emptySubject.subjectCode} - ${emptySubject.subjectName}].`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = selectedGroups.map((g) => ({
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        department: g.department,
        classes: g.selectedClasses
      }));

      const res = await attendanceEngine.updateLecturerTeachingAssignments(lecturer.id, payload);
      if (res.success) {
        soundService.playSuccess();
        setSaveSuccessMsg(res.message);
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Ralat menyimpan penugasan subjek.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Ralat sistem ketika menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const departments = [
    'Jabatan Perakaunan',
    'Jabatan Pengajian Am',
    'Jabatan Pengurusan Perniagaan',
    'Jabatan Teknologi Maklumat'
  ];

  return (
    <div
      id="lecturer-manage-subjects-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="lecturer-manage-subjects-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Tetapan Subjek & Kelas Pengajaran
              </h3>
              <p className="text-xs text-slate-400">
                Pilih subjek daripada senarai rasmi kolej dan tentukan kelas yang anda ajar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Instructions note */}
          <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 flex items-start gap-2.5 text-xs text-teal-200">
            <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <span>
              Subjek tidak diagihkan secara automatik kepada kelas. Anda bebas menentukan kursus mana yang anda ajar dan menandakan kelas berkaitan.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-200 font-bold">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Selector to add course */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Pilih Kursus Daripada Senarai 47 Kursus Kolej:
            </label>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <select
                id="select-add-subject-manage"
                value={currentlyAddingCode}
                onChange={(e) => setCurrentlyAddingCode(e.target.value)}
                className="w-full sm:w-auto sm:max-w-md sm:flex-initial px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">-- Pilih Kursus Untuk Ditambah --</option>
                {departments.map((dept) => {
                  const deptSubjects = allSubjects.filter(
                    (s) => (s.department || '').includes(dept) || (dept === 'Jabatan Perakaunan' && !s.department)
                  );
                  if (deptSubjects.length === 0) return null;
                  return (
                    <optgroup key={dept} label={`${dept} (${deptSubjects.length} Kursus)`}>
                      {deptSubjects.map((sub) => {
                        const isAdded = selectedGroups.some((g) => g.subjectCode.toUpperCase() === sub.code.toUpperCase());
                        return (
                          <option key={sub.code} value={sub.code} disabled={isAdded}>
                            {sub.code} - {sub.name} {isAdded ? '(Sudah Dipilih)' : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
              <button
                type="button"
                id="btn-add-subject-manage"
                disabled={!currentlyAddingCode}
                onClick={() => handleAddSubject(currentlyAddingCode)}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kursus</span>
              </button>
            </div>
          </div>

          {/* List of chosen subjects with class toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Subjek & Kelas Pilihan Anda ({selectedGroups.length}):</span>
            </div>

            {selectedGroups.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs space-y-1">
                <div>Tiada subjek dipilih lagi.</div>
                <div className="text-[11px] text-slate-600">Sila pilih kursus di atas untuk menetapkan kelas yang anda ajar.</div>
              </div>
            ) : (
              selectedGroups.map((group, idx) => (
                <div
                  key={group.subjectCode}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold text-xs border border-teal-500/30">
                          {group.subjectCode}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Kursus #{idx + 1}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {group.subjectName}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(group.subjectCode)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                      title="Padam Kursus Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Classes toggles */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        Tandakan Kelas Yang Anda Ajar:
                      </span>
                      <div className="space-x-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSelectAllClasses(group.subjectCode)}
                          className="text-teal-400 hover:underline font-semibold cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => handleClearClasses(group.subjectCode)}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {allClasses.map((cls) => {
                        const isChecked = group.selectedClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => handleToggleClass(group.subjectCode, cls)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition cursor-pointer ${
                              isChecked
                                ? 'bg-teal-950/60 border-teal-500 text-teal-200 font-bold shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{cls.replace('_', ' ')}</span>
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                                isChecked
                                  ? 'bg-teal-600 border-teal-600 text-white'
                                  : 'border-slate-700'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-save-manage-subjects"
            disabled={isSaving || selectedGroups.length === 0}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-teal-600/30 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Subjek & Kelas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
