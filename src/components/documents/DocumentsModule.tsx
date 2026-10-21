import React, { useState } from 'react';
import { DocumentItem } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { DocumentEditModal } from './DocumentEditModal';
import { Modal } from '../common/Modal';
import { parseGoogleDriveUrl, getDocumentTypeLabel } from '../../utils/drive';
import {
  FileText,
  Search,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileCode,
  Link as LinkIcon,
  Plus,
  Pin,
  FolderOpen,
} from 'lucide-react';

interface DocumentsModuleProps {
  documents: DocumentItem[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveDocument: (doc: Partial<DocumentItem>) => Promise<void>;
  onDeleteDocument?: (id: string) => Promise<void>;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({
  documents,
  isAdmin,
  inlineEditMode,
  onSaveDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentItem | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Categories list
  const categories = ['All', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setDocumentToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (doc: DocumentItem) => {
    setDocumentToEdit(doc);
    setIsEditModalOpen(true);
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'doc':
        return <FileCode className="w-5 h-5 text-blue-600" />;
      case 'link':
        return <LinkIcon className="w-5 h-5 text-indigo-600" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-600" />;
    }
  };

  const parsedPreview = previewDoc ? parseGoogleDriveUrl(previewDoc.fileUrl) : null;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Documents & References</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access official tournament handbooks, competition regulations, and technical forms.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document Link</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents and guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {searchQuery || selectedCategory !== 'All' ? 'No Matching Documents Found' : 'No Reference Documents Available'}
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {searchQuery || selectedCategory !== 'All'
              ? 'Try modifying your search keywords or category filter.'
              : 'Official competition documents, handbook PDFs, and Google Drive links will appear here once added by administrators.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Document</span>
            </button>
          )}
        </div>
      ) : (
        /* Document Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const driveInfo = parseGoogleDriveUrl(doc.fileUrl);

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getDocIcon(doc.fileType)}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.isPinned && (
                        <span title="Pinned reference" className="text-amber-500">
                          <Pin className="w-3.5 h-3.5 fill-amber-500" />
                        </span>
                      )}
                      {isAdmin && (
                        <InlineEditTrigger
                          onClick={() => handleOpenEdit(doc)}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-1">
                    {doc.title}
                  </h3>

                  {/* Clean unboxed metadata */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2.5">
                    <span>{doc.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getDocumentTypeLabel(doc.fileType)}</span>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Actions bottom row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <a
                    href={driveInfo.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <span>{driveInfo.isDrive ? 'Open in Drive' : 'Open Link'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          maxWidth="4xl"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span>{previewDoc.category}</span>
                <span aria-hidden="true">·</span>
                <span>{getDocumentTypeLabel(previewDoc.fileType)}</span>
              </div>
              <a
                href={parsedPreview?.directUrl || previewDoc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Open in Full Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Embedded Iframe Preview */}
            <div className="w-full h-[65vh] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative">
              <iframe
                src={parsedPreview?.previewUrl || previewDoc.fileUrl}
                title={previewDoc.title}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              Notice: If Google Drive indicates access requested or does not preview, verify that you are signed into your permitted Google account or open directly in Google Drive.
            </div>
          </div>
        </Modal>
      )}

      {/* Edit/Add Modal */}
      <DocumentEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveDocument}
        documentToEdit={documentToEdit}
      />
    </div>
  );
};
