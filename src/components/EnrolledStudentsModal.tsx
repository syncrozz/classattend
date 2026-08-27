import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Subject, Enrollment, Student, Lecturer } from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  Users,
  X,
  Search,
  BookOpen,
  UserCheck,
  Trash2,
  QrCode,
  Download,
  Printer,
  GraduationCap,
  ShieldAlert,
  Layers,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';

interface EnrolledStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  className?: string;
  enrollments: Enrollment[];
  students: Student[];
  onOpenGenerateQR: (subject: Subject, className?: string) => void;
}

export const EnrolledStudentsModal: React.FC<EnrolledStudentsModalProps> = ({
  isOpen,
  onClose,
  subject,
  className,
  enrollments,
  students,
  onOpenGenerateQR
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(className || 'ALL');
  const [previewQrStudent, setPreviewQrStudent] = useState<Student | null>(null);

  if (!isOpen || !subject) return null;

  const subjectEnrollments = enrollments.filter(
    (e) => e.subjectCode.toUpperCase() === subject.code.toUpperCase() && e.status !== 'DROPPED'
  );

  const filteredEnrollments = subjectEnrollments.filter((enr) => {
    const student = students.find((s) => s.studentId === enr.studentId || s.id === enr.studentId);
    const matchesClass =
      selectedClassFilter === 'ALL' || enr.className.toUpperCase() === selectedClassFilter.toUpperCase();

    if (!matchesClass) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = (student?.name || '').toLowerCase();
    const id = enr.studentId.toLowerCase();
    const enrClass = enr.className.toLowerCase();
    return name.includes(query) || id.includes(query) || enrClass.includes(query);
  });

  const handleDeleteEnrollment = async (enrollmentId: string, studentName: string) => {
    if (confirm(`Adakah anda pasti mahu memadamkan pendaftaran bagi pelajar ${studentName}? Pelajar ini akan dikeluarkan daripada subjek ini sahaja.`)) {
      await attendanceEngine.deleteEnrollment(enrollmentId);
    }
  };

  const handleExportCSV = () => {
    if (filteredEnrollments.length === 0) return;
    const headers = ['No. Pelajar', 'Nama Penuh', 'Kelas', 'Subjek', 'Tarikh Daftar', 'No. Telefon', 'E-mel'];
    const rows = filteredEnrollments.map((enr) => {
      const s = students.find((st) => st.studentId === enr.studentId || st.id === enr.studentId);
      return [
        `"${enr.studentId}"`,
        `"${s?.name || enr.studentId}"`,
        `"${enr.className}"`,
        `"${enr.subjectCode} - ${subject.name}"`,
        `"${new Date(enr.enrolledAt).toLocaleDateString('ms-MY')}"`,
        `"${s?.phone || ''}"`,
        `"${s?.email || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Senarai_Pelajar_${subject.code}_${selectedClassFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sectionsList = subject.sections && subject.sections.length > 0 ? subject.sections : ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];

  return (
    <div
      id="enrolled-students-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
    >
      <div
        id="enrolled-students-modal-card"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-6"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-slate-900 p-4 sm:p-5 border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SENARAI PENDAFTARAN KELAS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {filteredEnrollments.length} Pelajar
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                [{subject.code}] {subject.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-qr-from-enrolled-modal"
              onClick={() => onOpenGenerateQR(subject, selectedClassFilter === 'ALL' ? undefined : selectedClassFilter)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Jana QR Kelas</span>
            </button>
            <button
              id="btn-close-enrolled-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-enrolled-students"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau No. Pelajar..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Class Filter */}
            <select
              id="select-filter-enrolled-class"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelas ({subjectEnrollments.length})</option>
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>
                  Kelas {sec} ({subjectEnrollments.filter((e) => e.className === sec).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-enrolled-csv"
              onClick={handleExportCSV}
              disabled={filteredEnrollments.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Eksport CSV</span>
            </button>
          </div>
        </div>

        {/* Enrolled Students Table / Cards */}
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-2">
          {filteredEnrollments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                Tiada rekod pendaftaran ditemui bagi pilihan ini.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Pancarkan Kod QR Pendaftaran Kelas kepada pelajar untuk membolehkan mereka mendaftar masuk secara terus.
              </p>
              <button
                type="button"
                onClick={() => onOpenGenerateQR(subject, selectedClassFilter === 'ALL' ? undefined : selectedClassFilter)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Pancar Kod QR Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEnrollments.map((enr) => {
                const student = students.find((s) => s.studentId === enr.studentId || s.id === enr.studentId);
                const displayName = student?.name || enr.studentId;
                const formattedDate = new Date(enr.enrolledAt).toLocaleDateString('ms-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={enr.id}
                    className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${getStudentColor(
                          enr.studentId
                        )}`}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs sm:text-sm truncate">
                          {displayName}
                        </div>
                        <div className="font-mono text-[11px] text-blue-400 font-semibold">
                          {enr.studentId}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-1">
                          <span className={`px-1.5 py-0.2 rounded border font-bold ${getClassBadgeColor(enr.className)}`}>
                            {enr.className}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {student && (
                        <button
                          id={`btn-view-qr-${enr.studentId}`}
                          onClick={() => setPreviewQrStudent(student)}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                          title="Lihat Kod QR Identiti Pelajar"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        id={`btn-delete-enrollment-${enr.id}`}
                        onClick={() => handleDeleteEnrollment(enr.id, displayName)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 transition-colors"
                        title="Padam pendaftaran dari subjek ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-950 p-3.5 px-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Prinsip: Memadam enrollment tidak memadam profil Master Pelajar.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Mini Modal Preview of Student Static QR */}
      {previewQrStudent && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Kad QR Pelajar</span>
              <button
                onClick={() => setPreviewQrStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto">
              <QRCodeSVG value={`STUDENT|${previewQrStudent.studentId}`} size={160} level="H" />
            </div>
            <div>
              <div className="font-mono font-bold text-indigo-400">{previewQrStudent.studentId}</div>
              <div className="font-bold text-white text-sm">{previewQrStudent.name}</div>
              <div className="text-xs text-slate-400">Kelas {previewQrStudent.className}</div>
            </div>
            <button
              onClick={() => setPreviewQrStudent(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
