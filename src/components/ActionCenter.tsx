import React, { useState } from 'react';
import { 
  FileText, 
  ArrowRight, 
  Printer, 
  Send, 
  Percent, 
  Check, 
  AlertCircle, 
  Clock, 
  Building2, 
  PackageCheck,
  Download
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { analyzeExpiry, getTierBadgeStyle, formatCurrency } from '../utils/expiryUtils';

interface ActionCenterProps {
  medicines: Medicine[];
  onDispense: (id: string, amount: number) => void;
  onApplyDiscount: (id: string, discountPercent: number) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
  medicines,
  onDispense,
  onApplyDiscount,
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<'fefo' | 'returns' | 'markdowns'>('fefo');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [returnMemosSent, setReturnMemosSent] = useState<Record<string, boolean>>({});

  const activeMeds = medicines.filter((m) => m.status === 'in_stock');

  // FEFO queue sorted strictly by earliest expiry
  const fefoQueue = [...activeMeds].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Items eligible for supplier return (30 to 90 days before expiry)
  const returnEligible = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier === 'warning' || analysis.tier === 'watchlist' || analysis.tier === 'critical';
  });

  // Extract suppliers
  const suppliers = Array.from(new Set(returnEligible.map((m) => m.supplier)));

  const filteredReturnItems = returnEligible.filter(
    (m) => selectedSupplier === 'all' || m.supplier === selectedSupplier
  );

  const totalReturnCreditValue = filteredReturnItems.reduce(
    (sum, m) => sum + m.quantity * m.costPrice,
    0
  );

  // Critical items (<30 days) needing emergency markdown or clearance
  const markdownEligible = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier === 'critical' || analysis.tier === 'warning';
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Workflow Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Operational Expiry Action Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Standard operating procedures to eliminate medicine waste and maximize financial recovery
          </p>
        </div>

        {/* Workflow Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveWorkflow('fefo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeWorkflow === 'fefo'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            FEFO Dispense Queue
          </button>
          <button
            onClick={() => setActiveWorkflow('returns')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeWorkflow === 'returns'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Supplier Return Memos
          </button>
          <button
            onClick={() => setActiveWorkflow('markdowns')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeWorkflow === 'markdowns'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Clearance Markdowns
          </button>
        </div>
      </div>

      {/* 1. FEFO DISPENSING QUEUE */}
      {activeWorkflow === 'fefo' && (
        <div className="space-y-4">
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <PackageCheck className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-teal-950 dark:text-teal-100">
                  First Expired, First Out (FEFO) Protocol Active
                </h4>
                <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5 max-w-2xl">
                  Dispensary technicians must pick batches from this list for all customer prescriptions before touching newer shipments.
                  Medicines are prioritized strictly by impending expiration date.
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Picking Slip</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fefoQueue.slice(0, 10).map((med, index) => {
                const analysis = analyzeExpiry(med.expiryDate);
                const styles = getTierBadgeStyle(analysis.tier);

                return (
                  <div
                    key={med.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {med.brandName}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({med.genericName})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText}`}
                          >
                            {analysis.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                          <span>Batch: <strong className="font-mono text-slate-700 dark:text-slate-300">{med.batchNumber}</strong></span>
                          <span>·</span>
                          <span>Location: <strong className="text-teal-600 dark:text-teal-400">{med.shelfLocation}</strong></span>
                          <span>·</span>
                          <span>Available: <strong className="font-mono">{med.quantity} {med.unit}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => onDispense(med.id, 1)}
                        className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        Dispense 1 {med.unit.replace(/s$/, '')}
                      </button>
                      <button
                        onClick={() => onDispense(med.id, 5)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Dispense 5
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. SUPPLIER RETURN MEMOS */}
      {activeWorkflow === 'returns' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Supplier Return &amp; Credit Claim Generator
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Wholesale pharmaceutical suppliers offer 80%–100% inventory credit if batches are returned before their 60-90 day cutoff.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Suppliers ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier Return Summary Box */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Eligible Return Batches ({filteredReturnItems.length} items)
                </h4>
                <p className="text-xs text-slate-500">
                  Total Wholesale Purchase Cost Recoverable:{' '}
                  <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm">
                    {formatCurrency(totalReturnCreditValue)}
                  </strong>
                </p>
              </div>
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Official Return Memo</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Distributor / Supplier</th>
                    <th className="py-2.5 px-3">Medicine &amp; Batch No</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Units to Return</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Credit Claim</th>
                    <th className="py-2.5 px-3 text-right">Memo Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReturnItems.map((med) => {
                    const analysis = analyzeExpiry(med.expiryDate);
                    const styles = getTierBadgeStyle(analysis.tier);
                    const claimVal = med.quantity * med.costPrice;
                    const isSent = returnMemosSent[med.id];

                    return (
                      <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {med.supplier}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{med.brandName}</div>
                          <div className="font-mono text-[10px] text-slate-500">Batch #{med.batchNumber}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText}`}>
                            {med.expiryDate} ({analysis.daysRemaining}d)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium">
                          {med.quantity} {med.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(med.costPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                          {formatCurrency(claimVal)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() =>
                              setReturnMemosSent((prev) => ({
                                ...prev,
                                [med.id]: !prev[med.id],
                              }))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              isSent
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSent ? 'Claim Dispatched' : 'Prepare Claim'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLEARANCE MARKDOWNS */}
      {activeWorkflow === 'markdowns' && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-4">
            <h4 className="text-sm font-bold text-red-950 dark:text-red-100">
              Clearance Markdown Calculator for Near-Expiry Stock
            </h4>
            <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5 max-w-2xl">
              For medicines expiring within &lt;30 days (Red) or 30-60 days (Amber) where supplier return is unavailable,
              apply an immediate promotional discount to recover base costs and incentivize rapid dispensing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markdownEligible.map((med) => {
              const analysis = analyzeExpiry(med.expiryDate);
              const styles = getTierBadgeStyle(analysis.tier);
              const currentDiscount = med.discountPercent || 0;
              const discountedPrice = med.sellingPrice * (1 - currentDiscount / 100);

              return (
                <div
                  key={med.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText}`}>
                        {analysis.label}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {med.quantity} {med.unit}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {med.brandName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {med.genericName} · {med.strength}
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Regular Price</span>
                        <span className={`font-mono ${currentDiscount > 0 ? 'line-through text-slate-400' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                          {formatCurrency(med.sellingPrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Clearance Price</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                          {formatCurrency(discountedPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block mb-1.5">Apply Markdown Rate:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0, 20, 35, 50].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => onApplyDiscount(med.id, pct)}
                          className={`py-1 text-xs font-mono font-semibold rounded transition-colors ${
                            currentDiscount === pct
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {pct === 0 ? 'None' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
