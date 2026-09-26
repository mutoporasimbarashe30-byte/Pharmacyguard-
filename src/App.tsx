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
import { SubscriptionWallModal } from './components/SubscriptionWallModal';
import { INITIAL_MEDICINES } from './data/initialMedicines';
import { Medicine, ExpiryTier, SubscriptionState, EcoCashPendingPayment } from './types/pharmacy';
import { calculateAuditMetrics, exportToCSV, analyzeExpiry, formatCurrency, getTierBadgeStyle } from './utils/expiryUtils';
import { 
  Sparkles, 
  Plus, 
  FileText, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Barcode,
  CreditCard,
  Lock,
  PhoneCall,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

const STORAGE_KEY = 'pharmalert_inventory_v1';
const SUBSCRIPTION_STORAGE_KEY = 'pharmalert_subscription_v1';
const PENDING_STORAGE_KEY = 'pharmalert_pending';
const IS_PRO_STORAGE_KEY = 'pharmalert_isPro';
const EXPIRY_STORAGE_KEY = 'pharmalert_expiry';
const PAYMENT_PHONE_NUMBER = '0779520831';

function parsePendingStorage(): EcoCashPendingPayment | null {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    if (raw === 'pending') {
      return {
        status: 'pending',
        ecocashNumber: '0770000000',
        transactionId: 'PENDING-TX',
        txId: 'PENDING-TX',
        amount: '5',
        submittedAt: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        status: parsed.status || 'pending',
        ecocashNumber: parsed.ecocashNumber || '',
        transactionId: parsed.transactionId || parsed.txId || '',
        txId: parsed.txId || parsed.transactionId || '',
        amount: String(parsed.amount || '5'),
        submittedAt: parsed.submittedAt || new Date().toISOString(),
        approvedAt: parsed.approvedAt,
        expiryDays: parsed.expiryDays,
        expiresAt: parsed.expiresAt,
      };
    }
  } catch (e) {
    console.error('Failed to parse pharmalert_pending:', e);
  }
  return null;
}

