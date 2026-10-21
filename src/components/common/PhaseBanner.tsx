import React, { useState } from 'react';
import { PortalSettings } from '../../types';
import { Sparkles, Calendar, ArrowRightLeft, CheckCircle2, Clock } from 'lucide-react';

interface PhaseBannerProps {
  settings: PortalSettings;
  isAdmin: boolean;
  onUpdatePhase: (phase: 'pre-final' | 'during-final') => Promise<void>;
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({
  settings,
  isAdmin,
  onUpdatePhase,
}) => {
  const [switching, setSwitching] = useState(false);
  const isPreFinal = settings.activePhase === 'pre-final';

  const handleToggle = async () => {
    if (!isAdmin) return;
    setSwitching(true);
    try {
      const nextPhase = isPreFinal ? 'during-final' : 'pre-final';
      await onUpdatePhase(nextPhase);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
        isPreFinal
          ? 'bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 text-white border-indigo-700/50'
          : 'bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-slate-900 text-white border-amber-600/50'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isPreFinal
                  ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{isPreFinal ? 'Fasa Operasi A' : 'Fasa Operasi B (Live)'}</span>
            </span>

            {settings.phaseDates && (
              <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{settings.phaseDates}</span>
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
            {isPreFinal
              ? settings.phaseAName || 'Fasa A: Persediaan Pra-Final SOAR 2026'
              : settings.phaseBName || 'Fasa B: Kemuncak Final SOAR 2026'}
          </h3>

          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {isPreFinal
              ? settings.phaseADescription ||
                'Fokus: Checklist semakan, taklimat pengurus, jadual ketibaan, pendaftaran penginapan & raptai pentas.'
              : settings.phaseBDescription ||
                'Fokus: Jadual pertandingan hari ini, giliran persembahan, venue acara, pergerakan bas & keputusan rasmi.'}
          </p>
        </div>

        {/* Admin Quick Switch Control */}
        {isAdmin && (
          <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10 flex items-center gap-2">
            <button
              type="button"
              disabled={switching}
              onClick={handleToggle}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                isPreFinal
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white'
              }`}
            >
              <ArrowRightLeft className={`w-3.5 h-3.5 ${switching ? 'animate-spin' : ''}`} />
              <span>
                {switching
                  ? 'Menukar Fasa...'
                  : isPreFinal
                  ? 'Tukar ke Fasa B (Final)'
                  : 'Tukar ke Fasa A (Pra-Final)'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
