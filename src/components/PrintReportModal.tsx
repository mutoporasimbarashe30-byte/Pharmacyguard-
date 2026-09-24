import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, Barcode, Tag } from 'lucide-react';
import { Medicine, StockAuditMetric } from '../types/pharmacy';
import { analyzeExpiry, formatCurrency, getTierBadgeStyle } from '../utils/expiryUtils';
import { BarcodeVisual } from './BarcodeVisual';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  metrics: StockAuditMetric;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  medicines,
  metrics,
}) => {
  const [reportMode, setReportMode] = useState<'audit_sheet' | 'barcode_tags'>('audit_sheet');

  if (!isOpen) return null;

  const activeMeds = medicines.filter((m) => m.status === 'in_stock');
  const alertMeds = activeMeds.filter((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    return analysis.tier !== 'stable';
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:m-0 print:max-w-none">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportMode('audit_sheet')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                reportMode === 'audit_sheet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clinical Audit Sheet
            </button>
            <button
              onClick={() => setReportMode('barcode_tags')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                reportMode === 'barcode_tags'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-teal-600" />
              <span>Barcode Shelf Tags ({activeMeds.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{reportMode === 'audit_sheet' ? 'Print Audit Report' : 'Print Barcode Labels'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {reportMode === 'audit_sheet' ? (
          /* Printable Report Sheet */
          <div className="p-8 sm:p-10 space-y-6">
            
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  PHARMALERT CLINICAL AUDIT REPORT
                </h1>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  St. Jude Community Pharmacy &amp; Dispensary
                </p>
                <p className="text-xs text-slate-500">
                  License No: RX-889104-B · 402 Medical Arts Blvd, Suite 100
                </p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p><strong className="text-slate-900">Date of Inspection:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p><strong className="text-slate-900">Inspector / Pharmacist:</strong> Dr. Elena Vance, PharmD</p>
                <p><strong className="text-slate-900">Audit Scope:</strong> 90 / 60 / 30-Day Alert Verification</p>
              </div>
            </div>

            {/* Metric Summary Tiers */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                1. TIER EXPOSURE BREAKDOWN
              </h3>
              <div className="grid grid-cols-4 gap-3 text-xs border border-slate-300 rounded-lg p-3 bg-slate-50">
                <div>
                  <span className="text-red-700 font-bold block">&lt; 30 Days (Red Alert)</span>
                  <span className="text-base font-bold font-mono text-red-700">{metrics.criticalCount} batches</span>
                  <span className="text-[11px] text-slate-600 block">{formatCurrency(metrics.criticalValue)} at risk</span>
                </div>
                <div>
                  <span className="text-amber-700 font-bold block">30 - 60 Days (Warning)</span>
                  <span className="text-base font-bold font-mono text-amber-700">{metrics.warningCount} batches</span>
                  <span className="text-[11px] text-slate-600 block">{formatCurrency(metrics.warningValue)} value</span>
                </div>
                <div>
                  <span className="text-yellow-800 font-bold block">61 - 90 Days (Watchlist)</span>
                  <span className="text-base font-bold font-mono text-yellow-800">{metrics.watchlistCount} batches</span>
                  <span className="text-[11px] text-slate-600 block">{formatCurrency(metrics.watchlistValue)} value</span>
                </div>
                <div>
                  <span className="text-rose-800 font-bold block">Quarantined / Expired</span>
                  <span className="text-base font-bold font-mono text-rose-800">{metrics.expiredCount} batches</span>
                  <span className="text-[11px] text-slate-600 block">{formatCurrency(metrics.expiredValue)} loss</span>
                </div>
              </div>
            </div>

            {/* Detailed Audit Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                2. REGISTER OF EXPIRING MEDICINE BATCHES WITH BARCODES
              </h3>
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="py-2 px-2.5">Medicine Name</th>
                    <th className="py-2 px-2.5">Packaging Barcode</th>
                    <th className="py-2 px-2.5">Batch / Lot</th>
                    <th className="py-2 px-2.5">Expiry Date</th>
                    <th className="py-2 px-2.5">Days Left</th>
                    <th className="py-2 px-2.5">Alert Level</th>
                    <th className="py-2 px-2.5">Stock</th>
                    <th className="py-2 px-2.5 text-right">Value ($)</th>
                    <th className="py-2 px-2.5">Mandated Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {alertMeds.map((med) => {
                    const analysis = analyzeExpiry(med.expiryDate);
                    return (
                      <tr key={med.id} className="text-[11px]">
                        <td className="py-1.5 px-2.5 font-bold">{med.brandName}</td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-600 font-semibold">{med.barcode || '—'}</td>
                        <td className="py-1.5 px-2.5 font-mono">{med.batchNumber}</td>
                        <td className="py-1.5 px-2.5 font-mono">{med.expiryDate}</td>
                        <td className="py-1.5 px-2.5 font-mono font-semibold">{analysis.daysRemaining}d</td>
                        <td className="py-1.5 px-2.5">
                          <span className={`font-bold uppercase text-[10px] ${
                            analysis.tier === 'critical' ? 'text-red-700 font-extrabold' :
                            analysis.tier === 'warning' ? 'text-amber-700' :
                            analysis.tier === 'watchlist' ? 'text-yellow-700' :
                            'text-slate-600'
                          }`}>
                            {analysis.tier}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 font-mono">{med.quantity} {med.unit}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                          {formatCurrency(med.quantity * med.sellingPrice)}
                        </td>
                        <td className="py-1.5 px-2.5 text-[10px] text-slate-600">
                          {analysis.recommendedAction}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pharmacist & Inspector Attestation */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-bold text-slate-800">Supervising Pharmacist in Charge:</p>
                <div className="mt-8 border-b border-slate-400 w-48" />
                <p className="mt-1 text-slate-600">Dr. Elena Vance, PharmD (Reg #PH-9921)</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Health Authority / Pharmacy Board Inspector:</p>
                <div className="mt-8 border-b border-slate-400 w-48" />
                <p className="mt-1 text-slate-600">Official Stamp &amp; Date</p>
              </div>
            </div>

          </div>
        ) : (
          /* Printable Barcode Shelf Tags with Expiry Color Indication */
          <div className="p-8 sm:p-10 space-y-6">
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  DISPENSARY BARCODE SHELF TAGS
                </h2>
                <p className="text-xs text-slate-500">
                  Print onto sticker sheets to label shelves and packaging with barcode reminders
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600 font-bold">
                {activeMeds.length} Product Barcodes
              </span>
            </div>

            {/* Grid of Printable Barcode Shelf Tags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {activeMeds.map((med) => {
                const analysis = analyzeExpiry(med.expiryDate);
                const tierStyle = getTierBadgeStyle(analysis.tier);
                return (
                  <div
                    key={med.id}
                    className="p-3.5 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Tag Header with Color-Coded Expiry Indication Badge */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-mono text-slate-500 font-bold truncate">
                          {med.shelfLocation}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono border ${tierStyle.badgeBg} ${tierStyle.badgeBorder} ${tierStyle.badgeText}`}>
                          {analysis.tier === 'critical' ? '<30d RED ALERT' :
                           analysis.tier === 'warning' ? '30-60d AMBER' :
                           analysis.tier === 'watchlist' ? '61-90d YELLOW' :
                           '>90d GREEN'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {med.brandName}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        {med.genericName} · {med.strength}
                      </p>

                      {/* Barcode SVG Visual */}
                      <div className="my-2 p-1.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center">
                        <BarcodeVisual code={med.barcode || med.batchNumber} width={130} height={40} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-600 font-mono">
                      <span>EXP: <strong className="text-slate-900">{med.expiryDate}</strong></span>
                      <span>LOT: <strong className="text-slate-900">{med.batchNumber}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

