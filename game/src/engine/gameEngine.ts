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
  winScore: number;
  daysSurvived: number;
  totalDays: number;
  notifications: Notification[];
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

  constructor(era: Era, config?: GameConfig) {
    this.era = era;
    this.simulator = new PriceSimulator(era);
    this.model = new FinancialModel(era, config?.startingCapitalMM);
  }

  getState(): GameState {
    const currentDay = this.simulator.getCurrentDay();
    const currentPrice = this.simulator.getCurrentPrice();
    const metrics = this.model.computeMetrics(currentPrice);

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
      winScore: this.model.getBalance().btcHeld,
      daysSurvived: currentDay,
      totalDays: this.totalGameDays,
      notifications: this.notifications,
    };
  }

  tick(): void {
    const newPoints = this.simulator.advance(1);
    if (newPoints.length > 0) {
      const price = newPoints[0].price;
      this.model.tick(price, this.simulator.getCurrentDay() % 7);
    }
    this.maybeFireEvent();
  }

  tickDays(days: number): void {
    for (let i = 0; i < days; i++) {
      this.tick();
    }
  }

  private maybeFireEvent(): void {
    const roll = Math.random();
    const day = this.simulator.getCurrentDay();

    if (roll > 0.99) {
      const events: GameEvent[] = [
        {
          id: `ev_${day}_etf`,
          day,
          type: 'GOOD',
          title: 'ETF INFLOW SURGE',
          description: 'Bitcoin ETFs see record weekly inflows. Institutional demand spikes.',
        },
        {
          id: `ev_${day}_hack`,
          day,
          type: 'BAD',
          title: 'MAJOR EXCHANGE HACK',
          description: 'A top-5 exchange is hacked. Market sells off on fear.',
        },
        {
          id: `ev_${day}_fed`,
          day,
          type: 'NEUTRAL',
          title: 'FED HOLDS RATES',
          description: 'Federal Reserve holds rates steady. Risk assets stabilize.',
        },
        {
          id: `ev_${day}_nation`,
          day,
          type: 'GOOD',
          title: 'NATION-STATE ADOPTION',
          description: 'Another country adds Bitcoin to its sovereign reserves.',
        },
        {
          id: `ev_${day}_sec`,
          day,
          type: 'BAD',
          title: 'SEC ENFORCEMENT ACTION',
          description: 'The SEC announces crackdown on crypto lending. Market dips.',
        },
      ];

      const event = events[Math.floor(Math.random() * events.length)];
      this.model.addEvent(event);
      this.addNotification(
        event.type === 'GOOD' ? 'info' : event.type === 'BAD' ? 'warning' : 'info',
        `${event.title}: ${event.description}`
      );
    }
  }

  getConePoints(days: number = 90) {
    return this.simulator.getConePoints(days);
  }

  getSimulator() {
    return this.simulator;
  }

  // --- ACTIONS ---

  buyBTC(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.buyBTC(amountMM, price);
    if (result.success) {
      return this.addNotification('success',
        `Bought ${result.btcBought.toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC for $${amountMM.toFixed(1)}M`);
    } else {
      return this.addNotification('error', result.reason ?? 'Buy failed');
    }
  }

  sellBTC(btcAmount: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.sellBTC(btcAmount, price);
    if (result.success) {
      return this.addNotification('warning',
        `Sold ${btcAmount.toLocaleString()} BTC for $${result.proceedsMM.toFixed(1)}M ⚠ mNAV impact`);
    } else {
      return this.addNotification('error', result.reason ?? 'Sell failed');
    }
  }

  issueCommonStock(sharesMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issueCommonStock(sharesMM, price);
    if (result.success) {
      return this.addNotification('success',
        `Issued ${sharesMM.toFixed(1)}M shares, raised $${result.proceedsMM.toFixed(1)}M`);
    } else {
      return this.addNotification('error', result.reason ?? 'Issuance failed');
    }
  }

  issuePreferredStock(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issuePreferredStock(amountMM, price);
    if (result.success) {
      return this.addNotification('success',
        `Raised $${amountMM.toFixed(0)}M via preferred stock @ 8% annual dividend`);
    } else {
      return this.addNotification('error', result.reason ?? 'Preferred issuance failed');
    }
  }

  payDownDebt(amountMM: number): Notification {
    const result = this.model.payDownDebt(amountMM);
    if (result.success) {
      return this.addNotification('success',
        `Paid down $${amountMM.toFixed(0)}M convertible debt → stronger balance sheet`);
    } else {
      return this.addNotification('error', result.reason ?? 'Debt paydown failed');
    }
  }

  private addNotification(type: Notification['type'], message: string): Notification {
    const n: Notification = {
      id: `n_${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
    };
    this.notifications.unshift(n);
    if (this.notifications.length > 8) {
      this.notifications = this.notifications.slice(0, 8);
    }
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

  getWinScore(): { btc: number; btcValueMM: number; mNAV: number; daysSurvived: number } {
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
