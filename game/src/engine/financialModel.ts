import type { Era } from '../data/eras';

export interface BalanceSheet {
  btcHeld: number;
  cashMM: number;
  convertibleDebtMM: number;
  preferredFaceValueMM: number;
  preferredDivRate: number;
  sharesOutstanding: number;
  preferredSharesMM: number;
  preferredDivAccruedMM: number;
  // Cost basis tracking
  totalBTCSpentMM: number;      // cumulative USD spent buying BTC
  startingBTCPerShare: number;  // BTC/share at game start
  startingBTCHeld: number;
}

export interface GameMetrics {
  btcPrice: number;
  btcValueMM: number;
  totalAssetsMM: number;
  totalLiabilitiesMM: number;
  netAssetValueMM: number;
  navPerShare: number;
  stockPrice: number;
  marketCapMM: number;
  mNAV: number;
  mNAVStatus: 'EXTREME_PREMIUM' | 'HIGH_PREMIUM' | 'FAIR' | 'DISCOUNT' | 'DEEP_DISCOUNT';
  btcPerShare: number;
  btcYieldPct: number;          // % change in BTC/share since start
  costBasisPerBTC: number;      // avg price paid per BTC
  unrealizedGainMM: number;     // (price - costBasis) * btcHeld
  unrealizedGainPct: number;    // % gain on BTC position
  quarterlyBurnMM: number;
  monthsRunway: number;
  leverageRatio: number;
  currentInterestRate: number;  // live annual rate
  strcRate: number;              // live STRC dividend rate (dynamic)
  isInsolvent: boolean;
  insolventReason?: string;
  preferredCoverageRatio: number;
  sentiment: number;
  sentimentLabel: string;
  sentimentColor: string;
  atmCooldown: number;
}

export interface GameEvent {
  id: string;
  day: number;
  type: 'GOOD' | 'BAD' | 'NEUTRAL' | 'CRITICAL';
  title: string;
  description: string;
  effect?: Partial<BalanceSheet>;
}

export interface TradeImpact {
  priceImpactPct: number;
  mNavImpact: number;
  sentimentImpact: number;
  stockImpactPct: number;
}

const STRC_BASE_RATE = 0.115;   // 11.5% base annual div rate (STRC preferred)
const PREFERRED_FACE_PER_SHARE = 0.025;
const BTC_SUPPLY_PROXY = 19_700_000;

// Dynamic STRC rate: exponential as preferred/BTC coverage deteriorates
function computeSTRCRate(btcValueMM: number, preferredFaceValueMM: number): number {
  if (preferredFaceValueMM <= 0) return STRC_BASE_RATE;
  const coverage = btcValueMM / preferredFaceValueMM;
  if (coverage >= 2.0) return STRC_BASE_RATE;  // safe zone — base rate
  // Exponential escalation below 2x coverage
  const riskMult = Math.pow(Math.max(1, 2.0 / Math.max(coverage, 0.05)), 2.0);
  return Math.min(STRC_BASE_RATE * riskMult, 0.99);  // cap at 99%/year
}

export class FinancialModel {
  private era: Era;
  private balance: BalanceSheet;
  private mNAVLevel: number = 1.5;
  private sentimentLevel: number = 50;
  private atmIssuanceCount: number = 0;
  private atmCooldownDays: number = 0;
  private stockPriceMultiplier: number = 1.0;
  private events: GameEvent[] = [];
  private dayCount: number = 0;
  private currentInterestRate: number;

  constructor(era: Era, startingCapitalMM?: number) {
    this.era = era;
    this.currentInterestRate = era.interestRate;
    this.balance = this.initializeBalance(era, startingCapitalMM);
    this.mNAVLevel = era.id === 'now2024' || era.id === 'future2025' ? 2.8 : 1.5;
    this.sentimentLevel = 50;
  }

