import React from 'react';
import { PortalSettings } from '../../types';
import { Phone, MapPin, Shield } from 'lucide-react';

interface FooterProps {
  settings: PortalSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-sm text-slate-900">{settings.eventTitle}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 italic">{settings.motto}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-xs text-slate-600">
            {settings.secretariatLocation && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings.secretariatLocation}</span>
              </div>
            )}
            {settings.emergencyContactPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {settings.emergencyContactName}:{' '}
                  <a
                    href={`tel:${settings.emergencyContactPhone}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {settings.emergencyContactPhone}
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unboxed metadata separator row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{settings.contingentName}</span>
            <span aria-hidden="true">·</span>
            <span>Restricted Reference Portal</span>
            <span aria-hidden="true">·</span>
            <span>SES v4.4 Standard</span>
          </div>
          <div>
            <span>Confidential & Internal Contingent Use Only</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
