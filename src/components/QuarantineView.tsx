import React, { useState } from 'react';
import { ShieldAlert, Trash2, CheckCircle, FileCheck, AlertTriangle, Printer, Plus } from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { formatCurrency } from '../utils/expiryUtils';

interface QuarantineViewProps {
  medicines: Medicine[];
  onRestoreToStock?: (id: string) => void;
  onPermanentlyPurge?: (id: string) => void;
}

interface DestructionLog {
  id: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  disposalMethod: string;
  dateDestroyed: string;
  witnessPharmacist: string;
  wasteManifestNumber: string;
}

export const QuarantineView: React.FC<QuarantineViewProps> = ({
  medicines,
  onRestoreToStock,
  onPermanentlyPurge,
}) => {
  // Items marked as quarantined
  const quarantinedItems = medicines.filter((m) => m.status === 'quarantined');

  // Simulated destruction logs
  const [destructionLogs, setDestructionLogs] = useState<DestructionLog[]>([
    {
      id: 'dest-01',
      medicineName: 'Cefixime 200mg Susp',
      batchNumber: 'CFX-1102-A',
      quantity: 15,
      unit: 'bottles',
      disposalMethod: 'Chemical Denaturation & Incineration',
      dateDestroyed: '2026-08-15',
      witnessPharmacist: 'Dr. E. Vance, PharmD',
      wasteManifestNumber: 'HAZ-2026-0881',
    },
    {
      id: 'dest-02',
      medicineName: 'Erythromycin 250mg',
      batchNumber: 'ER-990-K',
      quantity: 40,
      unit: 'blister packs',
      disposalMethod: 'Licensed Biohazard Waste Collection',
      dateDestroyed: '2026-07-28',
      witnessPharmacist: 'Dr. E. Vance, PharmD',
      wasteManifestNumber: 'HAZ-2026-0742',
    },
  ]);

  const [selectedDisposalMed, setSelectedDisposalMed] = useState<Medicine | null>(null);
  const [disposalMethod, setDisposalMethod] = useState('High-Temperature Medical Incineration');
  const [witnessName, setWitnessName] = useState('Dr. Elena Vance, PharmD');

  const handleConfirmDisposal = () => {
    if (!selectedDisposalMed) return;

    const newLog: DestructionLog = {
      id: `dest-${Date.now()}`,
      medicineName: selectedDisposalMed.brandName,
      batchNumber: selectedDisposalMed.batchNumber,
      quantity: selectedDisposalMed.quantity,
      unit: selectedDisposalMed.unit,
      disposalMethod,
      dateDestroyed: new Date().toISOString().split('T')[0],
      witnessPharmacist: witnessName,
      wasteManifestNumber: `HAZ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setDestructionLogs([newLog, ...destructionLogs]);
    if (onPermanentlyPurge) {
      onPermanentlyPurge(selectedDisposalMed.id);
    }
    setSelectedDisposalMed(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Quarantine &amp; Biohazard Disposal Registry</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strict regulatory segregation for expired and recalled drugs in compliance with WHO &amp; FDA standards
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Destruction Certificate</span>
        </button>
      </div>

      {/* Regulatory Notice Banner */}
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs text-rose-900 dark:text-rose-200">
          <strong className="font-semibold block text-sm">Mandatory Quarantine Protocol:</strong>
          Any medicine that reaches expiration (0 days) must be physically removed from sales shelves within 24 hours
          and locked in the designated yellow/red quarantine cabinet to prevent accidental dispensing or cross-contamination.
        </div>
      </div>

      {/* Currently Quarantined Inventory */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Batches Currently in Quarantine Locker ({quarantinedItems.length} items)
        </h3>

        {quarantinedItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              Quarantine Locker is Clean
            </p>
            <p className="text-xs mt-0.5">
              No expired drugs pending hazardous destruction
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Medicine Brand</th>
                  <th className="py-2.5 px-3">Batch No</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Disposal Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quarantinedItems.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{med.brandName}</div>
                      <div className="text-[11px] text-slate-500">{med.genericName}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium">{med.batchNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 font-bold">{med.expiryDate}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {med.quantity} {med.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                        Quarantined Pending Destruction
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedDisposalMed(med)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                      >
                        Log Destruction
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Destruction Audit Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>Official Destruction &amp; Inactivation Audit Trail</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Manifest ID</th>
                <th className="py-2.5 px-3">Medicine &amp; Batch</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Method of Disposal</th>
                <th className="py-2.5 px-3">Date Completed</th>
                <th className="py-2.5 px-3">Witness Pharmacist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {destructionLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {log.wasteManifestNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white">{log.medicineName}</span>
                    <span className="text-slate-500 text-[10px] block font-mono">Lot #{log.batchNumber}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {log.disposalMethod}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{log.dateDestroyed}</td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                    {log.witnessPharmacist}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Destruction Modal */}
      {selectedDisposalMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Log Compliant Pharmaceutical Destruction
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {selectedDisposalMed.brandName} · Lot #{selectedDisposalMed.batchNumber} ({selectedDisposalMed.quantity} {selectedDisposalMed.unit})
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disposal Method
                </label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="High-Temperature Medical Incineration">
                    High-Temperature Medical Incineration (1100°C)
                  </option>
                  <option value="Chemical Inactivation & Encapsulation">
                    Chemical Inactivation &amp; Encapsulation (WHO Standard)
                  </option>
                  <option value="Licensed Reverse Distributor Disposal">
                    Licensed Reverse Distributor Collection
                  </option>
                  <option value="Witnessed Controlled Inactivation">
                    Witnessed Controlled Inactivation (Biohazard Tank)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Witness Pharmacist Name
                </label>
                <input
                  type="text"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedDisposalMed(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisposal}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Sign &amp; Certify Destruction
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
