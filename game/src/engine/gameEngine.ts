import type { Era } from '../data/eras';
import { ERAS } from '../data/eras';
import type { GameConfig } from '../data/gameConfig';
import { PriceSimulator } from './priceSimulator';
import type { PricePoint, PriceSnapshot } from './priceSimulator';
import { FinancialModel } from './financialModel';
import type { BalanceSheet, GameMetrics, GameEvent, FinancialSnapshot } from './financialModel';
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

export const TOTAL_GAME_DAYS = 730;

export interface Objective {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

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
  emergencySoldBTC: number;
  dividendsHalted: boolean;
  objectives: Objective[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export interface EngineSnapshot {
  version: 1;
  config: {
    eraId: string;
    startingCapitalMM: number;
    startingBTCOverride?: number;
  };
  simulator: PriceSnapshot;
  model: FinancialSnapshot;
  firedEventIds: string[];
  notifications: Notification[];
  everHaltedDividends: boolean;
  everEmergencySold: boolean;
}

export class GameEngine {
  private simulator: PriceSimulator;
  private model: FinancialModel;
  private era: Era;
  private config: GameConfig;
  private notifications: Notification[] = [];
  private readonly totalGameDays: number = TOTAL_GAME_DAYS;
  private lastTradeFlash: 'BUY' | 'SELL' | 'ATM' | null = null;
  private lastNewsEvent: NewsEvent | null = null;
  private firedEventIds = new Set<string>();
  private everHaltedDividends = false;
  private everEmergencySold = false;

  constructor(era: Era, config?: GameConfig, snapshot?: EngineSnapshot) {
    this.era = era;
    this.config = config ?? { era, startingCapitalMM: era.startingCash };
    this.simulator = new PriceSimulator(era, undefined, snapshot?.simulator);
    this.model = new FinancialModel(
      era,
      config?.startingCapitalMM ?? snapshot?.config.startingCapitalMM,
      config?.startingBTCOverride ?? snapshot?.config.startingBTCOverride,
      snapshot?.model,
    );
    if (snapshot) {
      this.firedEventIds = new Set(snapshot.firedEventIds);
      this.notifications = snapshot.notifications ?? [];
      this.everHaltedDividends = snapshot.everHaltedDividends;
      this.everEmergencySold = snapshot.everEmergencySold;
    }
  }

  static fromSnapshot(snapshot: EngineSnapshot): GameEngine | null {
    const era = ERAS.find(e => e.id === snapshot.config.eraId);
    if (!era) return null;
    const config: GameConfig = {
      era,
      startingCapitalMM: snapshot.config.startingCapitalMM,
      startingBTCOverride: snapshot.config.startingBTCOverride,
    };
    return new GameEngine(era, config, snapshot);
  }

  serialize(): EngineSnapshot {
    return {
      version: 1,
      config: {
        eraId: this.era.id,
        startingCapitalMM: this.config.startingCapitalMM,
        startingBTCOverride: this.config.startingBTCOverride,
      },
      simulator: this.simulator.serialize(),
      model: this.model.serialize(),
      firedEventIds: [...this.firedEventIds],
      notifications: this.notifications.slice(0, 8),
      everHaltedDividends: this.everHaltedDividends,
      everEmergencySold: this.everEmergencySold,
    };
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getState(): GameState {
    const currentDay = this.simulator.getCurrentDay();
    const currentPrice = this.simulator.getCurrentPrice();
    const metrics = this.model.computeMetrics(currentPrice);
    let phase: GamePhase = 'RUNNING';
    if (metrics.isInsolvent) phase = 'GAME_OVER_LOSE';
    else if (currentDay >= this.totalGameDays) phase = 'GAME_OVER_WIN';

    return {
      phase,
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
      lastTradeFlash: this.lastTradeFlash,
      lastNewsEvent: this.lastNewsEvent,
      emergencySoldBTC: metrics.emergencySoldBTCThisTick ?? 0,
      dividendsHalted: metrics.dividendsHalted ?? false,
      objectives: this.computeObjectives(metrics),
    };
  }

  consumeNewsEvent(): NewsEvent | null {
    const event = this.lastNewsEvent;
    this.lastNewsEvent = null;
    return event;
  }

  tick(): void {
    const newPoints = this.simulator.advance(1);
    if (newPoints.length > 0) {
      this.model.tick(newPoints[0].price, this.simulator.getCurrentDay() % 7);
    }
    const day = this.simulator.getCurrentDay();
    const metrics = this.model.computeMetrics(this.simulator.getCurrentPrice());
    if (metrics.emergencySoldBTCThisTick > 0) this.everEmergencySold = true;
    this.maybeFireNewsEvent();
    if (day > 0 && day % 90 === 0) {
      const q = Math.floor(day / 90);
      this.addNotification(
        'info',
        `📋 Q${q} BOARD REPORT: BTC/share ${metrics.btcPerShare.toFixed(4)} · mNAV ${metrics.mNAV.toFixed(2)}x · runway ${metrics.monthsRunway === 999 ? '∞' : Math.floor(metrics.monthsRunway) + 'mo'}`,
      );
    }
  }

  tickDays(days: number): void {
    for (let i = 0; i < days; i++) this.tick();
  }

  private maybeFireNewsEvent(): void {
    const day = this.simulator.getCurrentDay();
    const roll = Math.random();

    if (roll > 0.985) {
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

        this.model.applyNewsImpact(
          event.priceImpactPct,
          event.sentimentDelta,
          event.interestRateDelta,
        );
        if (Math.abs(event.priceImpactPct) > 0.001) {
          this.simulator.applyMarketImpact(event.priceImpactPct);
        }

        const type = event.type === 'BEARISH' ? 'warning' : 'info';
        this.addNotification(type, `${event.type === 'BULLISH' ? '▲' : event.type === 'BEARISH' ? '▼' : '◆'} ${event.headline}`);

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

  buybackShares(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.buybackShares(amountMM, price);
    if (result.success) {
      this.lastTradeFlash = 'ATM';
      return this.addNotification('success',
        `🔄 BUYBACK: retired ${result.sharesRetired.toFixed(2)}M shares for $${amountMM.toFixed(1)}M`);
    }
    return this.addNotification('error', result.reason ?? 'Buyback failed');
  }

  issuePreferredStock(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issuePreferredStock(amountMM, price);
    if (result.success) {
      return this.addNotification('success',
        `💎 $${amountMM.toFixed(0)}M preferred issued — STRC dividend now compounding`);
    }
    return this.addNotification('error', result.reason ?? 'Preferred failed');
  }

  issueConvertibleDebt(amountMM: number): Notification {
    const price = this.simulator.getCurrentPrice();
    const result = this.model.issueConvertibleDebt(amountMM, price);
    if (result.success) {
      this.lastTradeFlash = 'ATM';
      return this.addNotification('success',
        `📜 $${amountMM.toFixed(0)}M convertible notes issued — dry powder + leverage`);
    }
    return this.addNotification('error', result.reason ?? 'Convertible failed');
  }

  payDownDebt(amountMM: number): Notification {
    const result = this.model.payDownDebt(amountMM);
    if (result.success) {
      return this.addNotification('success',
        `✓ $${amountMM.toFixed(0)}M debt cleared → cleaner balance sheet`);
    }
    return this.addNotification('error', result.reason ?? 'Debt paydown failed');
  }

  haltDividends(): Notification {
    this.everHaltedDividends = true;
    this.model.haltDividends();
    return this.addNotification('warning', '⚠ DIVIDENDS SUSPENDED — STRC preferred in default. Preferred market closed. Sentiment destroyed.');
  }

  resumeDividends(): Notification {
    this.model.resumeDividends();
    return this.addNotification('info', '✓ Dividends resumed — preferred market may reopen.');
  }

  private computeObjectives(metrics: GameMetrics): Objective[] {
    const day = this.simulator.getCurrentDay();
    const survived = day >= this.totalGameDays && !metrics.isInsolvent;
    return [
      {
        id: 'survive',
        label: 'Survive 730 days',
        hint: `${Math.min(day, this.totalGameDays)} / ${this.totalGameDays}`,
        done: survived,
      },
      {
        id: 'btc-yield',
        label: 'Grow BTC per share',
        hint: `${metrics.btcYieldPct >= 0 ? '+' : ''}${metrics.btcYieldPct.toFixed(1)}%`,
        done: metrics.btcYieldPct > 0,
      },
      {
        id: 'coverage',
        label: 'Keep pref coverage ≥ 1.5x',
        hint: metrics.preferredCoverageRatio === 999 ? 'N/A' : `${metrics.preferredCoverageRatio.toFixed(1)}x`,
        done: metrics.preferredCoverageRatio >= 1.5,
      },
      {
        id: 'dividends',
        label: 'Never halt dividends',
        hint: this.everHaltedDividends ? 'HALTED' : 'CLEAN',
        done: !this.everHaltedDividends,
      },
      {
        id: 'no-distress',
        label: 'No emergency BTC sales',
        hint: this.everEmergencySold ? 'FORCED SALE' : 'CLEAN',
        done: !this.everEmergencySold,
      },
    ];
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
    const metrics = this.model.computeMetrics(this.simulator.getCurrentPrice());
    return !metrics.isInsolvent && this.simulator.getCurrentDay() >= this.totalGameDays;
  }

  getWinScore() {
    const balance = this.model.getBalance();
    const price = this.simulator.getCurrentPrice();
    return { btc: balance.btcHeld, btcValueMM: (balance.btcHeld * price) / 1e6, mNAV: this.model.getMNAV(), daysSurvived: this.simulator.getCurrentDay() };
  }
}
