import type { AnnualData, DCFInputs, StockScores } from '../types';

export function cagr(start: number, end: number, years: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0 || years <= 0) return NaN;
  return Math.pow(end / start, 1 / years) - 1;
}

export function mean(arr: number[]): number {
  const clean = arr.filter(Number.isFinite);
  if (!clean.length) return NaN;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function stdDev(arr: number[]): number {
  const clean = arr.filter(Number.isFinite);
  if (clean.length < 2) return 0;
  const m = mean(clean);
  return Math.sqrt(clean.reduce((a, b) => a + (b - m) ** 2, 0) / (clean.length - 1));
}

function cv(arr: number[]): number {
  const m = Math.abs(mean(arr));
  return m === 0 ? 1 : stdDev(arr) / m;
}

export function calcROIC(d: {
  operatingIncome: number;
  incomeTax: number;
  incomeBeforeTax: number;
  totalAssets: number;
  currentLiabilities: number;
  cash: number;
}): number {
  if (!Number.isFinite(d.operatingIncome) || !Number.isFinite(d.totalAssets)) return NaN;
  const taxRate = Number.isFinite(d.incomeTax) && Number.isFinite(d.incomeBeforeTax) && d.incomeBeforeTax > 0
    ? Math.min(Math.max(d.incomeTax / d.incomeBeforeTax, 0), 0.5)
    : 0.21;
  const nopat = d.operatingIncome * (1 - taxRate);
  const excessCash = Number.isFinite(d.cash) ? Math.max(0, d.cash - 1_000_000_000) : 0;
  const ic = d.totalAssets - (Number.isFinite(d.currentLiabilities) ? d.currentLiabilities : 0) - excessCash;
  if (ic <= 0) return NaN;
  return nopat / ic;
}

export function calcDCF(latestFCF: number, sharesOutstanding: number, inputs: DCFInputs): number {
  if (!Number.isFinite(latestFCF) || latestFCF <= 0 || !Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return NaN;
  const { growth, discount, terminal } = inputs;
  if (discount <= terminal) return NaN;
  let fcf = latestFCF;
  let totalPV = 0;
  for (let y = 1; y <= 5; y++) {
    fcf *= (1 + growth);
    totalPV += fcf / Math.pow(1 + discount, y);
  }
  const fadeGrowth = growth * 0.5;
  for (let y = 6; y <= 10; y++) {
    fcf *= (1 + fadeGrowth);
    totalPV += fcf / Math.pow(1 + discount, y);
  }
  const tv = (fcf * (1 + terminal)) / (discount - terminal);
  totalPV += tv / Math.pow(1 + discount, 10);
  return totalPV / sharesOutstanding;
}

export function scoreRevenue(cagrDecimal: number): number {
  const p = cagrDecimal * 100;
  if (!Number.isFinite(p)) return 0;
  if (p > 20) return 10; if (p > 15) return 9; if (p > 12) return 8;
  if (p > 10) return 7; if (p > 7) return 6; if (p > 4) return 4;
  if (p > 0) return 2; return 0;
}

export function scoreFCF(avgFCFMargin: number, fcfCagr: number): number {
  let s = 0;
  const m = avgFCFMargin * 100;
  if (m > 20) s += 5; else if (m > 15) s += 4; else if (m > 10) s += 3;
  else if (m > 5) s += 2; else if (m > 0) s += 1;
  const g = fcfCagr * 100;
  if (Number.isFinite(g)) {
    if (g > 20) s += 5; else if (g > 15) s += 4; else if (g > 10) s += 3;
    else if (g > 5) s += 2; else if (g > 0) s += 1;
  }
  return Math.min(10, s);
}

export function scoreOperatingMargin(avgMargin: number, data: AnnualData[]): number {
  const m = avgMargin * 100;
  let s = 0;
  if (m > 25) s += 6; else if (m > 20) s += 5; else if (m > 15) s += 4;
  else if (m > 10) s += 3; else if (m > 5) s += 2; else if (m > 0) s += 1;
  if (data.length >= 4) {
    const old = mean(data.slice(0, Math.floor(data.length / 2)).map(d => d.operatingMargin));
    const recent = mean(data.slice(Math.floor(data.length / 2)).map(d => d.operatingMargin));
    if (Number.isFinite(old) && Number.isFinite(recent) && recent > old) s += 4;
    else if (Number.isFinite(old) && Number.isFinite(recent) && recent >= old * 0.95) s += 2;
  }
  return Math.min(10, s);
}

export function scoreROIC(avgROIC: number): number {
  const p = avgROIC * 100;
  if (!Number.isFinite(p)) return 0;
  if (p > 30) return 10; if (p > 25) return 9; if (p > 20) return 8;
  if (p > 15) return 6; if (p > 10) return 4; if (p > 7) return 2; return 0;
}

export function scoreBalanceSheet(latestD: AnnualData): number {
  if (latestD.netDebt < 0) return 10;
  if (!Number.isFinite(latestD.debtToEbitda)) return 5;
  const d = latestD.debtToEbitda;
  if (d < 0.5) return 9; if (d < 1) return 8; if (d < 2) return 6;
  if (d < 3) return 4; if (d < 4) return 2; return 1;
}

export function scoreEPS(cagrDecimal: number): number {
  const p = cagrDecimal * 100;
  if (!Number.isFinite(p)) return 0;
  if (p > 20) return 10; if (p > 15) return 9; if (p > 12) return 7.5;
  if (p > 8) return 6; if (p > 5) return 4; if (p > 0) return 2; return 0;
}

export function scoreCapEx(avgCapExPct: number): number {
  const p = avgCapExPct * 100;
  if (!Number.isFinite(p)) return 5;
  if (p < 2) return 10; if (p < 4) return 8.5; if (p < 6) return 7;
  if (p < 10) return 5; if (p < 15) return 3; if (p < 25) return 1.5; return 0;
}

export function calcMoatScore(data: AnnualData[]): number {
  const grossMargins = data.map(d => d.grossMargin).filter(Number.isFinite);
  const roics = data.map(d => d.roic).filter(Number.isFinite);
  const opMargins = data.map(d => d.operatingMargin).filter(Number.isFinite);
  if (grossMargins.length < 2) return 5;
  const gmCV = cv(grossMargins);
  const stabilityScore = Math.max(0, Math.min(3, 3 - gmCV * 20));
  const avgROIC = mean(roics);
  const roicScore = !Number.isFinite(avgROIC) ? 1 : avgROIC > 0.25 ? 4 : avgROIC > 0.20 ? 3.5 : avgROIC > 0.15 ? 3 : avgROIC > 0.10 ? 2 : avgROIC > 0.05 ? 1 : 0;
  const avgGM = mean(grossMargins);
  const gmLevel = avgGM > 0.60 ? 2 : avgGM > 0.40 ? 1.5 : avgGM > 0.25 ? 1 : 0.5;
  let trendScore = 0;
  if (opMargins.length >= 4) {
    const half = Math.floor(opMargins.length / 2);
    const old = mean(opMargins.slice(0, half));
    const recent = mean(opMargins.slice(half));
    trendScore = Number.isFinite(old) && Number.isFinite(recent) && recent > old ? 1 : 0;
  }
  return Math.min(10, stabilityScore + roicScore + gmLevel + trendScore);
}

export function calcManagementScore(data: AnnualData[]): number {
  if (data.length < 3) return 5;
  const half = Math.floor(data.length / 2);
  const fcfMargins = data.map(d => d.fcfMargin).filter(Number.isFinite);
  const oldFCF = mean(fcfMargins.slice(0, half));
  const recentFCF = mean(fcfMargins.slice(half));
  const fcfScore = Number.isFinite(oldFCF) && Number.isFinite(recentFCF)
    ? (recentFCF - oldFCF > 0.05 ? 3 : recentFCF - oldFCF > 0 ? 2 : recentFCF - oldFCF > -0.05 ? 1 : 0)
    : 1;
  const shares = data.map(d => d.sharesOutstanding).filter(v => Number.isFinite(v) && v > 0);
  const shareReduction = shares.length >= 2 ? (shares[0] - shares[shares.length - 1]) / shares[0] : 0;
  const buybackScore = shareReduction > 0.25 ? 3 : shareReduction > 0.15 ? 2.5 : shareReduction > 0.08 ? 2 : shareReduction > 0.02 ? 1 : 0;
  const netDebts = data.map(d => d.netDebt).filter(Number.isFinite);
  let debtScore = 1;
  if (netDebts.length >= 2) {
    const latest = netDebts[netDebts.length - 1];
    if (latest < 0) debtScore = 2;
    else if (latest < netDebts[0]) debtScore = 1.5;
    else debtScore = 0.5;
  }
  const conversions = data.map(d => d.netIncome > 0 ? d.fcf / d.netIncome : NaN).filter(Number.isFinite);
  const avgConv = mean(conversions);
  const convScore = !Number.isFinite(avgConv) ? 1 : avgConv > 1.2 ? 2 : avgConv > 0.8 ? 1.5 : avgConv > 0.5 ? 1 : 0;
  return Math.min(10, fcfScore + buybackScore + debtScore + convScore);
}

export function scoreValuation(currentPrice: number, intrinsicValue: number, peRatio: number): number {
  if (Number.isFinite(intrinsicValue) && intrinsicValue > 0 && Number.isFinite(currentPrice)) {
    const disc = (intrinsicValue - currentPrice) / intrinsicValue;
    if (disc > 0.30) return 10; if (disc > 0.20) return 8; if (disc > 0.10) return 6;
    if (disc > 0) return 4; if (disc > -0.20) return 2; return 1;
  }
  if (Number.isFinite(peRatio) && peRatio > 0) {
    if (peRatio < 12) return 9; if (peRatio < 18) return 7; if (peRatio < 25) return 5;
    if (peRatio < 35) return 3; return 1;
  }
  return 5;
}

export function calcAllScores(data: AnnualData[], analysis: {
  revenueCAGR: number; epsCAGR: number; fcfCAGR: number;
  avgROIC: number; avgOperatingMargin: number; avgFCFMargin: number;
  intrinsicValue: number; currentPrice: number; peRatio: number;
}): StockScores {
  const avgCapExPct = mean(data.map(d => d.capExPct));
  const rev = scoreRevenue(analysis.revenueCAGR);
  const fcf = scoreFCF(analysis.avgFCFMargin, analysis.fcfCAGR);
  const opM = scoreOperatingMargin(analysis.avgOperatingMargin, data);
  const roic = scoreROIC(analysis.avgROIC);
  const bs = data.length ? scoreBalanceSheet(data[data.length - 1]) : 5;
  const eps = scoreEPS(analysis.epsCAGR);
  const capex = scoreCapEx(avgCapExPct);
  const moat = calcMoatScore(data);
  const mgmt = calcManagementScore(data);
  const val = scoreValuation(analysis.currentPrice, analysis.intrinsicValue, analysis.peRatio);
  const overall = mean([rev, fcf, opM, roic, bs, eps, capex, moat, mgmt, val]) * 10;
  return { revenueGrowth: rev, fcf, operatingMargin: opM, roic, balanceSheet: bs, epsGrowth: eps, capEx: capex, moat, management: mgmt, valuation: val, overall };
}

export function fmtBn(n: number): string {
  if (!Number.isFinite(n)) return 'N/A';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtPct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return 'N/A';
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtNum(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return 'N/A';
  return n.toFixed(decimals);
}

export function scoreColor(score: number): string {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#3b82f6';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

export function gradeLabel(overall: number): string {
  if (overall >= 80) return 'Elite Compounder';
  if (overall >= 65) return 'Strong Compounder';
  if (overall >= 50) return 'Good Business';
  if (overall >= 35) return 'Average Business';
  return 'Avoid';
}

export function fmtPrice(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return 'N/A';
  return `$${n.toFixed(decimals)}`;
}

export const TOOLTIP_STYLE = {
  background: '#0f0f1a',
  border: '1px solid #1a1a2e',
  borderRadius: 8,
  color: '#e2e8f0',
} as const;

export const TICK_STYLE = { fill: '#6b7280', fontSize: 11 } as const;
export const TICK_STYLE_SM = { fill: '#6b7280', fontSize: 10 } as const;
