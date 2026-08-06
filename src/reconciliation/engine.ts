import {
  BankCsvRow,
  FilterKey,
  PaymentCsvRow,
  ReconciliationItem,
  ReconciliationStatus,
  SortDirection,
  SortKey,
} from './types';

/* Normalizes CSV headers so column lookup works across naming style variations. */
const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

/* Parses date-like strings and returns null for invalid or empty values. */
const parseDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/* Safely reads a CSV cell by normalized header name. */
const getCellValue = (values: string[], headers: string[], headerName: string) => {
  const headerIndex = headers.findIndex((header) => normalizeHeader(header) === headerName);
  return headerIndex >= 0 ? values[headerIndex]?.trim() : '';
};

/* Splits CSV text into headers and value rows for downstream mappers. */
const splitCsvRows = (text: string) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(','));
  return { headers, rows };
};

/* Maps raw payments CSV into a normalized payment row shape. */
export const parsePaymentsCsv = (text: string): PaymentCsvRow[] => {
  const { headers, rows } = splitCsvRows(text);
  return rows.map((values) => ({
    paymentId: getCellValue(values, headers, 'paymentid'),
    paymentDate: getCellValue(values, headers, 'paymentdate'),
    amount: getCellValue(values, headers, 'amount'),
    paymentMethod: getCellValue(values, headers, 'paymentmethod'),
    expectedDescriptor: getCellValue(values, headers, 'expectedbankdescriptor'),
    payerName: getCellValue(values, headers, 'payername'),
  }));
};

/* Maps bank statement CSV into normalized bank row records. */
export const parseBankCsv = (text: string): BankCsvRow[] => {
  const { headers, rows } = splitCsvRows(text);
  return rows.map((values) => ({
    bankId: getCellValue(values, headers, 'banktransactionid'),
    postedDate: getCellValue(values, headers, 'posteddate'),
    amount: getCellValue(values, headers, 'amount'),
    sourceType: getCellValue(values, headers, 'sourcetype'),
    description: getCellValue(values, headers, 'description'),
  }));
};

