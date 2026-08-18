import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, Share2, PlusSquare, ArrowRight, X, Sparkles, ShieldCheck } from 'lucide-react';
import { OFFICIAL_STUDENT_ATTEND_ICON } from '../types';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(Boolean(standaloneMode));

    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstalled();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="pwa-install-modal-content"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 relative space-y-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-indigo-500/30 bg-slate-900 flex items-center justify-center shrink-0">
            <img
              src={OFFICIAL_STUDENT_ATTEND_ICON}
              alt="StudentAttend Icon"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Pasang Aplikasi (PWA)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gunakan StudentAttend seperti aplikasi mudah alih asli (Native App).
            </p>
          </div>
        </div>

        {/* Status: Already Installed vs Not Installed */}
        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-200">Aplikasi Sudah Dipasang!</div>
              <div className="text-[11px] text-emerald-300/80">
                Anda kini sedang menggunakan aplikasi ini dalam mod Standalone PWA.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Skrin Penuh (Tiada URL Bar)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Akses Pantas Skrin Utama</span>
              </div>
            </div>

            {/* Direct 1-Click Install Button (Chrome / Android / Edge) */}
            {deferredPrompt ? (
              <button
                id="btn-confirm-pwa-install"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Sekarang (1-Klik)</span>
              </button>
            ) : (
              /* Platform Specific Guides */
              <div className="space-y-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Panduan Pemasangan Manual:</span>
                </div>

                {isIOS ? (
                  /* iOS Safari Guide */
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                      <p>
                        Ketuk butang <strong>Kongsi (Share)</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-indigo-400" /> di bahagian bawah pelayar Safari.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <p>
                        Tatal ke bawah dan pilih <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-indigo-400" /> (Tambah ke Skrin Utama).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                      <p>Ketuk <strong>Add (Tambah)</strong> di penjuru atas kanan.</p>
                    </div>
                  </div>
                ) : (
                  /* Android Chrome / Desktop Guide */
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                      <p>
                        Ketuk menu tiga titik <strong>(⋮)</strong> di pelayar Chrome atau Edge anda.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <p>
                        Pilih <strong>"Pasang Aplikasi"</strong> atau <strong>"Add to Home screen"</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Service Worker & Manifest: v2.0</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            Faham, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
