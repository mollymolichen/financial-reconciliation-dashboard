import { ReconciliationItem } from '../reconciliation/types';

type ExceptionDialogProps = {
  item: ReconciliationItem;
  onResolveOverpayment: () => void;
  onResolveUnderpayment: () => void;
  onDismiss: () => void;
};

/* Guides users through resolving an exception as overpayment, underpayment, or deferred review. */
function ExceptionDialog({ item, onResolveOverpayment, onResolveUnderpayment, onDismiss }: ExceptionDialogProps) {
  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <h4>Resolve exception</h4>
        <p className="subtext">
          {item.paymentId} for ${item.amount.toFixed(2)} needs a next step before it can clear reconciliation. <br />
          <br />
          If the payment is suspected to be a duplicate, please select <b>Overpayment</b>. If the payment is suspected to be short of the expected amount,
          please select <b>Underpayment</b>. <br />
          <br />
          Otherwise, you can keep it as an exception for further review.
        </p>
        <ul className="dialog-details">
          <li>
            <span>Bank reference</span>
            <span>{item.bankId}</span>
          </li>
          <li>
            <span>Payment date</span>
            <span>{item.paymentDate || '—'}</span>
          </li>
          <li>
            <span>Posted date</span>
            <span>{item.postedDate || '—'}</span>
          </li>
          <li>
            <span>Confidence</span>
            <span>{Math.round(item.confidence * 100)}%</span>
          </li>
        </ul>
        <div className="dialog-actions">
          <button onClick={onResolveOverpayment}>Mark as Overpayment</button>
          <button onClick={onResolveUnderpayment}>Mark as Underpayment</button>
          <button className="dialog-dismiss" onClick={onDismiss}>Keep Open for Review</button>
        </div>
      </div>
    </div>
  );
}

export default ExceptionDialog;
