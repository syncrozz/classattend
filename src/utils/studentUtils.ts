import { ActivityCategory } from '../types';

export const getInitials = (name: string): string => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const getStudentColor = (id: string): string => {
  const colors = [
    'bg-indigo-600 text-indigo-100',
    'bg-emerald-600 text-emerald-100',
    'bg-blue-600 text-blue-100',
    'bg-amber-600 text-amber-100',
    'bg-rose-600 text-rose-100',
    'bg-teal-600 text-teal-100',
    'bg-purple-600 text-purple-100',
    'bg-cyan-600 text-cyan-100'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getCategoryLabel = (cat?: ActivityCategory | string): string => {
  switch (cat) {
    case 'CLASS':
      return 'Kuliah / Kelas';
    case 'ASSEMBLY':
      return 'Perhimpunan Pelajar';
    case 'OFFICIAL_PROGRAMME':
      return 'Program Rasmi Kolej';
    case 'SEMINAR':
      return 'Seminar';
    case 'WORKSHOP':
      return 'Bengkel';
    case 'BRIEFING':
      return 'Taklimat';
    case 'CO_CURRICULAR':
      return 'Kokurikulum';
    case 'STUDENT_PROGRAMME':
      return 'Program Pelajar';
    case 'CLUB_ACTIVITY':
      return 'Persatuan / Kelab';
    case 'SPECIAL_EVENT':
      return 'Acara Khas';
    case 'OTHER':
    default:
      return 'Aktiviti Umum';
  }
};

export const getCategoryBadgeColor = (cat?: ActivityCategory | string): string => {
  switch (cat) {
    case 'ASSEMBLY':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'CLASS':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'OFFICIAL_PROGRAMME':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'WORKSHOP':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'SEMINAR':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'CO_CURRICULAR':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'CLUB_ACTIVITY':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

export const getClassBadgeColor = (className?: string): string => {
  switch (className) {
    case 'DIA_4A':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'DIA_4B':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'DIA_4C':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    case 'DIA_4D':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
};

// Aliases for backward compatibility
export const getStaffColor = getStudentColor;
