import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { MetricCards } from './components/MetricCards';
import { ReminderBanner } from './components/ReminderBanner';
import { MedicineTable } from './components/MedicineTable';
import { MedicineModal } from './components/MedicineModal';
import { ActionCenter } from './components/ActionCenter';
import { QuarantineView } from './components/QuarantineView';
import { AiThinkingPharmacist } from './components/AiThinkingPharmacist';
import { PrintReportModal } from './components/PrintReportModal';
import { BarcodeReminderScannerModal } from './components/BarcodeReminderScannerModal';
import { INITIAL_MEDICINES } from './data/initialMedicines';
import { Medicine, ExpiryTier } from './types/pharmacy';
import { calculateAuditMetrics, exportToCSV, analyzeExpiry, formatCurrency, getTierBadgeStyle } from './utils/expiryUtils';
import { 
  Sparkles, 
  Plus, 
  FileText, 
  ArrowRight, 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  Pill, 
  CheckCircle2, 
  BarChart3,
  TrendingDown,
  Activity,
  Barcode
} from 'lucide-react';

const STORAGE_KEY = 'pharmalert_inventory_v1';

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Medicine[] = JSON.parse(saved);
        return parsed.map((m, idx) => ({
          ...m,
          alertThreshold: typeof m.alertThreshold === 'number' ? m.alertThreshold : 20,
          barcode: m.barcode || `8901030${String(idx + 100000).slice(-6)}`,
        }));
      }
    } catch (e) {
      console.error('Failed to load local storage:', e);
    }
    return INITIAL_MEDICINES;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'action-center' | 'quarantine' | 'ai-consultant'>('dashboard');
  const [selectedTier, setSelectedTier] = useState<ExpiryTier | 'all' | 'low_stock'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [medicines]);

  // Compute live metrics
  const auditMetrics = calculateAuditMetrics(medicines);

  // Handlers
  const handleSaveMedicine = (data: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingMedicine) {
      setMedicines((prev) =>
        prev.map((m) =>
          m.id === editingMedicine.id
            ? {
                ...m,
                ...data,
                updatedAt: new Date().toISOString().split('T')[0],
              }
            : m
        )
      );
      setEditingMedicine(null);
    } else {
      const newMed: Medicine = {
        ...data,
        id: `med-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setMedicines((prev) => [newMed, ...prev]);
    }
  };

  const handleDeleteMedicine = (id: string) => {
    if (window.confirm('Are you sure you want to delete this medicine batch record?')) {
      setMedicines((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleDispense = (id: string, amount: number) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newQty = Math.max(0, m.quantity - amount);
          return {
            ...m,
            quantity: newQty,
            status: newQty === 0 ? 'dispensed_out' : m.status,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return m;
      })
    );
  };

  const handleQuarantine = (medicine: Medicine) => {
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medicine.id
          ? {
              ...m,
              status: 'quarantined',
              shelfLocation: 'Quarantine Locker #Q1',
              notes: `${m.notes || ''} [Quarantined on ${new Date().toISOString().split('T')[0]}]`,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : m
      )
    );
  };

  const handleApplyDiscount = (id: string, discountPercent: number) => {
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              discountPercent: discountPercent > 0 ? discountPercent : undefined,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : m
      )
    );
  };

  const handleExportCSV = () => {
    const csvContent = exportToCSV(medicines);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharmalert_expiry_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Critical items list (<30 days) for quick dashboard view
  const criticalItems = medicines
    .filter((m) => m.status === 'in_stock')
    .filter((m) => analyzeExpiry(m.expiryDate).tier === 'critical');

  // Low stock items list (quantity <= specific alertThreshold) for dashboard low-stock indicator
  const lowStockItems = medicines
    .filter((m) => m.status === 'in_stock')
    .filter((m) => {
      const threshold = typeof m.alertThreshold === 'number' ? m.alertThreshold : 20;
      return m.quantity <= threshold;
    });

  const handleQuickRestock = (id: string, amount: number = 50) => {
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              quantity: m.quantity + amount,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : m
      )
    );
  };

  const handleOpenBarcodeScanner = (code?: string) => {
    setScannedBarcode(code || '');
    setIsBarcodeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Top Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingMedicine(null);
          setIsModalOpen(true);
        }}
        onExportCSV={handleExportCSV}
        onOpenPrintReport={() => setIsPrintModalOpen(true)}
        onOpenBarcodeScanner={() => handleOpenBarcodeScanner()}
        criticalCount={auditMetrics.criticalCount}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Daily Reminder Alert Banner */}
        <ReminderBanner
          medicines={medicines}
          onNavigateToTab={setActiveTab}
          onFilterCritical={() => setSelectedTier('critical')}
          onOpenBarcodeScanner={handleOpenBarcodeScanner}
        />

        {/* Global Metric Cards with 5-Tier Color Code */}
        <MetricCards
          metrics={auditMetrics}
          selectedTier={selectedTier}
          onSelectTier={(tier) => {
            setSelectedTier(tier);
            if (activeTab !== 'inventory') {
              setActiveTab('inventory');
            }
          }}
        />

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Actions & Triage Alert Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Critical Red Zone Focus */}
              <div className="p-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5 font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span>Immediate Risk (&lt;30d Red)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-mono">
                      {auditMetrics.criticalCount} Batches
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(auditMetrics.criticalValue)} at Immediate Risk
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Items expiring within the next 30 days must be dispensed first (FEFO) or placed on emergency clearance.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedTier('critical');
                      setActiveTab('inventory');
                    }}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>View Red Batches</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveTab('action-center')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    FEFO Queue
                  </button>
                </div>
              </div>

              {/* Card 2: 30-90 Day Window Protection */}
              <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-mono">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Supplier Return Window</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-mono">
                      {auditMetrics.warningCount + auditMetrics.watchlistCount} Batches
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(auditMetrics.warningValue + auditMetrics.watchlistValue)} Total Exposure
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Items approaching the 60-day cutoff must have credit return memos prepared for wholesale distributors.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('action-center')}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 flex items-center gap-1"
                  >
                    <span>Generate Return Memos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTier('warning');
                      setActiveTab('inventory');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Filter 30-60d
                  </button>
                </div>
              </div>

              {/* Card 3: Barcode-Driven Expiry Reminders */}
              <div className="p-5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:to-slate-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5 font-mono">
                      <Barcode className="w-4 h-4 text-teal-600" />
                      <span>Barcode Workstation</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-mono">
                      Laser Ready
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Scan Medicine Barcode
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Scan packaging barcode to instantly fetch batch, calculate days remaining, and display 90/60/30-day color alerts.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenBarcodeScanner()}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>Open Scanner</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenBarcodeScanner(criticalItems[0]?.barcode)}
                    className="px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-950 hover:bg-teal-200 rounded-lg transition-colors font-mono"
                  >
                    Scan Sample
                  </button>
                </div>
              </div>

              {/* Card 4: AI Clinical Pharmacist Consultation */}
              <div className="p-5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>High Thinking Mode</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-mono">
                      Gemini 3.1 Pro
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Clinical Stock Strategy Reasoning
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Run automated reasoning on current near-expiry stock, WHO biohazard disposal protocols, and drug substitution.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('ai-consultant')}
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>Launch Clinical Intelligence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Audit Sheet
                  </button>
                </div>
              </div>

            </div>

            {/* Critical Red Batches Immediate Table (<30 Days) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600" />
                    <span>Red Zone Alert: Items Expiring in Under 30 Days</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Highest dispensary priority. Front-counter staff must dispense these first or return immediately.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedTier('critical');
                    setActiveTab('inventory');
                  }}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <span>View All in Inventory Table</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {criticalItems.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-semibold text-sm">No items in the &lt;30 day red alert tier</p>
                  <p className="text-xs">Your dispensary stock is in healthy standing.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="py-2.5 px-3">Medicine &amp; Formulation</th>
                        <th className="py-2.5 px-3">Batch &amp; Shelf Location</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3">Days Remaining</th>
                        <th className="py-2.5 px-3">Units in Stock</th>
                        <th className="py-2.5 px-3 text-right">Value at Risk</th>
                        <th className="py-2.5 px-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {criticalItems.map((med) => {
                        const analysis = analyzeExpiry(med.expiryDate);
                        const styles = getTierBadgeStyle(analysis.tier);
                        const val = med.quantity * med.sellingPrice;

                        return (
                          <tr key={med.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {med.brandName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {med.genericName} · {med.strength}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-700 dark:text-slate-300 block">
                                {med.batchNumber}
                              </span>
                              <span className="text-[11px] text-teal-600 dark:text-teal-400 block">
                                {med.shelfLocation}
                              </span>
                              {med.barcode && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBarcodeScanner(med.barcode)}
                                  className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-teal-700 dark:text-teal-400 hover:underline"
                                  title="Check Barcode Reminder"
                                >
                                  <Barcode className="w-3 h-3" />
                                  <span>{med.barcode}</span>
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                              {med.expiryDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2.5 py-1 rounded text-xs font-bold border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText} font-mono`}>
                                {analysis.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold">
                              {med.quantity} {med.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700 dark:text-red-400">
                              {formatCurrency(val)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDispense(med.id, 1)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-xs transition-colors"
                              >
                                FEFO Dispense
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Low-Stock & Reorder Point Indicator Widget */}
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Low-Stock &amp; Reorder Point Indicators ({lowStockItems.length} Below Alert Threshold)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live dispensary monitor: Triggers automatically whenever on-hand quantity falls at or below a medicine&apos;s custom alert threshold.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedTier('low_stock');
                    setActiveTab('inventory');
                  }}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 flex items-center gap-1 self-start sm:self-center"
                >
                  <span>Filter Low Stock in Table</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="py-6 text-center text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-semibold text-sm">All inventory levels above specific alert thresholds</p>
                  <p className="text-xs">No active stock replenishment or reorder alarms.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.map((med) => {
                    const threshold = typeof med.alertThreshold === 'number' ? med.alertThreshold : 20;
                    const deficit = threshold - med.quantity;
                    const percentage = Math.min(100, Math.round((med.quantity / threshold) * 100));

                    return (
                      <div
                        key={med.id}
                        className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                {med.brandName}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {med.genericName} · {med.strength}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono whitespace-nowrap border border-amber-300 dark:border-amber-800">
                              {deficit > 0 ? `${deficit} BELOW MIN` : 'AT THRESHOLD'}
                            </span>
                          </div>

                          {/* Progress Bar of Stock vs Alert Threshold */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono">
                                <span className="text-amber-700 dark:text-amber-400 font-bold">{med.quantity}</span>
                                <span className="text-slate-400">/</span>
                                <span className="text-slate-600 dark:text-slate-400">{threshold} {med.unit}</span>
                              </span>
                              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                                {percentage}% of reorder pt
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  med.quantity === 0
                                    ? 'bg-red-600'
                                    : med.quantity <= threshold / 2
                                    ? 'bg-amber-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(8, percentage)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span>Batch &amp; Loc:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{med.batchNumber} · {med.shelfLocation}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Supplier:</span>
                              <span className="truncate max-w-[170px] font-medium text-slate-600 dark:text-slate-300">{med.supplier}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setEditingMedicine(med);
                              setIsModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          >
                            Edit Reorder Pt
                          </button>

                          <button
                            onClick={() => handleQuickRestock(med.id, 50)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                            title="Simulate receiving wholesale restock (+50 units)"
                          >
                            <span>+50 Restock</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* General Inventory Summary & Fast Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Total Dispensary Tracked Inventory: {auditMetrics.totalItems} Batches ({auditMetrics.totalQuantity.toLocaleString()} Units)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Pharmacy Stock Valuation: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(auditMetrics.totalInventoryValue)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingMedicine(null);
                    setIsModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Medicine Batch</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit Printout</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: INVENTORY & REMINDERS TABLE */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <MedicineTable
              medicines={medicines}
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              onEditMedicine={(med) => {
                setEditingMedicine(med);
                setIsModalOpen(true);
              }}
              onDeleteMedicine={handleDeleteMedicine}
              onDispense={handleDispense}
              onQuarantine={handleQuarantine}
              onApplyDiscount={handleApplyDiscount}
              onOpenBarcodeScanner={handleOpenBarcodeScanner}
            />
          </div>
        )}

        {/* TAB 3: ACTION CENTER (FEFO, SUPPLIER RETURNS, CLEARANCE) */}
        {activeTab === 'action-center' && (
          <ActionCenter
            medicines={medicines}
            onDispense={handleDispense}
            onApplyDiscount={handleApplyDiscount}
          />
        )}

        {/* TAB 4: QUARANTINE & DISPOSAL LOG */}
        {activeTab === 'quarantine' && (
          <QuarantineView
            medicines={medicines}
            onPermanentlyPurge={handleDeleteMedicine}
          />
        )}

        {/* TAB 5: AI THINKING CLINICAL PHARMACIST */}
        {activeTab === 'ai-consultant' && (
          <AiThinkingPharmacist medicines={medicines} />
        )}

      </main>

      {/* Add / Edit Medicine Modal */}
      <MedicineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMedicine(null);
        }}
        onSave={handleSaveMedicine}
        initialData={editingMedicine}
      />

      {/* Print Audit Sheet Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        medicines={medicines}
        metrics={auditMetrics}
      />

      {/* Barcode-Driven Reminder & Scanner Modal */}
      <BarcodeReminderScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => {
          setIsBarcodeModalOpen(false);
          setScannedBarcode('');
        }}
        medicines={medicines}
        initialBarcode={scannedBarcode}
        onDispense={handleDispense}
        onQuarantine={handleQuarantine}
        onQuickRestock={handleQuickRestock}
      />

    </div>
  );
}
