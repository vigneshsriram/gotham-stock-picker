import { useState, useEffect, useCallback } from 'react';
import { fetchQuotes } from '../api/fmp';

interface Position {
  id: string;
  ticker: string;
  shares: number;
  costPerShare: number;
}

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'themoat_paper_portfolio';
const BUDGET_KEY = 'themoat_paper_budget';

function loadPortfolio(): { positions: Position[]; budget: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const positions: Position[] = raw ? JSON.parse(raw) : [];
    const budgetRaw = localStorage.getItem(BUDGET_KEY);
    const budget = budgetRaw ? parseFloat(budgetRaw) : 100000;
    return { positions, budget };
  } catch {
    return { positions: [], budget: 100000 };
  }
}

function savePositions(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

function saveBudget(budget: number) {
  localStorage.setItem(BUDGET_KEY, String(budget));
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaperTrading({ onBack }: Props) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [budget, setBudget] = useState(100000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Add position form
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const { positions: p, budget: b } = loadPortfolio();
    setPositions(p);
    setBudget(b);
  }, []);

  const refreshPrices = useCallback(async (pos: Position[]) => {
    const tickers = [...new Set(pos.map(p => p.ticker))];
    if (tickers.length === 0) return;
    setPricesLoading(true);
    try {
      const result = await fetchQuotes(tickers);
      setPrices(result);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (positions.length > 0) refreshPrices(positions);
  }, [positions.length]); // re-fetch when position count changes

  const totalCost = positions.reduce((sum, p) => sum + p.shares * p.costPerShare, 0);
  const totalCurrentValue = positions.reduce((sum, p) => {
    const cur = prices[p.ticker];
    return sum + p.shares * (cur ?? p.costPerShare);
  }, 0);
  const totalPL = positions.reduce((sum, p) => {
    const cur = prices[p.ticker];
    if (!cur) return sum;
    return sum + p.shares * (cur - p.costPerShare);
  }, 0);
  const hasPrices = Object.keys(prices).length > 0;
  const cash = budget - totalCost;

  function handleAddPosition(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const t = ticker.trim().toUpperCase();
    const s = parseFloat(shares);
    const c = parseFloat(price);
    if (!t) { setFormError('Ticker is required'); return; }
    if (!s || s <= 0) { setFormError('Enter a valid number of shares'); return; }
    if (!c || c <= 0) { setFormError('Enter a valid price'); return; }
    const cost = s * c;
    if (cost > cash) { setFormError(`Not enough cash — need $${fmt(cost)} but only $${fmt(cash)} available`); return; }

    const next: Position[] = [...positions, { id: crypto.randomUUID(), ticker: t, shares: s, costPerShare: c }];
    setPositions(next);
    savePositions(next);
    setTicker('');
    setShares('');
    setPrice('');
  }

  function removePosition(id: string) {
    const next = positions.filter(p => p.id !== id);
    setPositions(next);
    savePositions(next);
  }

  function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(budgetDraft.replace(/,/g, ''));
    if (!val || val <= 0) return;
    setBudget(val);
    saveBudget(val);
    setEditingBudget(false);
  }

  return (
    <div className="paper-trading-page">
      <div className="paper-trading-header">
        <button className="paper-back-btn" onClick={onBack}>← Back</button>
        <h1 className="paper-trading-title">Paper Trading</h1>
        {positions.length > 0 && (
          <button className="paper-refresh-btn" onClick={() => refreshPrices(positions)} disabled={pricesLoading}>
            {pricesLoading ? 'Refreshing…' : '↺ Refresh Prices'}
          </button>
        )}
      </div>

      {/* Portfolio summary */}
      <div className="paper-summary-row">
        <div className="paper-summary-card">
          <div className="paper-summary-label">Total Budget</div>
          <div className="paper-summary-value">${fmt(budget)}</div>
          {editingBudget ? (
            <form onSubmit={handleBudgetSave} className="paper-budget-form">
              <input
                className="paper-budget-input"
                value={budgetDraft}
                onChange={e => setBudgetDraft(e.target.value)}
                placeholder="e.g. 100000"
                autoFocus
              />
              <button type="submit" className="paper-budget-save">Save</button>
              <button type="button" className="paper-budget-cancel" onClick={() => setEditingBudget(false)}>Cancel</button>
            </form>
          ) : (
            <button className="paper-edit-budget" onClick={() => { setBudgetDraft(String(budget)); setEditingBudget(true); }}>Edit budget</button>
          )}
        </div>
        <div className="paper-summary-card">
          <div className="paper-summary-label">Invested (Cost)</div>
          <div className="paper-summary-value">${fmt(totalCost)}</div>
          <div className="paper-summary-sub">{budget > 0 ? ((totalCost / budget) * 100).toFixed(1) : 0}% of budget</div>
        </div>
        {hasPrices ? (
          <div className="paper-summary-card">
            <div className="paper-summary-label">Unrealized P&L</div>
            <div className={`paper-summary-value${totalPL >= 0 ? ' paper-positive' : ' paper-negative'}`}>
              {totalPL >= 0 ? '+' : ''}${fmt(Math.abs(totalPL))}
            </div>
            <div className="paper-summary-sub">
              Current value: ${fmt(totalCurrentValue)}
            </div>
          </div>
        ) : (
          <div className="paper-summary-card">
            <div className="paper-summary-label">Cash Available</div>
            <div className="paper-summary-value">${fmt(cash)}</div>
            <div className="paper-summary-sub">{budget > 0 ? ((cash / budget) * 100).toFixed(1) : 0}% cash</div>
          </div>
        )}
      </div>

      {/* Add position form */}
      <div className="paper-section">
        <h2 className="paper-section-title">Add Position</h2>
        <form onSubmit={handleAddPosition} className="paper-add-form">
          <input
            className="paper-input"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="Ticker (e.g. AAPL)"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <input
            className="paper-input"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="Shares"
            type="number"
            min="0"
            step="any"
          />
          <input
            className="paper-input"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Cost per share ($)"
            type="number"
            min="0"
            step="any"
          />
          <button type="submit" className="paper-add-btn">Add</button>
        </form>
        {formError && <p className="paper-form-error">{formError}</p>}
      </div>

      {/* Positions table */}
      <div className="paper-section">
        <h2 className="paper-section-title">
          Holdings
          {pricesLoading && <span className="paper-prices-loading"> · fetching prices…</span>}
        </h2>
        {positions.length === 0 ? (
          <p className="paper-empty">No positions yet. Add one above.</p>
        ) : (
          <div className="paper-table-wrap">
            <table className="paper-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Cost/Share</th>
                  <th>Current Price</th>
                  <th>P&L</th>
                  <th>Allocation</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const costTotal = p.shares * p.costPerShare;
                  const curPrice = prices[p.ticker];
                  const curTotal = curPrice != null ? p.shares * curPrice : null;
                  const pl = curTotal != null ? curTotal - costTotal : null;
                  const plPct = pl != null ? (pl / costTotal) * 100 : null;
                  const alloc = budget > 0 ? (costTotal / budget) * 100 : 0;
                  return (
                    <tr key={p.id}>
                      <td className="paper-ticker-cell">{p.ticker}</td>
                      <td>{p.shares.toLocaleString()}</td>
                      <td>${fmt(p.costPerShare)}</td>
                      <td>
                        {curPrice != null ? `$${fmt(curPrice)}` : <span className="paper-muted">—</span>}
                      </td>
                      <td>
                        {pl != null ? (
                          <span className={pl >= 0 ? 'paper-positive' : 'paper-negative'}>
                            {pl >= 0 ? '+' : ''}${fmt(Math.abs(pl))}
                            <span className="paper-pl-pct"> ({plPct! >= 0 ? '+' : ''}{plPct!.toFixed(1)}%)</span>
                          </span>
                        ) : <span className="paper-muted">—</span>}
                      </td>
                      <td>
                        <div className="paper-alloc-cell">
                          <div className="paper-alloc-bar-wrap">
                            <div className="paper-alloc-bar" style={{ width: `${Math.min(alloc, 100)}%` }} />
                          </div>
                          <span className="paper-alloc-pct">{alloc.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="paper-remove-btn" onClick={() => removePosition(p.id)} title="Remove">×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
