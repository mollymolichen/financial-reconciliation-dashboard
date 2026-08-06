/* Status lifecycle used throughout matching, triage, and completion flows. */
export type ReconciliationStatus = 'Pending' | 'Matched' | 'Exception' | 'Completed' | 'Overpayment' | 'Underpayment';

/* Core table row model shown in queue, dialogs, and toasts. */
export type ReconciliationItem = {
  id: number;
  paymentId: string;
  bankId: string;
  payerName: string;
  amount: number;
  paymentDate: string;
  postedDate: string;
  status: ReconciliationStatus;
  confidence: number;
  notes: string;
};

/* Payments CSV record after header normalization and field mapping. */
export type PaymentCsvRow = {
  paymentId?: string;
  paymentDate?: string;
  amount?: string;
  paymentMethod?: string;
  expectedDescriptor?: string;
  payerName?: string;
};

/* Bank statement CSV record after normalization and field mapping. */
export type BankCsvRow = {
  bankId?: string;
  postedDate?: string;
  amount?: string;
  sourceType?: string;
  description?: string;
};

/* UI filter keys for dashboard tiles and filtered table views. */
export type FilterKey = 'open' | 'completed' | 'exception' | 'overpayment' | 'underpayment';

/* Table sort definitions shared by queue and header controls. */
export type SortKey = 'paymentId' | 'bankId' | 'payerName' | 'amount' | 'paymentDate' | 'postedDate' | 'confidence';

export type SortDirection = 'asc' | 'desc';

/* Toast variants map to style and icon states in the feedback component. */
export type ToastVariant = 'success' | 'overpayment' | 'underpayment';

/* Aggregate counts rendered in the summary tile strip. */
export type DashboardSummary = {
  open: number;
  completed: number;
  exceptions: number;
  overpayments: number;
  underpayments: number;
};

/* Toast payload used to render transient notifications with variant styling. */
export type ToastState = {
  key: number;
  message: string;
  variant: ToastVariant;
};
