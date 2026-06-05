import type { Era } from '../data/eras';
import type { GameConfig } from '../data/gameConfig';
import { PriceSimulator } from './priceSimulator';
import type { PricePoint } from './priceSimulator';
import { FinancialModel } from './financialModel';
import type { BalanceSheet, GameMetrics, GameEvent } from './financialModel';
import { NEWS_EVENTS } from '../data/newsEvents';
import type { NewsEvent } from '../data/newsEvents';

export type GamePhase = 'RUNNING' | 'PAUSED' | 'GAME_OVER_WIN' | 'GAME_OVER_LOSE';
export type TimeSpeed = 'PAUSED' | '1D' | '1W' | '1M';

export const TIME_SPEEDS: Record<TimeSpeed, { label: string; daysPerTick: number; tickMs: number }> = {
  PAUSED: { label: 'PAUSED', daysPerTick: 0, tickMs: 0 },
  '1D':   { label: '1 DAY/S', daysPerTick: 1,  tickMs: 800 },
  '1W':   { label: '1 WK/S',  daysPerTick: 7,  tickMs: 800 },
  '1M':   { label: '1 MO/S',  daysPerTick: 30, tickMs: 800 },
};

export interface GameState {
  phase: GamePhase;
  era: Era;
  currentDay: number;
  currentDate: string;
  priceHistory: PricePoint[];
  currentPrice: number;
  balance: BalanceSheet;
  metrics: GameMetrics;
  speed: TimeSpeed;
  events: GameEvent[];
  daysSurvived: number;
  totalDays: number;
  notifications: Notification[];
  lastTradeFlash?: 'BUY' | 'SELL' | 'ATM' | null;
  lastNewsEvent?: NewsEvent | null;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export class GameEngine {
  private simulator: PriceSimulator;
  private model: FinancialModel;
  private era: Era;
  private notifications: Notification[] = [];
  private readonly totalGameDays: number = 730;
  private lastTradeFlash: 'BUY' | 'SELL' | 'ATM' | null = null;
  private lastNewsEvent: NewsEvent | null = null;
  private firedEventIds = new Set<string>();

  constructor(era: Era, config?: GameConfig) {
    this.era = era;
    this.simulator = new PriceSimulator(era);
    this.model = new FinancialModel(era, config?.startingCapitalMM);
  }

  getState(): GameState {
    const currentDay = this.simulator.getCurrentDay();
    const currentPrice = this.simulator.getCurrentPrice();
    const metrics = this.model.computeMetrics(currentPrice);
    const flash = this.lastTradeFlash;
    const newsEvt = this.lastNewsEvent;
    this.lastTradeFlash = null;
    this.lastNewsEvent = null;

    return {
      phase: metrics.isInsolvent ? 'GAME_OVER_LOSE' : 'RUNNING',
      era: this.era,
      currentDay,
      currentDate: this.dayToDate(currentDay),
      priceHistory: this.simulator.getRevealedPrices(),
      currentPrice,
      balance: this.model.getBalance(),
      metrics,
      speed: 'PAUSED',
      events: this.model.getEvents(),
      daysSurvived: currentDay,
      totalDays: this.totalGameDays,
      notifications: this.notifications,
      lastTradeFlash: flash,
      lastNewsEvent: newsEvt,
    };
  }

  tick(): void {
    const newPoints = this.simulator.advance(1);
    if (newPoints.length > 0) {
      this.model.tick(newPoints[0].price, this.simulator.getCurrentDay() % 7);
    }
    this.maybeFireNewsEvent();
  }

  tickDays(days: number): void {
    for (let i = 0; i < days; i++) this.tick();
  }

  private maybeFireNewsEvent(): void {
    const day = this.simulator.getCurrentDay();
    const roll = Math.random();

    // ~1.5% chance per day of a significant news event
    if (roll > 0.985) {
      // Filter eligible events for this era
      const eligible = NEWS_EVENTS.filter(e => {
        if (this.firedEventIds.has(e.id)) return false;
        if (e.minDay && day < e.minDay) return false;
        if (e.eraIds && !e.eraIds.includes(this.era.id)) return false;
        return true;
      });

      if (eligible.length > 0) {
        const event = eligible[Math.floor(Math.random() * eligible.length)];
        this.firedEventIds.add(event.id);
        this.lastNewsEvent = event;

        // Apply effects
        this.model.applyNewsImpact(
          event.priceImpactPct,
          event.sentimentDelta,
          event.interestRateDelta
        );
        if (Math.abs(event.priceImpactPct) > 0.001) {
          this.simulator.applyMarketImpact(event.priceImpactPct);
        }

        // Notification
        const type = event.type === 'BULLISH' ? 'info'
          : event.type === 'BEARISH' ? 'warning'
          : 'info';
        this.addNotification(type, `${event.type === 'BULLISH' ? '▲' : event.type === 'BEARISH' ? '▼' : '◆'} ${event.headline}`);

        // Add rate change notification if applicable
        if (event.interestRateDelta) {
          const direction = event.interestRateDelta > 0 ? 'rises' : 'falls';
          this.addNotification('warning',
            `⚡ RATE CHANGE: Debt interest rate ${direction} by ${Math.abs(event.interestRateDelta * 100).toFixed(1)}bps`);
        }
      }
    }
  }

  getConePoints(days: number = 90) { return this.simulator.getConePoints(days); }
  getSimulator() { return this.simulator; }

  buyBTC(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.buyBTC(amountMM, price);
    if (result.success) {
      if (Math.abs(result.impact.priceImpactPct) > 0.001) {
        this.simulator.applyMarketImpact(result.impact.priceImpactPct);
      }
      this.lastTradeFlash = 'BUY';
      const pctStr = result.impact.priceImpactPct > 0.001
        ? ` ↑ BTC +${(result.impact.priceImpactPct * 100).toFixed(1)}%` : '';
      return this.addNotification('success',
        `₿ STACKED ${result.btcBought.toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC for $${amountMM.toFixed(1)}M${pctStr}`);
    }
    return this.addNotification('error', result.reason ?? 'Buy failed');
  }

  sellBTC(btcAmount: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.sellBTC(btcAmount, price);
    if (result.success) {
      if (Math.abs(result.impact.priceImpactPct) > 0.001) {
        this.simulator.applyMarketImpact(result.impact.priceImpactPct);
      }
      this.lastTradeFlash = 'SELL';
      return this.addNotification('warning',
        `📉 SOLD ${btcAmount.toLocaleString()} BTC — stock cratering, sentiment hit!`);
    }
    return this.addNotification('error', result.reason ?? 'Sell failed');
  }

  issueCommonStock(sharesMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issueCommonStock(sharesMM, price);
    if (result.success) {
      this.lastTradeFlash = 'ATM';
      return this.addNotification('success',
        `📈 ATM: ${sharesMM.toFixed(1)}M shares → $${result.proceedsMM.toFixed(1)}M raised`);
    }
    return this.addNotification('error', result.reason ?? 'ATM failed');
  }

  issuePreferredStock(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issuePreferredStock(amountMM, price);
    if (result.success) {
      return this.addNotification('success',
        `💎 $${amountMM.toFixed(0)}M preferred issued @ 8% annual div`);
    }
    return this.addNotification('error', result.reason ?? 'Preferred failed');
  }

  payDownDebt(amountMM: number): Notification {
    const result = this.model.payDownDebt(amountMM);
    if (result.success) {
      return this.addNotification('success',
        `✓ $${amountMM.toFixed(0)}M debt cleared → cleaner balance sheet`);
    }
    return this.addNotification('error', result.reason ?? 'Debt paydown failed');
  }

  private addNotification(type: Notification['type'], message: string): Notification {
    const n: Notification = { id: `n_${Date.now()}_${Math.random()}`, type, message, timestamp: Date.now() };
    this.notifications.unshift(n);
    if (this.notifications.length > 8) this.notifications = this.notifications.slice(0, 8);
    return n;
  }

  private dayToDate(day: number): string {
    const base = new Date(this.era.startYear, this.era.startMonth - 1, 1);
    base.setDate(base.getDate() + day);
    return base.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  checkWin(): boolean {
    const balance = this.model.getBalance();
    const price = this.simulator.getCurrentPrice();
    return (balance.btcHeld * price) / 1e6 > 10000 && this.simulator.getCurrentDay() >= this.totalGameDays;
  }

  getWinScore() {
    const balance = this.model.getBalance();
    const price = this.simulator.getCurrentPrice();
    return { btc: balance.btcHeld, btcValueMM: (balance.btcHeld * price) / 1e6, mNAV: this.model.getMNAV(), daysSurvived: this.simulator.getCurrentDay() };
  }
}
