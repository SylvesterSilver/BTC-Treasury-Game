import { fmtMM, fmtPrice } from '../utils/format';
import type { BalanceSheet, GameMetrics } from '../engine/financialModel';

interface Props {
  balance: BalanceSheet;
  metrics: GameMetrics;
}



function Row({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bloomberg-row">
      <span className="text-[#6a3090]">{label}</span>
      <div className="text-right">
        <span className="font-mono font-semibold text-xs" style={{ color: color ?? '#cbd5e1' }}>{value}</span>
        {sub && <div className="text-[#3a1070] text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function Gauge({ label, value, color, display }: { label: string; value: number; color: string; display?: string }) {
  return (
    <div className="p-2 rounded border border-[#2d0060] bg-[#04000a]">
      <div className="text-[#6a3090] text-xs mb-1">{label}</div>
      <div className="w-full bg-[#07000f] rounded-full h-1.5 mb-1">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <div className="font-mono font-bold text-xs" style={{ color }}>{display ?? `${value.toFixed(0)}%`}</div>
    </div>
  );
}

export function BalancePanel({ balance, metrics }: Props) {
  const mNavPct = Math.min((metrics.mNAV / 4) * 100, 100);
  const mNavColor = metrics.mNAV >= 2.5 ? '#a855f7' : metrics.mNAV >= 1.8 ? '#00FF88' : metrics.mNAV >= 1.0 ? '#f59e0b' : '#FF3355';
  const leverageColor = metrics.leverageRatio > 1.5 ? '#FF3355' : metrics.leverageRatio > 0.7 ? '#f59e0b' : '#00FF88';
  const runwayColor = metrics.monthsRunway < 4 ? '#FF3355' : metrics.monthsRunway < 12 ? '#f59e0b' : '#00FF88';
  const unrealizedColor = metrics.unrealizedGainMM >= 0 ? '#00FF88' : '#FF3355';
  const yieldColor = metrics.btcYieldPct >= 0 ? '#00FF88' : '#FF3355';

  return (
    <div className="space-y-2 h-full overflow-y-auto pr-0.5">

      {/* ── BTC Treasury ── */}
      <div className="card-bitcoin p-3">
        <div className="section-label mb-1 flex items-center gap-1 text-bitcoin/60">
          <span className="text-bitcoin text-sm">₿</span> BITCOIN TREASURY
        </div>
        <div className="text-bitcoin font-bold text-xl font-mono glow-text-bitcoin">
          {balance.btcHeld >= 1000
            ? `${(balance.btcHeld / 1000).toFixed(2)}K ₿`
            : `${balance.btcHeld.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₿`}
        </div>
        <div className="text-slate-400 text-xs font-mono">{fmtMM(metrics.btcValueMM)}</div>
      </div>

      {/* ── BTC Metrics ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">₿ BTC KEY METRICS</div>
        <Row
          label="BTC/Share"
          value={`${(balance.btcHeld / balance.sharesOutstanding).toFixed(4)} ₿`}
          color="#F7931A"
        />
        <Row
          label="BTC Yield"
          value={`${metrics.btcYieldPct >= 0 ? '+' : ''}${metrics.btcYieldPct.toFixed(1)}%`}
          color={yieldColor}
          sub="BTC/share growth since start"
        />
        <Row
          label="Cost Basis"
          value={fmtPrice(metrics.costBasisPerBTC)}
          color="#7a5a9a"
          sub="avg price paid per BTC"
        />
        <Row
          label="Unrealized P&L"
          value={`${metrics.unrealizedGainMM >= 0 ? '+' : ''}${fmtMM(metrics.unrealizedGainMM)}`}
          color={unrealizedColor}
          sub={`${metrics.unrealizedGainPct >= 0 ? '+' : ''}${metrics.unrealizedGainPct.toFixed(1)}% on position`}
        />
      </div>

      {/* ── mNAV Meter ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">mNAV PREMIUM</div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xl font-mono" style={{ color: mNavColor }}>{metrics.mNAV.toFixed(2)}x</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ color: mNavColor, background: `${mNavColor}22`, border: `1px solid ${mNavColor}44` }}>
            {metrics.mNAVStatus.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="w-full bg-[#07000f] rounded-full h-2 mb-1">
          <div className="mnav-bar" style={{ width: `${mNavPct}%`, background: `linear-gradient(90deg, ${mNavColor}88, ${mNavColor})` }} />
        </div>
        <div className="mt-1 text-xs rounded px-2 py-1"
          style={{ background: `${mNavColor}11`, border: `1px solid ${mNavColor}22`, color: mNavColor }}>
          {metrics.mNAV >= 2.0 ? '▲ SMASH the ATM — premium window' : metrics.mNAV < 1.0 ? '▼ ATM destroys value here' : '◆ Neutral — assess before issuing'}
        </div>
      </div>

      {/* ── Stock ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">📈 EQUITY</div>
        <Row label="Stock Price" value={`$${metrics.stockPrice.toFixed(2)}`} color="#F7931A" />
        <Row label="Market Cap" value={fmtMM(metrics.marketCapMM)} color="#e2e8f0" />
        <Row label="NAV/Share" value={`$${metrics.navPerShare.toFixed(2)}`} color={metrics.navPerShare > 0 ? '#7a5a9a' : '#FF3355'} />
        <Row label="Shares Out" value={`${balance.sharesOutstanding.toFixed(1)}M`} />
      </div>

      {/* ── Balance Sheet ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">⚖ BALANCE SHEET</div>
        <Row label="Cash" value={fmtMM(balance.cashMM)}
          color={balance.cashMM > 100 ? '#00FF88' : balance.cashMM > 20 ? '#f59e0b' : '#FF3355'} />
        <Row label="Conv. Debt" value={balance.convertibleDebtMM > 0 ? fmtMM(balance.convertibleDebtMM) : 'CLEAR'}
          color={balance.convertibleDebtMM === 0 ? '#00FF88' : '#FF3355'}
          sub={balance.convertibleDebtMM > 0 ? `${(metrics.currentInterestRate * 100).toFixed(1)}% · $${(balance.convertibleDebtMM * metrics.currentInterestRate / 12).toFixed(1)}M/mo` : undefined} />
        <Row label="Preferred" value={balance.preferredFaceValueMM > 0 ? fmtMM(balance.preferredFaceValueMM) : 'NONE'}
          color={balance.preferredFaceValueMM > 0 ? '#f59e0b' : '#00FF88'}
          sub={balance.preferredFaceValueMM > 0 ? `$${(balance.preferredFaceValueMM * 0.115 / 12).toFixed(1)}M/mo div` : undefined} />
        <Row label="Net Asset Value" value={fmtMM(metrics.netAssetValueMM)}
          color={metrics.netAssetValueMM > 0 ? '#00FF88' : '#FF3355'} />
        {balance.preferredDivAccruedMM > 0.01 && (
          <Row label="Div Accrued" value={fmtMM(balance.preferredDivAccruedMM)} color="#f59e0b" sub="pays monthly" />
        )}
      </div>

      {/* ── Risk Gauges ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">⚠ RISK GAUGES</div>
        <div className="grid grid-cols-2 gap-2">
          <Gauge label="LEVERAGE"
            value={metrics.leverageRatio === 999 ? 0 : Math.min(metrics.leverageRatio * 66.7, 100)}
            color={leverageColor}
            display={metrics.leverageRatio === 999 ? 'CLEAN' : `${(metrics.leverageRatio * 100).toFixed(0)}%`} />
          <Gauge label="RUNWAY"
            value={Math.min((Math.min(metrics.monthsRunway, 36) / 36) * 100, 100)}
            color={runwayColor}
            display={metrics.monthsRunway === 999 ? '∞' : `${Math.floor(Math.min(metrics.monthsRunway, 36))}mo`} />
          <Gauge label="PREF COVER"
            value={metrics.preferredCoverageRatio === 999 ? 100 : Math.min((metrics.preferredCoverageRatio / 5) * 100, 100)}
            color={metrics.preferredCoverageRatio > 2 ? '#00FF88' : metrics.preferredCoverageRatio > 1 ? '#f59e0b' : '#FF3355'}
            display={metrics.preferredCoverageRatio === 999 ? 'N/A' : `${metrics.preferredCoverageRatio.toFixed(1)}x`} />
          <Gauge label="SENTIMENT"
            value={metrics.sentiment}
            color={metrics.sentimentColor}
            display={`${metrics.sentiment.toFixed(0)} · ${metrics.sentimentLabel}`} />
        </div>
      </div>
    </div>
  );
}
