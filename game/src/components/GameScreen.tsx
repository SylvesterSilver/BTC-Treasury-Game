import { fmtMM, fmtPrice } from '../utils/format';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameConfig } from '../data/gameConfig';
import { GameEngine, TIME_SPEEDS } from '../engine/gameEngine';
import type { TimeSpeed, Notification } from '../engine/gameEngine';
import type { NewsEvent } from '../data/newsEvents';
import { PriceChart } from './PriceChart';
import { BalancePanel } from './BalancePanel';
import { ActionPanel } from './ActionPanel';
import { NotificationFeed } from './NotificationFeed';
import { GameOverScreen } from './GameOverScreen';
import { NewsTicker } from './NewsTicker';
import { SynthEngine } from '../engine/synthEngine';
import { DonateQR } from './DonateQR';

interface Props {
  config: GameConfig;
  onExitToMenu: () => void;
  onExitToConfig: () => void;
}



type MobileTab = 'CHART' | 'TRADE' | 'BALANCE';

interface Particle { id: string; x: number; y: number; }

export function GameScreen({ config, onExitToMenu, onExitToConfig }: Props) {
  const { era } = config;
  const engineRef = useRef<GameEngine | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SynthEngine>(new SynthEngine());

  const [speed, setSpeed] = useState<TimeSpeed>('PAUSED');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [flashClass, setFlashClass] = useState('');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [prevStockPrice, setPrevStockPrice] = useState(0);
  const [stockCrashClass, setStockCrashClass] = useState('');
  const [activeNewsEvent, setActiveNewsEvent] = useState<NewsEvent | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('CHART');

  const forceUpdate = () => setRenderCount(c => c + 1);

  useEffect(() => {
    engineRef.current = new GameEngine(era, config);
    // Auto-start music — user already clicked Play on config screen (satisfies browser autoplay policy)
    synthRef.current.start();
    forceUpdate();
    return () => { synthRef.current.stop(); };
  }, [era, config]);

  // Game loop
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (speed === 'PAUSED') return;
    const cfg = TIME_SPEEDS[speed];
    if (!cfg.daysPerTick) return;

    tickRef.current = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.tickDays(cfg.daysPerTick);
      const state = engine.getState();

      if (state.lastNewsEvent) {
        setActiveNewsEvent(state.lastNewsEvent);
        setTimeout(() => setActiveNewsEvent(null), 500);
      }
      if (state.metrics.isInsolvent) {
        setSpeed('PAUSED');
        setShowGameOver(true);
        setIsWin(false);
        setNotifications([...state.notifications]);
        return;
      }
      if (engine.checkWin()) {
        setSpeed('PAUSED');
        setShowGameOver(true);
        setIsWin(true);
      }
      setNotifications([...state.notifications]);
      setRenderCount(c => c + 1);
    }, cfg.tickMs);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [speed]);

  const handleSpeedChange = useCallback((s: TimeSpeed) => setSpeed(s), []);

  const spawnParticles = (count = 5) => {
    if (!chartAreaRef.current) return;
    const rect = chartAreaRef.current.getBoundingClientRect();
    const newP: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: `p_${Date.now()}_${i}`,
      x: Math.random() * rect.width * 0.6 + rect.width * 0.2,
      y: Math.random() * rect.height * 0.4 + rect.height * 0.4,
    }));
    setParticles(prev => [...prev, ...newP]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.find(n => n.id === p.id))), 1400);
  };

  const syncAndFlash = (flash: 'BUY' | 'SELL' | 'ATM') => {
    const s = engineRef.current?.getState();
    if (s) {
      setNotifications([...s.notifications]);
      setPrevStockPrice(s.metrics.stockPrice);
      if (flash === 'BUY') { setFlashClass('flash-buy'); spawnParticles(7); setMobileTab('CHART'); synthRef.current.playBuySound(0.8); }
      else if (flash === 'SELL') {
        setFlashClass('flash-sell');
        setStockCrashClass('stock-crash');
        setTimeout(() => setStockCrashClass(''), 700);
        setMobileTab('CHART');
      }
      else { setFlashClass('flash-atm'); }
      setTimeout(() => setFlashClass(''), 900);
    }
    forceUpdate();
  };

  const engine = engineRef.current;
  if (!engine) return (
    <div className="min-h-screen terminal-bg flex items-center justify-center text-[#3a5070] text-sm font-mono">
      INITIALIZING TERMINAL...
    </div>
  );

  void renderCount;

  const state = engine.getState();
  const conePoints = engine.getConePoints(120);
  const isHistorical = engine.getSimulator().isInHistorical();
  const { metrics, balance, currentPrice, currentDate, daysSurvived, totalDays } = state;

  const stockChange = prevStockPrice > 0 ? ((metrics.stockPrice - prevStockPrice) / prevStockPrice) * 100 : 0;
  const stockUp = metrics.stockPrice >= prevStockPrice;
  const progress = Math.min((daysSurvived / totalDays) * 100, 100);
  const SPEEDS: TimeSpeed[] = ['PAUSED', '1D', '1W', '1M'];

  const handleRestart = () => {
    engineRef.current = new GameEngine(era, config);
    setShowGameOver(false);
    setSpeed('PAUSED');
    setNotifications([]);
    setParticles([]);
    forceUpdate();
  };

  const MOBILE_TABS: { id: MobileTab; label: string; icon: string }[] = [
    { id: 'CHART',   label: 'CHART',   icon: '📈' },
    { id: 'TRADE',   label: 'TRADE',   icon: '₿' },
    { id: 'BALANCE', label: 'BALANCE', icon: '⚖' },
  ];

  return (
    <div className="min-h-screen terminal-bg flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>

      {/* ── TOP BAR ── */}
      <div className="border-b border-[#1a2540] px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-[#04070f]">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onExitToConfig} className="text-[#2a3a52] hover:text-slate-300 text-xs transition-colors uppercase tracking-wider">← CONFIG</button>
          <button onClick={onExitToMenu} className="text-[#1a2540] hover:text-slate-400 text-xs transition-colors uppercase tracking-wider hidden sm:block">ERAS</button>
          <div className="h-4 w-px bg-[#1a2540]" />
          <span className="text-bitcoin text-xs glow-text-bitcoin font-bold">₿</span>
          <span className="text-white font-bold text-xs tracking-wide hidden md:block">BITCOIN TREASURY STRATEGY SIMULATOR</span>
          <span className="text-white font-bold text-xs tracking-wide md:hidden">BTC TREASURY SIM</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-xs">
          <span className="text-[#3a5070] hidden sm:block">BTC</span>
          <span className="text-bitcoin font-bold font-mono text-sm md:text-base glow-text-bitcoin">
            ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="ticker-live text-bitcoin text-xs">●</span>
          <span className="text-[#3a5070] font-mono text-xs hidden md:block">{currentDate}</span>
        </div>
      </div>

      {/* ── HERO BAND — desktop: full, mobile: compact 2x2 grid ── */}
      <div className="border-b border-[#F7931A33] bg-gradient-to-r from-[#0a1408] via-[#060a12] to-[#0a1408] px-3 md:px-4 py-2 flex-shrink-0">
        {/* Desktop hero */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-5 flex-wrap">
            {/* STOCK PRICE */}
            <div>
              <div className="section-label mb-0.5" style={{ color: '#F7931A66' }}>▶ STOCK PRICE · MAXIMIZE</div>
              <div className="flex items-baseline gap-2">
                <span className={`stock-price-hero ${stockCrashClass}`}>{fmtPrice(metrics.stockPrice)}</span>
                {Math.abs(stockChange) > 0.01 && (
                  <span className={`text-sm font-bold ${stockUp ? 'price-up glow-text-green' : 'price-down glow-text-red'}`}>
                    {stockUp ? '▲' : '▼'}{Math.abs(stockChange).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-12 w-px bg-[#1a2540]" />
            {/* MARKET CAP */}
            <div>
              <div className="section-label mb-0.5">MARKET CAP</div>
              <div className="text-xl font-bold font-mono text-white">{fmtMM(metrics.marketCapMM)}</div>
              <div className="text-[#3a5070] text-xs">{balance.sharesOutstanding.toFixed(1)}M sh</div>
            </div>
            <div className="h-12 w-px bg-[#1a2540]" />
            {/* mNAV */}
            <div>
              <div className="section-label mb-0.5">mNAV</div>
              <div className="text-xl font-bold font-mono" style={{ color: metrics.mNAV >= 1.8 ? '#22c55e' : metrics.mNAV >= 1 ? '#f59e0b' : '#ef4444' }}>
                {metrics.mNAV.toFixed(2)}x
              </div>
              <div className="text-[#3a5070] text-xs">{metrics.mNAVStatus.replace(/_/g, ' ')}</div>
            </div>
            <div className="h-12 w-px bg-[#1a2540]" />
            {/* BTC */}
            <div>
              <div className="section-label mb-0.5">₿ TREASURY</div>
              <div className="text-xl font-bold font-mono text-bitcoin glow-text-bitcoin">
                {balance.btcHeld >= 1000 ? `${(balance.btcHeld/1000).toFixed(1)}K ₿` : `${balance.btcHeld.toLocaleString(undefined,{maximumFractionDigits:0})} ₿`}
              </div>
              <div className="text-[#3a5070] text-xs">{fmtMM(metrics.btcValueMM)}</div>
            </div>
            <div className="h-12 w-px bg-[#1a2540]" />
            {/* SENTIMENT */}
            <div style={{ minWidth: 110 }}>
              <div className="section-label mb-0.5">SENTIMENT</div>
              <div className="text-base font-bold" style={{ color: metrics.sentimentColor }}>{metrics.sentimentLabel}</div>
              <div className="w-24 bg-[#0a0f1e] rounded-full h-1.5 mt-0.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${metrics.sentiment}%`, background: metrics.sentimentColor }} />
              </div>
            </div>
            <div className="h-12 w-px bg-[#1a2540]" />
            {/* RATE */}
            <div>
              <div className="section-label mb-0.5">DEBT RATE</div>
              <div className="text-base font-bold font-mono" style={{ color: metrics.currentInterestRate >= 0.065 ? '#ef4444' : '#f59e0b' }}>
                {(metrics.currentInterestRate * 100).toFixed(1)}%
              </div>
              <div className="text-[#3a5070] text-xs">annual</div>
            </div>
          </div>
          {/* Speed + progress */}
          <div className="flex items-center gap-2 ml-4">
            <div className="text-right mr-1">
              <div className="section-label">PROGRESS</div>
              <div className="text-[#2a3a52] text-xs font-mono">D{daysSurvived}/{totalDays}</div>
              <div className="w-20 bg-[#0a0f1e] rounded-full h-1 mt-0.5">
                <div className="h-1 rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#F7931A66,#F7931A)' }} />
              </div>
            </div>
            {SPEEDS.map(s => {
              const cfg = TIME_SPEEDS[s];
              const isActive = speed === s;
              return (
                <button key={s} onClick={() => handleSpeedChange(s)}
                  className="px-2 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-all"
                  style={{
                    background: isActive ? (s === 'PAUSED' ? '#1e3a5f' : '#F7931A22') : '#0a0f1e',
                    color: isActive ? (s === 'PAUSED' ? '#60a5fa' : '#F7931A') : '#3a5070',
                    border: `1px solid ${isActive ? (s === 'PAUSED' ? '#1e3a8a' : '#F7931A66') : '#1a2540'}`,
                  }}
                >{s === 'PAUSED' ? '⏸' : cfg.label}</button>
              );
            })}
          </div>
        </div>

        {/* Mobile hero — compact 2x2 */}
        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-[#F7931A55] text-xs mb-0.5">STOCK PRICE</div>
              <div className={`text-2xl font-bold font-mono text-bitcoin glow-text-bitcoin ${stockCrashClass}`}>
                {fmtPrice(metrics.stockPrice)}
              </div>
              {Math.abs(stockChange) > 0.01 && (
                <span className={`text-xs font-bold ${stockUp ? 'price-up' : 'price-down'}`}>
                  {stockUp ? '▲' : '▼'}{Math.abs(stockChange).toFixed(2)}%
                </span>
              )}
            </div>
            <div>
              <div className="text-[#3a5070] text-xs mb-0.5">MARKET CAP</div>
              <div className="text-xl font-bold font-mono text-white">{fmtMM(metrics.marketCapMM)}</div>
              <div className="text-[#3a5070] text-xs">mNAV <span style={{ color: metrics.mNAV >= 1.8 ? '#22c55e' : '#f59e0b' }}>{metrics.mNAV.toFixed(2)}x</span></div>
            </div>
            <div>
              <div className="text-[#3a5070] text-xs mb-0.5">₿ TREASURY</div>
              <div className="text-lg font-bold font-mono text-bitcoin">
                {balance.btcHeld >= 1000 ? `${(balance.btcHeld/1000).toFixed(1)}K ₿` : `${balance.btcHeld.toLocaleString(undefined,{maximumFractionDigits:0})} ₿`}
              </div>
              <div className="text-[#3a5070] text-xs">{fmtMM(metrics.btcValueMM)}</div>
            </div>
            <div>
              <div className="text-[#3a5070] text-xs mb-0.5">SENTIMENT</div>
              <div className="text-base font-bold" style={{ color: metrics.sentimentColor }}>{metrics.sentimentLabel}</div>
              <div className="text-[#3a5070] text-xs">{currentDate}</div>
            </div>
          </div>
          {/* Mobile speed controls */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1">
              {SPEEDS.map(s => {
                const cfg = TIME_SPEEDS[s];
                const isActive = speed === s;
                return (
                  <button key={s} onClick={() => handleSpeedChange(s)}
                    className="px-2 py-1 text-xs font-bold rounded uppercase transition-all"
                    style={{
                      background: isActive ? (s === 'PAUSED' ? '#1e3a5f' : '#F7931A22') : '#0a0f1e',
                      color: isActive ? (s === 'PAUSED' ? '#60a5fa' : '#F7931A') : '#3a5070',
                      border: `1px solid ${isActive ? (s === 'PAUSED' ? '#1e3a8a' : '#F7931A66') : '#1a2540'}`,
                    }}
                  >{s === 'PAUSED' ? '⏸' : cfg.label}</button>
                );
              })}
            </div>
            <div className="text-[#2a3a52] text-xs font-mono">D{daysSurvived}/{totalDays}</div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT — desktop 3-col, mobile tabbed ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Desktop: 3-column layout */}
        <div className="hidden md:flex h-full px-3 pb-2 pt-2 gap-2">
          {/* Chart + notifications */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div ref={chartAreaRef} className={`game-card flex-1 min-h-0 relative overflow-hidden ${flashClass}`} style={{ minHeight: 260 }}>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.02]">
                <span style={{ fontSize: '14rem', color: '#F7931A', lineHeight: 1 }}>₿</span>
              </div>
              <div className="relative z-10 w-full h-full">
                <PriceChart priceHistory={state.priceHistory} conePoints={conePoints} currentPrice={currentPrice} isHistorical={isHistorical} />
              </div>
              {particles.map(p => <div key={p.id} className="btc-particle" style={{ left: p.x, top: p.y }}>₿</div>)}
            </div>
            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
              <NotificationFeed notifications={notifications} />
            </div>
          </div>
          {/* Actions */}
          <div className="flex-shrink-0" style={{ width: 305 }}>
            <ActionPanel balance={balance} metrics={metrics}
              onBuyBTC={(amt) => { engine.buyBTC(amt); syncAndFlash('BUY'); }}
              onSellBTC={(amt) => { engine.sellBTC(amt); syncAndFlash('SELL'); }}
              onIssueCommon={(shares) => { engine.issueCommonStock(shares); syncAndFlash('ATM'); }}
              onIssuePreferred={(amt) => { engine.issuePreferredStock(amt); syncAndFlash('ATM'); }}
              onPayDebt={(amt) => { engine.payDownDebt(amt); syncAndFlash('ATM'); }}
            />
          </div>
          {/* Balance */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: 260 }}>
            <BalancePanel balance={balance} metrics={metrics} />
          </div>
        </div>

        {/* Mobile: tabbed single panel */}
        <div className="md:hidden h-full flex flex-col">
          <div className="flex-1 overflow-hidden px-2 pt-2 pb-1">
            {mobileTab === 'CHART' && (
              <div className="flex flex-col gap-2" style={{ height: '100%' }}>
                {/* Explicit height so Recharts ResponsiveContainer can measure — flex alone doesn't work on mobile */}
                <div
                  ref={chartAreaRef}
                  className={`game-card relative overflow-hidden ${flashClass}`}
                  style={{ height: 'calc(100svh - 310px)', minHeight: 220, maxHeight: 480 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.02]">
                    <span style={{ fontSize: '8rem', color: '#F7931A', lineHeight: 1 }}>₿</span>
                  </div>
                  <div className="relative z-10 w-full h-full">
                    <PriceChart priceHistory={state.priceHistory} conePoints={conePoints} currentPrice={currentPrice} isHistorical={isHistorical} />
                  </div>
                  {particles.map(p => <div key={p.id} className="btc-particle" style={{ left: p.x, top: p.y }}>₿</div>)}
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', flexShrink: 0 }}>
                  <NotificationFeed notifications={notifications} />
                </div>
              </div>
            )}
            {mobileTab === 'TRADE' && (
              <div className="h-full overflow-y-auto">
                <ActionPanel balance={balance} metrics={metrics}
                  onBuyBTC={(amt) => { engine.buyBTC(amt); syncAndFlash('BUY'); }}
                  onSellBTC={(amt) => { engine.sellBTC(amt); syncAndFlash('SELL'); }}
                  onIssueCommon={(shares) => { engine.issueCommonStock(shares); syncAndFlash('ATM'); }}
                  onIssuePreferred={(amt) => { engine.issuePreferredStock(amt); syncAndFlash('ATM'); }}
                  onPayDebt={(amt) => { engine.payDownDebt(amt); syncAndFlash('ATM'); }}
                />
              </div>
            )}
            {mobileTab === 'BALANCE' && (
              <div className="h-full overflow-y-auto">
                <BalancePanel balance={balance} metrics={metrics} />
              </div>
            )}
          </div>

          {/* Mobile bottom tab bar */}
          <div className="flex border-t border-[#1a2540] bg-[#04070f] flex-shrink-0">
            {MOBILE_TABS.map(tab => (
              <button key={tab.id}
                className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-all"
                style={{
                  color: mobileTab === tab.id ? '#F7931A' : '#3a5070',
                  background: mobileTab === tab.id ? '#F7931A11' : 'transparent',
                  borderTop: mobileTab === tab.id ? '2px solid #F7931A' : '2px solid transparent',
                }}
                onClick={() => setMobileTab(tab.id)}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DONATE QR + NEWS TICKER ── */}
      <div className="flex items-stretch border-t border-[#1a2540] bg-[#04070f] flex-shrink-0">
        <div className="flex-shrink-0 border-r border-[#1a2540] hidden sm:flex items-center px-2 py-1">
          <DonateQR />
        </div>
        <div className="flex-1 overflow-hidden">
          <NewsTicker activeEvent={activeNewsEvent} />
        </div>
      </div>

      {showGameOver && (
        <GameOverScreen
          isWin={isWin} metrics={metrics} balance={balance} era={era}
          daysSurvived={daysSurvived} onRestart={handleRestart} onChangeEra={onExitToMenu}
        />
      )}
    </div>
  );
}
