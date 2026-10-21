import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { LocationItem, LocationCategory } from '../../types';
import { isValidUrl } from '../../utils/drive';
import { AlertCircle } from 'lucide-react';

interface LocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loc: Partial<LocationItem>) => Promise<void>;
  locationToEdit: LocationItem | null;
}

export const LocationEditModal: React.FC<LocationEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  locationToEdit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LocationCategory>('venue');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState('');
  const [routeDetails, setRouteDetails] = useState('');
  const [floorplanUrl, setFloorplanUrl] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locationToEdit) {
      setName(locationToEdit.name || '');
      setCategory(locationToEdit.category || 'venue');
      setAddress(locationToEdit.address || '');
      setMapUrl(locationToEdit.mapUrl || '');
      setCoordinates(locationToEdit.coordinates || '');
      setScheduleTimes(locationToEdit.scheduleTimes || '');
      setRouteDetails(locationToEdit.routeDetails || '');
      setFloorplanUrl(locationToEdit.floorplanUrl || '');
      setContactPerson(locationToEdit.contactPerson || '');
      setContactPhone(locationToEdit.contactPhone || '');
      setNotes(locationToEdit.notes || '');
    } else {
      setName('');
      setCategory('venue');
      setAddress('');
      setMapUrl('');
      setCoordinates('');
      setScheduleTimes('');
      setRouteDetails('');
      setFloorplanUrl('');
      setContactPerson('');
      setContactPhone('');
      setNotes('');
    }
    setError(null);
  }, [locationToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Location / Movement name is required.');
      return;
    }

    if (mapUrl.trim() && !isValidUrl(mapUrl.trim())) {
      setError('Please provide a valid Google Maps URL.');
      return;
    }

    if (floorplanUrl.trim() && !isValidUrl(floorplanUrl.trim())) {
      setError('Please provide a valid floorplan image or document URL.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: locationToEdit?.id,
        name: name.trim(),
        category,
        address: address.trim() || undefined,
        mapUrl: mapUrl.trim() || undefined,
        coordinates: coordinates.trim() || undefined,
        scheduleTimes: scheduleTimes.trim() || undefined,
        routeDetails: routeDetails.trim() || undefined,
        floorplanUrl: floorplanUrl.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save location details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locationToEdit ? 'Edit Location / Movement' : 'Add New Location / Transport Route'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name / Route Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stadium Tertutup, Bas Kontinjen 1, Penginapan Atlit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LocationCategory)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="venue">Competition Venue / Field</option>
              <option value="transport">Transportation & Bus Schedule</option>
              <option value="accommodation">Accommodation & Hostel</option>
              <option value="assembly">Assembly / Briefing Point</option>
            </select>
          </div>
        </div>

        {category === 'transport' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Departure / Trip Times
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06:45 AM, 12:30 PM, 18:00 PM"
                  value={scheduleTimes}
                  onChange={(e) => setScheduleTimes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle / Bus Plate Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bas KPMBP (JRA 8892)"
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Route / Pick-up & Drop-off Points
              </label>
              <input
                type="text"
                placeholder="e.g. Kolej Kediaman -> Dewan Sultan Ibrahim -> Kolej Kediaman"
                value={routeDetails}
                onChange={(e) => setRouteDetails(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Physical Address / Specific Hall
              </label>
              <input
                type="text"
                placeholder="e.g. Kompleks Sukan EduCity, Iskandar Puteri, Johor"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Floorplan Image / Drive Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or image URL"
                  value={floorplanUrl}
                  onChange={(e) => setFloorplanUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Person-in-Charge / Driver / Marshall
            </label>
            <input
              type="text"
              placeholder="e.g. En. Razak (Pemandu Bas 1)"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. +6013-7894561"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Operational Guidelines / Parking Info
          </label>
          <textarea
            rows={2}
            placeholder="Special instructions, gate entrance, parking allocation, assembly rules..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