function detectAdminBelam(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === 'belam') return true;
  if (window.location.href.includes('admin=belam')) return true;
  return false;
}

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
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(() => {
    try {
      if (detectAdminBelam()) return false;
      if (localStorage.getItem(IS_PRO_STORAGE_KEY) === 'true') return false;
      const savedSub = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (savedSub) {
        const parsed: SubscriptionState = JSON.parse(savedSub);
        const notExpired = !parsed.expiresAt || new Date(parsed.expiresAt).getTime() >= Date.now();
        if ((parsed.status === 'active' || parsed.status === 'trial_active') && notExpired) {
          return false;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return true;
  });

  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      return localStorage.getItem(IS_PRO_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [pendingPayment, setPendingPayment] = useState<EcoCashPendingPayment | null>(() =>
    parsePendingStorage()
  );

  const [isAdminBelam, setIsAdminBelam] = useState<boolean>(() => detectAdminBelam());
  const [adminExpiryChoice, setAdminExpiryChoice] = useState<30 | 365>(() => {
    const initialPending = parsePendingStorage();
    if (initialPending?.amount && initialPending.amount.replace(/^\$/, '').trim() === '70') {
      return 365;
    }
    return 30;
  });

  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const proFlag = localStorage.getItem(IS_PRO_STORAGE_KEY) === 'true';
      const savedExpiry = localStorage.getItem(EXPIRY_STORAGE_KEY);
      const savedSub = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (proFlag) {
        const expDate = savedExpiry
          ? savedExpiry.split('T')[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          status: 'active',
          planId: 'monthly_5',
          startedAt: new Date().toISOString().split('T')[0],
          expiresAt: expDate,
          trialUsed: true,
          paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
        };
      }
      if (savedSub) {
        const parsed: SubscriptionState = JSON.parse(savedSub);
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
          return {
            ...parsed,
            status: parsed.planId === 'free_trial' ? 'trial_expired' : 'unsubscribed',
            paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
          };
        }
        return {
          ...parsed,
          paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
        };
      }
    } catch (e) {
      console.error('Failed to load subscription:', e);
    }
    return {
      status: 'unsubscribed',
      trialUsed: false,
      paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
    };
  });

  useEffect(() => {
    const onUrlChange = () => {
      setIsAdminBelam(detectAdminBelam());
    };
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
    return () => {
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('hashchange', onUrlChange);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [medicines]);

  useEffect(() => {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
    } catch (e) {
      console.error('Failed to save subscription to local storage:', e);
    }
  }, [subscription]);

  const handleStartFreeTrial = () => {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setSubscription({
      status: 'trial_active',
      planId: 'free_trial',
      startedAt: now.toISOString().split('T')[0],
      expiresAt: expires.toISOString().split('T')[0],
      trialUsed: true,
      paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
    });
    setIsSubscriptionModalOpen(false);
  };

  const handleVerifyEcoCash = (
    ecocashNumber: string,
    transactionId: string,
    amount: string
  ) => {
    const record: EcoCashPendingPayment = {
      status: 'pending',
      ecocashNumber,
      transactionId,
      txId: transactionId,
      amount,
      submittedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(record));
    } catch (e) {
      console.error('Failed to save pharmalert_pending:', e);
    }
    setPendingPayment(record);
    const cleanAmt = amount.replace(/^\$/, '').trim();
    setAdminExpiryChoice(cleanAmt === '70' ? 365 : 30);
  };

  const handleApprovePending = (overrideDays?: 30 | 365) => {
    const cleanAmt = pendingPayment?.amount?.replace(/^\$/, '').trim();
    const days: 30 | 365 =
      overrideDays || (cleanAmt === '70' ? 365 : adminExpiryChoice || 30);
    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const expiresIso = expires.toISOString();
    const expiresShort = expiresIso.split('T')[0];

    try {
      localStorage.setItem(IS_PRO_STORAGE_KEY, 'true');
      localStorage.setItem(EXPIRY_STORAGE_KEY, expiresIso);
      localStorage.setItem('pharmalert_expiryDays', String(days));

      const updatedPending: EcoCashPendingPayment = {
        status: 'approved',
        ecocashNumber: pendingPayment?.ecocashNumber || '0779520831',
        transactionId: pendingPayment?.transactionId || 'APPROVED-BY-BELAM',
        txId: pendingPayment?.txId || pendingPayment?.transactionId || 'APPROVED-BY-BELAM',
        amount: pendingPayment?.amount || (days === 365 ? '70' : '5'),
        submittedAt: pendingPayment?.submittedAt || now.toISOString(),
        approvedAt: now.toISOString(),
        expiryDays: days,
        expiresAt: expiresShort,
      };
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(updatedPending));
      setPendingPayment(updatedPending);
    } catch (e) {
      console.error('Failed to approve subscription in localStorage:', e);
    }

    setIsPro(true);
    setSubscription({
      status: 'active',
      planId: days === 365 ? 'yearly_70' : 'monthly_5',
      startedAt: now.toISOString().split('T')[0],
      expiresAt: expiresShort,
      trialUsed: true,
      paymentPhoneNumber: PAYMENT_PHONE_NUMBER,
      lastTransactionRef: pendingPayment?.transactionId || 'ECOCASH-PRO',
      payerPhone: pendingPayment?.ecocashNumber || '',
      amountPaid: days === 365 ? 70 : 5,
    });
    setIsSubscriptionModalOpen(false);
  };

  const handleOpenAdminBelam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('admin', 'belam');
      window.history.pushState({}, '', url.toString());
    } catch {
      // Fallback if history pushState is restricted
    }
    setIsAdminBelam(true);
    setIsSubscriptionModalOpen(false);
  };

  const handleExitAdminBelam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore
    }
    setIsAdminBelam(false);
  };

  const handleSimulateLockWall = (mode: 'unsubscribed' | 'trial_expired') => {
    try {
      localStorage.removeItem(IS_PRO_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setIsPro(false);
    setSubscription((prev) => ({
      ...prev,
      status: mode,
    }));
    setIsSubscriptionModalOpen(true);
  };

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
    setMedicines((prev) => prev.filter((m) => m.id !== id));
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
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors">
      
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
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        subscription={subscription}
        isPro={isPro}
        criticalCount={auditMetrics.criticalCount}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ADMIN VIEW (?admin=belam) */}
        {isAdminBelam && (
          <div className="mb-6 p-6 rounded-2xl bg-slate-900 border-2 border-teal-500/80 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Portal (?admin=belam)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  EcoCash Pending Payment Verification
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review <code className="font-mono text-amber-300">pharmalert_pending</code> submissions for EcoCash <strong className="font-mono text-white">{PAYMENT_PHONE_NUMBER}</strong> and click <strong className="text-teal-400">Approve</strong> to set <code className="font-mono text-emerald-300">pharmalert_isPro=true</code> with 30 or 365 days expiry.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                  pharmalert_isPro: <strong className={isPro ? 'text-emerald-400' : 'text-amber-400'}>{String(isPro)}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleExitAdminBelam}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  Exit Admin
                </button>
              </div>
            </div>

            {/* Pending Payment Card */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      pendingPayment?.status === 'approved'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {pendingPayment ? pendingPayment.status : 'pending (no submission yet)'}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">
                    Storage Key: <code className="text-teal-300">pharmalert_pending</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Your EcoCash Number</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {pendingPayment?.ecocashNumber || '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Transaction ID (TxID)</span>
                    <span className="font-mono text-sm font-bold text-amber-300">
                      {pendingPayment?.transactionId || '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Amount</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {pendingPayment?.amount ? `$${pendingPayment.amount.replace(/^\$/, '')}` : '$5 / $70'}
                    </span>
                  </div>
                </div>

                {isPro && subscription.expiresAt && (
                  <p className="text-xs font-mono text-emerald-400 pt-1">
                    Approved! pharmalert_isPro=true · Expiry set to {subscription.expiresAt} ({pendingPayment?.expiryDays || adminExpiryChoice} days)
                  </p>
                )}
              </div>

              {/* Expiry Selector (30 or 365 days) & Approve Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdminExpiryChoice(30)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      adminExpiryChoice === 30
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    30 Days ($5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminExpiryChoice(365)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      adminExpiryChoice === 365
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    365 Days ($70)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleApprovePending(adminExpiryChoice)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription & EcoCash Status Strip */}
        <div
          className={`mb-5 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isPro || subscription.status === 'active'
              ? 'bg-emerald-950/30 border-emerald-800/70'
              : pendingPayment?.status === 'pending'
              ? 'bg-amber-950/40 border-amber-700/80'
              : subscription.status === 'trial_active'
              ? 'bg-amber-950/30 border-amber-800/70'
              : 'bg-red-950/40 border-red-800'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <CreditCard className="w-4 h-4 text-teal-400 shrink-0" />
            {isPro || subscription.status === 'active' ? (
              <span className="font-semibold text-white">
                PharmAlert Pro Active:{' '}
                <strong className="font-mono text-emerald-400">
                  {subscription.planId === 'yearly_70' ? '365-Day Yearly Plan ($70/yr)' : '30-Day Monthly Plan ($5/mo)'}
                </strong>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-slate-300 font-mono">
                  EcoCash {PAYMENT_PHONE_NUMBER} (Expires {subscription.expiresAt})
                </span>
              </span>
            ) : pendingPayment?.status === 'pending' ? (
              <span className="font-semibold text-amber-200">
                EcoCash Payment Pending Verification:{' '}
                <strong className="font-mono text-white">TxID {pendingPayment.transactionId}</strong>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="font-mono text-amber-300">
                  Amount: ${pendingPayment.amount.replace(/^\$/, '')} sent to {PAYMENT_PHONE_NUMBER}
                </span>
              </span>
            ) : subscription.status === 'trial_active' ? (
              <span className="font-semibold text-white">
                <strong className="text-amber-300">1-Month Free Trial Active</strong>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-slate-300">
                  Send <strong className="font-mono">$5 monthly</strong> or <strong className="font-mono">$70 yearly</strong> to{' '}
                  <strong className="font-mono text-amber-200 underline">
                    EcoCash {PAYMENT_PHONE_NUMBER}
                  </strong>
                </span>
              </span>
            ) : (
              <span className="font-semibold text-red-200">
                Pay EcoCash <strong className="font-mono">{PAYMENT_PHONE_NUMBER}</strong>: Send <strong className="font-mono">$5 monthly</strong> or <strong className="font-mono">$70 yearly</strong> or activate <strong className="underline">1-Month Free Trial</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Subscribe</span>
            </button>

            {isAdminBelam && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAdminBelam}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium text-teal-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Open Admin View (?admin=belam)"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>?admin=belam</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateLockWall('unsubscribed')}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-300 bg-slate-900 border border-red-800/80 hover:bg-red-950/50 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Trigger the unsubscribed EcoCash modal"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Paywall</span>
                </button>
              </>
            )}
          </div>
        </div>
        
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

      {/* EcoCash Subscription & 1-Month Free Trial Modal */}
      <SubscriptionWallModal
        isOpen={isSubscriptionModalOpen}
        subscription={subscription}
        isPro={isPro}
        isAdminBelam={isAdminBelam}
        pendingPayment={pendingPayment}
        onStartFreeTrial={handleStartFreeTrial}
        onVerifyEcoCash={handleVerifyEcoCash}
        onOpenAdminView={handleOpenAdminBelam}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
        }}
      />

    </div>
  );
}
