import React from 'react';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { StockAuditMetric, ExpiryTier } from '../types/pharmacy';
import { formatCurrency } from '../utils/expiryUtils';

interface MetricCardsProps {
  metrics: StockAuditMetric;
  selectedTier: ExpiryTier | 'all' | 'low_stock';
  onSelectTier: (tier: ExpiryTier | 'all' | 'low_stock') => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  metrics,
  selectedTier,
  onSelectTier,
}) => {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4">
        
        {/* 1. CRITICAL EXCLUSION: Expired (<0 Days) */}
        <button
          onClick={() => onSelectTier(selectedTier === 'expired' ? 'all' : 'expired')}
          className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedTier === 'expired'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Expired (&lt;0d)</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-900 dark:text-rose-100 tabular-nums">
            {metrics.expiredCount}
          </div>
          <div className="mt-1 text-xs text-rose-700/80 dark:text-rose-400 flex flex-col">
            <span>{formatCurrency(metrics.expiredValue)} lost</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Quarantine &amp; purge</span>
          </div>
        </button>

        {/* 2. PROMPT REQUIREMENT: Under Thirty Days (RED ALERT) */}
        <button
          onClick={() => onSelectTier(selectedTier === 'critical' ? 'all' : 'critical')}
          className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedTier === 'critical'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/30 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>&lt; 30 Days (RED)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white font-mono">
              URGENT
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-red-700 dark:text-red-300 tabular-nums">
            {metrics.criticalCount}
          </div>
          <div className="mt-1 text-xs text-red-700/90 dark:text-red-300 flex flex-col">
            <span className="font-semibold">{formatCurrency(metrics.criticalValue)} at risk</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">FEFO prioritize &amp; clear</span>
          </div>
        </button>

        {/* 3. PROMPT REQUIREMENT: 30 - 60 Days Reminder (AMBER / ORANGE) */}
        <button
          onClick={() => onSelectTier(selectedTier === 'warning' ? 'all' : 'warning')}
          className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedTier === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>30 - 60 Days (AMBER)</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-900 dark:text-amber-100 tabular-nums">
            {metrics.warningCount}
          </div>
          <div className="mt-1 text-xs text-amber-700/90 dark:text-amber-400 flex flex-col">
            <span>{formatCurrency(metrics.warningValue)} value</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Review supplier returns</span>
          </div>
        </button>

        {/* 4. PROMPT REQUIREMENT: 61 - 90 Days Reminder (YELLOW / GOLD) */}
        <button
          onClick={() => onSelectTier(selectedTier === 'watchlist' ? 'all' : 'watchlist')}
          className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedTier === 'watchlist'
              ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-500 ring-2 ring-yellow-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-yellow-400 dark:hover:border-yellow-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
              <span>61 - 90 Days (YELLOW)</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-yellow-900 dark:text-yellow-100 tabular-nums">
            {metrics.watchlistCount}
          </div>
          <div className="mt-1 text-xs text-yellow-800/90 dark:text-yellow-400 flex flex-col">
            <span>{formatCurrency(metrics.watchlistValue)} value</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Freeze incoming POs</span>
          </div>
        </button>

        {/* 5. STABLE (> 90 Days - GREEN) */}
        <button
          onClick={() => onSelectTier(selectedTier === 'stable' ? 'all' : 'stable')}
          className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden col-span-2 md:col-span-1 ${
            selectedTier === 'stable'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>&gt; 90 Days (GREEN)</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-900 dark:text-emerald-100 tabular-nums">
            {metrics.stableCount}
          </div>
          <div className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-400 flex flex-col">
            <span>{formatCurrency(metrics.stableValue)} value</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Nominal shelf life</span>
          </div>
        </button>

      </div>

      {/* Dashboard Low-Stock Summary Indicator Strip */}
      {metrics.lowStockCount > 0 && (
        <div className="mt-3 p-3 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Low-Stock Indicator: {metrics.lowStockCount} {metrics.lowStockCount === 1 ? 'medicine batch is' : 'medicine batches are'} below reorder threshold
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Current inventory levels have dropped beneath their specific minimum alert points. Place wholesale purchase orders to prevent stockouts.
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectTier(selectedTier === 'low_stock' ? 'all' : 'low_stock')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap self-start sm:self-center shrink-0 shadow-xs ${
              selectedTier === 'low_stock'
                ? 'bg-amber-700 text-white'
                : 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-slate-800 border border-amber-300 dark:border-amber-700'
            }`}
          >
            {selectedTier === 'low_stock' ? 'Showing Low Stock Batches' : `View ${metrics.lowStockCount} Low-Stock Batches`}
          </button>
        </div>
      )}
    </div>
  );
};
