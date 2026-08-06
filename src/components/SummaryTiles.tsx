import { DashboardSummary, FilterKey } from '../reconciliation/types';

type SummaryTilesProps = {
  dashboardSummary: DashboardSummary;
  activeFilter: FilterKey | null;
  onToggleFilter: (key: FilterKey) => void;
};

/* Shows high-level queue counts and lets users switch active table filters. */
function SummaryTiles({ dashboardSummary, activeFilter, onToggleFilter }: SummaryTilesProps) {
  return (
    <section className="panel summary-panel">
      <button
        type="button"
        className={`summary-tile ${activeFilter === 'open' ? 'active' : ''}`}
        onClick={() => onToggleFilter('open')}
      >
        <span className="tile-pill pill-open" aria-hidden="true" />
        <span className="tile-text">
          <strong>{dashboardSummary.open}</strong>
          <span>Payments needing review</span>
        </span>
      </button>
      <button
        type="button"
        className={`summary-tile ${activeFilter === 'completed' ? 'active' : ''}`}
        onClick={() => onToggleFilter('completed')}
      >
        <span className="tile-pill pill-completed" aria-hidden="true" />
        <span className="tile-text">
          <strong>{dashboardSummary.completed}</strong>
          <span>Completed tasks</span>
        </span>
      </button>
      <button
        type="button"
        className={`summary-tile ${activeFilter === 'overpayment' ? 'active' : ''}`}
        onClick={() => onToggleFilter('overpayment')}
      >
        <span className="tile-pill pill-overpayment" aria-hidden="true" />
        <span className="tile-text">
          <strong>{dashboardSummary.overpayments}</strong>
          <span>Overpayments</span>
        </span>
      </button>
      <button
        type="button"
        className={`summary-tile ${activeFilter === 'underpayment' ? 'active' : ''}`}
        onClick={() => onToggleFilter('underpayment')}
      >
        <span className="tile-pill pill-underpayment" aria-hidden="true" />
        <span className="tile-text">
          <strong>{dashboardSummary.underpayments}</strong>
          <span>Underpayments</span>
        </span>
      </button>
    </section>
  );
}

export default SummaryTiles;
