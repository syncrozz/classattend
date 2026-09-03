import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Lecturer,
  Subject,
  TeachingAssignment,
  OFFICIAL_STUDENT_ATTEND_ICON
} from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';
import { auditLogger } from '../services/auditLogger';
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  CreditCard,
  Building2,
  BookOpen,
  Layers,
  X,
  Sparkles,
  ShieldCheck,
  Clock,
  Plus,
  Trash2,
  Info,
  Check
} from 'lucide-react';

interface LecturerSelfRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  availableClasses?: string[];
  onSuccess?: (lecturer: Lecturer, assignments: TeachingAssignment[]) => void;
}

interface SubjectSelectionState {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  department?: string;
  selectedClasses: string[];
}

const DEFAULT_DEPARTMENTS = [
  'Jabatan Perakaunan (JP)',
  'Jabatan Pengajian Am (JPA)',
  'Jabatan Teknologi Maklumat & Multimedia (JTMM)',
  'Jabatan Pengurusan Perniagaan (JPP)',
  'Jabatan Sains Matematik & Komputer (JSMK)',
  'Unit Pengurusan Hal Ehwal Pelajar (HEP)'
];

const STANDARD_CLASSES = [
  'DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D',
  'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'
];

export const LecturerSelfRegistrationModal: React.FC<LecturerSelfRegistrationModalProps> = ({
  isOpen,
  onClose,
  subjects,
  availableClasses = STANDARD_CLASSES,
  onSuccess
}) => {
  const [name, setName] = useState<string>('');
  const [icNumber, setIcNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [department, setDepartment] = useState<string>('Jabatan Perakaunan (JP)');

  // Selected subjects with their assigned classes
  const [selectedSubjectGroups, setSelectedSubjectGroups] = useState<SubjectSelectionState[]>([]);
  const [currentlyAddingSubjectId, setCurrentlyAddingSubjectId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    lecturer: Lecturer;
    assignments: TeachingAssignment[];
    isNewLecturer: boolean;
  } | null>(null);

  // Derive all classes available
  const allClassList = useMemo(() => {
    const list = availableClasses.length > 0 ? availableClasses : STANDARD_CLASSES;
    return Array.from(new Set(list)).sort();
  }, [availableClasses]);

  // Derive master subjects available from props or engine
  const masterSubjects = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return attendanceEngine.getSubjects();
  }, [subjects]);

  // Derived 4-digit PIN for preview
  const derivedPin = useMemo(() => {
    const numeric = icNumber.replace(/[^0-9]/g, '');
    return numeric.length >= 4 ? numeric.slice(-4) : '••••';
  }, [icNumber]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcNumber('');
      setEmail('');
      setPhone('');
      setDepartment('Jabatan Perakaunan (JP)');
      setErrorMsg(null);
      setSubmittedResult(null);
      // Let lecturers decide their subjects and classes manually - no automatic pre-allocation
      setSelectedSubjectGroups([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler to add a subject group
  const handleAddSubject = (subjectId: string) => {
    if (!subjectId) return;
    const foundSub = masterSubjects.find((s) => s.id === subjectId || s.code === subjectId);
    if (!foundSub) return;

    if (selectedSubjectGroups.some((sg) => sg.subjectCode === foundSub.code)) {
      setErrorMsg(`Subjek [${foundSub.code}] sudah ada dalam senarai pilihan anda.`);
      return;
    }

    setErrorMsg(null);
    setSelectedSubjectGroups((prev) => [
      ...prev,
      {
        subjectId: foundSub.id,
        subjectCode: foundSub.code,
        subjectName: foundSub.name,
        department: foundSub.department,
        selectedClasses: [] // Pensyarah tentukan sendiri kelas yang diajar
      }
    ]);
    setCurrentlyAddingSubjectId('');
  };

  // Handler to remove a subject group
  const handleRemoveSubject = (subjectCode: string) => {
    setSelectedSubjectGroups((prev) => prev.filter((sg) => sg.subjectCode !== subjectCode));
  };

  const handleEmailInput = (newVal: string) => {
    let formatted = newVal.toLowerCase();
    if (formatted.endsWith('@') && !email.endsWith('@') && !email.includes('@')) {
      formatted = `${formatted}bpenawar.kpm.edu.my`;
    }
    setEmail(formatted);
  };

  const applyEmailSuggestion = (prefix: string) => {
    const user = prefix.split('@')[0].trim();
    if (user) {
      setEmail(`${user}@bpenawar.kpm.edu.my`);
    }
  };

  // Handler to toggle a class for a subject
  const handleToggleClass = (subjectCode: string, className: string) => {
    setSelectedSubjectGroups((prev) =>
      prev.map((sg) => {
        if (sg.subjectCode !== subjectCode) return sg;
        const exists = sg.selectedClasses.includes(className);
        const updated = exists
          ? sg.selectedClasses.filter((c) => c !== className)
          : [...sg.selectedClasses, className];
        return { ...sg, selectedClasses: updated };
      })
    );
  };

  // Handler to select all classes for a subject
  const handleSelectAllClassesForSubject = (subjectCode: string) => {
    setSelectedSubjectGroups((prev) =>
      prev.map((sg) => {
        if (sg.subjectCode !== subjectCode) return sg;
        return { ...sg, selectedClasses: [...allClassList] };
      })
    );
  };

  // Handler to clear classes for a subject
  const handleClearClassesForSubject = (subjectCode: string) => {
    setSelectedSubjectGroups((prev) =>
      prev.map((sg) => {
        if (sg.subjectCode !== subjectCode) return sg;
        return { ...sg, selectedClasses: [] };
      })
    );
  };

  // Calculate total assignments count
  const totalAssignmentsCount = selectedSubjectGroups.reduce(
    (acc, sg) => acc + sg.selectedClasses.length,
    0
  );

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanIC = icNumber.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg('Sila masukkan Nama Penuh pensyarah.');
      return;
    }

    if (!cleanIC || cleanIC.replace(/[^0-9]/g, '').length < 6) {
      setErrorMsg('Sila masukkan No. Kad Pengenalan yang sah (cth: 861115-46-5305).');
      return;
    }

    if (!cleanEmail) {
      setErrorMsg('Sila masukkan Emel Rasmi kolej.');
      return;
    }

    if (!cleanEmail.endsWith('@bpenawar.kpm.edu.my')) {
      setErrorMsg('Emel mestilah menggunakan domain kolej rasmi: @bpenawar.kpm.edu.my');
      return;
    }

    if (selectedSubjectGroups.length === 0) {
      setErrorMsg('Sila pilih sekurang-kurangnya satu subjek yang diajar.');
      return;
    }

    // Check if at least one class is ticked for each subject
    const emptyClassSubject = selectedSubjectGroups.find((sg) => sg.selectedClasses.length === 0);
    if (emptyClassSubject) {
      setErrorMsg(`Sila tandakan sekurang-kurangnya satu kelas bagi subjek [${emptyClassSubject.subjectCode} - ${emptyClassSubject.subjectName}].`);
      return;
    }

    setIsSubmitting(true);
    try {
      const subjectAssignments = selectedSubjectGroups.map((sg) => ({
        subjectId: sg.subjectId,
        subjectCode: sg.subjectCode,
        subjectName: sg.subjectName,
        classes: sg.selectedClasses
      }));

      const res = await attendanceEngine.registerLecturerSelf({
        name: cleanName,
        email: cleanEmail,
        icNumber: cleanIC,
        phone: cleanPhone,
        department,
        subjectAssignments
      });

      if (res.success) {
        soundService.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        auditLogger.log({
          category: 'LECTURER_STATUS',
          action: 'Permohonan Pendaftaran Kendiri Pensyarah',
          details: `Pensyarah ${res.lecturer.name} (${res.lecturer.email}) telah menghantar permohonan pendaftaran akaun untuk jabatan ${res.lecturer.department || department}. Status semasa: ${res.lecturer.status}.`,
          performedBy: res.lecturer.name,
          target: res.lecturer.email,
          severity: 'INFO'
        });

        setSubmittedResult({

          lecturer: res.lecturer,
          assignments: res.assignments,
          isNewLecturer: res.isNewLecturer
        });

        if (onSuccess) {
          onSuccess(res.lecturer, res.assignments);
        }
      }
    } catch (err: any) {
      soundService.playError();
      setErrorMsg(err?.message || 'Ralat memproses pendaftaran pensyarah. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="lecturer-self-registration-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="lecturer-self-registration-modal-container"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div
          id="lecturer-registration-header"
          className="px-6 py-5 bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white flex items-center justify-between shadow-sm flex-shrink-0"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <UserCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Lecturer Self-Registration
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white">
                  KPM Bandar Penawar
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">
                Pendaftaran Kendiri Pensyarah
              </h2>
            </div>
          </div>
          <button
            id="close-lecturer-registration-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup Borang"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {submittedResult ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div id="lecturer-registration-success-view" className="space-y-6 py-2">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Pendaftaran Pensyarah Berjaya Dihantar!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Maklumat identiti pensyarah dan penugasan subjek telah direkodkan ke pangkalan data.
                </p>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <span>Status: MENUNGGU KELULUSAN ADMIN (PENDING)</span>
                  </div>
                  <p>
                    Pentadbir sistem kolej akan mengesahkan profil anda di panel Pentadbir. Selepas diluluskan, anda boleh terus log masuk menggunakan Emel Rasmi dan PIN keselamatan.
                  </p>
                </div>
              </div>

              {/* Summary Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3 text-sm">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span>Ringkasan Identiti Pensyarah</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-medium">
                    1 Lecturer Master
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Nama Penuh:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">{submittedResult.lecturer.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">No. Kad Pengenalan:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{submittedResult.lecturer.icNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Emel Rasmi:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{submittedResult.lecturer.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">PIN Keselamatan (4-Digit):</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-widest">{submittedResult.lecturer.pin}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Jabatan:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{submittedResult.lecturer.department || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">No. Telefon:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{submittedResult.lecturer.phone || '-'}</p>
                  </div>
                </div>

                {/* Assignments List */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <span>Penugasan Subjek & Kelas:</span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                      {submittedResult.assignments.length} Teaching Assignments
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {submittedResult.assignments.map((ta) => (
                      <div
                        key={ta.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{ta.subjectCode}</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">{ta.subjectName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {ta.className}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="lecturer-registration-done-btn"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md transition-all text-sm flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai & Tutup</span>
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM VIEW */
            <form id="lecturer-registration-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Error Notice */}
              {errorMsg && (
                <div
                  id="lecturer-registration-error-alert"
                  className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start space-x-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Helper Notice */}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <span>
                    Sistem <strong>ClassAttend</strong>: 1 Master Identity Pensyarah + Pelbagai Penugasan Subjek & Kelas.
                  </span>
                </div>
              </div>

              {/* Section 1: Lecturer Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    1. Maklumat Peribadi Pensyarah
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Penuh (Seperti Dalam Kad Pengenalan) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lecturer-reg-name-input"
                      type="text"
                      required
                      placeholder="Cth: PN. SITI NURHALIZA BINTI MOHD ZAKI"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium uppercase focus:ring-2 focus:ring-teal-500 outline-none transition"
                    />
                  </div>

                  {/* IC Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. Kad Pengenalan (IC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lecturer-reg-ic-input"
                      type="text"
                      required
                      placeholder="861115-46-5305"
                      value={icNumber}
                      onChange={(e) => setIcNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
                      <span>PIN Keselamatan Log Masuk:</span>
                      <strong className="text-teal-600 dark:text-teal-400 font-mono">{derivedPin}</strong>
                      <span className="text-slate-400">(4 digit terakhir IC)</span>
                    </p>
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emel Rasmi Kolej (@bpenawar.kpm.edu.my) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="lecturer-reg-email-input"
                        type="email"
                        required
                        placeholder="nama.pensyarah@bpenawar.kpm.edu.my"
                        value={email}
                        onChange={(e) => handleEmailInput(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition font-mono"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    {email.trim() && !email.toLowerCase().includes('@bpenawar.kpm.edu.my') && (
                      <button
                        type="button"
                        onClick={() => applyEmailSuggestion(email)}
                        className="w-full text-left inline-flex items-center justify-between gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm mt-1"
                      >
                        <span className="truncate font-mono text-[10px]">
                          Cadangan: {email.split('@')[0]}@bpenawar.kpm.edu.my
                        </span>
                        <span className="text-[10px] bg-teal-600 text-white dark:bg-teal-500/40 px-1.5 py-0.2 rounded font-semibold shrink-0">
                          Gunakan
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. Telefon Bimbit / WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        id="lecturer-reg-phone-input"
                        type="tel"
                        placeholder="012-3456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jabatan / Program
                    </label>
                    <div className="relative">
                      <select
                        id="lecturer-reg-department-select"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition appearance-none"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Subject & Class Teaching Selection */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      2. Pilihan Subjek & Kelas Yang Diajar
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-semibold">
                    {totalAssignmentsCount} Penugasan Kelas
                  </span>
                </div>

                {/* Add Subject Selector from Master */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Subjek Daripada Master Data Subjek Kolej:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      id="lecturer-reg-add-subject-select"
                      value={currentlyAddingSubjectId}
                      onChange={(e) => setCurrentlyAddingSubjectId(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="">-- Pilih Kursus Daripada Senarai 47 Kursus Kolej --</option>
                      {['Jabatan Perakaunan', 'Jabatan Pengajian Am', 'Jabatan Pengurusan Perniagaan', 'Jabatan Teknologi Maklumat'].map((dept) => {
                        const deptSubjects = masterSubjects.filter((s) => (s.department || '').includes(dept) || (dept === 'Jabatan Perakaunan' && !s.department));
                        if (deptSubjects.length === 0) return null;
                        return (
                          <optgroup key={dept} label={`${dept} (${deptSubjects.length} Kursus)`}>
                            {deptSubjects.map((sub) => {
                              const isAlreadyAdded = selectedSubjectGroups.some((sg) => sg.subjectCode === sub.code);
                              return (
                                <option key={sub.id || sub.code} value={sub.id || sub.code} disabled={isAlreadyAdded}>
                                  {sub.code} - {sub.name} {isAlreadyAdded ? '(Sudah Dipilih)' : ''}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      })}
                    </select>
                    <button
                      id="lecturer-reg-add-subject-btn"
                      type="button"
                      disabled={!currentlyAddingSubjectId}
                      onClick={() => handleAddSubject(currentlyAddingSubjectId)}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Subjek</span>
                    </button>
                  </div>
                </div>

                {/* Selected Subjects & Assigned Classes Cards */}
                <div className="space-y-3">
                  {selectedSubjectGroups.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                      Tiada subjek dipilih. Sila pilih subjek di atas untuk menetapkan kelas yang diajar.
                    </div>
                  ) : (
                    selectedSubjectGroups.map((sg, index) => (
                      <div
                        key={sg.subjectCode}
                        id={`subject-group-card-${sg.subjectCode.replace(/\s+/g, '_')}`}
                        className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-white dark:bg-slate-850 shadow-sm space-y-3 transition"
                      >
                        {/* Subject Heading */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold text-xs">
                                {sg.subjectCode}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Subjek #{index + 1}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {sg.subjectName}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubject(sg.subjectCode)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Padam Subjek Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Class Ticking Section */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Tandakan Kelas Yang Anda Ajar:
                            </span>
                            <div className="space-x-2 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleSelectAllClassesForSubject(sg.subjectCode)}
                                className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                              >
                                Pilih Semua
                              </button>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <button
                                type="button"
                                onClick={() => handleClearClassesForSubject(sg.subjectCode)}
                                className="text-slate-500 hover:underline"
                              >
                                Kosongkan
                              </button>
                            </div>
                          </div>

                          {/* Classes Checkbox Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {allClassList.map((cls) => {
                              const isChecked = sg.selectedClasses.includes(cls);
                              return (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => handleToggleClass(sg.subjectCode, cls)}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition ${
                                    isChecked
                                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                  }`}
                                >
                                  <span>{cls.replace('_', ' ')}</span>
                                  <div
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                                      isChecked
                                        ? 'bg-teal-600 border-teal-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
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

              {/* Submit & Cancel Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    Status pendaftaran akan dihantar sebagai <strong>PENDING</strong> untuk kelulusan Pentadbir.
                  </span>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    id="lecturer-reg-cancel-btn"
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    id="lecturer-reg-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menghantar Pendaftaran...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Hantar Pendaftaran Kendiri</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
