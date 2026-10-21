import React from 'react';
import { Pencil } from 'lucide-react';

interface CardPencilButtonProps {
  isAdmin: boolean;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
  size?: 'xs' | 'sm';
}

export const CardPencilButton: React.FC<CardPencilButtonProps> = ({
  isAdmin,
  onClick,
  title = 'Edit card / sub-header',
  className = '',
  size = 'sm',
}) => {
  if (!isAdmin) return null;

  const sizeClasses = size === 'xs' ? 'p-1 text-[10px]' : 'p-1.5 text-xs';
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      className={`absolute top-2 right-2 z-20 inline-flex items-center justify-center rounded-lg bg-white/95 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group ${sizeClasses} ${className}`}
    >
      <Pencil className={`${iconSize} group-hover:scale-110 transition-transform`} />
    </button>
  );
};
