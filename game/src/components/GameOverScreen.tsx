import type { GameMetrics, BalanceSheet } from '../engine/financialModel';
import type { Era } from '../data/eras';

interface Props {
  isWin: boolean;
  metrics: GameMetrics;
  balance: BalanceSheet;
  era: Era;
  daysSurvived: number;
  onRestart: () => void;
  onChangeEra: () => void;
}

function StatLine({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-terminal-border/30 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`font-mono font-bold text-sm ${highlight ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

function getRating(btcValueMM: number, daysSurvived: number): { title: string; color: string; desc: string } {
  const btcValueB = btcValueMM / 1000;
  if (btcValueB >= 50) return { title: 'HYPERBITCOINIZATION', color: '#a855f7', desc: 'You accumulated enough BTC to reshape the financial system.' };
  if (btcValueB >= 20) return { title: 'LEGENDARY STACK', color: '#F7931A', desc: 'The treasury speaks for itself. Orange-pilled entire institutions.' };
  if (btcValueB >= 10) return { title: 'DIAMOND HANDS', color: '#22c55e', desc: 'You navigated volatility like a pro. Saylor would be proud.' };
  if (btcValueB >= 5) return { title: 'STRONG HOLD', color: '#60a5fa', desc: 'Solid treasury operations. Room to grow further.' };
  if (daysSurvived >= 365) return { title: 'SURVIVOR', color: '#f59e0b', desc: 'One full year of operations. Not easy.' };
  return { title: 'OPERATOR', color: '#94a3b8', desc: 'You kept the lights on. Bitcoin treasury management is harder than it looks.' };
}

export function GameOverScreen({ isWin, metrics, balance, era, daysSurvived, onRestart, onChangeEra }: Props) {
  const rating = getRating(metrics.btcValueMM, daysSurvived);

  return (
    <div className="modal-overlay">
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-8 max-w-lg w-full mx-4 relative">
        {/* Status */}
        <div className="text-center mb-6">
          {isWin ? (
            <>
              <div className="text-6xl mb-3">₿</div>
              <div className="text-bitcoin text-3xl font-bold mb-1">STACKED</div>
              <div className="text-slate-400 text-sm">Bitcoin treasury mission accomplished</div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-3">📉</div>
              <div className="text-red-400 text-3xl font-bold mb-1">REKT</div>
              <div className="text-slate-400 text-sm">{metrics.insolventReason ?? 'The preferred dividends ate you alive.'}</div>
            </>
          )}
        </div>

        {/* Rating */}
        <div
          className="text-center py-3 mb-6 rounded-lg border"
          style={{ borderColor: `${rating.color}44`, background: `${rating.color}11` }}
        >
          <div className="font-bold text-lg mb-1" style={{ color: rating.color }}>{rating.title}</div>
          <div className="text-slate-400 text-xs">{rating.desc}</div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <StatLine label="Era" value={era.name} />
          <StatLine label="Days Survived" value={`${daysSurvived} days`} />
          <StatLine label="BTC Accumulated" value={`${balance.btcHeld.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₿`} highlight="text-bitcoin" />
          <StatLine
            label="BTC Treasury Value"
            value={`$${(metrics.btcValueMM / 1000).toFixed(2)}B`}
            highlight={metrics.btcValueMM > 1000 ? 'text-emerald-400' : 'text-white'}
          />
          <StatLine label="mNAV at End" value={`${metrics.mNAV.toFixed(2)}x`} />
          <StatLine label="Stock Price" value={`$${metrics.stockPrice.toFixed(2)}`} />
          <StatLine label="Shares Outstanding" value={`${balance.sharesOutstanding.toFixed(1)}M`} />
          <StatLine
            label="Cash Remaining"
            value={`$${balance.cashMM.toFixed(1)}M`}
            highlight={balance.cashMM > 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn-outline flex-1" onClick={onChangeEra}>
            ← CHANGE ERA
          </button>
          <button className="btn-bitcoin flex-1" onClick={onRestart}>
            ↺ REPLAY ERA
          </button>
        </div>
      </div>
    </div>
  );
}
