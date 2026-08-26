import React, { useState } from 'react';
import {
  Download,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Heart,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface SupportInnovationViewProps {
  onReturnToPlatform: () => void;
}

export const SupportInnovationView: React.FC<SupportInnovationViewProps> = ({
  onReturnToPlatform
}) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<'IDLE' | 'DOWNLOADING' | 'SUCCESS'>('IDLE');

  const QR_IMAGE_URL =
    'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Bank%20QR/QR%20RYT%20for%20Sumbangan.jpg';

  const handleSaveQRCode = async () => {
    try {
      setDownloadStatus('DOWNLOADING');
      const response = await fetch(QR_IMAGE_URL, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch network error');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'Syncrozz-QR-Sumbangan.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      setDownloadStatus('SUCCESS');
      setTimeout(() => setDownloadStatus('IDLE'), 3500);
    } catch (error) {
      // Direct download link fallback
      const link = document.createElement('a');
      link.href = QR_IMAGE_URL;
      link.target = '_blank';
      link.download = 'Syncrozz-QR-Sumbangan.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus('SUCCESS');
      setTimeout(() => setDownloadStatus('IDLE'), 3500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-return-top"
          onClick={onReturnToPlatform}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke PLATFORM</span>
        </button>
      </div>

      {/* Main Support Card */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Support Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold tracking-wide">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>Sumbangan Sukarela</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sokong Inovasi Ini ❤️
          </h2>

          {/* Friendly & Appreciative Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto font-normal">
            Jika platform ClassAttend ini memberi manfaat dan memudahkan urusan pengurusan kehadiran anda, sokongan kecil anda amat bermakna untuk membantu kami mengekalkan pelayan (hosting), mempertingkatkan ciri inovasi digital, dan memastikan aplikasi kekal percuma untuk digunakan.
          </p>
        </div>

        {/* Real Donation QR Code Container */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/50 max-w-[280px] w-full transition-transform hover:scale-[1.01]">
            <img
              src={QR_IMAGE_URL}
              alt="DuitNow Bank QR Code Sumbangan Syncrozz"
              className="w-full h-auto aspect-square object-contain rounded-xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* QR Scan Helper Label */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Imbas menggunakan sebarang aplikasi Perbankan atau DuitNow e-Wallet</span>
          </div>
        </div>

        {/* Action: Save QR Code */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            id="btn-save-qr-code"
            onClick={handleSaveQRCode}
            disabled={downloadStatus === 'DOWNLOADING'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
          >
            {downloadStatus === 'DOWNLOADING' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                <span>Menyimpan...</span>
              </>
            ) : downloadStatus === 'SUCCESS' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>QR Berjaya Disimpan!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-900" />
                <span>Save QR Code</span>
              </>
            )}
          </button>
        </div>

        {/* How To Pay Accordion */}
        <div className="max-w-lg mx-auto text-left">
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden transition-all">
            <button
              id="accordion-how-to-pay"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Cara Bayar Guna Galeri (How To Pay)</span>
              </div>
              {isAccordionOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isAccordionOpen && (
              <div className="p-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-2.5 animate-fadeIn">
                <div className="space-y-2 text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Tekan butang <strong className="text-white font-semibold">"Save QR Code"</strong> di atas untuk memuat turun imej Kod QR ke galeri peranti anda.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Buka aplikasi perbankan atau e-wallet pilihan anda (contoh: Maybank MAE, CIMB, Bank Islam, Touch 'n Go eWallet, dsb.).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      Pilih fungsi <strong className="text-white font-semibold">Imbas Kod QR / DuitNow QR</strong>, kemudian pilih ikon <strong className="text-white font-semibold">'Scan from Gallery' / Gambar</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <p className="leading-relaxed">
                      Pilih imej QR yang telah disimpan tadi dari galeri telefon anda.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      5
                    </span>
                    <p className="leading-relaxed">
                      Masukkan sebarang jumlah sumbangan ikhlas dan lengkapkan proses transaksi mengikut langkah bank anda.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appreciation Message */}
        <div className="pt-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold shadow-sm">
            <span>RM1 pun amat dihargai 👏</span>
          </div>
        </div>

        {/* Primary Return Button */}
        <div className="pt-2 border-t border-slate-800">
          <button
            id="btn-return-bottom"
            onClick={onReturnToPlatform}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke PLATFORM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
