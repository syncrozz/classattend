import React from 'react';

interface FooterProps {
  onOpenSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 py-3.5 px-4 sm:px-6 lg:px-8 mt-auto select-none no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {/* Support CTA Button (Part A) */}
        <div className="flex items-center justify-center sm:justify-start">
          <a
            href="https://syncrozz.com/#support"
            id="footer-btn-support-innovation"
            onClick={(e) => {
              // Smooth SPA in-app routing to #support while preserving href fallback
              e.preventDefault();
              onOpenSupport();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer select-none group"
            title="Support"
          >
            <span className="tracking-tight text-slate-400 group-hover:text-slate-200 transition-colors">Support</span>
            <span className="text-[11px] opacity-80 group-hover:opacity-100 transition-opacity">❤️</span>
          </a>
        </div>

        {/* Developer Credit (Part A) */}
        <div className="text-xs text-slate-400 font-medium flex items-center justify-center sm:justify-end gap-1">
          <span className="text-slate-400 select-none">Develop By</span>
          <a
            href="https://wasap.my/60145313756"
            target="_blank"
            rel="noopener noreferrer"
            id="footer-link-syncrozz-whatsapp"
            className="text-slate-200 hover:text-indigo-400 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            title="Hubungi Syncrozz melalui WhatsApp"
          >
            Syncrozz
          </a>
        </div>
      </div>
    </footer>
  );
};
