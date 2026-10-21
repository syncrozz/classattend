import React from 'react';
import { Pencil } from 'lucide-react';

interface InlineEditTriggerProps {
  onClick: (e: React.MouseEvent) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const InlineEditTrigger: React.FC<InlineEditTriggerProps> = ({
  onClick,
  label,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'p-1.5 text-xs' : 'p-2 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={label || 'Edit section content'}
      className={`inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80 rounded-md font-medium transition-all shadow-xs cursor-pointer ${sizeClasses} ${className}`}
    >
      <Pencil className={iconSize} />
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
};
