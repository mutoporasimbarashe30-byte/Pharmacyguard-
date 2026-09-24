import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  MinusCircle, 
  Tag, 
  Eye, 
  Building2, 
  MapPin,
  Barcode
} from 'lucide-react';
import { Medicine, ExpiryTier, DrugCategory } from '../types/pharmacy';
import { analyzeExpiry, getTierBadgeStyle, formatCurrency } from '../utils/expiryUtils';

interface MedicineTableProps {
  medicines: Medicine[];
  selectedTier: ExpiryTier | 'all' | 'low_stock';
  onSelectTier: (tier: ExpiryTier | 'all' | 'low_stock') => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (id: string) => void;
  onDispense: (id: string, amount: number) => void;
  onQuarantine: (medicine: Medicine) => void;
  onApplyDiscount: (id: string, discountPercent: number) => void;
  onOpenBarcodeScanner?: (barcode?: string) => void;
}

export const MedicineTable: React.FC<MedicineTableProps> = ({
  medicines,
  selectedTier,
  onSelectTier,
  onEditMedicine,
  onDeleteMedicine,
  onDispense,
  onQuarantine,
  onApplyDiscount,
  onOpenBarcodeScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'expiryAsc' | 'daysAsc' | 'qtyAsc' | 'valueDesc' | 'nameAsc'>('expiryAsc');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dispenseModalMed, setDispenseModalMed] = useState<Medicine | null>(null);
  const [dispenseQty, setDispenseQty] = useState<number>(1);

  // Low stock count calculation
  const lowStockCount = useMemo(() => {
    return medicines.filter((m) => {
      if (m.status !== 'in_stock') return false;
      const threshold = typeof m.alertThreshold === 'number' ? m.alertThreshold : 20;
      return m.quantity <= threshold;
    }).length;
  }, [medicines]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => set.add(m.category));
    return Array.from(set);
  }, [medicines]);

  // Filtered and sorted medicine list
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((med) => {
        // Status filter: ignore items already quarantined or dispensed out from active table
        if (med.status !== 'in_stock') return false;

        // Low stock filter or Tier filter
        if (selectedTier === 'low_stock') {
          const threshold = typeof med.alertThreshold === 'number' ? med.alertThreshold : 20;
          if (med.quantity > threshold) return false;
        } else if (selectedTier !== 'all') {
          const analysis = analyzeExpiry(med.expiryDate);
          if (analysis.tier !== selectedTier) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'all' && med.category !== selectedCategory) {
          return false;
        }

        // Search query (Brand, Generic, Batch, Barcode, Shelf, Supplier)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchBrand = med.brandName.toLowerCase().includes(q);
          const matchGeneric = med.genericName.toLowerCase().includes(q);
          const matchBatch = med.batchNumber.toLowerCase().includes(q);
          const matchBarcode = med.barcode ? med.barcode.toLowerCase().includes(q) : false;
          const matchShelf = med.shelfLocation.toLowerCase().includes(q);
          const matchSupplier = med.supplier.toLowerCase().includes(q);
          if (!matchBrand && !matchGeneric && !matchBatch && !matchBarcode && !matchShelf && !matchSupplier) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const analysisA = analyzeExpiry(a.expiryDate);
        const analysisB = analyzeExpiry(b.expiryDate);

        if (sortBy === 'expiryAsc') {
          return a.expiryDate.localeCompare(b.expiryDate); // FEFO default
        }
        if (sortBy === 'daysAsc') {
          return analysisA.daysRemaining - analysisB.daysRemaining;
        }
        if (sortBy === 'qtyAsc') {
          return a.quantity - b.quantity;
        }
        if (sortBy === 'valueDesc') {
          const valA = a.quantity * a.sellingPrice;
          const valB = b.quantity * b.sellingPrice;
          return valB - valA;
        }
        if (sortBy === 'nameAsc') {
          return a.brandName.localeCompare(b.brandName);
        }
        return 0;
      });
  }, [medicines, selectedTier, selectedCategory, searchQuery, sortBy]);

  const handleDispenseConfirm = () => {
    if (dispenseModalMed && dispenseQty > 0) {
      onDispense(dispenseModalMed.id, dispenseQty);
      setDispenseModalMed(null);
      setDispenseQty(1);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      
      {/* Control Bar: Filters, Search, and Category */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectTier('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedTier === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Stock ({medicines.filter((m) => m.status === 'in_stock').length})
          </button>

          <button
            onClick={() => onSelectTier('critical')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'critical'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            <span>&lt; 30 Days (Red)</span>
          </button>

          <button
            onClick={() => onSelectTier('warning')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'warning'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>30-60 Days (Amber)</span>
          </button>

          <button
            onClick={() => onSelectTier('watchlist')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'watchlist'
                ? 'bg-yellow-500 text-slate-950 shadow-xs'
                : 'text-yellow-800 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>61-90 Days (Yellow)</span>
          </button>

          <button
            onClick={() => onSelectTier('stable')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'stable'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>&gt; 90 Days (Green)</span>
          </button>

          <button
            onClick={() => onSelectTier('expired')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'expired'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            <span>Expired (&lt;0d)</span>
          </button>

          <button
            onClick={() => onSelectTier(selectedTier === 'low_stock' ? 'all' : 'low_stock')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedTier === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
        </div>

        {/* Search, Category, and Sort */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicine, batch, barcode (e.g. 890103...)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
            />
          </div>

          {/* Barcode Quick Trigger Button */}
          {onOpenBarcodeScanner && (
            <button
              type="button"
              onClick={() => onOpenBarcodeScanner()}
              title="Open Barcode Reminder Scanner Workstation"
              className="px-2.5 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900 flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <Barcode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          )}

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="expiryAsc">Sort: Expiry (FEFO)</option>
            <option value="daysAsc">Sort: Days Remaining</option>
            <option value="valueDesc">Sort: Financial Loss Risk</option>
            <option value="qtyAsc">Sort: Quantity (Low to High)</option>
            <option value="nameAsc">Sort: Brand Name (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Medicine &amp; Formulation</th>
              <th className="py-3 px-3">Batch &amp; Shelf Location</th>
              <th className="py-3 px-3">Stock Units</th>
              <th className="py-3 px-3">Expiry Date</th>
              <th className="py-3 px-3">Days Remaining &amp; Alert Tier</th>
              <th className="py-3 px-3 text-right">Value at Risk</th>
              <th className="py-3 px-4 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                      No medicines matching the selected criteria
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try clearing filters or search terms
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMedicines.map((med) => {
                const analysis = analyzeExpiry(med.expiryDate);
                const styles = getTierBadgeStyle(analysis.tier);
                const totalValue = med.quantity * med.sellingPrice;

                return (
                  <tr
                    key={med.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      analysis.tier === 'critical' ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                    } ${analysis.tier === 'expired' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}
                  >
                    {/* Medicine & Generic */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{med.brandName}</span>
                            {med.discountPercent && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                -{med.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {med.genericName} · {med.strength}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {med.dosageForm} · {med.category}
                          </div>
                          {med.barcode && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => onOpenBarcodeScanner && onOpenBarcodeScanner(med.barcode)}
                                className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/80 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400 transition-colors shadow-2xs"
                                title="Click to view barcode-based expiry reminder"
                              >
                                <Barcode className="w-3 h-3 text-teal-600" />
                                <span>{med.barcode}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Batch & Shelf */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {med.batchNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{med.shelfLocation}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {med.storageCondition}
                      </div>
                    </td>

                    {/* Stock Units & Alert Threshold */}
                    <td className="py-3 px-3">
                      {(() => {
                        const threshold = typeof med.alertThreshold === 'number' ? med.alertThreshold : 20;
                        const isLowStock = med.quantity <= threshold;
                        return (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                {med.quantity}{' '}
                                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                  {med.unit}
                                </span>
                              </span>
                              {isLowStock && (
                                <span
                                  title={`Quantity (${med.quantity}) is at or below alert threshold (${threshold})`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 whitespace-nowrap"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>LOW STOCK</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between gap-1 mt-0.5">
                              <span>Cost: {formatCurrency(med.costPrice)}/ea</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400" title="Specific reorder point threshold">
                                Alert Pt: {threshold}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                        {med.expiryDate}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {analysis.daysRemaining < 0
                          ? `Passed ${Math.abs(analysis.daysRemaining)}d ago`
                          : `in ${analysis.daysRemaining} days`}
                      </div>
                    </td>

                    {/* Days Remaining & Alert Tier Indicator (RED, AMBER, YELLOW, GREEN) */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 max-w-[190px]">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText} transition-all`}
                        >
                          <span className={`w-2 h-2 rounded-full ${styles.dotBg} shrink-0`} />
                          <span className="font-mono tabular-nums">
                            {analysis.label}
                          </span>
                        </span>

                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {analysis.recommendedAction}
                        </span>
                      </div>
                    </td>

                    {/* Financial Risk */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(totalValue)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        Sell: {formatCurrency(med.sellingPrice)}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Quick Dispense Button */}
                        <button
                          onClick={() => {
                            setDispenseModalMed(med);
                            setDispenseQty(1);
                          }}
                          title="Dispense from this batch (FEFO)"
                          className="px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
                        >
                          Dispense
                        </button>

                        {/* More Menu Dropdown Toggle */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === med.id ? null : med.id)
                            }
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeMenuId === med.id && (
                            <div className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-lg bg-white dark:bg-slate-800 py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-hidden text-xs">
                              
                              <button
                                onClick={() => {
                                  onEditMedicine(med);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Batch Info</span>
                              </button>

                              <button
                                onClick={() => {
                                  onApplyDiscount(med.id, med.discountPercent ? 0 : 30);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-amber-700 dark:text-amber-300"
                              >
                                <Tag className="w-3.5 h-3.5" />
                                <span>
                                  {med.discountPercent ? 'Remove Discount' : 'Apply 30% Clearance'}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  onQuarantine(med);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Send to Quarantine</span>
                              </button>

                              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                              <button
                                onClick={() => {
                                  onDeleteMedicine(med.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Record</span>
                              </button>

                            </div>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{filteredMedicines.length}</span> of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{medicines.filter((m) => m.status === 'in_stock').length}</span> active dispensary batches
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600" /> &lt;30d Urgent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 30-60d Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> 61-90d Watchlist
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;90d Stable
          </span>
        </div>
      </div>

      {/* Quick Dispense Dialog */}
      {dispenseModalMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Dispense from Earliest Batch (FEFO)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dispenseModalMed.brandName} · Batch #{dispenseModalMed.batchNumber}
            </p>
            <div className="mt-2 text-xs font-mono text-red-600 dark:text-red-400">
              Expires: {dispenseModalMed.expiryDate} (Current Stock: {dispenseModalMed.quantity} {dispenseModalMed.unit})
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity to Dispense ({dispenseModalMed.unit}):
              </label>
              <input
                type="number"
                min="1"
                max={dispenseModalMed.quantity}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(Math.max(1, Math.min(dispenseModalMed.quantity, Number(e.target.value))))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDispenseModalMed(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDispenseConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
              >
                Confirm Dispensing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
