import React, { useState } from 'react';
import { ScheduleItem } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { ScheduleEditModal } from './ScheduleEditModal';
import { parseGoogleDriveUrl } from '../../utils/drive';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  Plus,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface ScheduleModuleProps {
  schedules: ScheduleItem[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveSchedule: (schedule: Partial<ScheduleItem>) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
}

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  schedules,
  isAdmin,
  inlineEditMode,
  onSaveSchedule,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    schedules.length > 0 ? schedules[0].id : ''
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleItem | null>(null);

  // Active schedule selection
  const activeSchedule = schedules.find((s) => s.id === selectedId) || schedules[0] || null;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // Parse Drive URL for image and source links
  const parsedImage = activeSchedule?.imageUrl ? parseGoogleDriveUrl(activeSchedule.imageUrl) : null;
  const parsedSource = activeSchedule?.sourceDocUrl ? parseGoogleDriveUrl(activeSchedule.sourceDocUrl) : null;

  const effectiveImageSrc = parsedImage?.isDrive ? parsedImage.imageUrl : activeSchedule?.imageUrl;

  const handleOpenAdd = () => {
    setScheduleToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (schedule: ScheduleItem) => {
    setScheduleToEdit(schedule);
    setIsEditModalOpen(true);
  };

  // Switch category reset zoom and image status
  const handleSelectSchedule = (id: string) => {
    setSelectedId(id);
    setZoomLevel(1);
    setImageLoading(true);
    setImageError(false);
  };

  return (
    <div className="space-y-6">
      {/* Module Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Competition Schedule</h2>
            {isAdmin && activeSchedule && (
              <InlineEditTrigger
                onClick={() => handleOpenEdit(activeSchedule)}
                label="Edit Category"
                size="sm"
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official match fixtures, timetable charts, and event rundowns.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule Category</span>
          </button>
        )}
      </div>

      {/* Empty State when no schedules exist */}
      {schedules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No Competition Schedules Added</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Competition schedule images and match timetables have not been uploaded or linked yet. Authorized administrators can add schedule categories using image URLs or Google Drive files.
          </p>
          {isAdmin ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Schedule Category</span>
            </button>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Please check back soon or consult the Contingent Secretariat.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Category Tabs (Interactive Filter / Segmented control buttons) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {schedules.map((schedule) => {
              const isSelected = activeSchedule?.id === schedule.id;
              return (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => handleSelectSchedule(schedule.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {schedule.categoryName}
                  {schedule.subcategory && (
                    <span className="opacity-75 font-normal ml-1">({schedule.subcategory})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Schedule Meta Bar */}
          {activeSchedule && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeSchedule.categoryName}
                    </h3>
                    {activeSchedule.subcategory && (
                      <span className="text-xs font-medium text-slate-500">
                        / {activeSchedule.subcategory}
                      </span>
                    )}
                    {isAdmin && (
                      <InlineEditTrigger
                        onClick={() => handleOpenEdit(activeSchedule)}
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    {activeSchedule.date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeSchedule.date}</span>
                      </div>
                    )}
                    {activeSchedule.time && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeSchedule.time}</span>
                        </div>
                      </>
                    )}
                    {activeSchedule.venue && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeSchedule.venue}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {activeSchedule.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-2">
                      <span className="font-semibold text-slate-700">Remarks: </span>
                      {activeSchedule.notes}
                    </p>
                  )}
                </div>

                {/* External Document Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {parsedImage?.directUrl && (
                    <a
                      href={parsedImage.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Image in Drive</span>
                    </a>
                  )}

                  {activeSchedule.sourceDocUrl && (
                    <a
                      href={parsedSource?.directUrl || activeSchedule.sourceDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Original Document</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Image Viewer Container */}
          {activeSchedule && (
            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg flex flex-col">
              {/* Viewer Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300">
                <div className="text-xs font-medium flex items-center gap-2 truncate">
                  <span>{activeSchedule.categoryName} Schedule Sheet</span>
                  <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom out"
                    disabled={zoomLevel <= 0.75}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom in"
                    disabled={zoomLevel >= 3}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset zoom"
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    title="Fullscreen view"
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport Canvas */}
              <div className="relative min-h-[420px] max-h-[750px] overflow-auto flex items-center justify-center p-4 bg-slate-950/70 select-none">
                {!activeSchedule.imageUrl ? (
                  /* No image linked state */
                  <div className="text-center p-8 max-w-sm">
                    <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">
                      No Schedule Image Provided
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      A schedule image URL or Google Drive link has not been linked for this category yet.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(activeSchedule)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Add Image Link
                      </button>
                    )}
                  </div>
                ) : imageError ? (
                  /* Broken / Invalid image link state */
                  <div className="text-center p-8 max-w-md">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">
                      Unable to Render Schedule Image
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      The image could not be loaded directly. If this is a Google Drive link, verify that file sharing permissions are set to &ldquo;Anyone with the link can view&rdquo;, or open directly in Google Drive.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {parsedImage?.directUrl && (
                        <a
                          href={parsedImage.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Google Drive</span>
                        </a>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(activeSchedule)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Edit Image URL
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Image Display with Zoom & Aspect Ratio Preservation */
                  <div
                    className="transition-transform duration-150 ease-out origin-center flex items-center justify-center w-full"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                    )}
                    <img
                      src={effectiveImageSrc || ''}
                      alt={`${activeSchedule.categoryName} Schedule`}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                      className="max-w-full h-auto object-contain rounded-md shadow-2xl"
                      style={{ maxHeight: '700px' }}
                    />
                  </div>
                )}
              </div>

              {/* Viewer Footer Status */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Aspect ratio preserved · Pinch or use buttons to zoom</span>
                {parsedImage?.isDrive && (
                  <span className="text-indigo-400 font-medium">Google Drive Asset</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fullscreen High-Resolution Modal */}
      {isFullscreen && activeSchedule && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold">{activeSchedule.categoryName} Schedule</h3>
              <p className="text-xs text-white/60">{activeSchedule.date} · {activeSchedule.venue}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white/10 rounded-md text-white/80"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white/10 rounded-md text-white/80"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={effectiveImageSrc || ''}
              alt={activeSchedule.categoryName}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[85vh] max-w-full object-contain transition-transform duration-100"
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ScheduleEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveSchedule}
        scheduleToEdit={scheduleToEdit}
      />
    </div>
  );
};
