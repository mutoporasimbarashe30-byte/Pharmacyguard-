import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Clock, AlertTriangle } from 'lucide-react';
import { Medicine, DosageForm, DrugCategory, StorageCondition } from '../types/pharmacy';
import { analyzeExpiry, getTierBadgeStyle, getSystemToday } from '../utils/expiryUtils';

interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Medicine | null;
}

const DOSAGE_FORMS: DosageForm[] = [
  'Tablets',
  'Capsules',
  'Syrup',
  'Injection / Vial',
  'Inhaler',
  'Suspension',
  'Ointment / Cream',
  'Eye / Ear Drops',
  'Suppository',
];

const CATEGORIES: DrugCategory[] = [
  'Antibiotics & Anti-infectives',
  'Cardiovascular & Antihypertensives',
  'Analgesics & Anti-inflammatory',
  'Antidiabetic & Endocrinology',
  'Respiratory & Antiasthmatic',
  'Gastrointestinal',
  'Psychotropic & Neurological',
  'Pediatric Formulas',
  'Dermatological',
  'Vitamins & Supplements',
];

const STORAGE_CONDITIONS: StorageCondition[] = [
  'Room Temperature (15-25°C)',
  'Cold Chain Refrigerator (2-8°C)',
  'Cool & Dry (Protect from Moisture)',
  'Protect from Light',
  'Controlled Substance Vault',
];

