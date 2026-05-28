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
}

export interface GameEvent {
  id: string;
  day: number;
  type: 'GOOD' | 'BAD' | 'NEUTRAL' | 'CRITICAL';
  title: string;
  description: string;
  effect?: Partial<BalanceSheet>;
}

const PREFERRED_DIV_RATE = 0.08;
const PREFERRED_FACE_PER_SHARE = 0.025;
const STOCK_MARKET_NOISE = 0.05;

export class FinancialModel {
  private era: Era;
  private balance: BalanceSheet;
  private mNAVNoise: number = 1.0;
  private events: GameEvent[] = [];
  private dayCount: number = 0;

  constructor(era: Era, startingCapitalMM?: number) {
    this.era = era;
    this.balance = this.initializeBalance(era, startingCapitalMM);
    this.mNAVNoise = era.id === 'now2024' || era.id === 'future2025' ? 2.8 : 1.5;
  }

  private initializeBalance(era: Era, startingCapitalMM?: number): BalanceSheet {
    const prefShares = era.startingPreferred / PREFERRED_FACE_PER_SHARE;
    const cashMM = startingCapitalMM ?? era.startingCash;
    return {
      btcHeld: era.startingBTC,
      cashMM: cashMM,
      convertibleDebtMM: era.startingDebt,
      preferredFaceValueMM: era.startingPreferred,
      preferredDivRate: PREFERRED_DIV_RATE,
      sharesOutstanding: era.startingShares,
      preferredSharesMM: prefShares,
      preferredDivAccruedMM: 0,
    };
  }

  getBalance(): BalanceSheet {
    return { ...this.balance };
  }

  computeMetrics(btcPrice: number): GameMetrics {
    const btcValueMM = (this.balance.btcHeld * btcPrice) / 1e6;
    const totalAssetsMM = btcValueMM + this.balance.cashMM;
    const totalLiabilitiesMM = this.balance.convertibleDebtMM + this.balance.preferredFaceValueMM;
    const netAssetValueMM = totalAssetsMM - totalLiabilitiesMM;
    const navPerShare = netAssetValueMM / this.balance.sharesOutstanding;

    const mNAV = this.mNAVNoise;
    const stockPrice = Math.max(navPerShare * mNAV, 0.01);

    let mNAVStatus: GameMetrics['mNAVStatus'];
    if (mNAV >= 3.5) mNAVStatus = 'EXTREME_PREMIUM';
    else if (mNAV >= 2.0) mNAVStatus = 'HIGH_PREMIUM';
    else if (mNAV >= 0.9) mNAVStatus = 'FAIR';
    else if (mNAV >= 0.6) mNAVStatus = 'DISCOUNT';
    else mNAVStatus = 'DEEP_DISCOUNT';

    const btcPerShare = this.balance.btcHeld / this.balance.sharesOutstanding;

    const quarterlyInterest = (this.balance.convertibleDebtMM * 0.06) / 4;
    const quarterlyPrefDiv = (this.balance.preferredFaceValueMM * PREFERRED_DIV_RATE) / 4;
    const quarterlyOpex = this.era.softwareRevenue * 0.85;
    const quarterlyRevenue = this.era.softwareRevenue;
    const quarterlyBurnMM = quarterlyInterest + quarterlyPrefDiv + quarterlyOpex - quarterlyRevenue;

    const monthsRunway = quarterlyBurnMM > 0
      ? (this.balance.cashMM / quarterlyBurnMM) * 3
      : 999;

    const leverageRatio = btcValueMM > 0
      ? totalLiabilitiesMM / btcValueMM
      : 999;

    const preferredCoverageRatio = this.balance.preferredFaceValueMM > 0
      ? btcValueMM / this.balance.preferredFaceValueMM
      : 999;

    let isInsolvent = false;
    let insolventReason: string | undefined;

    if (this.balance.cashMM < -50) {
      isInsolvent = true;
      insolventReason = 'Cash reserves exhausted. Cannot meet obligations.';
    } else if (navPerShare < -10 && this.balance.sharesOutstanding > 0) {
      isInsolvent = true;
      insolventReason = 'Negative equity: liabilities far exceed all assets.';
    } else if (
      this.balance.preferredFaceValueMM > btcValueMM * 3 &&
      this.balance.cashMM < quarterlyPrefDiv * 2 &&
      btcPrice < 0.5 * (this.balance.convertibleDebtMM + this.balance.preferredFaceValueMM) / Math.max(this.balance.btcHeld, 1)
    ) {
      isInsolvent = true;
      insolventReason = 'Preferred obligations are a runaway train. No path to recovery.';
    }

    return {
      btcPrice,
      btcValueMM,
      totalAssetsMM,
      totalLiabilitiesMM,
      netAssetValueMM,
      navPerShare,
      stockPrice,
      mNAV,
      mNAVStatus,
      btcPerShare,
      quarterlyBurnMM,
      monthsRunway,
      leverageRatio,
      isInsolvent,
      insolventReason,
      preferredCoverageRatio,
    };
  }

