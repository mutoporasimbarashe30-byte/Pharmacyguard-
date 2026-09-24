import React, { useState } from 'react';
import { 
  Bell, 
  AlertOctagon, 
  ArrowRight, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Barcode, 
  Search,
  AlertTriangle 
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { analyzeExpiry, formatCurrency } from '../utils/expiryUtils';

interface ReminderBannerProps {
  medicines: Medicine[];
  onNavigateToTab: (tab: 'dashboard' | 'inventory' | 'action-center' | 'quarantine' | 'ai-consultant') => void;
  onFilterCritical: () => void;
  onOpenBarcodeScanner: (barcode?: string) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  medicines,
  onNavigateToTab,
  onFilterCritical,
  onOpenBarcodeScanner,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Identify medicines requiring urgent attention
  const activeMeds = medicines.filter((m) => m.status === 'in_stock');
  
  const lowStockMeds = activeMeds.filter((m) => {
    const threshold = typeof m.alertThreshold === 'number' ? m.alertThreshold : 20;
    return m.quantity <= threshold;
  });

  const criticalMeds = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier === 'critical';
  });

  const warningMeds = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier === 'warning';
  });

  const watchlistMeds = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier === 'watchlist';
  });

  const totalCriticalValue = criticalMeds.reduce(
    (acc, m) => acc + m.quantity * m.sellingPrice,
    0
  );

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onOpenBarcodeScanner(barcodeInput.trim());
      setBarcodeInput('');
    } else {
      onOpenBarcodeScanner();
    }
  };

  if (dismissed || (criticalMeds.length === 0 && warningMeds.length === 0 && lowStockMeds.length === 0)) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-red-300 dark:border-red-900/60 bg-gradient-to-r from-red-50 via-amber-50/40 to-white dark:from-red-950/40 dark:via-amber-950/20 dark:to-slate-900 p-4 sm:p-5 shadow-xs relative transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Icon & Alert message */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 font-mono flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" />
                <span>Barcode-Driven Medicine Reminders</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {lowStockMeds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {lowStockMeds.length} Below Reorder Point
                </span>
              )}
            </div>
            
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {criticalMeds.length > 0 ? (
                <>
                  <span className="text-red-600 dark:text-red-400 font-extrabold">
                    {criticalMeds.length} medicine {criticalMeds.length === 1 ? 'barcode batch is' : 'barcode batches are'} expiring in under 30 days
                  </span>
                  {' '}({formatCurrency(totalCriticalValue)} at immediate risk)
                  {lowStockMeds.length > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold block sm:inline sm:ml-2">
                      · {lowStockMeds.length} items low in stock
                    </span>
                  )}
                </>
              ) : (
                <span>
                  {lowStockMeds.length > 0
                    ? `${lowStockMeds.length} medicines fell below their minimum alert threshold point`
                    : `${warningMeds.length} items entered the 30-60 day urgent return window`}
                </span>
              )}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Reminders calculated directly from medicine barcodes: <strong className="text-red-600 font-semibold">&lt;30d (Red)</strong>,{' '}
              <strong className="text-amber-600 font-semibold">30-60d (Amber)</strong>,{' '}
              <strong className="text-yellow-600 font-semibold">61-90d (Yellow)</strong>, and{' '}
              <strong className="text-amber-700 dark:text-amber-300 font-semibold">Low-Stock Alert Points</strong>.
            </p>

            {/* Quick Barcode Trigger Chips for Expiring Medicines */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                Urgent Barcodes:
              </span>
              {criticalMeds.slice(0, 3).map((med) => (
                <button
                  key={med.id}
                  onClick={() => onOpenBarcodeScanner(med.barcode)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors flex items-center gap-1 shadow-2xs"
                  title={`Check barcode reminder for ${med.brandName}`}
                >
                  <Barcode className="w-3 h-3 text-red-500" />
                  <span>{med.barcode || med.batchNumber}</span>
                  <span className="text-[10px] text-slate-500">({med.brandName.split(' ')[0]})</span>
                </button>
              ))}
              {warningMeds.slice(0, 2).map((med) => (
                <button
                  key={med.id}
                  onClick={() => onOpenBarcodeScanner(med.barcode)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors flex items-center gap-1 shadow-2xs"
                  title={`Check barcode reminder for ${med.brandName}`}
                >
                  <Barcode className="w-3 h-3 text-amber-500" />
                  <span>{med.barcode || med.batchNumber}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick actions & Barcode Fast Scanner Input */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0">
          
          {/* Quick Barcode Scanner input form */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan / type barcode..."
                className="w-48 sm:w-44 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs whitespace-nowrap"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Check</span>
            </button>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBarcodeScanner()}
              className="px-3.5 py-1.5 text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/80 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Open Barcode Scanner</span>
            </button>

            <button
              onClick={() => {
                onFilterCritical();
                onNavigateToTab('inventory');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>Triage &lt;30d</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

