import { fmtMM, fmtPrice, fmtBTC } from '../utils/format';
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

function StatLine({ label, value, highlight, sub }: { label: string; value: string; highlight?: string; sub?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#1a2540] last:border-0">
      <span className="text-[#3a5070] text-xs">{label}</span>
      <div className="text-right">
        <span className={`font-mono font-bold text-xs ${highlight ?? 'text-white'}`}>{value}</span>
        {sub && <div className="text-[#2a3a52] text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function getRating(btcValueMM: number, daysSurvived: number): { title: string; color: string; desc: string } {
  const btcValueB = btcValueMM / 1000;
  if (btcValueB >= 50)  return { title: 'HYPERBITCOINIZATION', color: '#a855f7', desc: 'You accumulated enough BTC to reshape the financial system.' };
  if (btcValueB >= 20)  return { title: 'LEGENDARY STACK',     color: '#F7931A', desc: 'The treasury speaks for itself. Orange-pilled entire institutions.' };
  if (btcValueB >= 10)  return { title: 'DIAMOND HANDS',       color: '#22c55e', desc: 'You navigated volatility like a pro.' };
  if (btcValueB >= 5)   return { title: 'STRONG HOLD',         color: '#60a5fa', desc: 'Solid treasury operations. Room to grow further.' };
  if (daysSurvived >= 365) return { title: 'SURVIVOR',         color: '#f59e0b', desc: 'One full year of operations. Not easy.' };
  return { title: 'OPERATOR', color: '#94a3b8', desc: 'You kept the lights on. Bitcoin treasury management is harder than it looks.' };
}

const btcPriceChangePct = (start: number, end: number) =>
  ((end - start) / start * 100);

export function GameOverScreen({ isWin, metrics, balance, era, daysSurvived, onRestart, onChangeEra }: Props) {
  const rating = getRating(metrics.btcValueMM, daysSurvived);
  const priceChange = btcPriceChangePct(era.startPrice, metrics.btcPrice);
  const priceUp = metrics.btcPrice >= era.startPrice;

  return (
    <div className="modal-overlay">
      <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-6 max-w-lg w-full mx-4 relative overflow-y-auto"
        style={{ maxHeight: '90vh' }}>

        {/* Status */}
        <div className="text-center mb-4">
          {isWin ? (
            <>
              <div className="text-5xl mb-2 glow-text-bitcoin">₿</div>
              <div className="text-bitcoin text-3xl font-bold mb-1 glow-text-bitcoin">STACKED</div>
              <div className="text-[#3a5070] text-sm">Bitcoin treasury mission accomplished</div>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">📉</div>
              <div className="text-red-400 text-3xl font-bold mb-1">REKT</div>
              <div className="text-[#3a5070] text-xs">{metrics.insolventReason ?? 'The preferred dividends ate you alive.'}</div>
            </>
          )}
        </div>

        {/* Rating */}
        <div className="text-center py-2.5 mb-4 rounded-lg border"
          style={{ borderColor: `${rating.color}44`, background: `${rating.color}11` }}>
          <div className="font-bold text-base mb-0.5" style={{ color: rating.color }}>{rating.title}</div>
          <div className="text-[#3a5070] text-xs">{rating.desc}</div>
        </div>

        {/* BTC Price Journey — highlighted */}
        <div className="rounded-lg border border-[#F7931A33] bg-gradient-to-r from-[#0a1408] to-[#060a12] p-3 mb-4">
          <div className="section-label mb-2 text-bitcoin/60">₿ BITCOIN PRICE JOURNEY</div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <div>
              <div className="text-[#3a5070] text-xs mb-0.5">Starting Price</div>
              <div className="text-white font-bold font-mono text-base">{fmtPrice(era.startPrice)}</div>
              <div className="text-[#2a3a52] text-xs">{era.startYear}</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${priceUp ? 'price-up glow-text-green' : 'price-down glow-text-red'}`}>
                {priceUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}%
              </div>
              <div className="text-[#2a3a52] text-xs">over {daysSurvived}d</div>
            </div>
            <div className="text-right">
              <div className="text-[#3a5070] text-xs mb-0.5">Ending Price</div>
              <div className={`font-bold font-mono text-base ${priceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPrice(metrics.btcPrice)}
              </div>
              <div className="text-[#2a3a52] text-xs">final</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4">
          <StatLine label="Era" value={era.name} />
          <StatLine label="Days Survived" value={`${daysSurvived} days`} />
          <StatLine
            label="BTC Accumulated"
            value={fmtBTC(balance.btcHeld)}
            highlight="text-bitcoin"
          />
          <StatLine
            label="BTC Treasury Value"
            value={fmtMM(metrics.btcValueMM)}
            highlight={metrics.btcValueMM > 1000 ? 'text-emerald-400' : 'text-white'}
          />
          <StatLine label="Final Stock Price" value={fmtPrice(metrics.stockPrice)} highlight="text-bitcoin" />
          <StatLine label="Market Cap" value={fmtMM(metrics.marketCapMM)} />
          <StatLine label="mNAV at End" value={`${metrics.mNAV.toFixed(2)}x`} />
          <StatLine
            label="Cash Remaining"
            value={fmtMM(balance.cashMM)}
            highlight={balance.cashMM > 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-4">
          <button className="btn-outline flex-1" onClick={onChangeEra}>← CHANGE ERA</button>
          <button className="btn-bitcoin flex-1" onClick={onRestart}>↺ REPLAY ERA</button>
        </div>

        {/* Credit */}
        <div className="text-center text-[#2a3a52] text-xs">
          <span className="font-cursive text-base" style={{ color: '#F7931A88' }}>
            created by @Benny_Stacks
          </span>
        </div>
      </div>
    </div>
  );
}