export const MedicineModal: React.FC<MedicineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosageForm, setDosageForm] = useState<DosageForm>('Tablets');
  const [strength, setStrength] = useState('');
  const [category, setCategory] = useState<DrugCategory>('Antibiotics & Anti-infectives');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [alertThreshold, setAlertThreshold] = useState(20);
  const [unit, setUnit] = useState('boxes');
  const [costPrice, setCostPrice] = useState(5.0);
  const [sellingPrice, setSellingPrice] = useState(10.0);
  const [shelfLocation, setShelfLocation] = useState('Shelf A-1');
  const [supplier, setSupplier] = useState('GlaxoSmithKline Healthcare');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('Room Temperature (15-25°C)');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setBrandName(initialData.brandName);
      setGenericName(initialData.genericName);
      setDosageForm(initialData.dosageForm);
      setStrength(initialData.strength);
      setCategory(initialData.category);
      setBatchNumber(initialData.batchNumber);
      setBarcode(initialData.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      setExpiryDate(initialData.expiryDate);
      setQuantity(initialData.quantity);
      setAlertThreshold(typeof initialData.alertThreshold === 'number' ? initialData.alertThreshold : 20);
      setUnit(initialData.unit);
      setCostPrice(initialData.costPrice);
      setSellingPrice(initialData.sellingPrice);
      setShelfLocation(initialData.shelfLocation);
      setSupplier(initialData.supplier);
      setStorageCondition(initialData.storageCondition);
      setNotes(initialData.notes || '');
    } else {
      // Default to 45 days in future for demonstration
      const future = new Date();
      future.setDate(future.getDate() + 45);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, '0');
      const dd = String(future.getDate()).padStart(2, '0');

      setBrandName('');
      setGenericName('');
      setDosageForm('Tablets');
      setStrength('500 mg');
      setCategory('Antibiotics & Anti-infectives');
      setBatchNumber(`B-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear().toString().slice(-2)}`);
      setBarcode(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      setExpiryDate(`${yyyy}-${mm}-${dd}`);
      setQuantity(60);
      setAlertThreshold(25);
      setUnit('boxes');
      setCostPrice(4.5);
      setSellingPrice(9.5);
      setShelfLocation('Shelf A-2');
      setSupplier('National Pharma Wholesale');
      setStorageCondition('Room Temperature (15-25°C)');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Real-time analysis for color indication preview
  const previewAnalysis = expiryDate ? analyzeExpiry(expiryDate) : null;
  const previewStyle = previewAnalysis ? getTierBadgeStyle(previewAnalysis.tier) : null;

  const handleSetQuickDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setExpiryDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !expiryDate || !batchNumber.trim()) {
      alert('Please fill in Brand Name, Batch Number, and Expiry Date');
      return;
    }

    onSave({
      brandName: brandName.trim(),
      genericName: genericName.trim() || brandName.trim(),
      dosageForm,
      strength: strength.trim() || 'Standard Dose',
      category,
      batchNumber: batchNumber.trim().toUpperCase(),
      barcode: barcode.trim() || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      expiryDate,
      quantity: Number(quantity) || 1,
      alertThreshold: Number(alertThreshold) >= 0 ? Number(alertThreshold) : 20,
      unit: unit.trim() || 'units',
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      shelfLocation: shelfLocation.trim() || 'General Bay',
      supplier: supplier.trim() || 'Local Distributor',
      storageCondition,
      notes: notes.trim(),
      status: 'in_stock',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initialData ? 'Edit Medicine Batch' : 'Register New Medicine Batch'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure inventory levels, expiry threshold tracking, and storage location
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Real-time Expiry Status Preview Strip */}
          {previewAnalysis && previewStyle && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${previewStyle.badgeBg} ${previewStyle.badgeBorder} transition-all`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${previewStyle.dotBg} animate-ping`} />
                <div>
                  <span className={`text-xs font-bold ${previewStyle.badgeText}`}>
                    Calculated Alert Tier: {previewAnalysis.tier.toUpperCase()} ({previewAnalysis.label})
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {previewAnalysis.urgencyDescription}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border bg-white dark:bg-slate-900 ${previewStyle.badgeText}`}>
                {previewAnalysis.daysRemaining} Days
              </span>
            </div>
          )}

          {/* Row 1: Brand Name & Generic Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand / Trade Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxil, Lipitor, Panadol Extra"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Generic Active Ingredient
              </label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin Trihydrate"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Row 2: Dosage Form, Strength, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dosage Form
              </label>
              <select
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {DOSAGE_FORMS.map((df) => (
                  <option key={df} value={df}>
                    {df}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Strength / Concentration
              </label>
              <input
                type="text"
                placeholder="e.g. 500mg, 10mg/5ml"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Therapeutic Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DrugCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Batch Number & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch / Lot Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. B-8801-X"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Packaging Barcode *
                </label>
                <button
                  type="button"
                  onClick={() => setBarcode(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`)}
                  className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Generate EAN-13
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. 8901030112211"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 4: Expiration Date (With Quick Buttons) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expiration Date (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400">Quick set:</span>
              <button
                type="button"
                onClick={() => handleSetQuickDays(15)}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded hover:bg-red-200"
              >
                +15d (&lt;30d Red)
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDays(45)}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded hover:bg-amber-200"
              >
                +45d (Amber)
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDays(75)}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 rounded hover:bg-yellow-200"
              >
                +75d (Yellow)
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDays(180)}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded hover:bg-emerald-200"
              >
                +6 months
              </button>
            </div>
          </div>

          {/* Row 4: Quantity, Alert Threshold (Reorder Point), Unit, Cost Price, Selling Price */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center justify-between">
                <span>Alert Threshold *</span>
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="e.g. 20"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Packaging Unit
              </label>
              <input
                type="text"
                placeholder="boxes, bottles"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Reorder Point Notification Strip if Quantity is at or below threshold */}
          {quantity <= alertThreshold && (
            <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Low-Stock Alert Triggered:</strong> Stock ({quantity} {unit}) is at or below the reorder threshold ({alertThreshold} {unit}).
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                REORDER REQD
              </span>
            </div>
          )}

          {/* Row 5: Shelf Location & Storage Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dispensary Shelf / Bin Location
              </label>
              <input
                type="text"
                placeholder="e.g. Shelf A-2, Fridge #1 Top"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storage Condition
              </label>
              <select
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {STORAGE_CONDITIONS.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Supplier & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Wholesale Supplier / Distributor
              </label>
              <input
                type="text"
                placeholder="e.g. Pfizer Distribution Ltd"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Internal Pharmacist Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Fast moving, check foil blister seals"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
            >
              {initialData ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
