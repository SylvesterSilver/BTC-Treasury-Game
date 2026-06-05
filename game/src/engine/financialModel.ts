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
}

export interface GameMetrics {
  btcPrice: number;
  btcValueMM: number;
  totalAssetsMM: number;
  totalLiabilitiesMM: number;
  netAssetValueMM: number;
  navPerShare: number;
  stockPrice: number;
  mNAV: number;
  mNAVStatus: 'EXTREME_PREMIUM' | 'HIGH_PREMIUM' | 'FAIR' | 'DISCOUNT' | 'DEEP_DISCOUNT';
  btcPerShare: number;
  quarterlyBurnMM: number;
  monthsRunway: number;
  leverageRatio: number;
  isInsolvent: boolean;
  insolventReason?: string;
  preferredCoverageRatio: number;
  sentiment: number;           // 0–100
  sentimentLabel: string;
  sentimentColor: string;
  atmCooldown: number;         // 0–100, how "used up" ATM issuance is
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
  priceImpactPct: number;    // immediate BTC price move
  mNavImpact: number;        // immediate mNAV delta
  sentimentImpact: number;   // immediate sentiment delta
  stockImpactPct: number;    // immediate stock price % move
}

const PREFERRED_DIV_RATE = 0.08;
const PREFERRED_FACE_PER_SHARE = 0.025;
// BTC circulating supply proxy for impact calc
const BTC_SUPPLY_PROXY = 19_700_000;

export class FinancialModel {
  private era: Era;
  private balance: BalanceSheet;
  private mNAVLevel: number = 1.5;
  private sentimentLevel: number = 50;   // 0–100
  private atmIssuanceCount: number = 0;  // times ATM used in last 30 days
  private atmCooldownDays: number = 0;   // days since last ATM use
  private stockPriceMultiplier: number = 1.0; // extra stock shock layer
  private events: GameEvent[] = [];
  private dayCount: number = 0;

  constructor(era: Era, startingCapitalMM?: number) {
    this.era = era;
    this.balance = this.initializeBalance(era, startingCapitalMM);
    this.mNAVLevel = era.id === 'now2024' || era.id === 'future2025' ? 2.8 : 1.5;
    this.sentimentLevel = 50;
  }

  private initializeBalance(era: Era, startingCapitalMM?: number): BalanceSheet {
    const prefShares = era.startingPreferred / PREFERRED_FACE_PER_SHARE;
    return {
      btcHeld: era.startingBTC,
      cashMM: startingCapitalMM ?? era.startingCash,
      convertibleDebtMM: era.startingDebt,
      preferredFaceValueMM: era.startingPreferred,
      preferredDivRate: PREFERRED_DIV_RATE,
      sharesOutstanding: era.startingShares,
      preferredSharesMM: prefShares,
      preferredDivAccruedMM: 0,
    };
  }

  getBalance(): BalanceSheet { return { ...this.balance }; }