  private initializeBalance(era: Era, startingCapitalMM?: number): BalanceSheet {
    const prefShares = era.startingPreferred / PREFERRED_FACE_PER_SHARE;
    const initBTCPerShare = era.startingBTC / era.startingShares;
    return {
      btcHeld: era.startingBTC,
      cashMM: startingCapitalMM ?? era.startingCash,
      convertibleDebtMM: era.startingDebt,
      preferredFaceValueMM: era.startingPreferred,
      preferredDivRate: STRC_BASE_RATE,  // base rate; actual rate is dynamic
      sharesOutstanding: era.startingShares,
      preferredSharesMM: prefShares,
      preferredDivAccruedMM: 0,
      totalBTCSpentMM: era.startingBTC > 0 ? era.startingBTC * era.startPrice / 1e6 : 0,
      startingBTCPerShare: initBTCPerShare,
      startingBTCHeld: era.startingBTC,
    };
  }

  getBalance(): BalanceSheet { return { ...this.balance }; }

  adjustInterestRate(delta: number) {
    this.currentInterestRate = Math.max(0.01, Math.min(0.15, this.currentInterestRate + delta));
  }

  computeMetrics(btcPrice: number): GameMetrics {
    const btcValueMM = (this.balance.btcHeld * btcPrice) / 1e6;
    const totalAssetsMM = btcValueMM + this.balance.cashMM;
    const totalLiabilitiesMM = this.balance.convertibleDebtMM + this.balance.preferredFaceValueMM;
    const netAssetValueMM = totalAssetsMM - totalLiabilitiesMM;
    const navPerShare = netAssetValueMM / this.balance.sharesOutstanding;
    const mNAV = Math.min(this.mNAVLevel, 4.0);
    const rawStockPrice = Math.max(navPerShare * mNAV, 0.01);
    const stockPrice = Math.max(rawStockPrice * this.stockPriceMultiplier, 0.01);
    const marketCapMM = stockPrice * this.balance.sharesOutstanding;

    let mNAVStatus: GameMetrics['mNAVStatus'];
    if (mNAV >= 3.0) mNAVStatus = 'EXTREME_PREMIUM';
    else if (mNAV >= 1.8) mNAVStatus = 'HIGH_PREMIUM';
    else if (mNAV >= 0.9) mNAVStatus = 'FAIR';
    else if (mNAV >= 0.6) mNAVStatus = 'DISCOUNT';
    else mNAVStatus = 'DEEP_DISCOUNT';

    const btcPerShare = this.balance.btcHeld / this.balance.sharesOutstanding;
    const btcYieldPct = this.balance.startingBTCPerShare > 0
      ? ((btcPerShare - this.balance.startingBTCPerShare) / this.balance.startingBTCPerShare) * 100
      : 0;

    // Cost basis
    const costBasisPerBTC = this.balance.btcHeld > 0 && this.balance.totalBTCSpentMM > 0
      ? (this.balance.totalBTCSpentMM * 1e6) / this.balance.btcHeld
      : this.era.startPrice;
    const unrealizedGainMM = ((btcPrice - costBasisPerBTC) * this.balance.btcHeld) / 1e6;
    const unrealizedGainPct = costBasisPerBTC > 0
      ? ((btcPrice - costBasisPerBTC) / costBasisPerBTC) * 100
      : 0;

    // Dynamic STRC rate — escalates exponentially as preferred exceeds BTC coverage
    const strcRate = computeSTRCRate(btcValueMM, this.balance.preferredFaceValueMM);
    // Monthly costs (dividends paid monthly)
    const monthlyInterest = (this.balance.convertibleDebtMM * this.currentInterestRate) / 12;
    const monthlyPrefDiv = (this.balance.preferredFaceValueMM * strcRate) / 12;
    const monthlyOpex = (this.era.softwareRevenue * 0.85) / 3;
    const monthlyRevenue = this.era.softwareRevenue / 3;
    const monthlyBurn = monthlyInterest + monthlyPrefDiv + monthlyOpex - monthlyRevenue;
    const quarterlyBurnMM = monthlyBurn * 3;
    const monthsRunway = monthlyBurn > 0 ? this.balance.cashMM / monthlyBurn : 999;
    const leverageRatio = btcValueMM > 0 ? totalLiabilitiesMM / btcValueMM : 999;
    const preferredCoverageRatio = this.balance.preferredFaceValueMM > 0
      ? btcValueMM / this.balance.preferredFaceValueMM : 999;

    const sentiment = Math.max(0, Math.min(100, this.sentimentLevel));
    let sentimentLabel: string, sentimentColor: string;
    if (sentiment >= 80) { sentimentLabel = 'EUPHORIC'; sentimentColor = '#a855f7'; }
    else if (sentiment >= 65) { sentimentLabel = 'BULLISH'; sentimentColor = '#22c55e'; }
    else if (sentiment >= 45) { sentimentLabel = 'NEUTRAL'; sentimentColor = '#f59e0b'; }
    else if (sentiment >= 25) { sentimentLabel = 'BEARISH'; sentimentColor = '#ef4444'; }
    else { sentimentLabel = 'PANIC'; sentimentColor = '#7f1d1d'; }

    const atmCooldown = Math.min(100, this.atmIssuanceCount * 25);

    const monthlyPrefDivActual = (this.balance.preferredFaceValueMM * strcRate) / 12;
    let isInsolvent = false, insolventReason: string | undefined;
    if (this.balance.cashMM < -50) {
      isInsolvent = true;
      insolventReason = 'Cash reserves exhausted. Cannot meet obligations.';
    } else if (navPerShare < -10) {
      isInsolvent = true;
      insolventReason = 'Negative equity: liabilities far exceed all assets.';
    } else if (
      this.balance.preferredFaceValueMM > btcValueMM * 3 &&
      this.balance.cashMM < monthlyPrefDivActual * 2 &&
      btcPrice < 0.5 * (this.balance.convertibleDebtMM + this.balance.preferredFaceValueMM) / Math.max(this.balance.btcHeld, 1)
    ) {
      isInsolvent = true;
      insolventReason = 'Preferred dividend obligations are unrecoverable. Common stock goes to zero.';
    }

    return {
      btcPrice, btcValueMM, totalAssetsMM, totalLiabilitiesMM, netAssetValueMM,
      navPerShare, stockPrice, marketCapMM, mNAV, mNAVStatus, btcPerShare,
      btcYieldPct, costBasisPerBTC, unrealizedGainMM, unrealizedGainPct,
      quarterlyBurnMM, monthsRunway, leverageRatio, currentInterestRate: this.currentInterestRate,
      isInsolvent, insolventReason, preferredCoverageRatio,
      sentiment, sentimentLabel, sentimentColor, atmCooldown,
      strcRate,
    };
  }

