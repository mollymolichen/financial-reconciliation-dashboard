import { filterLabels, rowClassForStatus, sortColumns, sortItems } from '../reconciliation/engine';
import { FilterKey, ReconciliationItem, SortDirection, SortKey } from '../reconciliation/types';

type ReconciliationTableProps = {
  activeFilter: FilterKey | null;
  items: ReconciliationItem[];
  sortKey: SortKey | null;
  sortDirection: SortDirection;
  confidenceTooltip: string;
  onToggleSort: (key: SortKey) => void;
  onConfirm: (item: ReconciliationItem) => void;
  onFlag: (item: ReconciliationItem) => void;
  onResolve: (item: ReconciliationItem) => void;
};

/* Renders the sortable reconciliation queue and conditionally exposes row actions by filter. */
function ReconciliationTable({
  activeFilter,
  items,
  sortKey,
  sortDirection,
  confidenceTooltip,
  onToggleSort,
  onConfirm,
  onFlag,
  onResolve,
}: ReconciliationTableProps) {
  const title = activeFilter ? filterLabels[activeFilter] : 'Payments to reconcile';

  return (
    <section className="panel table-panel">
      <div className="queue-header">
        <h3>{title}</h3>
      </div>
      <table>
        <thead>
          <tr>
            {sortColumns.map(({ key, label }) => (
              <th key={key}>
                <div className="th-inner">
                  <button type="button" className="sort-header" onClick={() => onToggleSort(key)}>
                    {label}
                    <span className="sort-icon">{sortKey === key ? (sortDirection === 'asc' ? '\u25b2' : '\u25bc') : '\u21c5'}</span>
                  </button>
                  {key === 'confidence' && (
                    <span className="info-icon" tabIndex={0} data-tooltip={confidenceTooltip}>
                      &#9432;
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortItems(items, sortKey, sortDirection).map((item) => (
            <tr key={item.id} className={rowClassForStatus(item.status)}>
              <td>{item.paymentId}</td>
              <td>{item.bankId}</td>
              <td>{item.payerName || '—'}</td>
              <td>{item.amount.toFixed(2)}</td>
              <td>{item.paymentDate || '—'}</td>
              <td>{item.postedDate || '—'}</td>
              <td>{Math.round(item.confidence * 100)}%</td>
              <td>
                <div className="actions">
                  {activeFilter === 'completed' && (
                    <button className="flag-button" onClick={() => onFlag(item)}>Flag</button>
                  )}
                  {(activeFilter === 'overpayment' || activeFilter === 'underpayment') && (
                    <button onClick={() => onResolve(item)}>Resolve</button>
                  )}
                  {activeFilter !== 'completed' && activeFilter !== 'overpayment' && activeFilter !== 'underpayment' && (
                    <>
                      <button className="confirm-button" onClick={() => onConfirm(item)}>Confirm</button>
                      <button className="flag-button" onClick={() => onFlag(item)}>Flag</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default ReconciliationTable;
