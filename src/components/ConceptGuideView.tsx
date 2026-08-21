import React from 'react';
import {
  GraduationCap,
  QrCode,
  Users,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  BookOpen,
  Mail,
  KeyRound,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';

export const ConceptGuideView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Sistem Khusus Kehadiran Kelas KPM Bandar Penawar</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Panduan & Aliran Kerja Sistem CLASS ATTEND
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Platform CLASS ATTEND direka bentuk khusus untuk merekod kehadiran kuliah dan tutorial mengikut Kelas, Subjek, dan Sesi Kuliah pensyarah secara pantas, telus, dan selamat.
        </p>
      </div>

      {/* 1. LECTURER AUTHENTICATION */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>1. Pengesahan Identiti Pensyarah (Admin Pensyarah)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <Mail className="w-4 h-4" />
              <span>E-mel Rasmi Domain KPM</span>
            </div>
            <h4 className="text-sm font-bold text-white">Domain: @bpenawar.kpm.edu.my</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pensyarah mendaftar dan mengesahkan identiti dengan memasukkan e-mel rasmi (cth: <code className="text-indigo-300">khairi@bpenawar.kpm.edu.my</code> atau <code className="text-indigo-300">norazlina@bpenawar.kpm.edu.my</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <KeyRound className="w-4 h-4" />
              <span>PIN Keselamatan (4 Digit Terakhir No. IC)</span>
            </div>
            <h4 className="text-sm font-bold text-white">Contoh: IC 861115-46-5305 ➔ PIN: 5305</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kombinasi e-mel dan 4 digit terakhir Kad Pengenalan pensyarah digunakan sebagai kunci keselamatan PIN bagi melindungi rekod kelas dan pemberian akses admin.
            </p>
          </div>
        </div>
      </div>

      {/* 2. CSV TEMPLATE DOWNLOAD & UPLOAD */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
          <span>2. Muat Turun & Muat Naik Templat Data Pelajar (CSV)</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <strong className="text-white block text-sm">Muat Turun Templat Rasmi:</strong>
              Pensyarah boleh memuat turun templat CSV standard yang mengandungi format lajur: <code className="text-indigo-300">Bil, No_Pelajar, Nama_Pelajar, Kelas, No_Telefon, Email, Program</code>.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <strong className="text-white block text-sm">Isi & Muat Naik Semula:</strong>
              Isi data senarai pelajar kelas yang diajar menggunakan Microsoft Excel atau Google Sheets, simpan sebagai CSV, dan muat naik ke platform.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <strong className="text-white block text-sm">Jana Kod QR Pelajar Automatik:</strong>
              Setiap pelajar baharu yang dimasukkan akan dijana Kod QR kekal secara automatik untuk semua sesi subjek dan boleh dicetak terus ke format A4 (pelekat atau kad ID).
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLASS & SUBJECT STRUCTURE */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span>3. Struktur Subjek, Kelas & Sesi Kuliah</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 uppercase">Subjek / Kursus</div>
            <h4 className="text-sm font-bold text-white">FAR210, MAF251, TAX310, AUD390</h4>
            <p className="text-[11px] text-slate-400">
              Setiap kursus dikendalikan oleh pensyarah bertanggungjawab dengan maklumat bilik kuliah dan silibus.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 uppercase">Kelas</div>
            <h4 className="text-sm font-bold text-white">DIA_4A, DIA_4B, DIA_4C, DIA_4D</h4>
            <p className="text-[11px] text-slate-400">
              Pelajar dibahagikan mengikut kelas masing-masing. Pensyarah boleh mengajar satu atau beberapa kelas serentak.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 uppercase">Sesi Kuliah Mingguan</div>
            <h4 className="text-sm font-bold text-white">Kuliah Minggu 1, Minggu 2, Tutorial</h4>
            <p className="text-[11px] text-slate-400">
              Buka sesi imbasan bila-bila masa. Sistem menyokong imbasan kamera dan paparan projektor skrin besar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
