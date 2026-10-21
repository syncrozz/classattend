import React, { useState } from 'react';
import { LocationItem, LocationCategory } from '../../types';
import { InlineEditTrigger } from '../common/InlineEditTrigger';
import { LocationEditModal } from './LocationEditModal';
import {
  MapPin,
  Bus,
  Home,
  Flag,
  Navigation,
  Phone,
  Clock,
  ExternalLink,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';

interface LocationsModuleProps {
  locations: LocationItem[];
  isAdmin: boolean;
  inlineEditMode: boolean;
  onSaveLocation: (loc: Partial<LocationItem>) => Promise<void>;
  onDeleteLocation?: (id: string) => Promise<void>;
}

export const LocationsModule: React.FC<LocationsModuleProps> = ({
  locations,
  isAdmin,
  inlineEditMode,
  onSaveLocation,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<LocationItem | null>(null);

  const filteredLocations = locations.filter((loc) => {
    if (selectedFilter === 'all') return true;
    return loc.category === selectedFilter;
  });

  const handleOpenAdd = () => {
    setLocationToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (loc: LocationItem) => {
    setLocationToEdit(loc);
    setIsEditModalOpen(true);
  };

  const getCategoryIcon = (category: LocationCategory) => {
    switch (category) {
      case 'venue':
        return <MapPin className="w-4 h-4 text-rose-600" />;
      case 'transport':
        return <Bus className="w-4 h-4 text-indigo-600" />;
      case 'accommodation':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'assembly':
        return <Flag className="w-4 h-4 text-amber-600" />;
    }
  };

  const getCategoryLabel = (category: LocationCategory) => {
    switch (category) {
      case 'venue':
        return 'Competition Arena';
      case 'transport':
        return 'Contingent Transport';
      case 'accommodation':
        return 'Accommodation';
      case 'assembly':
        return 'Assembly Point';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Locations & Movement</h2>
          <p className="text-xs text-slate-500 mt-1">
            Competition venues, contingent transport schedules, assembly points, and accommodation.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location / Route</span>
          </button>
        )}
      </div>

      {/* Category Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'all', label: 'All Locations' },
          { id: 'venue', label: 'Competition Venues' },
          { id: 'transport', label: 'Bus & Transport' },
          { id: 'accommodation', label: 'Accommodation' },
          { id: 'assembly', label: 'Assembly Points' },
        ].map((item) => {
          const isActive = selectedFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedFilter(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {filteredLocations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No Location Entries Found</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Venues and transport schedules will appear here once added by contingent administrators.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Location / Route</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {getCategoryIcon(loc.category)}
                  </div>
                  {isAdmin && (
                    <InlineEditTrigger
                      onClick={() => handleOpenEdit(loc)}
                      size="sm"
                    />
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{loc.name}</h3>

                {/* Clean unboxed metadata */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                  <span>{getCategoryLabel(loc.category)}</span>
                  {loc.coordinates && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{loc.coordinates}</span>
                    </>
                  )}
                </div>

                {loc.category === 'transport' ? (
                  <div className="space-y-2 mb-4">
                    {loc.scheduleTimes && (
                      <div className="flex items-start gap-2 text-xs text-slate-700 bg-indigo-50/60 border border-indigo-100 p-2 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-indigo-900">Departure: </span>
                          <span>{loc.scheduleTimes}</span>
                        </div>
                      </div>
                    )}

                    {loc.routeDetails && (
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Route: </span>
                        <span>{loc.routeDetails}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {loc.address && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {loc.address}
                      </p>
                    )}
                  </div>
                )}

                {loc.notes && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg mb-3">
                    {loc.notes}
                  </p>
                )}

                {(loc.contactPerson || loc.contactPhone) && (
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      {loc.contactPerson || 'Coordinator'}
                    </span>
                    {loc.contactPhone && (
                      <a
                        href={`tel:${loc.contactPhone.replace(/\s+/g, '')}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{loc.contactPhone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              {(loc.mapUrl || loc.floorplanUrl) && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  {loc.mapUrl ? (
                    <a
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions / Map</span>
                    </a>
                  ) : <span />}

                  {loc.floorplanUrl && (
                    <a
                      href={loc.floorplanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Floorplan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <LocationEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveLocation}
        locationToEdit={locationToEdit}
      />
    </div>
  );
};
