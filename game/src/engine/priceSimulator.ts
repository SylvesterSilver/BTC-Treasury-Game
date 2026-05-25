import type { Era } from '../data/eras';

export interface PricePoint {
  day: number;
  price: number;
  isHistorical: boolean;
  isProjected: boolean;
  coneUpper?: number;
  coneLower?: number;
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
    // Mulberry32 PRNG
    this.seed |= 0;
    this.seed = this.seed + 0x6D2B79F5 | 0;
    let t = Math.imul(this.seed ^ this.seed >>> 15, 1 | this.seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  private gaussianRandom(): number {
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = this.seededRandom();
    while (v === 0) v = this.seededRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private initialize(): void {
    const historical = this.era.historicalPrices;
    const points: PricePoint[] = [];

    if (historical.length > 0) {
      // Load historical portion
      for (let i = 0; i < historical.length; i++) {
        points.push({
          day: i,
          price: historical[i],
          isHistorical: true,
          isProjected: false,
        });
      }
    } else {
      // Pure future scenario - start with single point
      points.push({
        day: 0,
        price: this.era.startPrice,
        isHistorical: false,
        isProjected: false,
      });
    }

    this.prices = points;
    this.currentDay = points.length - 1;

    // Pre-generate future price path (720 days = ~2 years)
    this.futureCache = this.generateFuturePath(720);
  }

  private generateFuturePath(days: number): number[] {
    const { volatility, drift, jumpFreq, jumpMean, jumpStd } = this.era;
    const dt = 1 / 365;
    const sqrtDt = Math.sqrt(dt);

    let price = this.prices[this.prices.length - 1].price;
    const path: number[] = [];

    for (let i = 0; i < days; i++) {
      // GBM component
      const z = this.gaussianRandom();
      const gbm = (drift - 0.5 * volatility * volatility) * dt + volatility * sqrtDt * z;

      // Jump-diffusion (Merton model)
      let jump = 0;
      const jumpProb = jumpFreq * dt;
      if (this.seededRandom() < jumpProb) {
        const jumpSize = jumpMean + jumpStd * this.gaussianRandom();
        jump = jumpSize;
      }

      price = price * Math.exp(gbm + jump);
      price = Math.max(price, 1);
      path.push(price);
    }

    return path;
  }

  // Regenerate future with fresh randomness (called on game reset or era change)
  regenerateFuture(): void {
    this.seed = Math.floor(Math.random() * 1e9);
    this.futureCache = this.generateFuturePath(720);
  }

  // Advance simulation by N days, returns new price points
  advance(days: number = 1): PricePoint[] {
    const newPoints: PricePoint[] = [];
    const histLen = this.era.historicalPrices.length;

    for (let i = 0; i < days; i++) {
      this.currentDay++;
      const futureIdx = this.currentDay - histLen;

      if (futureIdx < 0) {
        // Still in historical
        const price = this.era.historicalPrices[this.currentDay];
        const point: PricePoint = {
          day: this.currentDay,
          price,
          isHistorical: true,
          isProjected: false,
        };
        this.prices.push(point);
        newPoints.push(point);
      } else if (futureIdx < this.futureCache.length) {
        const price = this.futureCache[futureIdx];
        const point: PricePoint = {
          day: this.currentDay,
          price,
          isHistorical: false,
          isProjected: false,
        };
        this.prices.push(point);
        newPoints.push(point);
      }
    }

    return newPoints;
  }

  // Get current price
  getCurrentPrice(): number {
    return this.prices[this.prices.length - 1]?.price ?? this.era.startPrice;
  }

  // Get all revealed price points
  getRevealedPrices(): PricePoint[] {
    return this.prices;
  }

  // Get cone of uncertainty for next N days
  getCone(days: number = 90): { upper: number[]; lower: number[]; median: number[] } {
    const currentPrice = this.getCurrentPrice();
    const { volatility, drift } = this.era;
    const dt = 1 / 365;

    const upper: number[] = [];
    const lower: number[] = [];
    const median: number[] = [];

    for (let i = 1; i <= days; i++) {
      const t = i * dt;
      const logMean = Math.log(currentPrice) + (drift - 0.5 * volatility * volatility) * t;
      const logStd = volatility * Math.sqrt(t);

      // 80% confidence interval
      upper.push(Math.exp(logMean + 1.28 * logStd));
      lower.push(Math.exp(logMean - 1.28 * logStd));
      median.push(Math.exp(logMean));
    }

    return { upper, lower, median };
  }

  // Get cone as chart-friendly data points
  getConePoints(days: number = 90): Array<{ day: number; upper: number; lower: number; median: number }> {
    const cone = this.getCone(days);
    return cone.upper.map((upper, i) => ({
      day: this.currentDay + i + 1,
      upper,
      lower: cone.lower[i],
      median: cone.median[i],
    }));
  }

  getCurrentDay(): number {
    return this.currentDay;
  }

  isInHistorical(): boolean {
    return this.currentDay < this.era.historicalPrices.length;
  }
}