  tick(btcPrice: number, _dayOfWeek: number): void {
    this.dayCount++;
    const dailyRevenue = this.era.softwareRevenue / 90;
    const dailyOpex = (this.era.softwareRevenue * 0.85) / 90;
    this.balance.cashMM += (dailyRevenue - dailyOpex);
    this.balance.cashMM -= (this.balance.convertibleDebtMM * this.currentInterestRate) / 365;
    const btcValueApprox = (this.balance.btcHeld * btcPrice) / 1e6;
    const dynamicStrcRate = computeSTRCRate(btcValueApprox, this.balance.preferredFaceValueMM);
    const dailyPrefDiv = (this.balance.preferredFaceValueMM * dynamicStrcRate) / 365;
    this.balance.preferredDivAccruedMM += dailyPrefDiv;
    if (this.dayCount % 30 === 0) {
      this.balance.cashMM -= this.balance.preferredDivAccruedMM;
      this.balance.preferredDivAccruedMM = 0;
    }
    if (this.atmCooldownDays > 0) this.atmCooldownDays--;
    if (this.dayCount % 30 === 0 && this.atmIssuanceCount > 0) {
      this.atmIssuanceCount = Math.max(0, this.atmIssuanceCount - 1);
    }
    this.stockPriceMultiplier += (1.0 - this.stockPriceMultiplier) * 0.01;
    this.stockPriceMultiplier = Math.max(0.05, this.stockPriceMultiplier);

    const target = this.computeTargetMNav(btcPrice);
    this.mNAVLevel += (target - this.mNAVLevel) * 0.015 + (Math.random() - 0.5) * 0.04;
    this.mNAVLevel = Math.max(0.1, Math.min(4.0, this.mNAVLevel));

    const sentTarget = this.computeTargetSentiment(btcPrice);
    this.sentimentLevel += (sentTarget - this.sentimentLevel) * 0.02 + (Math.random() - 0.5) * 1.5;
    this.sentimentLevel = Math.max(0, Math.min(100, this.sentimentLevel));
  }

