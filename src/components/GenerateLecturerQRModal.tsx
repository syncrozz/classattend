import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Printer,
  X,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
  BookOpen
} from 'lucide-react';

interface GenerateLecturerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDirectRegistration: () => void;
}

export const GenerateLecturerQRModal: React.FC<GenerateLecturerQRModalProps> = ({
  isOpen,
  onClose,
  onOpenDirectRegistration
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const registrationUrl = `${currentOrigin}${currentPath}#register-lecturer`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="generate-lecturer-qr-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="generate-lecturer-qr-modal-container"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        {/* Header */}
        <div
          id="lecturer-qr-header"
          className="px-6 py-5 bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <QrCode className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Admin Tool
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white">
                  KPM Bandar Penawar
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">
                QR Pendaftaran Kendiri Pensyarah
              </h2>
            </div>
          </div>
          <button
            id="close-lecturer-qr-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pamerkan kod QR ini kepada pensyarah kolej untuk pendaftaran identiti master dan penugasan subjek secara kendiri.
            </p>
          </div>

          {/* QR Code Container */}
          <div
            id="lecturer-registration-qr-box"
            className="inline-block p-5 bg-white rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700 shadow-md mx-auto"
          >
            <QRCodeSVG
              value={registrationUrl}
              size={210}
              level="H"
              includeMargin={true}
            />
            <div className="mt-2 text-[11px] font-mono font-semibold text-slate-700 uppercase tracking-wider">
              Scan to Register Lecturer Master
            </div>
          </div>

          {/* Direct URL Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-left">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Pautan Pendaftaran Rasmi:</span>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                {registrationUrl}
              </p>
            </div>
            <button
              id="copy-lecturer-reg-url-btn"
              onClick={handleCopyLink}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition ${
                copied
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
              }`}
              title="Salin Pautan"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Disalin' : 'Salin'}</span>
            </button>
          </div>

          {/* How It Works Guidelines */}
          <div className="text-left rounded-xl p-3.5 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/60 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Alur Kerja Pendaftaran Kendiri Pensyarah:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
              <li>Pensyarah mengimbas kod QR menggunakan telefon pintar atau tablet.</li>
              <li>Pensyarah mengisi nama, No. IC, emel rasmi kolej dan memilih subjek serta menandakan kelas yang diajar.</li>
              <li>Sistem menjana status <strong>PENDING</strong> bagi pendaftaran baharu.</li>
              <li>Pentadbir meluluskan akaun di menu <strong>Pensyarah</strong> (Master Data) untuk mengaktifkan akses.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              id="test-open-lecturer-form-btn"
              onClick={() => {
                onClose();
                onOpenDirectRegistration();
              }}
              className="py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Uji Borang Sekarang</span>
            </button>
            <button
              id="print-lecturer-qr-btn"
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
