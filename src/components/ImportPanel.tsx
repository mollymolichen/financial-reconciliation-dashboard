import { ChangeEvent } from 'react';

type ImportPanelProps = {
  paymentsFileName: string;
  bankFileName: string;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, type: 'payments' | 'bank') => void;
  onImport: () => void;
};

/* Collects CSV inputs and triggers ingestion into the reconciliation workflow. */
function ImportPanel({ paymentsFileName, bankFileName, onFileUpload, onImport }: ImportPanelProps) {
  return (
    <section className="panel import-panel">
      <h4>Import data</h4>
      <div className="grid">
        <label className="upload-card">
          <span>Payments file (.csv)</span>
          <p className="upload-description">This is a CSV of all payments made to Accounts Receivable (AR).</p>
          <input type="file" accept=".csv,text/csv" onChange={(event) => onFileUpload(event, 'payments')} />
          {paymentsFileName ? <small>Loaded: {paymentsFileName}</small> : <small>Select a payments CSV file</small>}
        </label>
        <label className="upload-card">
          <span>Bank statement file (.csv)</span>
          <p className="upload-description">This is the CSV of all bank statements from the last billing cycle.</p>
          <input type="file" accept=".csv,text/csv" onChange={(event) => onFileUpload(event, 'bank')} />
          {bankFileName ? <small>Loaded: {bankFileName}</small> : <small>Select a bank statement CSV file</small>}
        </label>
      </div>
      <button onClick={onImport}>Review payments</button>
    </section>
  );
}

export default ImportPanel;
