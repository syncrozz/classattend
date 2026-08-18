import React, { useState } from 'react';
import { Student, Lecturer } from '../types';
import {
  parseStudentCSV,
  parseLecturerCSV,
  generateClassTemplateCSV,
  generateLecturerTemplateCSV,
  downloadCSV
} from '../utils/csvHelper';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Users,
  UserCheck,
  BookOpen,
  Sparkles,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Student[]) => void;
  onImportLecturers?: (lecturers: Lecturer[]) => void;
  initialMode?: 'STUDENT' | 'LECTURER';
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onImportLecturers,
  initialMode = 'STUDENT'
}) => {
  const [importMode, setImportMode] = useState<'STUDENT' | 'LECTURER'>(initialMode);
  const [dragActive, setDragActive] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [parsedLecturers, setParsedLecturers] = useState<Lecturer[]>([]);
  const [targetClass, setTargetClass] = useState<string>('KEKAL');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (importMode === 'STUDENT') {
          const students = parseStudentCSV(text);
          if (students.length === 0) {
            setError('Gagal membaca rekod pelajar daripada fail CSV. Sila pastikan format fail mematuhi templat.');
            soundService.playError();
          } else {
            setParsedStudents(students);
            setParsedLecturers([]);
            soundService.playSuccess();
          }
        } else {
          const lecturers = parseLecturerCSV(text);
          if (lecturers.length === 0) {
            setError('Gagal membaca rekod pensyarah daripada fail CSV. Sila pastikan terdapat lajur Nama, Email KPM (@bpenawar.kpm.edu.my), dan No. IC.');
            soundService.playError();
          } else {
            setParsedLecturers(lecturers);
            setParsedStudents([]);
            soundService.playSuccess();
          }
        }
      } catch (err) {
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
      onImport(finalStudents);
      soundService.playSuccess();
      onClose();
    } else if (importMode === 'LECTURER' && parsedLecturers.length > 0) {
      if (onImportLecturers) {
        onImportLecturers(parsedLecturers);
      }
      soundService.playSuccess();
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    if (importMode === 'STUDENT') {
      const template = generateClassTemplateCSV('DIA_4A');
      downloadCSV(template, 'Templat_Kehadiran_Kelas_KPM.csv');
    } else {
      const template = generateLecturerTemplateCSV();
      downloadCSV(template, 'Templat_Senarai_Pensyarah_KPM.csv');
    }
    soundService.playClick();
  };

  const hasData = importMode === 'STUDENT' ? parsedStudents.length > 0 : parsedLecturers.length > 0;

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
              ) : (
                <>
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Import Senarai Pensyarah (CSV)</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {importMode === 'STUDENT'
                ? 'Muat turun templat rasmi, isi maklumat kelas, dan muat naik semula'
                : 'Muat turun templat pensyarah (Emel, No IC, Seksyen) untuk padanan akses'}
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
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
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
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <Upload className={`w-10 h-10 mb-3 ${importMode === 'STUDENT' ? 'text-indigo-400' : 'text-emerald-400'}`} />
              <h4 className="text-sm font-bold text-white mb-1">
                Tarik & Lepaskan fail CSV {importMode === 'STUDENT' ? 'kelas' : 'pensyarah'} di sini
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                atau klik untuk memilih fail daripada komputer anda
              </p>

              <label className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                importMode === 'STUDENT'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}>
                <Upload className="w-4 h-4" />
                <span>Pilih Fail CSV {importMode === 'STUDENT' ? 'Pelajar' : 'Pensyarah'}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
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
                    ? 'Bil, No_Pelajar, Nama_Pelajar, Kelas_Seksyen, No_Telefon, Email, Program'
                    : 'Bil, Nama_Pensyarah, Email_KPM, No_IC, Kelas_Seksyen, Subjek_Diajar, Jabatan'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Muat Turun Templat CSV ({importMode === 'STUDENT' ? 'Pelajar' : 'Pensyarah'})</span>
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
                    {importMode === 'STUDENT' ? `${parsedStudents.length} pelajar` : `${parsedLecturers.length} pensyarah`}
                  </strong>{' '}
                  berjaya dibaca daripada fail <strong>{fileName}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setParsedStudents([]);
                  setParsedLecturers([]);
                  setFileName('');
                }}
                className="text-[11px] underline hover:text-white cursor-pointer text-left"
              >
                Pilih fail lain
              </button>
            </div>

            {/* Target Class Assignment Override for Students */}
            {importMode === 'STUDENT' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-300 font-semibold">Tentukan Kelas / Seksyen:</span>
                  <p className="text-[11px] text-slate-400">Pilih jika ingin menetapkan semua pelajar dalam fail ini ke kelas tertentu</p>
                </div>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="KEKAL">Gunakan Kelas Dari Fail CSV</option>
                  <option value="DIA_4A">Tetapkan ke DIA_4A</option>
                  <option value="DIA_4B">Tetapkan ke DIA_4B</option>
                  <option value="DIA_4C">Tetapkan ke DIA_4C</option>
                  <option value="DIA_4D">Tetapkan ke DIA_4D</option>
                </select>
              </div>
            )}

            {/* Table Preview */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 max-h-56">
              {importMode === 'STUDENT' ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">No. Pelajar</th>
                      <th className="py-2.5 px-3">Nama Pelajar</th>
                      <th className="py-2.5 px-3">Kelas / Seksyen</th>
                      <th className="py-2.5 px-3">Telefon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-indigo-400 font-bold">{s.studentId}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-white">{s.name}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {targetClass === 'KEKAL' ? s.className : targetClass}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{s.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Nama Pensyarah</th>
                      <th className="py-2.5 px-3">Emel KPM</th>
                      <th className="py-2.5 px-3">No. IC</th>
                      <th className="py-2.5 px-3">PIN (4-Digit)</th>
                      <th className="py-2.5 px-3">Seksyen Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedLecturers.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
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
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Simpan {importMode === 'STUDENT' ? `${parsedStudents.length} Pelajar` : `${parsedLecturers.length} Pensyarah`} ke Pangkalan Data
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

