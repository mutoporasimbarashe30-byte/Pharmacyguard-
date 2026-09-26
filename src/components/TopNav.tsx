import React from 'react';
import { Pill, Plus, Download, Sparkles, ShieldAlert, Barcode, CreditCard } from 'lucide-react';
import avatarImg from '../assets/images/avatar_pharmacist_1790233732970.jpg';
import { SubscriptionState } from '../types/pharmacy';

interface TopNavProps {
  activeTab: 'dashboard' | 'inventory' | 'action-center' | 'quarantine' | 'ai-consultant';
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'action-center' | 'quarantine' | 'ai-consultant') => void;
  onOpenAddModal: () => void;
  onExportCSV: () => void;
  onOpenPrintReport: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenSubscriptionModal: () => void;
  subscription: SubscriptionState;
  isPro?: boolean;
  criticalCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onExportCSV,
  onOpenBarcodeScanner,
  onOpenSubscriptionModal,
  subscription,
  isPro = false,
  criticalCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-sm">
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              PharmAlert
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span>Inventory &amp; Reminders</span>
              {criticalCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-600 text-white">
                  {criticalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('action-center')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'action-center'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              FEFO &amp; Returns
            </button>

            <button
              onClick={() => setActiveTab('quarantine')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'quarantine'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Quarantine Log</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-consultant')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ai-consultant'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 shadow-xs font-semibold'
                  : 'text-teal-700 dark:text-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-950/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>AI Thinking Pharmacist</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions and Pharmacist Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenSubscriptionModal}
              title="Pay EcoCash 0779520831 ($5 monthly or $70 yearly)"
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
                isPro || subscription.status === 'active'
                  ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border-emerald-700'
                  : subscription.status === 'trial_active'
                  ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border-amber-700'
                  : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono">
                {isPro || subscription.status === 'active'
                  ? 'Subscribe · Pro Active'
                  : 'Subscribe'}
              </span>
            </button>

            <button
              onClick={onOpenBarcodeScanner}
              title="Scan packaging barcode for live expiry reminders"
              className="px-2.5 sm:px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            >
              <Barcode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            <button
              onClick={onExportCSV}
              title="Export Expiry Audit CSV"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Medicine Batch</span>
            </button>

            {/* Pharmacist Profile */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={avatarImg}
                alt="Pharmacist in charge"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  Dr. E. Vance, PharmD
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Supervising Pharmacist
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
