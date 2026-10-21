import React, { useState } from 'react';
import { EventSection, EventSectionType } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { EventSectionEditModal } from './EventSectionEditModal';
import {
  CalendarDays,
  ShieldCheck,
  Award,
  Users,
  FileText,
  Clock,
  Phone,
  Plus,
  BookOpen,
} from 'lucide-react';

interface EventInfoModuleProps {
  sections: EventSection[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveSection: (section: Partial<EventSection>) => Promise<void>;
  onDeleteSection?: (id: string) => Promise<void>;
}

export const EventInfoModule: React.FC<EventInfoModuleProps> = ({
  sections,
  isAdmin,
  inlineEditMode,
  onSaveSection,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections.length > 0 ? sections[0].id : ''
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<EventSection | null>(null);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0] || null;

  const handleOpenAdd = () => {
    setSectionToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (section: EventSection) => {
    setSectionToEdit(section);
    setIsEditModalOpen(true);
  };

  const getSectionIcon = (type: EventSectionType) => {
    switch (type) {
      case 'rundown':
        return <CalendarDays className="w-4 h-4 text-indigo-600" />;
      case 'rules':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'criteria':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'contacts':
        return <Users className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Event Information</h2>
          <p className="text-xs text-slate-500 mt-1">
            Official operational rundown, contingent protocols, rules, and secretariat directory.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event Section</span>
          </button>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No Event Information Added</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Competition programs, technical rules, and directory lists have not been configured yet.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Section</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Section selector buttons (segmented control) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sections.map((section) => {
              const isSelected = activeSection?.id === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {getSectionIcon(section.type)}
                  <span>{section.title}</span>
                </button>
              );
            })}
          </div>

          {activeSection && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              {/* Section Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900">{activeSection.title}</h3>
                    {isAdmin && (
                      <InlineEditTrigger
                        onClick={() => handleOpenEdit(activeSection)}
                        size="sm"
                      />
                    )}
                  </div>
                  {activeSection.description && (
                    <p className="text-xs text-slate-500 mt-1">{activeSection.description}</p>
                  )}
                </div>
              </div>

              {/* Rendering based on Section Type */}
              {activeSection.type === 'rundown' ? (
                /* Program Timeline View */
                <div className="space-y-4">
                  {activeSection.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No timeline entries in this rundown.</p>
                  ) : (
                    <div className="relative border-l-2 border-indigo-100 ml-3 space-y-6 py-2">
                      {activeSection.items.map((item, idx) => (
                        <div key={item.id || idx} className="relative pl-6">
                          {/* Dot marker */}
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />

                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                              {item.time && (
                                <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 font-semibold">
                                  <Clock className="w-3 h-3" />
                                  <span>{item.time}</span>
                                </div>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] font-medium text-slate-500 mb-1">
                                {item.subtitle}
                              </p>
                            )}
                            {item.detail && (
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {item.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeSection.type === 'contacts' ? (
                /* Officers & Contacts Card Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSection.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                          {item.title.charAt(0)}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-[11px] text-indigo-600 font-medium mb-1">
                            {item.subtitle}
                          </p>
                        )}
                        {item.detail && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {item.detail}
                          </p>
                        )}
                      </div>

                      {item.contactNumber && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60">
                          <a
                            href={`tel:${item.contactNumber.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{item.contactNumber}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Rules / Criteria / Text Sections */
                <div className="space-y-3">
                  {activeSection.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        {item.subtitle && (
                          <span className="text-[11px] text-slate-500 font-medium">{item.subtitle}</span>
                        )}
                      </div>
                      {item.detail && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  ))}

                  {activeSection.rawContent && (
                    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {activeSection.rawContent}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <EventSectionEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveSection}
        sectionToEdit={sectionToEdit}
      />
    </div>
  );
};
