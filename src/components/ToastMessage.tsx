import { ToastState } from '../reconciliation/types';

type ToastMessageProps = {
  toast: ToastState;
};

/* Presents transient success or discrepancy feedback after user actions. */
function ToastMessage({ toast }: ToastMessageProps) {
  return (
    <div key={toast.key} className={`confirm-toast toast-${toast.variant}`} role="status">
      <span className="confirm-toast-icon">{toast.variant === 'success' ? '\u2713' : '!'}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export default ToastMessage;
