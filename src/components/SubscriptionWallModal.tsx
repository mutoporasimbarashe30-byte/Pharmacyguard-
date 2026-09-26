import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  PhoneCall,
  X,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { EcoCashPendingPayment, SubscriptionState } from '../types/pharmacy';

interface SubscriptionWallModalProps {
  isOpen: boolean;
  subscription: SubscriptionState;
  isPro: boolean;
  isAdminBelam?: boolean;
  pendingPayment: EcoCashPendingPayment | null;
  onStartFreeTrial: () => void;
  onVerifyEcoCash: (ecocashNumber: string, transactionId: string, amount: string) => void;
  onOpenAdminView: () => void;
  onClose?: () => void;
}

const PAYMENT_NUMBER = '0779520831';
const WHATSAPP_NUMBER = '263779520831';

export const SubscriptionWallModal: React.FC<SubscriptionWallModalProps> = ({
  isOpen,
  subscription,
  isPro,
  isAdminBelam = false,
  pendingPayment,
  onStartFreeTrial,
  onVerifyEcoCash,
  onOpenAdminView,
  onClose,
}) => {
  const [ecocashNumber, setEcocashNumber] = useState(
    pendingPayment?.ecocashNumber || subscription.payerPhone || ''
  );
  const [transactionId, setTransactionId] = useState(
    pendingPayment?.transactionId || subscription.lastTransactionRef || ''
  );
  const [amount, setAmount] = useState(
    pendingPayment?.amount || (subscription.planId === 'yearly_70' ? '70' : '5')
  );
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [verifiedWhatsappUrl, setVerifiedWhatsappUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLockedWall =
    !isPro && (subscription.status === 'unsubscribed' || subscription.status === 'trial_expired');

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(PAYMENT_NUMBER).catch(() => {});
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = ecocashNumber.trim() || '0770000000';
    const cleanTxId =
      transactionId.trim() ||
      `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cleanAmount = amount.trim() || '5';

    // Save to localStorage pharmalert_pending as pending
    const pendingPayload: EcoCashPendingPayment = {
      status: 'pending',
      ecocashNumber: cleanPhone,
      transactionId: cleanTxId,
      txId: cleanTxId,
      amount: cleanAmount,
      submittedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('pharmalert_pending', JSON.stringify(pendingPayload));
    } catch (err) {
      console.error('Failed to save pharmalert_pending:', err);
    }

    onVerifyEcoCash(cleanPhone, cleanTxId, cleanAmount);

    // Construct WhatsApp wa.me/263779520831 URL with TxID
    const waText = `EcoCash Payment Verification (PharmAlert)\nTxID: ${cleanTxId}\nEcoCash Number: ${cleanPhone}\nAmount: $${cleanAmount.replace(/^\$/, '')}`;
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;
    setVerifiedWhatsappUrl(waUrl);

    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback link is rendered below for iframe environments
    }
  };

  const getDaysRemaining = () => {
    if (!subscription.expiresAt) return 30;
    const now = new Date();
    const exp = new Date(subscription.expiresAt);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ecocash-modal-title"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Top Status Header Bar */}
        <div
          className={`px-6 py-3 flex items-center justify-between gap-2 border-b ${
            isPro
              ? 'bg-emerald-900/80 text-emerald-100 border-emerald-800'
              : pendingPayment?.status === 'pending'
              ? 'bg-amber-900/80 text-amber-100 border-amber-800'
              : isLockedWall
              ? 'bg-red-900/80 text-red-100 border-red-800'
              : 'bg-teal-900/80 text-teal-100 border-teal-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {isPro ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PharmAlert Pro Active ({daysRemaining} Days Remaining)</span>
              </>
            ) : pendingPayment?.status === 'pending' ? (
              <>
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>EcoCash Verification Pending (TxID: {pendingPayment.transactionId})</span>
              </>
            ) : isLockedWall ? (
              <>
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>Subscription Required · Pay EcoCash {PAYMENT_NUMBER}</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>1-Month Free Trial Active ({daysRemaining} Days Remaining)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-slate-950/60 px-2.5 py-1 rounded text-slate-200 border border-slate-700/60">
              {PAYMENT_NUMBER}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* Modal Title & Instruction Text */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider font-mono">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>EcoCash Merchant / Agent Payment</span>
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors flex items-center gap-1.5 font-mono"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied {PAYMENT_NUMBER}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {PAYMENT_NUMBER}</span>
                  </>
                )}
              </button>
            </div>

            <h2
              id="ecocash-modal-title"
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono"
            >
              Pay EcoCash 0779520831
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              Send $5 monthly or $70 yearly to 0779520831 then enter code below
            </p>
          </div>

          {/* Quick Plan Selector Buttons ($5 Monthly / $70 Yearly) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAmount('5')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                amount.replace(/^\$/, '') === '5'
                  ? 'border-teal-500 bg-teal-950/40 text-white'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 font-mono">
                  Monthly Plan
                </span>
                <span className="text-lg font-bold font-mono text-white">$5</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">30 Days Pro License</p>
            </button>

            <button
              type="button"
              onClick={() => setAmount('70')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                amount.replace(/^\$/, '') === '70'
                  ? 'border-teal-500 bg-teal-950/40 text-white'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
                  Yearly Plan
                </span>
                <span className="text-lg font-bold font-mono text-white">$70</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">365 Days Pro License</p>
            </button>
          </div>

          {/* EcoCash Verification Form with 3 Inputs + Verify Button */}
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label
                htmlFor="ecocash-number-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Your EcoCash Number
              </label>
              <input
                id="ecocash-number-input"
                type="text"
                value={ecocashNumber}
                onChange={(e) => setEcocashNumber(e.target.value)}
                placeholder="Your EcoCash Number (e.g. 0771234567)"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="transaction-id-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Transaction ID
              </label>
              <input
                id="transaction-id-input"
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Transaction ID (e.g. MP260926.1420.A12345)"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="amount-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Amount
              </label>
              <input
                id="amount-input"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (5 or 70)"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Verify</span>
            </button>
          </form>

          {/* Pending Status / WhatsApp Link Confirmation */}
          {(verifiedWhatsappUrl || pendingPayment?.status === 'pending') && (
            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/80 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">
                    Saved to <code className="font-mono text-emerald-300">pharmalert_pending</code> as pending!
                  </p>
                  <p className="text-slate-300">
                    TxID: <strong className="font-mono text-white">{pendingPayment?.transactionId || transactionId}</strong> · EcoCash: <strong className="font-mono text-white">{pendingPayment?.ecocashNumber || ecocashNumber}</strong> · Amount: <strong className="font-mono text-white">${(pendingPayment?.amount || amount).replace(/^\$/, '')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={
                    verifiedWhatsappUrl ||
                    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `EcoCash Payment Verification (PharmAlert)\nTxID: ${pendingPayment?.transactionId || transactionId}\nEcoCash Number: ${pendingPayment?.ecocashNumber || ecocashNumber}\nAmount: $${(pendingPayment?.amount || amount).replace(/^\$/, '')}`
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Open WhatsApp (wa.me/263779520831)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {isAdminBelam && (
                  <button
                    type="button"
                    onClick={onOpenAdminView}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors font-mono"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Open ?admin=belam View</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1-Month Free Trial Option */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
              <span>New dispensary? Try 1-Month Free Trial (30 days full access)</span>
            </div>

            {subscription.status === 'trial_active' ? (
              <span className="text-xs font-mono font-semibold text-teal-400">
                Trial Active ({daysRemaining}d left)
              </span>
            ) : (
              <button
                type="button"
                onClick={onStartFreeTrial}
                className="px-3.5 py-2 text-xs font-semibold text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>Start 1-Month Free Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
