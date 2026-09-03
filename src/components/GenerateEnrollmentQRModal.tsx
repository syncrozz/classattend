import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Subject, Lecturer, Enrollment, Student, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  QrCode,
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Printer,
  Users,
  ExternalLink,
  BookOpen,
  UserCheck,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';

interface GenerateEnrollmentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubject?: Subject | null;
  initialClass?: string;
  activeLecturer?: Lecturer | null;
  enrollments: Enrollment[];
  students: Student[];
  onOpenSelfRegistrationTest: (context: {
    subjectCode: string;
    subjectName: string;
    className: string;
    lecturerName?: string;
    lecturerEmail?: string;
  }) => void;
}

export const GenerateEnrollmentQRModal: React.FC<GenerateEnrollmentQRModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubject,
  initialClass,
  activeLecturer,
  enrollments,
  students,
  onOpenSelfRegistrationTest
}) => {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    initialSubject?.code || subjects[0]?.code || 'MPU 2163'
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    initialClass || initialSubject?.sections?.[0] || 'DIA_4A'
  );
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync with props
  useEffect(() => {
    if (initialSubject?.code) {
      setSelectedSubjectCode(initialSubject.code);
      if (initialClass) {
        setSelectedClass(initialClass);
      } else if (initialSubject.sections && initialSubject.sections.length > 0) {
        setSelectedClass(initialSubject.sections[0]);
      }
    }
  }, [initialSubject, initialClass]);

  if (!isOpen) return null;

  const currentSubject =
    subjects.find((s) => s.code === selectedSubjectCode) ||
    initialSubject || {
      id: 'SUBJ-DEFAULT',
      code: selectedSubjectCode,
      name: 'Pengajian Malaysia 2',
      sections: ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D']
    };

  const lecturerName = activeLecturer?.name || currentSubject.lecturerName || 'Pensyarah KPM Bandar Penawar';
  const lecturerEmail = activeLecturer?.email || currentSubject.lecturerEmail || '';

  // Construct Enrollment Registration URL
  const baseUrl = window.location.origin + window.location.pathname;
  const enrollmentUrl = `${baseUrl}#enroll?subject=${encodeURIComponent(currentSubject.code)}&subjectName=${encodeURIComponent(currentSubject.name)}&class=${encodeURIComponent(selectedClass)}&lecturer=${encodeURIComponent(lecturerName)}&lecturerEmail=${encodeURIComponent(lecturerEmail)}`;

  // Filter enrolled students for this subject & class in real time
  const currentEnrollments = enrollments.filter(
    (e) =>
      e.subjectCode.toUpperCase() === currentSubject.code.toUpperCase() &&
      (!selectedClass || selectedClass === 'ALL' || e.className.toUpperCase() === selectedClass.toUpperCase()) &&
      e.status !== 'DROPPED'
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(enrollmentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const availableSections = currentSubject.sections && currentSubject.sections.length > 0
    ? Array.from(new Set(currentSubject.sections.map((s) => s.trim().toUpperCase()).filter(Boolean)))
    : ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];

  return (
    <div
      id="generate-enrollment-qr-modal-backdrop"
      className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 ${
        isFullScreen ? 'p-0' : ''
      }`}
    >
      <div
        id="generate-enrollment-qr-modal-card"
        className={`relative w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 transition-all ${
          isFullScreen
            ? 'h-full max-h-screen rounded-none border-none flex flex-col justify-between p-6 bg-slate-950'
            : 'max-w-3xl my-6'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-slate-900 p-4 sm:p-5 border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  QR PENDAFTARAN KELAS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME SYNC
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Jana QR Pendaftaran Pelajar (Student Enrollment)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-toggle-fullscreen-qr"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'Keluar Skrin Penuh' : 'Pancar Skrin Penuh (Projector Mode)'}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              id="btn-close-generate-qr-modal"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className={`p-4 sm:p-6 space-y-6 ${isFullScreen ? 'flex-1 flex flex-col justify-center' : 'max-h-[82vh] overflow-y-auto'}`}>
          {/* Top Selectors: Subjek & Kelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Pilih Subjek
              </label>
              <select
                id="select-qr-subject"
                value={selectedSubjectCode}
                onChange={(e) => setSelectedSubjectCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.code}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Pilih Kelas / Seksyen
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSections.map((sec, secIdx) => (
                  <button
                    key={`gen-qr-sec-${sec}-${secIdx}`}
                    type="button"
                    onClick={() => setSelectedClass(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedClass === sec
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main QR Display Section & Real-Time Enrolled Counter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Big QR Code Card (Left Column - 7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl text-center space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-extrabold tracking-wide">
                  <span>IMBAS UNTUK DAFTAR MASUK KELAS</span>
                </div>
                <h4 className="text-lg sm:text-xl font-extrabold text-white">
                  [{currentSubject.code}] {currentSubject.name}
                </h4>
                <p className="text-xs text-slate-300">
                  Kelas: <strong className="text-blue-400">{selectedClass}</strong> • Pensyarah:{' '}
                  <strong className="text-slate-100">{lecturerName}</strong>
                </p>
              </div>

              {/* QR Container */}
              <div className="p-4 sm:p-5 bg-white rounded-3xl shadow-2xl ring-8 ring-indigo-500/20">
                <QRCodeSVG
                  value={enrollmentUrl}
                  size={isFullScreen ? 280 : 210}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="text-xs text-slate-400 max-w-sm">
                Pelajar hanya perlu mengimbas kod QR ini menggunakan kamera telefon pintar untuk mengisi maklumat dan mendaftar masuk.
              </p>

              {/* Action Buttons underneath QR */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 w-full">
                <button
                  id="btn-copy-enrollment-link"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Pautan Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Salin Pautan</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-print-enrollment-qr"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Cetak Poster QR</span>
                </button>

                <button
                  id="btn-test-student-registration-flow"
                  onClick={() =>
                    onOpenSelfRegistrationTest({
                      subjectCode: currentSubject.code,
                      subjectName: currentSubject.name,
                      className: selectedClass,
                      lecturerName,
                      lecturerEmail
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Uji Borang Pelajar</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Enrolled Students Feed (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                      Pelajar Berdaftar (Live)
                    </h5>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {currentEnrollments.length} Orang
                  </span>
                </div>

                {currentEnrollments.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400">
                      Belum ada pelajar mendaftar masuk.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Pancarkan kod QR ini. Senarai nama akan muncul serta-merta apabila pelajar submit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {currentEnrollments.map((enr) => {
                      const student = students.find((s) => s.studentId === enr.studentId || s.id === enr.studentId);
                      const displayName = student?.name || enr.studentId;
                      return (
                        <div
                          key={enr.id}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getStudentColor(enr.studentId)}`}>
                              {getInitials(displayName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {displayName}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {enr.studentId} • Kelas {enr.className}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            Berdaftar
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Instructions Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Prinsip Identiti ClassAttend:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  • <strong>1 Pelajar = 1 Identiti Master</strong> (No. Pelajar unik).<br />
                  • <strong>Banyak Pensyarah / Subjek = Banyak Enrollment</strong> tanpa penduaan data pelajar.<br />
                  • Selepas mendaftar, pelajar akan menerima <strong>Kod QR Kekal</strong> untuk imbasan kehadiran harian.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
