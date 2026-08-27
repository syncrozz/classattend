import React from 'react';
import { Lecturer, TeachingAssignment, Subject } from '../types';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  QrCode,
  Users,
  ArrowRight,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface FirstTimeLecturerModalProps {
  isOpen: boolean;
  lecturer: Lecturer;
  teachingAssignments: TeachingAssignment[];
  subjects?: Subject[];
  onDismiss?: () => void;
  onClose?: () => void;
  onGoToClasses?: () => void;
  onStartTeaching?: () => void;
}

export const FirstTimeLecturerModal: React.FC<FirstTimeLecturerModalProps> = ({
  isOpen,
  lecturer,
  teachingAssignments,
  subjects,
  onDismiss,
  onClose,
  onGoToClasses,
  onStartTeaching
}) => {
  if (!isOpen) return null;

  const myAssignments = teachingAssignments.filter(
    (ta) =>
      ta.lecturerId === lecturer.id ||
      ta.lecturerEmail?.toLowerCase() === lecturer.email.toLowerCase()
  );

  const subjectSet = new Set<string>();
  const classSet = new Set<string>();

  myAssignments.forEach((ta) => {
    subjectSet.add(ta.subjectCode);
    classSet.add(ta.className);
  });

  // Fallback to lecturer object if assignments empty
  const totalSubjectsCount = subjectSet.size > 0 ? subjectSet.size : (lecturer.assignedSubjects || []).length;
  const totalClassesCount = classSet.size > 0 ? classSet.size : (lecturer.assignedClasses || []).length;

  const handleStart = () => {
    soundService.playClick();
    if (onDismiss) onDismiss();
    if (onClose) onClose();
    if (onStartTeaching) onStartTeaching();
    else if (onGoToClasses) onGoToClasses();
  };

  const steps = [
    {
      num: '1',
      title: 'PILIH KELAS',
      desc: 'Pilih subjek dan seksyen kelas yang diajar.',
      icon: BookOpen
    },
    {
      num: '2',
      title: 'MULA SESI',
      desc: 'Buka sesi kehadiran kelas untuk hari ini.',
      icon: Sparkles
    },
    {
      num: '3',
      title: 'PAPAR QR',
      desc: 'Papar Kod QR di skrin projektor atau peranti.',
      icon: QrCode
    },
    {
      num: '4',
      title: 'PELAJAR IMBAS',
      desc: 'Pelajar imbas kod QR menggunakan kamera peranti.',
      icon: Users
    },
    {
      num: '5',
      title: 'KEHADIRAN LIVE',
      desc: 'Data kehadiran dikemaskini secara langsung & tepat.',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div
        id="first-time-lecturer-modal"
        className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 text-white relative my-8 space-y-6"
      >
        {/* Top Badge & Welcome Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pengesahan Akaun Selesai</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Selamat Datang ke <span className="text-emerald-400">Class Attend</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300">
            Hai <strong className="text-white">{lecturer.name}</strong>, akaun pensyarah anda telah diaktifkan oleh Pentadbir Kolej.
          </p>
        </div>

        {/* Assigned Summary Stats Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-around gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {totalSubjectsCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Subjek Ditugaskan
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {totalClassesCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Seksyen Kelas
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              ACTIVE
            </div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Status Akaun
            </div>
          </div>
        </div>

        {/* 5-Step Workflow Guide */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aliran Pantas 5 Langkah Kehadiran:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.num}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center space-y-1 relative group hover:border-emerald-500/40 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-bold font-mono">
                    {s.num}
                  </div>
                  <Icon className="w-4 h-4 text-slate-300" />
                  <div className="text-[10px] font-extrabold text-white leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-snug">
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            id="btn-first-time-start-workspace"
            className="w-full flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Terus ke Ruang Kerja Saya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
