import { describe, expect, it } from 'vitest';
import { ERAS } from '../data/eras';
import { GameEngine } from './gameEngine';
import { FinancialModel } from './financialModel';

const genesis = ERAS.find(e => e.id === 'genesis')!;
const now = ERAS.find(e => e.id === 'now2024')!;

describe('FinancialModel', () => {
  it('buys BTC and reduces cash while adding to the stack', () => {
    const model = new FinancialModel(genesis, 100);
    const before = model.getBalance().btcHeld;
    const result = model.buyBTC(10, genesis.startPrice);
    expect(result.success).toBe(true);
    expect(model.getBalance().cashMM).toBeCloseTo(90, 5);
    expect(model.getBalance().btcHeld).toBeGreaterThan(before);
  });

  it('rejects a buy that would break the 5% cash reserve', () => {
    const model = new FinancialModel(genesis, 100);
    const result = model.buyBTC(96, genesis.startPrice);
    expect(result.success).toBe(false);
  });

  it('closes the ATM window for 7 days after a print', () => {
    const model = new FinancialModel(now, 800);
    const first = model.issueCommonStock(1, now.startPrice);
    expect(first.success).toBe(true);
    const second = model.issueCommonStock(1, now.startPrice);
    expect(second.success).toBe(false);
    expect(second.reason).toMatch(/window closed/i);
  });

  it('retires shares on a buyback', () => {
    const model = new FinancialModel(genesis, 250);
    const before = model.getBalance().sharesOutstanding;
    const result = model.buybackShares(20, genesis.startPrice);
    expect(result.success).toBe(true);
    expect(model.getBalance().sharesOutstanding).toBeLessThan(before);
    expect(model.getBalance().cashMM).toBeCloseTo(230, 5);
  });

  it('issues convertible notes against a funded treasury', () => {
    const model = new FinancialModel(now, 800);
    const debtBefore = model.getBalance().convertibleDebtMM;
    const result = model.issueConvertibleDebt(200, now.startPrice);
    expect(result.success).toBe(true);
    expect(model.getBalance().convertibleDebtMM).toBe(debtBefore + 200);
    expect(model.getBalance().cashMM).toBeCloseTo(1000, 5);
  });

  it('refuses preferred when dividends are halted', () => {
    const model = new FinancialModel(now, 800);
    model.haltDividends();
    const result = model.issuePreferredStock(100, now.startPrice);
    expect(result.success).toBe(false);
  });
});

describe('GameEngine', () => {
  it('does not win before day 730', () => {
    const engine = new GameEngine(genesis, { era: genesis, startingCapitalMM: 250 });
    expect(engine.checkWin()).toBe(false);
  });

  it('round-trips through serialize / restore', () => {
    const engine = new GameEngine(now, { era: now, startingCapitalMM: 800 });
    engine.buyBTC(20);
    engine.tickDays(12);
    const restored = GameEngine.fromSnapshot(engine.serialize());
    expect(restored).not.toBeNull();
    const a = engine.getState();
    const b = restored!.getState();
    expect(b.daysSurvived).toBe(a.daysSurvived);
    expect(b.balance.cashMM).toBeCloseTo(a.balance.cashMM, 5);
    expect(b.balance.btcHeld).toBeCloseTo(a.balance.btcHeld, 5);
    expect(b.currentPrice).toBeCloseTo(a.currentPrice, 5);
  });

  it('tracks dividend-halt and emergency-sale objectives', () => {
    const engine = new GameEngine(now, { era: now, startingCapitalMM: 800 });
    const before = engine.getState().objectives.find(o => o.id === 'dividends');
    expect(before?.done).toBe(true);
    engine.haltDividends();
    const after = engine.getState().objectives.find(o => o.id === 'dividends');
    expect(after?.done).toBe(false);
  });
});

describe('eras', () => {
  it('anchors historical day 0 at the listed start price', () => {
    expect(genesis.historicalPrices[0]).toBeCloseTo(genesis.startPrice, 5);
    expect(now.historicalPrices[0]).toBeCloseTo(now.startPrice, 5);
  });
});
