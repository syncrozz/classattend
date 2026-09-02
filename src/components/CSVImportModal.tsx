import React, { useState } from 'react';
import { Student, Lecturer, Subject } from '../types';
import {
  parseStudentCSVWithReport,
  parseLecturerCSV,
  parseSubjectCSVWithReport,
  generateClassTemplateCSV,
  generateLecturerTemplateCSV,
  generateSubjectTemplateCSV,
  downloadCSV,
  StudentCSVParseResult,
  SubjectCSVParseResult
} from '../utils/csvHelper';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Student[], replaceAll?: boolean) => void;
  onImportLecturers?: (lecturers: Lecturer[]) => void;
  onImportSubjects?: (subjects: Subject[], replaceAll?: boolean) => void;
  initialMode?: 'STUDENT' | 'LECTURER' | 'SUBJECT';
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onImportLecturers,
  onImportSubjects,
  initialMode = 'STUDENT'
}) => {
  const [importMode, setImportMode] = useState<'STUDENT' | 'LECTURER' | 'SUBJECT'>(initialMode);
  const [dragActive, setDragActive] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [studentReport, setStudentReport] = useState<StudentCSVParseResult | null>(null);
  const [parsedLecturers, setParsedLecturers] = useState<Lecturer[]>([]);
  const [parsedSubjects, setParsedSubjects] = useState<Subject[]>([]);
  const [subjectReport, setSubjectReport] = useState<SubjectCSVParseResult | null>(null);
  const [targetClass, setTargetClass] = useState<string>('KEKAL');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setImportMode(initialMode);
      setParsedStudents([]);
      setStudentReport(null);
      setParsedLecturers([]);
      setParsedSubjects([]);
      setSubjectReport(null);
      setError(null);
      setFileName('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (importMode === 'STUDENT') {
          const report = parseStudentCSVWithReport(text);
          if (report.students.length === 0) {
            setError('Gagal membaca rekod pelajar daripada fail CSV. Sila pastikan format fail mempunyai sekurang-kurangnya nama atau no pelajar.');
            soundService.playError();
          } else {
            setParsedStudents(report.students);
            setStudentReport(report);
            setParsedLecturers([]);
            setParsedSubjects([]);
            soundService.playSuccess();
          }
        } else if (importMode === 'LECTURER') {
          const lecturers = parseLecturerCSV(text);
          if (lecturers.length === 0) {
            setError('Gagal membaca rekod pensyarah daripada fail CSV. Sila pastikan terdapat lajur Nama, Email KPM (@bpenawar.kpm.edu.my), dan No. IC.');
            soundService.playError();
          } else {
            setParsedLecturers(lecturers);
            setParsedStudents([]);
            setParsedSubjects([]);
            setStudentReport(null);
            soundService.playSuccess();
          }
        } else {
          // SUBJECT mode
          const report = parseSubjectCSVWithReport(text);
          if (report.subjects.length === 0) {
            setError('Gagal membaca senarai subjek/kursus. Pastikan format mempunyai Kod Kursus dan Nama Kursus (cth: ACC1013 FINANCIAL ACCOUNTING 1).');
            soundService.playError();
          } else {
            setParsedSubjects(report.subjects);
            setSubjectReport(report);
            setParsedStudents([]);
            setParsedLecturers([]);
            setStudentReport(null);
            soundService.playSuccess();
          }
        }
      } catch {
        setError('Ralat semasa memproses fail CSV.');
        soundService.playError();
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (importMode === 'STUDENT' && parsedStudents.length > 0) {
      let finalStudents = parsedStudents;
      if (targetClass !== 'KEKAL') {
        finalStudents = parsedStudents.map((s) => ({
          ...s,
          className: targetClass
        }));
      }
      onImport(finalStudents, replaceExisting);
      soundService.playSuccess();
      onClose();
    } else if (importMode === 'LECTURER' && parsedLecturers.length > 0) {
      if (onImportLecturers) {
        onImportLecturers(parsedLecturers);
      }
      soundService.playSuccess();
      onClose();
    } else if (importMode === 'SUBJECT' && parsedSubjects.length > 0) {
      if (onImportSubjects) {
        onImportSubjects(parsedSubjects, replaceExisting);
      }
      soundService.playSuccess();
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    if (importMode === 'STUDENT') {
      const template = generateClassTemplateCSV('DIA_4A');
      downloadCSV(template, 'Templat_Kehadiran_Kelas_KPM.csv');
    } else if (importMode === 'LECTURER') {
      const template = generateLecturerTemplateCSV();
      downloadCSV(template, 'Templat_Senarai_Pensyarah_KPM.csv');
    } else {
      const template = generateSubjectTemplateCSV();
      downloadCSV(template, 'Templat_Senarai_Kursus_KPM.csv');
    }
    soundService.playClick();
  };

  const hasData =
    importMode === 'STUDENT'
      ? parsedStudents.length > 0
      : importMode === 'LECTURER'
      ? parsedLecturers.length > 0
      : parsedSubjects.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col space-y-4 text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {importMode === 'STUDENT' ? (
                <>
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Import Data Pelajar Kelas (CSV)</span>
                </>
              ) : importMode === 'LECTURER' ? (
                <>
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Import Senarai Pensyarah (CSV)</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5 text-teal-400" />
                  <span>Import Kod & Nama Kursus / Subjek (CSV)</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {importMode === 'STUDENT'
                ? 'Muat naik fail CSV untuk mengisi atau mengemas kini pangkalan data pelajar'
                : importMode === 'LECTURER'
                ? 'Muat naik fail CSV pensyarah (Emel, No IC, Kelas, Subjek) untuk padanan akses'
                : 'Muat naik fail CSV senarai subjek/kursus agar pensyarah dapat memilih subjek dengan tepat'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {!hasData && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-1">
            <button
              type="button"
              onClick={() => {
                setImportMode('STUDENT');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                importMode === 'STUDENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Import Pelajar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode('LECTURER');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                importMode === 'LECTURER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Import Pensyarah</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode('SUBJECT');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                importMode === 'SUBJECT' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Import Subjek</span>
            </button>
          </div>
        )}

        {/* Dropzone or Preview */}
        {!hasData ? (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                dragActive
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <Upload
                className={`w-10 h-10 mb-3 ${
                  importMode === 'STUDENT'
                    ? 'text-indigo-400'
                    : importMode === 'LECTURER'
                    ? 'text-emerald-400'
                    : 'text-teal-400'
                }`}
              />
              <h4 className="text-sm font-bold text-white mb-1">
                Tarik & Lepaskan fail CSV {importMode === 'STUDENT' ? 'pelajar' : importMode === 'LECTURER' ? 'pensyarah' : 'subjek/kursus'} di sini
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Menyokong fail CSV dengan pemisah koma (,), koma bertindih (;), tab, atau senarai teks kod & nama kursus
              </p>

              <label
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                  importMode === 'STUDENT'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : importMode === 'LECTURER'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>
                  Pilih Fail CSV {importMode === 'STUDENT' ? 'Pelajar' : importMode === 'LECTURER' ? 'Pensyarah' : 'Subjek / Kursus'}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Format info & Template download */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                <span className="font-semibold text-slate-300">Format Lajur Templat CSV:</span>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {importMode === 'STUDENT'
                    ? 'Bil, No_Pelajar, Nama_Pelajar, Kelas, No_Telefon, Email, Program'
                    : importMode === 'LECTURER'
                    ? 'Bil, Nama_Pensyarah, Email_KPM, No_IC, Kelas, Subjek_Diajar, Jabatan'
                    : 'Bil, Kod_Kursus, Nama_Kursus, Jabatan, Kelas_Seksyen'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>
                  Muat Turun Templat ({importMode === 'STUDENT' ? 'Pelajar' : importMode === 'LECTURER' ? 'Pensyarah' : 'Subjek'})
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview state */
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 text-xs gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>
                    {importMode === 'STUDENT'
                      ? `${parsedStudents.length} pelajar`
                      : importMode === 'LECTURER'
                      ? `${parsedLecturers.length} pensyarah`
                      : `${parsedSubjects.length} subjek/kursus`}
                  </strong>{' '}
                  berjaya dibaca daripada fail <strong>{fileName}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setParsedStudents([]);
                  setStudentReport(null);
                  setParsedLecturers([]);
                  setParsedSubjects([]);
                  setSubjectReport(null);
                  setFileName('');
                }}
                className="text-[11px] underline hover:text-white cursor-pointer text-left"
              >
                Pilih fail lain
              </button>
            </div>

            {/* If duplicate warnings */}
            {importMode === 'STUDENT' && studentReport && studentReport.duplicateCount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Terdapat {studentReport.duplicateCount} rekod dengan No. Pelajar pendua dalam fail ini. Semua rekod telah dikekalkan tanpa ada yang tercicir.
                </span>
              </div>
            )}

            {importMode === 'SUBJECT' && subjectReport && subjectReport.duplicateCount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  {subjectReport.duplicateCount} kod kursus pendua telah dikesan dan diselaraskan secara automatik.
                </span>
              </div>
            )}

            {/* Storage Mode Options (Students & Subjects) */}
            {(importMode === 'STUDENT' || importMode === 'SUBJECT') && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Mode Replace vs Merge */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                      Kaedah Simpanan:
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="importStorageMode"
                          checked={!replaceExisting}
                          onChange={() => setReplaceExisting(false)}
                          className="text-teal-600 focus:ring-0"
                        />
                        <span>
                          <strong>Gabungkan</strong> dengan senarai sedia ada
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="importStorageMode"
                          checked={replaceExisting}
                          onChange={() => setReplaceExisting(true)}
                          className="text-teal-600 focus:ring-0"
                        />
                        <span>
                          <strong>Gantikan Keseluruhan</strong> (Jumlah jadi {importMode === 'STUDENT' ? parsedStudents.length : parsedSubjects.length})
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Target Class Assignment Override for Students */}
                  {importMode === 'STUDENT' ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between gap-1.5 text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        Tentukan Kelas:
                      </span>
                      <select
                        value={targetClass}
                        onChange={(e) => setTargetClass(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 w-full"
                      >
                        <option value="KEKAL">Gunakan Kelas Dari Fail CSV</option>
                        <option value="DIA_3A">Tetapkan ke DIA_3A</option>
                        <option value="DIA_3B">Tetapkan ke DIA_3B</option>
                        <option value="DIA_3C">Tetapkan ke DIA_3C</option>
                        <option value="DIA_3D">Tetapkan ke DIA_3D</option>
                        <option value="DIA_4A">Tetapkan ke DIA_4A</option>
                        <option value="DIA_4B">Tetapkan ke DIA_4B</option>
                        <option value="DIA_4C">Tetapkan ke DIA_4C</option>
                        <option value="DIA_4D">Tetapkan ke DIA_4D</option>
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between gap-1.5 text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        Pilihan Penugasan:
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Subjek ini akan serta-merta tersedia dalam pilihan Pendaftaran Kendiri Pensyarah dan Sesi Kuliah.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table Preview */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 max-h-52">
              {importMode === 'STUDENT' ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Bil</th>
                      <th className="py-2.5 px-3">No. Pelajar</th>
                      <th className="py-2.5 px-3">Nama Pelajar</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Telefon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 text-indigo-400 font-bold">{s.studentId}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-white">{s.name}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {targetClass === 'KEKAL' ? s.className : targetClass}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{s.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : importMode === 'LECTURER' ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Bil</th>
                      <th className="py-2.5 px-3">Nama Pensyarah</th>
                      <th className="py-2.5 px-3">Emel KPM</th>
                      <th className="py-2.5 px-3">No. IC</th>
                      <th className="py-2.5 px-3">PIN (4-Digit)</th>
                      <th className="py-2.5 px-3">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedLecturers.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-white">{l.name}</td>
                        <td className="py-2 px-3 text-emerald-400">{l.email}</td>
                        <td className="py-2 px-3 text-slate-300">{l.icNumber}</td>
                        <td className="py-2 px-3 text-amber-300 font-bold">{l.pin}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 font-sans">
                            {(l.assignedSections || l.assignedClasses || []).map((sec) => (
                              <span key={sec} className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                                {sec}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* SUBJECTS TABLE PREVIEW */
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Bil</th>
                      <th className="py-2.5 px-3">Kod Kursus</th>
                      <th className="py-2.5 px-3">Nama Kursus</th>
                      <th className="py-2.5 px-3">Jabatan</th>
                      <th className="py-2.5 px-3">Kelas / Seksyen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedSubjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-teal-300">{sub.code}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-white">{sub.name}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px]">
                            {sub.department || 'Jabatan Perakaunan'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400 text-[10px]">
                          {(sub.sections || []).slice(0, 3).join(', ')}
                          {(sub.sections || []).length > 3 ? ` +${sub.sections.length - 3}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  importMode === 'STUDENT'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : importMode === 'LECTURER'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Simpan {importMode === 'STUDENT' ? `${parsedStudents.length} Pelajar` : importMode === 'LECTURER' ? `${parsedLecturers.length} Pensyarah` : `${parsedSubjects.length} Subjek`} ke Pangkalan Data
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
