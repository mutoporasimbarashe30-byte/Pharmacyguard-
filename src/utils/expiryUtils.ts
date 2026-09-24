import { ExpiryTier, ExpiryAnalysis, Medicine, StockAuditMetric } from '../types/pharmacy';

// Reference date for the pharmacy system
export function getSystemToday(): Date {
  const now = new Date();
  // Ensure time component is set to midnight for clean day calculations
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Calculates days remaining until expiration date
 */
export function calculateDaysRemaining(expiryDateStr: string, referenceDate: Date = getSystemToday()): number {
  if (!expiryDateStr) return 0;
  const [year, month, day] = expiryDateStr.split('-').map(Number);
  const expiryDate = new Date(year, month - 1, day);
  
  const diffTime = expiryDate.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Classifies medicine into expiry alert tiers based on prompt requirements:
 * - < 0 days: Expired
 * - <= 30 days: Critical Alert (Red)
 * - 31 - 60 days: Urgent Warning (Amber / Orange)
 * - 61 - 90 days: Early Watchlist (Yellow / Gold)
 * - > 90 days: Stable (Green)
 */
export function analyzeExpiry(expiryDateStr: string, referenceDate: Date = getSystemToday()): ExpiryAnalysis {
  const daysRemaining = calculateDaysRemaining(expiryDateStr, referenceDate);

  if (daysRemaining < 0) {
    const daysAgo = Math.abs(daysRemaining);
    return {
      daysRemaining,
      tier: 'expired',
      label: `Expired (${daysAgo}d ago)`,
      colorName: 'rose',
      urgencyDescription: 'EXPIRED PRODUCT: Immediate removal from dispensary required to comply with pharmaceutical laws.',
      recommendedAction: 'Quarantine immediately & log for authorized biohazard destruction.',
    };
  }

  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      tier: 'critical',
      label: daysRemaining === 0 ? 'Expires Today!' : `${daysRemaining} days left (<30d)`,
      colorName: 'red',
      urgencyDescription: 'CRITICAL EXPIRY ALERT: High financial & compliance risk.',
      recommendedAction: 'Place at front of dispensary shelf (FEFO), notify prescribers, or apply emergency 40% clearance.',
    };
  }

  if (daysRemaining <= 60) {
    return {
      daysRemaining,
      tier: 'warning',
      label: `${daysRemaining} days left (30-60d)`,
      colorName: 'amber',
      urgencyDescription: 'URGENT EXPIRY REMINDER: Entering final 2-month dispensing window.',
      recommendedAction: 'Prioritize dispensing first (FEFO) and verify distributor credit return policy cutoff.',
    };
  }

  if (daysRemaining <= 90) {
    return {
      daysRemaining,
      tier: 'watchlist',
      label: `${daysRemaining} days left (60-90d)`,
      colorName: 'yellow',
      urgencyDescription: 'EARLY 90-DAY WATCHLIST: Advance notice to adjust reorders.',
      recommendedAction: 'Halt new incoming purchase orders for this SKU; prepare supplier return paperwork if velocity is slow.',
    };
  }

  return {
    daysRemaining,
    tier: 'stable',
    label: `${daysRemaining} days left (>90d)`,
    colorName: 'emerald',
    urgencyDescription: 'STABLE SHELF LIFE: Stock within healthy operational parameters.',
    recommendedAction: 'Routine standard storage and monitoring.',
  };
}

/**
 * Returns distinct visual styling badges according to strict color specifications
 */