  computeMetrics(btcPrice: number): GameMetrics {
    const btcValueMM = (this.balance.btcHeld * btcPrice) / 1e6;
    const totalAssetsMM = btcValueMM + this.balance.cashMM;
    const totalLiabilitiesMM = this.balance.convertibleDebtMM + this.balance.preferredFaceValueMM;
    const netAssetValueMM = totalAssetsMM - totalLiabilitiesMM;
    const navPerShare = netAssetValueMM / this.balance.sharesOutstanding;

    // mNAV capped at 4x realistically; ATM issuance compresses it
    const mNAV = Math.min(this.mNAVLevel, 4.0);
    const rawStockPrice = Math.max(navPerShare * mNAV, 0.01);
    const stockPrice = Math.max(rawStockPrice * this.stockPriceMultiplier, 0.01);

    let mNAVStatus: GameMetrics['mNAVStatus'];
    if (mNAV >= 3.0) mNAVStatus = 'EXTREME_PREMIUM';
    else if (mNAV >= 1.8) mNAVStatus = 'HIGH_PREMIUM';
    else if (mNAV >= 0.9) mNAVStatus = 'FAIR';
    else if (mNAV >= 0.6) mNAVStatus = 'DISCOUNT';
    else mNAVStatus = 'DEEP_DISCOUNT';

    const btcPerShare = this.balance.btcHeld / this.balance.sharesOutstanding;

    // Monthly cost (dividends paid monthly now)
    const monthlyInterest = (this.balance.convertibleDebtMM * 0.06) / 12;
    const monthlyPrefDiv = (this.balance.preferredFaceValueMM * PREFERRED_DIV_RATE) / 12;
    const monthlyOpex = (this.era.softwareRevenue * 0.85) / 3;
    const monthlyRevenue = this.era.softwareRevenue / 3;
    const monthlyBurn = monthlyInterest + monthlyPrefDiv + monthlyOpex - monthlyRevenue;
    // Convert to quarterly for display compatibility
    const quarterlyBurnMM = monthlyBurn * 3;

    const monthsRunway = monthlyBurn > 0 ? this.balance.cashMM / monthlyBurn : 999;
    const leverageRatio = btcValueMM > 0 ? totalLiabilitiesMM / btcValueMM : 999;
    const preferredCoverageRatio = this.balance.preferredFaceValueMM > 0
      ? btcValueMM / this.balance.preferredFaceValueMM : 999;

    // Sentiment label/color
    const sentiment = Math.max(0, Math.min(100, this.sentimentLevel));
    let sentimentLabel: string;
    let sentimentColor: string;
    if (sentiment >= 80) { sentimentLabel = 'EUPHORIC'; sentimentColor = '#a855f7'; }
    else if (sentiment >= 65) { sentimentLabel = 'BULLISH'; sentimentColor = '#22c55e'; }
    else if (sentiment >= 45) { sentimentLabel = 'NEUTRAL'; sentimentColor = '#f59e0b'; }
    else if (sentiment >= 25) { sentimentLabel = 'BEARISH'; sentimentColor = '#ef4444'; }
    else { sentimentLabel = 'PANIC'; sentimentColor = '#7f1d1d'; }

    const atmCooldown = Math.min(100, this.atmIssuanceCount * 25);

    // Insolvency check
    const monthlyPrefDivActual = (this.balance.preferredFaceValueMM * PREFERRED_DIV_RATE) / 12;
    let isInsolvent = false;
    let insolventReason: string | undefined;
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
      navPerShare, stockPrice, mNAV, mNAVStatus, btcPerShare,
      quarterlyBurnMM, monthsRunway, leverageRatio,
      isInsolvent, insolventReason, preferredCoverageRatio,
      sentiment, sentimentLabel, sentimentColor, atmCooldown,
    };
  }

  tick(btcPrice: number, _dayOfWeek: number): void {
    this.dayCount++;

    // Daily software ops
    const dailyRevenue = this.era.softwareRevenue / 90;
    const dailyOpex = (this.era.softwareRevenue * 0.85) / 90;
    this.balance.cashMM += (dailyRevenue - dailyOpex);

    // Daily interest
    this.balance.cashMM -= (this.balance.convertibleDebtMM * 0.06) / 365;

    // Daily preferred div accrual
    const dailyPrefDiv = (this.balance.preferredFaceValueMM * PREFERRED_DIV_RATE) / 365;
    this.balance.preferredDivAccruedMM += dailyPrefDiv;

    // Pay preferred dividends MONTHLY (every 30 days)
    if (this.dayCount % 30 === 0) {
      this.balance.cashMM -= this.balance.preferredDivAccruedMM;
      this.balance.preferredDivAccruedMM = 0;
    }

    // ATM cooldown recovery
    if (this.atmCooldownDays > 0) {
      this.atmCooldownDays--;
    }
    if (this.dayCount % 30 === 0 && this.atmIssuanceCount > 0) {
      this.atmIssuanceCount = Math.max(0, this.atmIssuanceCount - 1);
    }

    // Restore stock price multiplier gradually
    this.stockPriceMultiplier += (1.0 - this.stockPriceMultiplier) * 0.01;
    this.stockPriceMultiplier = Math.max(0.05, this.stockPriceMultiplier);

    // Drift mNAV toward target
    const target = this.computeTargetMNav(btcPrice);
    this.mNAVLevel += (target - this.mNAVLevel) * 0.015 + (Math.random() - 0.5) * 0.04;
    this.mNAVLevel = Math.max(0.1, Math.min(4.0, this.mNAVLevel));

    // Drift sentiment
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

    // Sentiment boost
    base += (this.sentimentLevel - 50) * 0.015;

    return Math.max(0.2, Math.min(4.0, base));
  }

  private computeTargetSentiment(btcPrice: number): number {
    const metrics = this.computeMetrics(btcPrice);
    let base = 50;

    // BTC treasury quality
    if (metrics.btcValueMM > 5000) base += 15;
    else if (metrics.btcValueMM > 1000) base += 8;

    // Leverage risk
    if (metrics.leverageRatio > 1.5) base -= 20;
    else if (metrics.leverageRatio < 0.3) base += 10;

    // Runway
    if (metrics.monthsRunway < 3) base -= 25;
    else if (metrics.monthsRunway > 24) base += 10;

    // ATM overuse penalty
    base -= this.atmIssuanceCount * 8;

    return Math.max(5, Math.min(95, base));
  }

  // Compute price impact from a BTC trade
  private computeBTCTradeImpact(btcAmount: number, isBuy: boolean): TradeImpact {
    // Market impact: relative to circulating supply
    const supplyFraction = btcAmount / BTC_SUPPLY_PROXY;
    const rawImpact = supplyFraction * 25; // 1% of supply = 25% price move (arcade-tuned)
    const priceImpactPct = isBuy ? rawImpact : -rawImpact * 1.8; // sells hit harder

    const mNavImpact = isBuy ? rawImpact * 0.3 : -rawImpact * 0.8;
    const sentimentImpact = isBuy ? rawImpact * 8 : -rawImpact * 15;
    // Stock tanks hard on BTC sell
    const stockImpactPct = isBuy ? rawImpact * 0.5 : -rawImpact * 2.5;

    return { priceImpactPct, mNavImpact, sentimentImpact, stockImpactPct };
  }

  // --- ACTIONS ---

  issueCommonStock(sharesMM: number, btcPrice: number): { success: boolean; reason?: string; proceedsMM: number; impact: TradeImpact } {
    const emptyImpact: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    const metrics = this.computeMetrics(btcPrice);
    if (metrics.stockPrice <= 0) return { success: false, reason: 'Stock price is zero.', proceedsMM: 0, impact: emptyImpact };
    if (sharesMM <= 0 || sharesMM > 50) return { success: false, reason: 'Enter 0.1–50M shares.', proceedsMM: 0, impact: emptyImpact };

    const proceedsMM = sharesMM * metrics.stockPrice;
    this.balance.sharesOutstanding += sharesMM;
    this.balance.cashMM += proceedsMM;

    // Each ATM use compresses mNAV — harder if used frequently
    const dilutionPct = sharesMM / this.balance.sharesOutstanding;
    const mNavHit = dilutionPct * 2.0 + this.atmIssuanceCount * 0.1;
    this.mNAVLevel = Math.max(0.5, this.mNAVLevel - mNavHit);

    // Stock price shock from dilution
    const stockShock = dilutionPct * 1.5 + this.atmIssuanceCount * 0.05;
    this.stockPriceMultiplier *= Math.max(0.5, 1 - stockShock);

    // Sentiment penalty for overuse
    this.atmIssuanceCount++;
    this.atmCooldownDays = 7;
    const sentimentHit = 3 + this.atmIssuanceCount * 4;
    this.sentimentLevel = Math.max(5, this.sentimentLevel - sentimentHit);

    const impact: TradeImpact = {
      priceImpactPct: 0,
      mNavImpact: -mNavHit,
      sentimentImpact: -sentimentHit,
      stockImpactPct: -stockShock * 100,
    };
    return { success: true, proceedsMM, impact };
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
    const emptyImpact: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    if (usdMM <= 0) return { success: false, reason: 'Invalid amount.', btcBought: 0, impact: emptyImpact };
    if (usdMM > this.balance.cashMM * 0.95) return { success: false, reason: `Max $${(this.balance.cashMM * 0.95).toFixed(0)}M (keep 5% reserve).`, btcBought: 0, impact: emptyImpact };

    const btcBought = (usdMM * 1e6) / btcPrice;
    this.balance.cashMM -= usdMM;
    this.balance.btcHeld += btcBought;

    const impact = this.computeBTCTradeImpact(btcBought, true);

    // Apply effects
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
    const emptyImpact: TradeImpact = { priceImpactPct: 0, mNavImpact: 0, sentimentImpact: 0, stockImpactPct: 0 };
    if (btcAmount <= 0) return { success: false, reason: 'Invalid amount.', proceedsMM: 0, impact: emptyImpact };
    if (btcAmount > this.balance.btcHeld) return { success: false, reason: `Only have ${this.balance.btcHeld.toFixed(0)} BTC.`, proceedsMM: 0, impact: emptyImpact };

    const proceedsMM = (btcAmount * btcPrice) / 1e6;
    this.balance.btcHeld -= btcAmount;
    this.balance.cashMM += proceedsMM;

    const impact = this.computeBTCTradeImpact(btcAmount, false);

    // Sell BTC = massive stock price crater
    this.mNAVLevel = Math.max(0.1, this.mNAVLevel + impact.mNavImpact);
    this.sentimentLevel = Math.max(0, this.sentimentLevel + impact.sentimentImpact);
    this.stockPriceMultiplier *= Math.max(0.1, 1 + impact.stockImpactPct / 100);

    return { success: true, proceedsMM, impact };
  }

  getMNAV(): number { return this.mNAVLevel; }
  getSentiment(): number { return this.sentimentLevel; }
  getEvents(): GameEvent[] { return this.events; }
  addEvent(event: GameEvent): void { this.events.push(event); }
}
