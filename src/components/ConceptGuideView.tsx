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
  Cpu,
  Smartphone,
  Check,
  PlayCircle,
  HelpCircle,
  RefreshCw,
  Printer,
  ShieldAlert
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

      {/* NEW SECTION: STUDENT QR ENROLLMENT & TESTING GUIDE */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border-2 border-blue-500/40 p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                FITUR UTAMA: PENDAFTARAN KELAS PELAJAR (STUDENT ENROLLMENT)
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Panduan Operasi & Cara Menguji Pendaftaran QR Pelajar
              </h3>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold self-start">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Multi-Lecturer • Single Identity</span>
          </div>
        </div>

        {/* Concept Explanation: 1 Student = 1 Master, Many Enrollments */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Konsep Seni Bina Identiti:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-white block font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                1 Pelajar = 1 Identiti Master
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Setiap pelajar hanya mempunyai satu profil kekal berasaskan No. Pelajar unik. Tiada duplikasi profil walaupun diajar oleh ramai pensyarah.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-white block font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Banyak Pensyarah = Banyak Enrollment
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pelajar mendaftar ke pelbagai subjek melalui imbasan QR kelas pensyarah. Pensyarah hanya melihat senarai pelajar yang mendaftar bagi subjeknya sahaja.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Testing Guide */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-400" />
            <span>Langkah Ujian Alur Kerja (Testing Workflow):</span>
          </h4>

          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Pensyarah Menjana Kod QR Pendaftaran Kelas
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Buka tab <strong className="text-blue-300">Pengurusan Kelas</strong> ➔ Cari kad subjek (cth: <code className="text-indigo-300">MPU 2163</code>) ➔ Tekan butang biru <strong className="text-blue-400">"QR Daftar Pelajar"</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                Tip: Tekan ikon skrin penuh jika ingin memancarkan kod QR pada skrin projektor bilik kuliah.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Pelajar Mengimbas QR & Mengisi Borang
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Pelajar mengimbas QR dengan kamera telefon (atau pensyarah boleh menekan butang <strong className="text-blue-300">"Uji Borang Pelajar"</strong> untuk simulasi) ➔ Masukkan No. Pelajar (cth: <code className="text-indigo-300">PDA-2502-011</code>), Nama, dan Kelas ➔ Tekan <strong className="text-emerald-400">"Hantar & Daftar Masuk Kelas"</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                Sistem akan memaparkan <strong>Kad Identiti QR Digital Pelajar</strong> yang boleh disimpan/screenshot untuk imbasan harian.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Paparan Masa Nyata (Live Feed) & Ujian Pencegahan Duplikasi
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Nama pelajar akan serta-merta muncul pada skrin pensyarah di bahagian <strong className="text-indigo-300">"Pelajar Berdaftar (Live)"</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>Uji Pencegahan Duplikasi:</strong> Buka QR subjek lain dan masukkan No. Pelajar yang sama (<code className="text-indigo-300">PDA-2502-011</code>). Sistem akan mengesan identiti sedia ada secara automatik dan hanya menambah rekod subjek baharu tanpa menduplikasi maklumat pelajar.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
              4
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Pengurusan & Eksport Senarai Pelajar
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Tekan butang <strong className="text-indigo-300">"[X] Pelajar Berdaftar"</strong> pada kad subjek untuk melihat keseluruhan senarai, menapis mengikut kelas, melihat kod QR pelajar, memadam pendaftaran, atau mengeksport fail senarai pelajar ke format <strong>CSV (Excel)</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: LECTURER SELF-REGISTRATION VIA ADMIN QR */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-900 border-2 border-teal-500/40 p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/50 flex items-center justify-center text-teal-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                FITUR BAHARU: PENDAFTARAN KENDIRI PENSYARAH (LECTURER SELF-REGISTRATION)
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Panduan Pendaftaran Pensyarah Melalui QR Kod Pentadbir (Admin)
              </h3>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold self-start">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Admin QR • 1 Pensyarah Banyak Subjek/Kelas</span>
          </div>
        </div>

        {/* Architectural Concept */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Seni Bina Identiti & Hubungan Penugasan:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-white block font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                1 Pensyarah = 1 Identiti Master
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Profil pensyarah didaftarkan dengan Nama, No. IC, E-mel rasmi <code className="text-teal-300">@bpenawar.kpm.edu.my</code>, No Telefon, dan Jabatan. PIN keselamatan dijana automatik daripada 4 digit terakhir No. IC.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-white block font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Banyak Subjek / Kelas = Teaching Assignments
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pensyarah memilih sendiri subjek rasmi sedia ada dan menanda kelas-kelas yang diajar. Hubungan penugasan pengajaran disimpan dalam struktur <code className="text-indigo-300">teaching_assignments</code> tanpa duplikasi identiti.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Flow */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-teal-400" />
            <span>Alur Kerja Pendaftaran & Pengesahan Pentadbir:</span>
          </h4>

          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Admin Menjana QR Pensyarah
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Admin membuka tab <strong className="text-teal-300">Master Data ➔ Tab Direktori Pensyarah</strong> dan menekan butang hijau <strong className="text-emerald-400">"1. Jana QR Pensyarah"</strong>. Kod QR ini adalah umum dan boleh diimbas oleh berbilang pensyarah.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Pensyarah Mengimbas QR & Mengisi Maklumat Peribadi
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Pensyarah mengimbas QR dengan telefon pintar (atau klik <strong className="text-teal-300">"2. Uji Borang Pendaftaran"</strong> untuk simulasi) ➔ Masukkan Nama Penuh, No. IC, E-mel rasmi Kolej, No. Telefon, dan Jabatan.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Pemilihan Subjek & Penandaan Kelas Ditugaskan
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Pensyarah memilih subjek daripada katalog subjek rasmi kolej, kemudian menanda satu atau lebih kelas yang diajar (cth: <code className="text-indigo-300">DIA_4A, DIA_4B</code>). Pensyarah juga boleh menambah subjek kedua atau ketiga jika mengajar pelbagai kursus sebelum menekan <strong className="text-teal-400">"Hantar Pendaftaran Pensyarah"</strong>.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
              4
            </div>
            <div className="space-y-1 text-xs">
              <strong className="text-white block text-sm">
                Kelulusan & Pengaktifan oleh Pentadbir (Admin Approval)
              </strong>
              <p className="text-slate-300 leading-relaxed">
                Permohonan pensyarah baharu disimpan dalam status <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px]">PENDING</span>. Pentadbir akan melihat kad permohonan berserta perincian subjek dan kelas di bahagian <strong className="text-amber-300">"Menunggu Kelulusan"</strong> dan menekan butang <strong className="text-emerald-400">"Luluskan & Aktifkan"</strong> untuk mengaktifkan akaun pensyarah.
              </p>
            </div>
          </div>
        </div>
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
              Setiap kursus dikendalikan oleh pensyarah bertanggungjawab mengikut kelas dan silibus.
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
