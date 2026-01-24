/**
 * Daily closing types — aligned with backend (Prisma + controller) and API responses.
 */

export type PaymentMethodKey =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'JAZZCASH'
  | 'EASYPAISA'
  | 'NAYA_PAY'
  | 'SADAPAY';

export interface PaymentMethodItem {
  method: PaymentMethodKey | string;
  amount: number;
  ordersCount: number;
}

export interface RiderCollection {
  riderId?: string;
  riderName: string;
  amount: number;
  ordersCount: number;
  paymentMethods?: PaymentMethodItem[];
}

/** GET /daily-closings/summary — today's preview (before closing) */
export interface DailyClosingSummary {
  date: string;
  customerPayable: number;
  customerReceivable: number;
  totalPaidAmount: number;
  totalCurrentOrderAmount: number;
  walkInAmount: number;
  clearBillAmount: number;
  enrouteAmount: number;
  balanceClearedToday: number;
  totalBottles: number;
  totalOrders: number;
  riderCollections: RiderCollection[];
  paymentMethods: PaymentMethodItem[];
  canClose: boolean;
  inProgressOrdersCount: number;
  alreadyExists: boolean;
}

/** GET /daily-closings — list item (stored closing) */
export interface DailyClosing {
  id: string;
  date: string;
  customerPayable: number;
  customerReceivable: number;
  totalPaidAmount: number;
  totalCurrentOrderAmount: number;
  walkInAmount: number;
  clearBillAmount: number;
  enrouteAmount: number;
  balanceClearedToday: number;
  totalBottles: number;
  totalOrders: number;
  riderCollections: RiderCollection[];
  paymentMethods: PaymentMethodItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyClosingSummaryResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: DailyClosingSummary;
}

export interface DailyClosingListResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: DailyClosing[];
}

export interface DailyClosingSaveResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: DailyClosing;
}