export function getTierBadgeStyle(tier: ExpiryTier) {
  switch (tier) {
    case 'expired':
      return {
        badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
        badgeBorder: 'border-rose-300 dark:border-rose-800',
        badgeText: 'text-rose-800 dark:text-rose-200',
        dotBg: 'bg-rose-600',
        barColor: 'bg-rose-600',
        cardBorder: 'border-l-4 border-l-rose-600',
        highlightBg: 'bg-rose-50/50 dark:bg-rose-950/20',
      };
    case 'critical': // Under 30 days - RED
      return {
        badgeBg: 'bg-red-100 dark:bg-red-950/60',
        badgeBorder: 'border-red-300 dark:border-red-800',
        badgeText: 'text-red-700 dark:text-red-200',
        dotBg: 'bg-red-600',
        barColor: 'bg-red-600',
        cardBorder: 'border-l-4 border-l-red-600',
        highlightBg: 'bg-red-50/50 dark:bg-red-950/20',
      };
    case 'warning': // 30 - 60 days - AMBER
      return {
        badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
        badgeBorder: 'border-amber-300 dark:border-amber-800',
        badgeText: 'text-amber-800 dark:text-amber-200',
        dotBg: 'bg-amber-500',
        barColor: 'bg-amber-500',
        cardBorder: 'border-l-4 border-l-amber-500',
        highlightBg: 'bg-amber-50/30 dark:bg-amber-950/20',
      };
    case 'watchlist': // 61 - 90 days - YELLOW
      return {
        badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60',
        badgeBorder: 'border-yellow-300 dark:border-yellow-800',
        badgeText: 'text-yellow-800 dark:text-yellow-200',
        dotBg: 'bg-yellow-500',
        barColor: 'bg-yellow-500',
        cardBorder: 'border-l-4 border-l-yellow-500',
        highlightBg: 'bg-yellow-50/30 dark:bg-yellow-950/20',
      };
    case 'stable': // > 90 days - GREEN
    default:
      return {
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        badgeBorder: 'border-emerald-300 dark:border-emerald-800',
        badgeText: 'text-emerald-800 dark:text-emerald-200',
        dotBg: 'bg-emerald-500',
        barColor: 'bg-emerald-500',
        cardBorder: 'border-l-4 border-l-emerald-500',
        highlightBg: 'bg-emerald-50/20 dark:bg-emerald-950/10',
      };
  }
}

/**
 * Computes comprehensive pharmacy stock audit metrics
 */
export function calculateAuditMetrics(medicines: Medicine[], refDate: Date = getSystemToday()): StockAuditMetric {
  const activeMeds = medicines.filter((m) => m.status === 'in_stock');

  const metric: StockAuditMetric = {
    totalItems: activeMeds.length,
    totalQuantity: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    expiredCount: 0,
    expiredValue: 0,
    criticalCount: 0,
    criticalValue: 0,
    warningCount: 0,
    warningValue: 0,
    watchlistCount: 0,
    watchlistValue: 0,
    stableCount: 0,
    stableValue: 0,
  };

  for (const med of activeMeds) {
    const value = med.quantity * med.sellingPrice;
    metric.totalQuantity += med.quantity;
    metric.totalInventoryValue += value;

    const threshold = typeof med.alertThreshold === 'number' ? med.alertThreshold : 20;
    if (med.quantity <= threshold) {
      metric.lowStockCount += 1;
    }

    const analysis = analyzeExpiry(med.expiryDate, refDate);

    switch (analysis.tier) {
      case 'expired':
        metric.expiredCount += 1;
        metric.expiredValue += value;
        break;
      case 'critical':
        metric.criticalCount += 1;
        metric.criticalValue += value;
        break;
      case 'warning':
        metric.warningCount += 1;
        metric.warningValue += value;
        break;
      case 'watchlist':
        metric.watchlistCount += 1;
        metric.watchlistValue += value;
        break;
      case 'stable':
        metric.stableCount += 1;
        metric.stableValue += value;
        break;
    }
  }

  return metric;
}

/**
 * Currency formatter
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Export medicines to CSV string
 */
export function exportToCSV(medicines: Medicine[]): string {
  const headers = [
    'Brand Name',
    'Generic Formula',
    'Dosage Form',
    'Strength',
    'Category',
    'Batch No',
    'Expiry Date',
    'Days Left',
    'Alert Tier',
    'Quantity',
    'Unit',
    'Cost Price ($)',
    'Selling Price ($)',
    'Total Value ($)',
    'Shelf Location',
    'Supplier',
    'Status',
  ];

  const rows = medicines.map((m) => {
    const analysis = analyzeExpiry(m.expiryDate);
    const totalVal = (m.quantity * m.sellingPrice).toFixed(2);
    return [
      `"${m.brandName}"`,
      `"${m.genericName}"`,
      `"${m.dosageForm}"`,
      `"${m.strength}"`,
      `"${m.category}"`,
      `"${m.batchNumber}"`,
      `"${m.expiryDate}"`,
      analysis.daysRemaining,
      `"${analysis.tier.toUpperCase()}"`,
      m.quantity,
      `"${m.unit}"`,
      m.costPrice.toFixed(2),
      m.sellingPrice.toFixed(2),
      totalVal,
      `"${m.shelfLocation}"`,
      `"${m.supplier}"`,
      `"${m.status}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
