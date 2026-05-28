import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameConfig } from '../data/gameConfig';
import { GameEngine, TIME_SPEEDS } from '../engine/gameEngine';
import type { TimeSpeed, Notification } from '../engine/gameEngine';
import { PriceChart } from './PriceChart';
import { BalancePanel } from './BalancePanel';
import { ActionPanel } from './ActionPanel';
import { TimeControls } from './TimeControls';
import { NotificationFeed } from './NotificationFeed';
import { GameOverScreen } from './GameOverScreen';

interface Props {
  config: GameConfig;
  onExitToMenu: () => void;
  onExitToConfig: () => void;
}

function fmtCapital(mm: number): string {
  if (mm >= 1000) return `$${(mm / 1000).toFixed(mm % 1000 === 0 ? 0 : 1)}B`;
  return `$${mm}M`;
}

export function GameScreen({ config, onExitToMenu, onExitToConfig }: Props) {
  const { era, startingCapitalMM } = config;
  const engineRef = useRef<GameEngine | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [speed, setSpeed] = useState<TimeSpeed>('PAUSED');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  const forceUpdate = () => setRenderCount(c => c + 1);

  useEffect(() => {
    engineRef.current = new GameEngine(era, config);
    setRenderCount(c => c + 1);
  }, [era, config]);

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (speed === 'PAUSED') return;

    const cfg = TIME_SPEEDS[speed];
    if (cfg.daysPerTick === 0) return;

    tickRef.current = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.tickDays(cfg.daysPerTick);
      const state = engine.getState();

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

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [speed]);

  const handleSpeedChange = useCallback((s: TimeSpeed) => {
    setSpeed(s);
  }, []);

  const engine = engineRef.current;
  if (!engine) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  void renderCount;

  const state = engine.getState();
  const conePoints = engine.getConePoints(120);
  const isHistorical = engine.getSimulator().isInHistorical();

  const handleRestart = () => {
    engineRef.current = new GameEngine(era, config);
    setShowGameOver(false);
    setSpeed('PAUSED');
    setNotifications([]);
    forceUpdate();
  };

  const syncNotifications = () => {
    const s = engineRef.current?.getState();
    if (s) setNotifications([...s.notifications]);
    forceUpdate();
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Top bar */}
      <div className="border-b border-terminal-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="text-slate-600 hover:text-slate-300 text-xs transition-colors uppercase tracking-wider"
            onClick={onExitToConfig}
          >
            ← CONFIG
          </button>
          <button
            className="text-slate-700 hover:text-slate-400 text-xs transition-colors uppercase tracking-wider"
            onClick={onExitToMenu}
          >
            ERAS
          </button>
          <div className="h-4 w-px bg-terminal-border" />
          <span className="text-bitcoin font-bold text-sm">SAYLOR MODE</span>
          <span className="text-slate-600 text-xs hidden md:block">
            started with <span className="text-emerald-400">{fmtCapital(startingCapitalMM)}</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-600">BTC/USD</span>
          <span className="text-bitcoin font-bold font-mono text-base">
            ${state.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Time controls */}
      <div className="px-4 py-2 flex-shrink-0">
        <TimeControls
          speed={speed}
          onSpeedChange={handleSpeedChange}
          currentDate={state.currentDate}
          daysSurvived={state.daysSurvived}
          totalDays={state.totalDays}
          era={era}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden px-4 pb-4 gap-3">
        {/* Left: Chart + notifications */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="game-card flex-1 min-h-0" style={{ minHeight: '320px' }}>
            <PriceChart
              priceHistory={state.priceHistory}
              conePoints={conePoints}
              currentPrice={state.currentPrice}
              isHistorical={isHistorical}
            />
          </div>
          <div className="flex-shrink-0" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <NotificationFeed notifications={notifications} />
          </div>
        </div>

        {/* Center: Actions */}
        <div className="flex-shrink-0" style={{ width: '320px' }}>
          <ActionPanel
            balance={state.balance}
            metrics={state.metrics}
            onBuyBTC={(amt) => { engine.buyBTC(amt); syncNotifications(); }}
            onSellBTC={(amt) => { engine.sellBTC(amt); syncNotifications(); }}
            onIssueCommon={(shares) => { engine.issueCommonStock(shares); syncNotifications(); }}
            onIssuePreferred={(amt) => { engine.issuePreferredStock(amt); syncNotifications(); }}
            onPayDebt={(amt) => { engine.payDownDebt(amt); syncNotifications(); }}
            onIssueConvertibleDebt={(amt) => { engine.issueConvertibleDebt(amt); syncNotifications(); }}
            onBuyBackStock={(shares) => { engine.buyBackStock(shares); syncNotifications(); }}
          />
        </div>

        {/* Right: Balance sheet */}
        <div className="flex-shrink-0 overflow-y-auto" style={{ width: '280px' }}>
          <BalancePanel
            balance={state.balance}
            metrics={state.metrics}
          />
        </div>
      </div>

      {showGameOver && (
        <GameOverScreen
          isWin={isWin}
          metrics={state.metrics}
          balance={state.balance}
          era={era}
          daysSurvived={state.daysSurvived}
          onRestart={handleRestart}
          onChangeEra={onExitToMenu}
        />
      )}
    </div>
  );
}
