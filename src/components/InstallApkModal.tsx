import React from 'react';
import { X, Download, Smartphone, Share, CheckCircle2, Wifi } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceMode?: 'POS' | 'MOBILE';
}

/** Installs the app to the home screen (works on Wi-Fi or mobile data, Android + iPhone). */
export const InstallApkModal: React.FC<InstallApkModalProps> = ({ isOpen, onClose, deviceMode = 'MOBILE' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  if (!isOpen) return null;

  const title = deviceMode === 'POS' ? 'Install GIVA Q3 POS' : 'Install GIVA Store Manager';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white text-stone-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-emerald-400" />
            <h2 className="text-sm font-bold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {isInstalled ? (
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle2 size={18} /> Already installed on this device.
            </div>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={async () => {
                if (await install()) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              <Download size={16} /> Install on this phone
            </button>
          ) : isIOS ? (
            <p className="text-stone-700 leading-relaxed">
              On iPhone, open this page in <strong>Safari</strong>, tap <Share size={13} className="inline -mt-0.5" />{' '}
              <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-stone-700 leading-relaxed">
              In Chrome, open the <strong>&#8942; menu</strong> and tap <strong>Install app</strong> (or{' '}
              <strong>Add to Home screen</strong>).
            </p>
          )}

          <div className="flex items-start gap-2 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-3">
            <Wifi size={14} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Works on any Wi-Fi or mobile data. With no signal it keeps showing the last synced stock and queues
              your changes until you are back online.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
