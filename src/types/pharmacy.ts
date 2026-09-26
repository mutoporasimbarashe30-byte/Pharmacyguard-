export type ExpiryTier = 'expired' | 'critical' | 'warning' | 'watchlist' | 'stable';

export type DosageForm =
  | 'Tablets'
  | 'Capsules'
  | 'Syrup'
  | 'Injection / Vial'
  | 'Inhaler'
  | 'Suspension'
  | 'Ointment / Cream'
  | 'Eye / Ear Drops'
  | 'Suppository';

export type StorageCondition =
  | 'Room Temperature (15-25°C)'
  | 'Cold Chain Refrigerator (2-8°C)'
  | 'Cool & Dry (Protect from Moisture)'
  | 'Protect from Light'
  | 'Controlled Substance Vault';

export type DrugCategory =
  | 'Antibiotics & Anti-infectives'
  | 'Cardiovascular & Antihypertensives'
  | 'Analgesics & Anti-inflammatory'
  | 'Antidiabetic & Endocrinology'
  | 'Respiratory & Antiasthmatic'
  | 'Gastrointestinal'
  | 'Psychotropic & Neurological'
  | 'Pediatric Formulas'
  | 'Dermatological'
  | 'Vitamins & Supplements';

export type MedicineStatus = 'in_stock' | 'quarantined' | 'returned_to_supplier' | 'dispensed_out';

export interface Medicine {
  id: string;
  brandName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string; // e.g., "500 mg", "100 mcg", "10 mg/5ml"
  category: DrugCategory;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  unit: string; // e.g. "boxes", "bottles", "blister packs", "vials"
  costPrice: number; // Unit purchase cost
  sellingPrice: number; // Unit selling price
  shelfLocation: string; // e.g. "Shelf A-3", "Fridge 1 - Top Shelf"
  supplier: string; // Supplier name
  storageCondition: StorageCondition;
  alertThreshold: number; // Specific reorder point / low-stock alert threshold
  barcode?: string;
  notes?: string;
  status: MedicineStatus;
  discountPercent?: number; // e.g. 30 for 30% markdown
  createdAt: string;
  updatedAt: string;
}

export interface ExpiryAnalysis {
  daysRemaining: number;
  tier: ExpiryTier;
  label: string;
  colorName: 'red' | 'amber' | 'yellow' | 'emerald' | 'rose';
  urgencyDescription: string;
  recommendedAction: string;
}

export interface StockAuditMetric {
  totalItems: number;
  totalQuantity: number;
  totalInventoryValue: number;
  lowStockCount: number; // Items where quantity <= alertThreshold
  expiredCount: number;
  expiredValue: number;
  criticalCount: number; // < 30 days (RED)
  criticalValue: number;
  warningCount: number; // 30 - 60 days (AMBER)
  warningValue: number;
  watchlistCount: number; // 61 - 90 days (YELLOW)
  watchlistValue: number;
  stableCount: number; // > 90 days (GREEN)
  stableValue: number;
}

export interface ReminderNotification {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  tier: ExpiryTier;
  dateTriggered: string;
  read: boolean;
  message: string;
}

export interface QuarantineRecord {
  id: string;
  medicineId: string;
  brandName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  quarantinedAt: string;
  reason: 'Expired on Shelf' | 'Cold Chain Breach' | 'Damaged Packaging' | 'Supplier Recall';
  disposalMethod?: 'High Temperature Incineration' | 'Chemical Inactivation' | 'Return to Supplier' | 'Licensed Waste Contractor';
  disposalDate?: string;
  witnessPharmacist: string;
  notes?: string;
}

export type SubscriptionPlanId = 'free_trial' | 'monthly_5' | 'yearly_70';
export type SubscriptionStatus = 'unsubscribed' | 'trial_active' | 'trial_expired' | 'active';

export interface EcoCashPendingPayment {
  status: 'pending' | 'approved';
  ecocashNumber: string;
  transactionId: string;
  txId: string;
  amount: string;
  submittedAt: string;
  approvedAt?: string;
  expiryDays?: 30 | 365;
  expiresAt?: string;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  planId?: SubscriptionPlanId;
  startedAt?: string;
  expiresAt?: string;
  trialUsed: boolean;
  paymentPhoneNumber: string;
  lastTransactionRef?: string;
  payerPhone?: string;
  amountPaid?: number;
}

