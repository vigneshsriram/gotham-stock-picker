export interface AnnualData {
  year: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  incomeTax: number;
  incomeBeforeTax: number;
  totalAssets: number;
  totalEquity: number;
  longTermDebt: number;
  shortTermDebt: number;
  cash: number;
  sharesOutstanding: number;
  currentLiabilities: number;
  operatingCashFlow: number;
  capEx: number;
  depreciation: number;
  fcf: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  fcfMargin: number;
  roic: number;
  debtToEbitda: number;
  capExPct: number;
  eps: number;
  netDebt: number;
}

export interface DCFInputs {
  growth: number;
  discount: number;
  terminal: number;
}

export interface StockScores {
  revenueGrowth: number;
  fcf: number;
  operatingMargin: number;
  roic: number;
  balanceSheet: number;
  epsGrowth: number;
  capEx: number;
  moat: number;
  management: number;
  valuation: number;
  overall: number;
}

export interface RevenueSegmentYear {
  year: string;        // e.g. "2024"
  total: number;       // sum of all segments (cross-check vs income statement)
  segments: Record<string, number>; // segment name → revenue $
}

export interface StockAnalysis {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  currentPrice: number;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  eps: number;
  beta: number;
  weekHigh52: number;
  weekLow52: number;
  forwardPE: number;
  dividendYield: number;
  lastDividend: number; // annual dividend in dollars — stored so yield can be recomputed with live price
  priceChange: number;
  priceChangePct: number;
  nextEarnings: string | null;
  annualData: AnnualData[];
  revenueCAGR: number;
  epsCAGR: number;
  fcfCAGR: number;
  avgROIC: number;
  avgOperatingMargin: number;
  avgFCFMargin: number;
  intrinsicValue: number;
  dcfInputs: DCFInputs;
  scores: StockScores;
  revenueSegments: RevenueSegmentYear[]; // empty array if not available
}
