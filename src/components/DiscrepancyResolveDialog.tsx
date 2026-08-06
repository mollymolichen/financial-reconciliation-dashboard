import { ReconciliationItem } from '../reconciliation/types';

type DiscrepancyResolveDialogProps = {
  item: ReconciliationItem;
  onProceed: () => void;
  onCancel: () => void;
};

/* Confirms the final communication step before closing an overpayment or underpayment item. */
function DiscrepancyResolveDialog({ item, onProceed, onCancel }: DiscrepancyResolveDialogProps) {
  const kind = item.status === 'Overpayment' ? 'overpayment' : 'underpayment';

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <h4>Resolve {kind}</h4>
        <p className="subtext">
          Taking action on this {kind} requires contacting {item.payerName || 'the payer'} and requesting them resubmit their invoice made on{' '}
          {item.paymentDate || 'the original date'} for an {kind} of ${item.amount.toFixed(2)}.
        </p>
        <div className="dialog-actions">
          <button onClick={onProceed}>I understand, please proceed</button>
          <button className="dialog-dismiss" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default DiscrepancyResolveDialog;
