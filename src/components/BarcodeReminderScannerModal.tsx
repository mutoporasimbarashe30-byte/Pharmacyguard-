import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Barcode, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  Printer, 
  PackageCheck, 
  Camera, 
  Volume2, 
  VolumeX, 
  Sparkles,
  MapPin,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { analyzeExpiry, getTierBadgeStyle, formatCurrency } from '../utils/expiryUtils';
import { BarcodeVisual } from './BarcodeVisual';

interface BarcodeReminderScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  onDispense: (id: string, amount: number) => void;
  onQuarantine?: (medicine: Medicine) => void;
  onQuickRestock: (id: string, amount: number) => void;
  initialBarcode?: string;
}

export const BarcodeReminderScannerModal: React.FC<BarcodeReminderScannerModalProps> = ({
  isOpen,
  onClose,
  medicines,
  onDispense,
  onQuarantine,
  onQuickRestock,
  initialBarcode,
}) => {
  const [scannedCode, setScannedCode] = useState(initialBarcode || '');
  const [activeMedicine, setActiveMedicine] = useState<Medicine | null>(null);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; medName: string; tier: string; time: string }>>([]);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [dispenseSuccessMessage, setDispenseSuccessMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Play audio beep on barcode scan
  const playScanBeep = (isAlert: boolean = false) => {
    if (!audioFeedback) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (isAlert) {
        // Double warning beep
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Clean confirmation beep
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // Audio not permitted or supported
    }
  };

  // Perform medicine lookup based on barcode
  const lookupBarcode = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) {
      setActiveMedicine(null);
      return;
    }

    // Match by exact barcode or barcode substring, or batch fallback
    const matched = medicines.find(
      (m) => (m.barcode && m.barcode.toLowerCase() === clean) ||
             (m.barcode && m.barcode.toLowerCase().includes(clean)) ||
             m.batchNumber.toLowerCase() === clean
    );

    if (matched) {
      setActiveMedicine(matched);
      const analysis = analyzeExpiry(matched.expiryDate);
      const isUrgent = analysis.tier === 'critical' || analysis.tier === 'expired';
      playScanBeep(isUrgent);

      // Add to scan history if not already most recent
      setScanHistory((prev) => [
        {
          code: matched.barcode || matched.batchNumber,
          medName: matched.brandName,
          tier: analysis.tier,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...prev.filter((h) => h.code !== (matched.barcode || matched.batchNumber)).slice(0, 7),
      ]);
    } else {
      setActiveMedicine(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialBarcode) {
        setScannedCode(initialBarcode);
        lookupBarcode(initialBarcode);
      } else {
        // Auto-select first critical item as a default demo if none provided
        const criticalFirst = medicines.find((m) => analyzeExpiry(m.expiryDate).tier === 'critical');
        if (criticalFirst && criticalFirst.barcode) {
          setScannedCode(criticalFirst.barcode);
          lookupBarcode(criticalFirst.barcode);
        }
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialBarcode]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setScannedCode(val);
    lookupBarcode(val);
  };

  const handleSelectPreset = (barcode: string) => {
    setScannedCode(barcode);
    lookupBarcode(barcode);
    inputRef.current?.focus();
  };

  const handleDispenseUnit = (med: Medicine) => {
    onDispense(med.id, 1);
    setDispenseSuccessMessage(`Dispensed 1 unit of ${med.brandName} (FEFO Verified)`);
    setTimeout(() => setDispenseSuccessMessage(null), 3000);
    // Refresh active medicine reference
    const updated = medicines.find((m) => m.id === med.id);
    if (updated) {
      setActiveMedicine({ ...updated, quantity: Math.max(0, updated.quantity - 1) });
    }
  };

  // Expiry analysis for active medicine
  const analysis = activeMedicine ? analyzeExpiry(activeMedicine.expiryDate) : null;
  const tierStyle = analysis ? getTierBadgeStyle(analysis.tier) : null;

  // Low stock check
  const threshold = activeMedicine
    ? typeof activeMedicine.alertThreshold === 'number'
      ? activeMedicine.alertThreshold
      : 20
    : 20;
  const isLowStock = activeMedicine ? activeMedicine.quantity <= threshold : false;

  // Sample presets for quick testing of all reminder tiers by barcode
  const presetMeds = [
    { label: '<30d (Red Alert)', tier: 'critical', med: medicines.find((m) => analyzeExpiry(m.expiryDate).tier === 'critical') },
    { label: '30-60d (Amber Warning)', tier: 'warning', med: medicines.find((m) => analyzeExpiry(m.expiryDate).tier === 'warning') },
    { label: '61-90d (Yellow Watch)', tier: 'watchlist', med: medicines.find((m) => analyzeExpiry(m.expiryDate).tier === 'watchlist') },
    { label: '>90d (Green Safe)', tier: 'stable', med: medicines.find((m) => analyzeExpiry(m.expiryDate).tier === 'stable') },
    { label: 'Low Stock (<Min Pt)', tier: 'low_stock', med: medicines.find((m) => m.quantity <= (m.alertThreshold ?? 20)) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Barcode Medicine Reminder Scanner
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-mono">
                  LIVE WORKSTATION
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan or type any medicine packaging barcode to instantly trigger its expiry reminder, return window &amp; low-stock status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioFeedback(!audioFeedback)}
              title={audioFeedback ? 'Mute scanner audio feedback' : 'Enable scanner beep audio'}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {audioFeedback ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barcode Scanner Input Bar */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Barcode className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={scannedCode}
                onChange={handleInputChange}
                placeholder="Scan with physical scanner or enter barcode (e.g., 8901030112211)..."
                className="w-full pl-11 pr-24 py-3 text-sm sm:text-base font-mono bg-slate-50 dark:bg-slate-950 border-2 border-teal-500/80 rounded-xl focus:ring-4 focus:ring-teal-500/20 focus:outline-none text-slate-900 dark:text-white transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                {scannedCode && (
                  <button
                    onClick={() => {
                      setScannedCode('');
                      setActiveMedicine(null);
                      inputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Clear
                  </button>
                )}
                <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Ready to scan
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSimulatingCamera(!isSimulatingCamera)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                isSimulatingCamera
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{isSimulatingCamera ? 'Hide Laser Aim' : 'Laser Aim Simulator'}</span>
            </button>
          </div>

          {/* Camera Scanner Laser Aim Simulation */}
          {isSimulatingCamera && (
            <div className="mt-3 relative rounded-xl overflow-hidden border-2 border-dashed border-teal-500/60 bg-slate-950 p-6 flex flex-col items-center justify-center">
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
              <div className="w-48 h-20 border border-teal-400/40 rounded flex items-center justify-center relative">
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-teal-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-teal-400" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-teal-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-teal-400" />
                <span className="text-[11px] font-mono text-teal-300 tracking-wider">ALIGN BARCODE HERE</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                Hardware wedge scanner active: scanning directly feeds this input field.
              </p>
            </div>
          )}

          {/* Quick-test Preset Barcode Chips */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mr-1 font-mono">
              Quick Barcode Test:
            </span>
            {presetMeds.map((item, idx) => {
              if (!item.med || !item.med.barcode) return null;
              const isSelected = activeMedicine?.barcode === item.med.barcode;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(item.med!.barcode!)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  }`}
                >
                  <Barcode className="w-3 h-3 opacity-70" />
                  <span>{item.med.brandName.split(' ')[0]} ({item.label})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Body: Medicine Reminder Card vs Empty State */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40">
          
          {dispenseSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{dispenseSuccessMessage}</span>
            </div>
          )}

          {activeMedicine && analysis && tierStyle ? (
            <div className="space-y-4">
              
              {/* PRIMARY EXPIRY REMINDER BANNER FOR THIS BARCODE */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 ${tierStyle.cardBorder} ${tierStyle.highlightBg} shadow-md transition-all`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800">
                      {analysis.tier === 'critical' ? (
                        <AlertOctagon className="w-7 h-7 text-red-600 animate-pulse" />
                      ) : analysis.tier === 'warning' ? (
                        <AlertTriangle className="w-7 h-7 text-amber-600" />
                      ) : analysis.tier === 'watchlist' ? (
                        <Clock className="w-7 h-7 text-yellow-600" />
                      ) : analysis.tier === 'expired' ? (
                        <ShieldAlert className="w-7 h-7 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase font-mono border ${tierStyle.badgeBg} ${tierStyle.badgeBorder} ${tierStyle.badgeText}`}>
                          {analysis.label}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          Barcode: <strong className="text-slate-800 dark:text-slate-200">{activeMedicine.barcode}</strong>
                        </span>
                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                            LOW STOCK ALERT
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {analysis.daysRemaining < 0
                          ? `EXPIRED ${Math.abs(analysis.daysRemaining)} DAYS AGO`
                          : `${analysis.daysRemaining} DAYS UNTIL EXPIRY (${activeMedicine.expiryDate})`}
                      </h2>

                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {analysis.urgencyDescription}
                      </p>
                    </div>
                  </div>

                  {/* Reminder Action Directive */}
                  <div className="sm:text-right shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                      Reminded Action
                    </span>
                    <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${
                      analysis.tier === 'critical' ? 'text-red-700 dark:text-red-300' :
                      analysis.tier === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                      analysis.tier === 'watchlist' ? 'text-yellow-800 dark:text-yellow-300' :
                      analysis.tier === 'expired' ? 'text-rose-700 dark:text-rose-300' :
                      'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {analysis.recommendedAction}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medicine Product Details & Barcode Visual Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Col 1 & 2: Medicine Information & Stock */}
                <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                        {activeMedicine.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {activeMedicine.brandName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activeMedicine.genericName} · {activeMedicine.strength} · {activeMedicine.dosageForm}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Unit Selling Price</span>
                      <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(activeMedicine.sellingPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Stock Level vs Low-Stock Alert Threshold */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Current Dispensary Stock:</span>
                        <strong className="font-mono text-sm text-slate-900 dark:text-white">
                          {activeMedicine.quantity} {activeMedicine.unit}
                        </strong>
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Reorder Threshold: <strong>{threshold} {activeMedicine.unit}</strong>
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          activeMedicine.quantity <= threshold
                            ? 'bg-amber-500'
                            : 'bg-teal-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(10, Math.round((activeMedicine.quantity / Math.max(threshold * 1.5, activeMedicine.quantity)) * 100)))}%`
                        }}
                      />
                    </div>

                    {isLowStock ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Low-stock reminder active: on-hand quantity is below the {threshold} unit reorder point.</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Stock is above minimum reorder threshold.</span>
                      </p>
                    )}
                  </div>

                  {/* Batch, Shelf, and Logistics Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] block uppercase font-mono">Batch Number</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {activeMedicine.batchNumber}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] block uppercase font-mono">Shelf Location</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        <span className="truncate">{activeMedicine.shelfLocation}</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block uppercase font-mono">Storage</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                        {activeMedicine.storageCondition}
                      </span>
                    </div>
                  </div>

                  {/* Supplier & Notes */}
                  <div className="text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>Wholesale Supplier: <strong className="text-slate-700 dark:text-slate-300">{activeMedicine.supplier}</strong></span>
                    {activeMedicine.notes && (
                      <span className="italic truncate max-w-sm">{activeMedicine.notes}</span>
                    )}
                  </div>
                </div>

                {/* Col 3: Printable Barcode Shelf Tag & Quick Actions */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                      <Barcode className="w-4 h-4 text-teal-600" />
                      <span>Packaging Barcode Tag</span>
                    </h4>

                    {/* Visual Barcode Graphic */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-inner flex flex-col items-center justify-center text-slate-900">
                      <BarcodeVisual code={activeMedicine.barcode || activeMedicine.batchNumber} width={180} height={60} />
                      <div className="mt-2 text-center">
                        <span className="text-[11px] font-bold block text-slate-900 truncate max-w-[190px]">
                          {activeMedicine.brandName}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono border mt-1 ${tierStyle.badgeBg} ${tierStyle.badgeBorder} ${tierStyle.badgeText}`}>
                          {analysis.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for this Scanned Barcode */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleDispenseUnit(activeMedicine)}
                      disabled={activeMedicine.quantity <= 0}
                      className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Dispense 1 Unit (FEFO)</span>
                    </button>

                    <button
                      onClick={() => onQuickRestock(activeMedicine.id, 50)}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>+50 Units Restock PO</span>
                    </button>

                    {analysis.tier === 'expired' && onQuarantine && (
                      <button
                        onClick={() => onQuarantine(activeMedicine)}
                        className="w-full py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Move to Biohazard Quarantine</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Barcode className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No medicine matching barcode &ldquo;{scannedCode}&rdquo;
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Scan another barcode using your barcode scanner, or select one of the quick test presets above to view its live reminder indication.
              </p>
            </div>
          )}

          {/* Recent Scans Session Audit Log */}
          {scanHistory.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                Recent Barcode Scans This Session
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {scanHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(item.code)}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-left hover:border-teal-400 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{item.code}</span>
                      <span>{item.time}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {item.medName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Barcode Reminders synchronized with dispensary inventory</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close Workstation
          </button>
        </div>

      </div>
    </div>
  );
};