  tick(btcPrice: number, _dayOfWeek: number): void {
    this.dayCount++;

    const dailyRevenue = this.era.softwareRevenue / 90;
    const dailyOpex = (this.era.softwareRevenue * 0.85) / 90;
    this.balance.cashMM += (dailyRevenue - dailyOpex);

    const dailyInterest = (this.balance.convertibleDebtMM * 0.06) / 365;
    this.balance.cashMM -= dailyInterest;

    const dailyPrefDiv = (this.balance.preferredFaceValueMM * PREFERRED_DIV_RATE) / 365;
    this.balance.preferredDivAccruedMM += dailyPrefDiv;

    if (this.dayCount % 90 === 0) {
      this.balance.cashMM -= this.balance.preferredDivAccruedMM;
      this.balance.preferredDivAccruedMM = 0;
    }

    const targetMNav = this.computeTargetMNav(btcPrice);
    this.mNAVNoise += (targetMNav - this.mNAVNoise) * 0.02 + (Math.random() - 0.5) * STOCK_MARKET_NOISE;
    this.mNAVNoise = Math.max(0.1, this.mNAVNoise);
  }

  private computeTargetMNav(btcPrice: number): number {
    const metrics = this.computeMetrics(btcPrice);
    let base = 1.5;

    if (metrics.leverageRatio < 0.3) base += 1.5;
    else if (metrics.leverageRatio < 0.5) base += 0.8;
    else if (metrics.leverageRatio > 1.5) base -= 0.5;

    const btcConcentration = metrics.btcValueMM / Math.max(metrics.totalAssetsMM, 1);
    base += btcConcentration * 0.5;

    if (metrics.preferredCoverageRatio < 1.5) base -= 0.8;
    if (metrics.preferredCoverageRatio < 1.0) base -= 0.5;

    return Math.max(0.2, Math.min(6.0, base));
  }

  issueCommonStock(sharesMM: number, btcPrice: number): { success: boolean; reason?: string; proceedsMM: number } {
    const metrics = this.computeMetrics(btcPrice);
    if (metrics.stockPrice <= 0) return { success: false, reason: 'Stock price is zero.', proceedsMM: 0 };
    if (sharesMM <= 0) return { success: false, reason: 'Invalid share amount.', proceedsMM: 0 };
    if (sharesMM > 50) return { success: false, reason: 'Cannot issue more than 50M shares at once.', proceedsMM: 0 };

    const proceedsMM = sharesMM * metrics.stockPrice;
    const preIssueShares = this.balance.sharesOutstanding;
    const preIssueNavPerShare = metrics.navPerShare;

    this.balance.sharesOutstanding += sharesMM;
    this.balance.cashMM += proceedsMM;

    // When mNAV > 1, issuing shares is NAV/share accretive (selling $2.8 of market cap
    // for $2 of asset backing). Without adjustment, stock price would rise — which is wrong.
    // Correct mNAV downward so stock price stays flat or slightly declines.
    // Formula: mNAV_new = mNAV_old × (navPerShare_old / navPerShare_new) × sentiment_penalty
    const newNavPerShare = this.computeMetrics(btcPrice).navPerShare;
    if (newNavPerShare > 0 && preIssueNavPerShare > 0) {
      const navAccretionFactor = preIssueNavPerShare / newNavPerShare;
      const dilutionPct = sharesMM / preIssueShares;
      const sentimentPenalty = Math.max(0.75, 1 - dilutionPct * 1.5);
      this.mNAVNoise *= navAccretionFactor * sentimentPenalty;
    }
    this.mNAVNoise = Math.max(0.1, this.mNAVNoise);

    return { success: true, proceedsMM };
  }

  issuePreferredStock(proceedsMM: number, btcPrice: number): { success: boolean; reason?: string } {
    if (proceedsMM <= 0) return { success: false, reason: 'Invalid amount.' };
    if (proceedsMM > 500) return { success: false, reason: 'Cannot raise more than $500M preferred at once.' };

    const metrics = this.computeMetrics(btcPrice);
    if (metrics.mNAV < 0.8) return { success: false, reason: "Market won't buy preferred at this mNAV discount." };

    this.balance.preferredFaceValueMM += proceedsMM;
    this.balance.cashMM += proceedsMM;
    this.balance.preferredSharesMM += proceedsMM / PREFERRED_FACE_PER_SHARE;

    return { success: true };
  }

