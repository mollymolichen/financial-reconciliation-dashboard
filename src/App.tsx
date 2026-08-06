import { ChangeEvent, useMemo, useRef, useState } from 'react';
import samplePaymentsCsv from '../payments_to_reconcile.csv?raw';
import sampleBankCsv from '../bank_statement_rows.csv?raw';
import DiscrepancyResolveDialog from './components/DiscrepancyResolveDialog';
import ExceptionDialog from './components/ExceptionDialog';
import ImportPanel from './components/ImportPanel';
import ReconciliationTable from './components/ReconciliationTable';
import SummaryTiles from './components/SummaryTiles';
import ToastMessage from './components/ToastMessage';
import { createItemsFromCsv, filterStatuses, parseBankCsv, parsePaymentsCsv } from './reconciliation/engine';
import { FilterKey, ReconciliationItem, ReconciliationStatus, SortDirection, SortKey, ToastState, ToastVariant } from './reconciliation/types';

/* Coordinates data import, reconciliation state, and action workflows across the app UI. */
function App() {
  const [paymentsText, setPaymentsText] = useState(samplePaymentsCsv);
  const [bankText, setBankText] = useState(sampleBankCsv);
  const [paymentsFileName, setPaymentsFileName] = useState('payments_to_reconcile.csv (sample)');
  const [bankFileName, setBankFileName] = useState('bank_statement_rows.csv (sample)');
  const [items, setItems] = useState<ReconciliationItem[]>(() =>
    createItemsFromCsv(parsePaymentsCsv(samplePaymentsCsv), parseBankCsv(sampleBankCsv)),
  );

  const [activeFilter, setActiveFilter] = useState<FilterKey | null>('open');
  const [exceptionItem, setExceptionItem] = useState<ReconciliationItem | null>(null);
  const [discrepancyResolveItem, setDiscrepancyResolveItem] = useState<ReconciliationItem | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dashboardSummary = useMemo(() => {
    const open = items.filter((item) => item.status === 'Pending' || item.status === 'Matched').length;
    const completed = items.filter((item) => item.status === 'Completed').length;
    const exceptions = items.filter((item) => item.status === 'Exception').length;
    const overpayments = items.filter((item) => item.status === 'Overpayment').length;
    const underpayments = items.filter((item) => item.status === 'Underpayment').length;
    return { open, completed, exceptions, overpayments, underpayments };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!activeFilter) return [];
    const allowedStatuses = filterStatuses[activeFilter];
    return items.filter((item) => allowedStatuses.includes(item.status));
  }, [items, activeFilter]);

  const openQueueItems = useMemo(
    () => items.filter((item) => item.status === 'Pending' || item.status === 'Matched' || item.status === 'Exception'),
    [items],
  );

  const visibleItems = activeFilter ? filteredItems : openQueueItems;

  /* Reads uploaded CSV files as UTF-8 text for downstream parsing. */
  const readFileAsText = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  /* Stores uploaded CSV content and visible file labels for the import panel. */
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>, type: 'payments' | 'bank') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      if (type === 'payments') {
        setPaymentsText(content);
        setPaymentsFileName(file.name);
      } else {
        setBankText(content);
        setBankFileName(file.name);
      }
    } catch (error) {
      console.error('Unable to read file', error);
    }
  };

  /* Rebuilds queue items from the currently loaded payments and bank CSV text. */
  const handleImport = () => {
    if (!paymentsText || !bankText) return;
    const nextItems = createItemsFromCsv(parsePaymentsCsv(paymentsText), parseBankCsv(bankText));
    setItems(nextItems);
  };

  const toggleFilter = (key: FilterKey) => {
    setActiveFilter((current) => (current === key ? null : key));
  };

  /* Toggles sort direction when re-clicking the same column, otherwise starts ascending. */
  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('asc');
      return;
    }
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  /* Applies a status mutation to one reconciliation row by id. */
  const updateStatus = (id: number, status: ReconciliationStatus) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  /* Shows a short-lived confirmation banner after key user actions. */
  const showToast = (message: string, variant: ToastVariant) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ key: Date.now(), message, variant });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2400);
  };

  const handleConfirm = (item: ReconciliationItem) => {
    updateStatus(item.id, 'Completed');
    showToast(`${item.paymentId} completed`, 'success');
  };

  const flagException = (item: ReconciliationItem) => {
    updateStatus(item.id, 'Exception');
    setExceptionItem(item);
  };

  /* Converts the current exception into a discrepancy outcome and notifies the user. */
  const resolveDiscrepancy = (kind: 'Overpayment' | 'Underpayment') => {
    if (!exceptionItem) return;
    updateStatus(exceptionItem.id, kind);
    showToast(`${exceptionItem.paymentId} flagged as ${kind.toLowerCase()}`, kind === 'Overpayment' ? 'overpayment' : 'underpayment');
    setExceptionItem(null);
  };

  /* Confirms standard queue items directly; discrepancy items require an extra resolve prompt. */
  const openResolveDialog = (item: ReconciliationItem) => {
    if (item.status === 'Overpayment' || item.status === 'Underpayment') {
      setDiscrepancyResolveItem(item);
      return;
    }
    handleConfirm(item);
  };

  const confidenceTooltip =
    'Confidence blends amount match (50%), payment method vs. bank source type match (30%), and how close the posted date is to the payment date within the 5-day window (20%).';

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Payments Platform</p>
          <h2>Reconcile payments against bank statements</h2>
          <p className="subtext">Use this tool to reconcile flagged payments against bank statements over any date range.</p>
        </div>
      </header>

      <ImportPanel
        paymentsFileName={paymentsFileName}
        bankFileName={bankFileName}
        onFileUpload={handleFileUpload}
        onImport={handleImport}
      />

      <SummaryTiles dashboardSummary={dashboardSummary} activeFilter={activeFilter} onToggleFilter={toggleFilter} />

      <div className="caveat-banner">
        <span>Payments matched with 90% confidence or higher are automatically moved to Completed.</span>
        <span className="info-icon" tabIndex={0} data-tooltip={confidenceTooltip}>
          &#9432;
        </span>
      </div>

      <ReconciliationTable
        activeFilter={activeFilter}
        items={visibleItems}
        sortKey={sortKey}
        sortDirection={sortDirection}
        confidenceTooltip={confidenceTooltip}
        onToggleSort={toggleSort}
        onConfirm={handleConfirm}
        onFlag={flagException}
        onResolve={openResolveDialog}
      />

      {exceptionItem && (
        <ExceptionDialog
          item={exceptionItem}
          onResolveOverpayment={() => resolveDiscrepancy('Overpayment')}
          onResolveUnderpayment={() => resolveDiscrepancy('Underpayment')}
          onDismiss={() => setExceptionItem(null)}
        />
      )}

      {discrepancyResolveItem && (
        <DiscrepancyResolveDialog
          item={discrepancyResolveItem}
          onProceed={() => {
            handleConfirm(discrepancyResolveItem);
            setDiscrepancyResolveItem(null);
          }}
          onCancel={() => setDiscrepancyResolveItem(null)}
        />
      )}

      {toast && <ToastMessage toast={toast} />}
    </div>
  );
}

export default App;
