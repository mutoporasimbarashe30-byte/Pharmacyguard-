import React, { useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  Send, 
  Copy, 
  Check, 
  AlertCircle, 
  RotateCw, 
  BookOpen, 
  ShieldCheck, 
  Pill,
  Clock
} from 'lucide-react';
import { Medicine } from '../types/pharmacy';
import { analyzeExpiry } from '../utils/expiryUtils';

interface AiThinkingPharmacistProps {
  medicines: Medicine[];
}

export const AiThinkingPharmacist: React.FC<AiThinkingPharmacistProps> = ({ medicines }) => {
  const [promptInput, setPromptInput] = useState('');
  const [queryType, setQueryType] = useState<string>('EXPIRY_MITIGATION_AUDIT');
  const [loading, setLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract snapshot of expiring medicines (<90 days)
  const expiringMeds = medicines
    .filter((m) => m.status === 'in_stock')
    .map((m) => {
      const analysis = analyzeExpiry(m.expiryDate);
      return {
        brandName: m.brandName,
        genericName: m.genericName,
        batchNumber: m.batchNumber,
        category: m.category,
        quantity: `${m.quantity} ${m.unit}`,
        expiryDate: m.expiryDate,
        daysRemaining: analysis.daysRemaining,
        tier: analysis.tier,
        costPrice: `$${m.costPrice}`,
        sellingPrice: `$${m.sellingPrice}`,
        supplier: m.supplier,
        storageCondition: m.storageCondition,
      };
    })
    .filter((m) => m.daysRemaining <= 90);

  const presetQueries = [
    {
      id: 'EXPIRY_MITIGATION_AUDIT',
      title: 'Full Expiry Triage Audit',
      icon: Clock,
      desc: 'Formulates a multi-tier triage plan for items in the 90, 60, and <30 day red windows.',
      defaultPrompt: 'Perform a comprehensive clinical and financial inventory triage on our expiring batches. Recommend exact prioritized actions: which items to return immediately to distributors before credit deadlines, which to dispense via FEFO, and which to apply promotional clearance to.',
    },
    {
      id: 'DISPOSAL_COMPLIANCE_PROTOCOL',
      title: 'Biohazard & Disposal Protocol',
      icon: ShieldCheck,
      desc: 'Generates compliant pharmaceutical destruction pathways per WHO and FDA rules.',
      defaultPrompt: 'Outline standard operating procedures and chemical inactivation protocols for safely destroying expired antibiotics, biologicals, and cytotoxic inventory without environmental contamination.',
    },
    {
      id: 'SUBSTITUTE_ADVISOR',
      title: 'Therapeutic Substitution Advisor',
      icon: Pill,
      desc: 'Suggests clinically equivalent alternatives when near-expiry stock must be substituted.',
      defaultPrompt: 'Review our expiring antibiotics and cardio drugs. For patients requiring these therapies, list bioequivalent and safe therapeutic alternatives we should stock or substitute if these batches expire.',
    },
    {
      id: 'STABILITY_TEMPERATURE_ANALYSIS',
      title: 'Stability & Cold-Chain Assessment',
      icon: BookOpen,
      desc: 'Evaluates degradation kinetics and stability if storage parameters drift.',
      defaultPrompt: 'Analyze the chemical stability and safety margins of biologicals (e.g. Insulin Glargine) and oral suspensions if subjected to temporary room temperature excursions.',
    },
  ];

  const handleSelectPreset = (preset: typeof presetQueries[0]) => {
    setQueryType(preset.id);
    setPromptInput(preset.defaultPrompt);
  };

  const handleRunThinkingAnalysis = async (customPrompt?: string) => {
    const textToSend = customPrompt || promptInput;
    if (!textToSend.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResponseOutput(null);

    try {
      const res = await fetch('/api/ai/pharmacist-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          queryType,
          inventoryContext: {
            currentDate: new Date().toISOString().split('T')[0],
            totalExpiringBatchesUnder90Days: expiringMeds.length,
            batches: expiringMeds,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error during clinical reasoning');
      }

      setResponseOutput(data.analysis);
    } catch (err: any) {
      console.error('AI error:', err);
      setErrorMsg(err.message || 'Failed to connect to clinical intelligence engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (responseOutput) {
      navigator.clipboard.writeText(responseOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Thinking Mode · ThinkingLevel.HIGH</span>
            </span>
            <span className="text-xs text-teal-200/80 font-mono">
              Model: gemini-3.1-pro-preview
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            AI Clinical Pharmacist &amp; Expiry Reasoning Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Harnesses deep clinical pharmacology and pharmaceutical inventory strategy to evaluate near-expiry stock,
            prevent catastrophic drug expiration, ensure compliance with pharmaceutical disposal standards, and preserve revenue.
          </p>
        </div>
      </div>

      {/* Preset Action Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Specialized Clinical Reasoning Tasks
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presetQueries.map((preset) => {
            const Icon = preset.icon;
            const isSelected = queryType === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-900 shadow-xs'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-2.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {preset.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {preset.desc}
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                  <span>Select Template</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
          <span>Clinical Reasoning Prompt (Auto-injected with live expiring inventory context)</span>
          <span className="text-[11px] font-normal text-slate-400">
            {expiringMeds.length} near-expiry batches attached
          </span>
        </label>

        <textarea
          rows={3}
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Ask a clinical question or request specific inventory triage..."
          className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />

        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>High Thinking Mode active (gemini-3.1-pro-preview)</span>
          </div>

          <button
            onClick={() => handleRunThinkingAnalysis()}
            disabled={loading || !promptInput.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deep Clinical Reasoning in Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Clinical Intelligence</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 dark:text-red-200">
            <strong className="font-semibold block text-sm">Reasoning Engine Error</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Output Response Section */}
      {responseOutput && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Clinical Pharmacist Reasoning &amp; Strategy Report
                </h4>
                <p className="text-[11px] text-slate-500">
                  Formulated via gemini-3.1-pro-preview (ThinkingLevel.HIGH)
                </p>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>
          </div>

          <div className="prose dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {responseOutput}
          </div>
        </div>
      )}

    </div>
  );
};
