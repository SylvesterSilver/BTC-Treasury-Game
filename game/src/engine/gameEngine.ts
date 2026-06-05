import type { Era } from '../data/eras';
import type { GameConfig } from '../data/gameConfig';
import { PriceSimulator } from './priceSimulator';
import type { PricePoint } from './priceSimulator';
import { FinancialModel } from './financialModel';
import type { BalanceSheet, GameMetrics, GameEvent } from './financialModel';

export type GamePhase = 'RUNNING' | 'PAUSED' | 'GAME_OVER_WIN' | 'GAME_OVER_LOSE';
export type TimeSpeed = 'PAUSED' | '1D' | '1W' | '1M';

export const TIME_SPEEDS: Record<TimeSpeed, { label: string; daysPerTick: number; tickMs: number }> = {
  PAUSED: { label: 'PAUSED', daysPerTick: 0, tickMs: 0 },
  '1D':   { label: '1 DAY/S', daysPerTick: 1, tickMs: 800 },
  '1W':   { label: '1 WK/S',  daysPerTick: 7, tickMs: 800 },
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
    this.lastTradeFlash = null;

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
    };
  }

  tick(): void {
    const newPoints = this.simulator.advance(1);
    if (newPoints.length > 0) {
      this.model.tick(newPoints[0].price, this.simulator.getCurrentDay() % 7);
    }
    this.maybeFireEvent();
  }

  tickDays(days: number): void {
    for (let i = 0; i < days; i++) this.tick();
  }

  private maybeFireEvent(): void {
    if (Math.random() > 0.99) {
      const day = this.simulator.getCurrentDay();
      const events: GameEvent[] = [
        { id: `ev_${day}_etf`, day, type: 'GOOD', title: 'ETF INFLOW SURGE', description: 'Bitcoin ETFs see record weekly inflows.' },
        { id: `ev_${day}_hack`, day, type: 'BAD', title: 'EXCHANGE HACK', description: 'Major exchange breached — fear spreads.' },
        { id: `ev_${day}_fed`, day, type: 'NEUTRAL', title: 'FED HOLDS RATES', description: 'Federal Reserve holds. Risk assets breathe.' },
        { id: `ev_${day}_nation`, day, type: 'GOOD', title: 'NATION-STATE BUYS', description: 'Sovereign fund adds Bitcoin to reserves.' },
        { id: `ev_${day}_sec`, day, type: 'BAD', title: 'REGULATORY CRACKDOWN', description: 'SEC targets crypto lending platforms.' },
        { id: `ev_${day}_halving`, day, type: 'GOOD', title: 'HALVING BUZZ', description: 'Supply shock narrative explodes on social media.' },
        { id: `ev_${day}_whale`, day, type: 'BAD', title: 'WHALE DUMP DETECTED', description: 'On-chain data shows massive BTC outflow to exchanges.' },
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      this.model.addEvent(event);
      this.addNotification(
        event.type === 'GOOD' ? 'info' : event.type === 'BAD' ? 'warning' : 'info',
        `⚡ ${event.title}: ${event.description}`
      );
    }
  }

  getConePoints(days: number = 90) { return this.simulator.getConePoints(days); }
  getSimulator() { return this.simulator; }

  // --- ACTIONS ---

  buyBTC(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.buyBTC(amountMM, price);
    if (result.success) {
      // Apply price impact to the chart
      if (Math.abs(result.impact.priceImpactPct) > 0.001) {
        this.simulator.applyMarketImpact(result.impact.priceImpactPct);
      }
      this.lastTradeFlash = 'BUY';
      const pctStr = result.impact.priceImpactPct > 0.001
        ? ` ↑ BTC +${(result.impact.priceImpactPct * 100).toFixed(1)}%`
        : '';
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
        `📈 ATM: ${sharesMM.toFixed(1)}M shares → $${result.proceedsMM.toFixed(1)}M raised. mNAV compressed.`);
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
    const btcValueMM = (balance.btcHeld * price) / 1e6;
    return btcValueMM > 10000 && this.simulator.getCurrentDay() >= this.totalGameDays;
  }

  getWinScore() {
    const balance = this.model.getBalance();
    const price = this.simulator.getCurrentPrice();
    return {
      btc: balance.btcHeld,
      btcValueMM: (balance.btcHeld * price) / 1e6,
      mNAV: this.model.getMNAV(),
      daysSurvived: this.simulator.getCurrentDay(),
    };
  }
}