  private computeTargetMNav(btcPrice: number): number {
    const metrics = this.computeMetrics(btcPrice);
    let base = 1.5;
    if (metrics.leverageRatio < 0.3) base += 1.2;
    else if (metrics.leverageRatio < 0.5) base += 0.6;
    else if (metrics.leverageRatio > 1.5) base -= 0.5;
    const btcConc = metrics.btcValueMM / Math.max(metrics.totalAssetsMM, 1);
    base += btcConc * 0.4;
    if (metrics.preferredCoverageRatio < 1.5) base -= 0.8;
    if (metrics.preferredCoverageRatio < 1.0) base -= 0.5;
    base += (this.sentimentLevel - 50) * 0.015;
    return Math.max(0.2, Math.min(4.0, base));
  }

  private computeTargetSentiment(btcPrice: number): number {
    const metrics = this.computeMetrics(btcPrice);
    let base = 50;
    if (metrics.btcValueMM > 5000) base += 15;
    else if (metrics.btcValueMM > 1000) base += 8;
    if (metrics.leverageRatio > 1.5) base -= 20;
    else if (metrics.leverageRatio < 0.3) base += 10;
    if (metrics.monthsRunway < 3) base -= 25;
    else if (metrics.monthsRunway > 24) base += 10;
    base -= this.atmIssuanceCount * 8;
    return Math.max(5, Math.min(95, base));
  }

  private computeBTCTradeImpact(btcAmount: number, isBuy: boolean): TradeImpact {
    const supplyFraction = btcAmount / BTC_SUPPLY_PROXY;
    const rawImpact = supplyFraction * 60;  // amplified for arcade feel — large buys visibly move the chart
    const priceImpactPct = isBuy ? rawImpact : -rawImpact * 1.8;
    const mNavImpact = isBuy ? rawImpact * 0.3 : -rawImpact * 0.8;
    const sentimentImpact = isBuy ? rawImpact * 8 : -rawImpact * 15;
    const stockImpactPct = isBuy ? rawImpact * 0.5 : -rawImpact * 2.5;
    return { priceImpactPct, mNavImpact, sentimentImpact, stockImpactPct };
  }

  issueCommonStock(sharesMM: number, btcPrice: number): { success: boolean; reason?: string; proceedsMM: number; impact: TradeImpact } {
    const empty: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    const metrics = this.computeMetrics(btcPrice);
    if (metrics.stockPrice <= 0) return { success: false, reason: 'Stock price is zero.', proceedsMM: 0, impact: empty };
    if (sharesMM <= 0 || sharesMM > 50) return { success: false, reason: 'Enter 0.1–50M shares.', proceedsMM: 0, impact: empty };

    const proceedsMM = sharesMM * metrics.stockPrice;
    this.balance.sharesOutstanding += sharesMM;
    this.balance.cashMM += proceedsMM;

    const dilutionPct = sharesMM / this.balance.sharesOutstanding;
    const mNavHit = dilutionPct * 2.0 + this.atmIssuanceCount * 0.1;
    this.mNAVLevel = Math.max(0.5, this.mNAVLevel - mNavHit);

    const stockShock = dilutionPct * 1.5 + this.atmIssuanceCount * 0.05;
    this.stockPriceMultiplier *= Math.max(0.5, 1 - stockShock);

    this.atmIssuanceCount++;
    this.atmCooldownDays = 7;
    const sentimentHit = 3 + this.atmIssuanceCount * 4;
    this.sentimentLevel = Math.max(5, this.sentimentLevel - sentimentHit);

    return { success: true, proceedsMM, impact: { priceImpactPct: 0, mNavImpact: -mNavHit, sentimentImpact: -sentimentHit, stockImpactPct: -stockShock * 100 } };
  }

