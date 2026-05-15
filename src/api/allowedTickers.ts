// FMP free tier supported tickers
export const ALLOWED_TICKERS = new Set([
  'AAPL', 'TSLA', 'AMZN', 'MSFT', 'NVDA', 'GOOGL', 'META', 'NFLX', 'JPM', 'V',
  'BAC', 'PYPL', 'DIS', 'T', 'PFE', 'COST', 'INTC', 'KO', 'TGT', 'NKE',
  'SPY', 'BA', 'BABA', 'XOM', 'WMT', 'GE', 'CSCO', 'VZ', 'JNJ', 'CVX',
  'PLTR', 'SQ', 'SHOP', 'SBUX', 'SOFI', 'HOOD', 'RBLX', 'SNAP', 'AMD', 'UBER',
  'FDX', 'ABBV', 'ETSY', 'MRNA', 'LMT', 'GM', 'F', 'LCID', 'CCL', 'DAL',
  'UAL', 'AAL', 'TSM', 'SONY', 'ET', 'MRO', 'COIN', 'RIVN', 'RIOT', 'CPRX',
  'VWO', 'SPYG', 'NOK', 'ROKU', 'VIAC', 'ATVI', 'BIDU', 'DOCU', 'ZM', 'PINS',
  'TLRY', 'WBA', 'MGM', 'NIO', 'C', 'GS', 'WFC', 'ADBE', 'PEP', 'UNH',
  'CARR', 'HCA', 'TWTR', 'BILI', 'SIRI', 'FUBO', 'RKT',
]);

export function isAllowedTicker(symbol: string): boolean {
  return ALLOWED_TICKERS.has(symbol.toUpperCase());
}

// Sorted list for display / autocomplete
export const ALLOWED_TICKERS_SORTED = [...ALLOWED_TICKERS].sort();