/* Buckets payment and source labels into comparable categories for scoring. */
const sourceCategory = (value: string): string => {
  const normalized = value.toLowerCase();
  if (normalized.includes('ach')) return 'ach';
  if (normalized.includes('card') || normalized.includes('credit')) return 'card';
  if (normalized.includes('lockbox') || normalized.includes('check')) return 'check';
  if (normalized.includes('insurance') || normalized.includes('eft')) return 'eft';
  if (normalized.includes('wire')) return 'wire';
  return 'other';
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_POSTING_DELAY_DAYS = 5;
const AMOUNT_TOLERANCE_RATIO = 0.05;

type MatchCandidate = {
  bank: BankCsvRow;
  confidence: number;
  isLikelyBatch: boolean;
};

/* Scores one payment against one bank row using amount, source, and posting delay signals. */
const scoreCandidate = (payment: PaymentCsvRow, bank: BankCsvRow): MatchCandidate | null => {
  const paymentDate = parseDate(payment.paymentDate || '');
  const postedDate = parseDate(bank.postedDate || '');
  if (!paymentDate || !postedDate) return null;

  const dayDiff = Math.round((postedDate.getTime() - paymentDate.getTime()) / MS_PER_DAY);
  if (dayDiff < 0 || dayDiff > MAX_POSTING_DELAY_DAYS) return null;

  const paymentAmount = Number(payment.amount || 0);
  const bankAmount = Number(bank.amount || 0);
  if (paymentAmount <= 0 || bankAmount <= 0) return null;

  const amountDiffRatio = Math.abs(bankAmount - paymentAmount) / paymentAmount;

  let amountScore: number;
  let isLikelyBatch = false;
  if (amountDiffRatio <= AMOUNT_TOLERANCE_RATIO) {
    amountScore = 1 - amountDiffRatio / AMOUNT_TOLERANCE_RATIO;
  } else if (bankAmount > paymentAmount) {
    isLikelyBatch = true;
    const sizeRatio = paymentAmount / bankAmount;
    amountScore = Math.max(0.15, Math.min(0.6, sizeRatio));
  } else {
    return null;
  }

  const sourceScore = sourceCategory(payment.paymentMethod || '') === sourceCategory(bank.sourceType || '') ? 1 : 0.3;
  const proximityScore = 1 - dayDiff / MAX_POSTING_DELAY_DAYS;

  const confidence = amountScore * 0.5 + sourceScore * 0.3 + proximityScore * 0.2;

  return { bank, confidence: Math.max(0, Math.min(1, confidence)), isLikelyBatch };
};

/* Produces reconciliation rows with best-match confidence and initial workflow status. */
export const createItemsFromCsv = (payments: PaymentCsvRow[], bankStatements: BankCsvRow[]): ReconciliationItem[] => {
  return payments.map((payment, index) => {
    const amount = Number(payment.amount || 0);

    const bestMatch = bankStatements
      .map((bank) => scoreCandidate(payment, bank))
      .filter((candidate): candidate is MatchCandidate => candidate !== null)
      .sort((a, b) => b.confidence - a.confidence)[0];

    const confidence = bestMatch ? bestMatch.confidence : 0.15;
    const status: ReconciliationStatus = !bestMatch ? 'Pending' : confidence >= 0.9 ? 'Completed' : 'Matched';
    const notes = bestMatch
      ? bestMatch.isLikelyBatch
        ? 'Possible partial match within a batched settlement'
        : 'AI suggestion based on amount, posting window, and source type'
      : 'No bank row found within the 5-day posting window';

    return {
      id: index + 1,
      paymentId: payment.paymentId || `PAY-${index + 1}`,
      bankId: bestMatch?.bank.bankId || `BANK-${index + 1}`,
      payerName: payment.payerName || '',
      amount,
      paymentDate: payment.paymentDate || '',
      postedDate: bestMatch?.bank.postedDate || '',
      status,
      confidence,
      notes,
    };
  });
};

export const filterStatuses: Record<FilterKey, ReconciliationStatus[]> = {
  open: ['Pending', 'Matched'],
  completed: ['Completed'],
  exception: ['Exception'],
  overpayment: ['Overpayment'],
  underpayment: ['Underpayment'],
};

export const filterLabels: Record<FilterKey, string> = {
  open: 'Payments to reconcile',
  completed: 'Completed tasks',
  exception: 'Exception tasks',
  overpayment: 'Overpayments',
  underpayment: 'Underpayments',
};

/* Maps statuses to CSS row classes used by the queue table. */
export const rowClassForStatus = (status: ReconciliationStatus) => {
  if (status === 'Exception') return 'row-exception';
  if (status === 'Completed') return 'row-completed';
  if (status === 'Overpayment') return 'row-overpayment';
  if (status === 'Underpayment') return 'row-underpayment';
  return '';
};

export const sortColumns: { key: SortKey; label: string }[] = [
  { key: 'paymentId', label: 'Payment ID' },
  { key: 'bankId', label: 'Bank ID' },
  { key: 'payerName', label: 'Payer name' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentDate', label: 'Payment date' },
  { key: 'postedDate', label: 'Posted date' },
  { key: 'confidence', label: 'Confidence' },
];

/* Converts row values into consistently sortable primitives per selected key. */
const sortValue = (item: ReconciliationItem, key: SortKey): number | string => {
  if (key === 'paymentDate' || key === 'postedDate') return parseDate(item[key])?.getTime() ?? 0;
  if (key === 'amount' || key === 'confidence') return item[key];
  return item[key].toLowerCase();
};

/* Returns a sorted copy of items and preserves original order when no sort is selected. */
export const sortItems = (list: ReconciliationItem[], sortKey: SortKey | null, direction: SortDirection) => {
  if (!sortKey) return list;
  const sorted = [...list].sort((a, b) => {
    const valueA = sortValue(a, sortKey);
    const valueB = sortValue(b, sortKey);
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  });
  return direction === 'asc' ? sorted : sorted.reverse();
};