  issuePreferredStock(proceedsMM: number, btcPrice: number): { success: boolean; reason?: string } {
    if (proceedsMM <= 0) return { success: false, reason: 'Invalid amount.' };
    if (proceedsMM > 500) return { success: false, reason: 'Max $500M per issuance.' };
    const metrics = this.computeMetrics(btcPrice);
    if (metrics.mNAV < 0.8) return { success: false, reason: "Market won't buy preferred at this discount." };
    this.balance.preferredFaceValueMM += proceedsMM;
    this.balance.cashMM += proceedsMM;
    this.balance.preferredSharesMM += proceedsMM / PREFERRED_FACE_PER_SHARE;
    return { success: true };
  }

  buyBTC(usdMM: number, btcPrice: number): { success: boolean; reason?: string; btcBought: number; impact: TradeImpact } {
    const empty: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    if (usdMM <= 0) return { success: false, reason: 'Invalid amount.', btcBought: 0, impact: empty };
    if (usdMM > this.balance.cashMM * 0.9501) return { success: false, reason: `Max $${Math.floor(this.balance.cashMM * 0.95)}M (keep 5% reserve).`, btcBought: 0, impact: empty };

    const btcBought = (usdMM * 1e6) / btcPrice;
    this.balance.cashMM -= usdMM;
    this.balance.btcHeld += btcBought;
    this.balance.totalBTCSpentMM += usdMM;

    const impact = this.computeBTCTradeImpact(btcBought, true);
    this.mNAVLevel = Math.min(4.0, this.mNAVLevel + impact.mNavImpact);
    this.sentimentLevel = Math.min(100, this.sentimentLevel + impact.sentimentImpact);
    this.stockPriceMultiplier *= (1 + impact.stockImpactPct / 100);
    return { success: true, btcBought, impact };
  }

  payDownDebt(amountMM: number): { success: boolean; reason?: string } {
    if (amountMM <= 0) return { success: false, reason: 'Invalid amount.' };
    if (amountMM > this.balance.cashMM) return { success: false, reason: 'Insufficient cash.' };
    if (this.balance.convertibleDebtMM <= 0) return { success: false, reason: 'No convertible debt outstanding.' };
    const actual = Math.min(amountMM, this.balance.convertibleDebtMM);
    this.balance.cashMM -= actual;
    this.balance.convertibleDebtMM = Math.max(0, this.balance.convertibleDebtMM - actual);
    this.mNAVLevel = Math.min(4.0, this.mNAVLevel + 0.08);
    this.sentimentLevel = Math.min(100, this.sentimentLevel + 3);
    return { success: true };
  }

  sellBTC(btcAmount: number, btcPrice: number): { success: boolean; reason?: string; proceedsMM: number; impact: TradeImpact } {
    const empty: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    if (btcAmount <= 0) return { success: false, reason: 'Invalid amount.', proceedsMM: 0, impact: empty };
    if (btcAmount > this.balance.btcHeld) return { success: false, reason: `Only have ${this.balance.btcHeld.toFixed(0)} BTC.`, proceedsMM: 0, impact: empty };

    const proceedsMM = (btcAmount * btcPrice) / 1e6;
    this.balance.btcHeld -= btcAmount;
    this.balance.cashMM += proceedsMM;

    const impact = this.computeBTCTradeImpact(btcAmount, false);
    this.mNAVLevel = Math.max(0.1, this.mNAVLevel + impact.mNavImpact);
    this.sentimentLevel = Math.max(0, this.sentimentLevel + impact.sentimentImpact);
    this.stockPriceMultiplier *= Math.max(0.1, 1 + impact.stockImpactPct / 100);
    return { success: true, proceedsMM, impact };
  }

  applyNewsImpact(_priceImpactPct: number, sentimentDelta: number, interestRateDelta?: number) {
    this.sentimentLevel = Math.max(0, Math.min(100, this.sentimentLevel + sentimentDelta));
    if (interestRateDelta) this.adjustInterestRate(interestRateDelta);
    // mNAV loosely follows sentiment shocks
    this.mNAVLevel = Math.max(0.1, Math.min(4.0, this.mNAVLevel + sentimentDelta * 0.015));
  }

  getMNAV(): number { return this.mNAVLevel; }
  getSentiment(): number { return this.sentimentLevel; }
  getEvents(): GameEvent[] { return this.events; }
  addEvent(event: GameEvent): void { this.events.push(event); }
}
