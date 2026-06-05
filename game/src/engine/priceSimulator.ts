import type { Era } from '../data/eras';

export interface PricePoint {
  day: number;
  price: number;
  isHistorical: boolean;
  isProjected: boolean;
}

export class PriceSimulator {
  private era: Era;
  private currentDay: number = 0;
  private prices: PricePoint[] = [];
  private seed: number;
  private futureCache: number[] = [];

  constructor(era: Era, seed?: number) {
    this.era = era;
    this.seed = seed ?? Math.floor(Math.random() * 1e9);
    this.initialize();
  }

  private seededRandom(): number {
    this.seed |= 0;
    this.seed = this.seed + 0x6D2B79F5 | 0;
    let t = Math.imul(this.seed ^ this.seed >>> 15, 1 | this.seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.seededRandom();
    while (v === 0) v = this.seededRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private initialize(): void {
    const historical = this.era.historicalPrices;
    const points: PricePoint[] = [];

    if (historical.length > 0) {
      for (let i = 0; i < historical.length; i++) {
        points.push({ day: i, price: historical[i], isHistorical: true, isProjected: false });
      }
    } else {
      points.push({ day: 0, price: this.era.startPrice, isHistorical: false, isProjected: false });
    }

    this.prices = points;
    this.currentDay = points.length - 1;
    this.futureCache = this.generateFuturePath(720);
  }

  private generateFuturePath(days: number): number[] {
    const { volatility, drift, jumpFreq, jumpMean, jumpStd } = this.era;
    const dt = 1 / 365;
    const sqrtDt = Math.sqrt(dt);
    let price = this.prices[this.prices.length - 1].price;
    const path: number[] = [];

    for (let i = 0; i < days; i++) {
      const z = this.gaussianRandom();
      const gbm = (drift - 0.5 * volatility * volatility) * dt + volatility * sqrtDt * z;
      let jump = 0;
      if (this.seededRandom() < jumpFreq * dt) {
        jump = jumpMean + jumpStd * this.gaussianRandom();
      }
      price = Math.max(price * Math.exp(gbm + jump), 1);
      path.push(price);
    }
    return path;
  }

  regenerateFuture(): void {
    this.seed = Math.floor(Math.random() * 1e9);
    this.futureCache = this.generateFuturePath(720);
  }

  advance(days: number = 1): PricePoint[] {
    const newPoints: PricePoint[] = [];
    const histLen = this.era.historicalPrices.length;

    for (let i = 0; i < days; i++) {
      this.currentDay++;
      const futureIdx = this.currentDay - histLen;

      if (futureIdx < 0) {
        const price = this.era.historicalPrices[this.currentDay];
        const point: PricePoint = { day: this.currentDay, price, isHistorical: true, isProjected: false };
        this.prices.push(point);
        newPoints.push(point);
      } else if (futureIdx < this.futureCache.length) {
        const price = this.futureCache[futureIdx];
        const point: PricePoint = { day: this.currentDay, price, isHistorical: false, isProjected: false };
        this.prices.push(point);
        newPoints.push(point);
      }
    }
    return newPoints;
  }

  // Apply immediate market impact from a large trade (arcade feel)
  applyMarketImpact(impactPct: number): void {
    if (this.prices.length === 0) return;
    const last = this.prices[this.prices.length - 1];
    const newPrice = Math.max(last.price * (1 + impactPct), 1);
    this.prices[this.prices.length - 1] = { ...last, price: newPrice };

    // Shift remaining future cache proportionally
    const ratio = newPrice / last.price;
    this.futureCache = this.futureCache.map(p => p * ratio);
  }

  getCurrentPrice(): number {
    return this.prices[this.prices.length - 1]?.price ?? this.era.startPrice;
  }

  getRevealedPrices(): PricePoint[] {
    return this.prices;
  }

  getCone(days: number = 90): { upper: number[]; lower: number[]; median: number[] } {
    const currentPrice = this.getCurrentPrice();
    const { volatility, drift } = this.era;
    const dt = 1 / 365;
    const upper: number[] = [], lower: number[] = [], median: number[] = [];

    for (let i = 1; i <= days; i++) {
      const t = i * dt;
      const logMean = Math.log(currentPrice) + (drift - 0.5 * volatility * volatility) * t;
      const logStd = volatility * Math.sqrt(t);
      upper.push(Math.exp(logMean + 1.28 * logStd));
      lower.push(Math.exp(logMean - 1.28 * logStd));
      median.push(Math.exp(logMean));
    }
    return { upper, lower, median };
  }

  getConePoints(days: number = 90): Array<{ day: number; upper: number; lower: number; median: number }> {
    const cone = this.getCone(days);
    return cone.upper.map((upper, i) => ({
      day: this.currentDay + i + 1,
      upper,
      lower: cone.lower[i],
      median: cone.median[i],
    }));
  }

  getCurrentDay(): number { return this.currentDay; }

  isInHistorical(): boolean {
    return this.currentDay < this.era.historicalPrices.length;
  }
}
