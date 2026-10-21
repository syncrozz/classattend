import React from 'react';
import { Modal } from './Modal';
import { ExternalLink, Download, X } from 'lucide-react';

interface PosterLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  caption?: string;
  category?: string;
  author?: string;
}

export const PosterLightboxModal: React.FC<PosterLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  caption,
  category,
  author,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0">
        <div className="truncate pr-4">
          <h3 className="text-base font-bold truncate">{title}</h3>
          <p className="text-xs text-white/60">
            {category && <span>{category} · </span>}
            {author && <span>Oleh: {author}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka Imej Asal</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Viewer */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4">
        <img
          src={imageUrl}
          alt={title}
          className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
        />
      </div>

      {/* Caption bottom bar */}
      {caption && (
        <div className="shrink-0 p-3 bg-white/10 text-white text-xs rounded-xl max-w-3xl mx-auto w-full text-center">
          {caption}
        </div>
      )}
    </div>
  );
};