  buyBTC(usdMM: number, btcPrice: number): { success: boolean; reason?: string; btcBought: number } {
    if (usdMM <= 0) return { success: false, reason: 'Invalid amount.', btcBought: 0 };
    if (usdMM > this.balance.cashMM) return { success: false, reason: `Insufficient cash. Have $${this.balance.cashMM.toFixed(1)}M`, btcBought: 0 };
    if (usdMM > this.balance.cashMM * 0.95) return { success: false, reason: 'Must keep 5% cash reserve.', btcBought: 0 };

    const btcBought = (usdMM * 1e6) / btcPrice;
    this.balance.cashMM -= usdMM;
    this.balance.btcHeld += btcBought;
    this.mNAVNoise += 0.05;

    return { success: true, btcBought };
  }

  issueConvertibleDebt(amountMM: number, btcPrice: number): { success: boolean; reason?: string } {
    if (amountMM <= 0) return { success: false, reason: 'Invalid amount.' };
    if (amountMM > 1000) return { success: false, reason: 'Cannot raise more than $1B in convertible notes at once.' };

    const metrics = this.computeMetrics(btcPrice);
    const maxDebt = metrics.btcValueMM * 0.5;
    if (this.balance.convertibleDebtMM + amountMM > maxDebt) {
      return { success: false, reason: `Debt limit: convertible notes can't exceed 50% of BTC value ($${maxDebt.toFixed(0)}M).` };
    }
    if (metrics.mNAV < 0.7) {
      return { success: false, reason: "Bond market won't lend at this mNAV discount — too distressed." };
    }

    this.balance.convertibleDebtMM += amountMM;
    this.balance.cashMM += amountMM;
    // Leverage excites the market short-term but adds risk premium over time
    this.mNAVNoise += 0.1;

    return { success: true };
  }

  buyBackStock(sharesMM: number, btcPrice: number): { success: boolean; reason?: string; costMM: number } {
    const metrics = this.computeMetrics(btcPrice);
    if (sharesMM <= 0) return { success: false, reason: 'Invalid share amount.', costMM: 0 };
    if (sharesMM >= this.balance.sharesOutstanding * 0.1) {
      return { success: false, reason: 'Cannot buy back more than 10% of shares at once.', costMM: 0 };
    }

    const costMM = sharesMM * metrics.stockPrice;
    if (costMM > this.balance.cashMM) {
      return { success: false, reason: `Insufficient cash. Need $${costMM.toFixed(1)}M, have $${this.balance.cashMM.toFixed(1)}M`, costMM: 0 };
    }
    if (metrics.mNAV > 1.5) {
      return { success: false, reason: 'Buybacks at this premium destroy NAV per share. Wait for a discount.', costMM: 0 };
    }

    this.balance.sharesOutstanding -= sharesMM;
    this.balance.cashMM -= costMM;
    // Buybacks signal confidence, boost mNAV
    this.mNAVNoise += 0.12;

    return { success: true, costMM };
  }

  payDownDebt(amountMM: number): { success: boolean; reason?: string } {
    if (amountMM <= 0) return { success: false, reason: 'Invalid amount.' };
    if (amountMM > this.balance.cashMM) return { success: false, reason: 'Insufficient cash.' };
    if (this.balance.convertibleDebtMM <= 0) return { success: false, reason: 'No convertible debt outstanding.' };

    const actual = Math.min(amountMM, this.balance.convertibleDebtMM);
    this.balance.cashMM -= actual;
    this.balance.convertibleDebtMM = Math.max(0, this.balance.convertibleDebtMM - actual);
    this.mNAVNoise += 0.08;

    return { success: true };
  }

  sellBTC(btcAmount: number, btcPrice: number): { success: boolean; reason?: string; proceedsMM: number } {
    if (btcAmount <= 0) return { success: false, reason: 'Invalid amount.', proceedsMM: 0 };
    if (btcAmount > this.balance.btcHeld) return { success: false, reason: `Only have ${this.balance.btcHeld.toFixed(0)} BTC.`, proceedsMM: 0 };

    const proceedsMM = (btcAmount * btcPrice) / 1e6;
    this.balance.btcHeld -= btcAmount;
    this.balance.cashMM += proceedsMM;
    this.mNAVNoise = Math.max(0.1, this.mNAVNoise - 0.15);

    return { success: true, proceedsMM };
  }

  getMNAV(): number {
    return this.mNAVNoise;
  }

  applyMNavShock(delta: number): void {
    this.mNAVNoise = Math.max(0.1, this.mNAVNoise + delta);
  }

  getEvents(): GameEvent[] {
    return this.events;
  }

  addEvent(event: GameEvent): void {
    this.events.push(event);
  }
}
