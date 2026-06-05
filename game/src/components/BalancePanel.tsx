import type { BalanceSheet, GameMetrics } from '../engine/financialModel';
import type { Era } from '../data/eras';

interface Props {
  balance: BalanceSheet;
  metrics: GameMetrics;
  era: Era;
}

function fmtMM(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(2)}B`;
  return `$${v.toFixed(1)}M`;
}

function Row({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bloomberg-row">
      <span className="text-[#3a5070]">{label}</span>
      <div className="text-right">
        <span className="font-mono font-semibold" style={{ color: color ?? '#cbd5e1' }}>{value}</span>
        {sub && <div className="text-[#2a3a52] text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function Gauge({ label, value, color, max = 100, display }: { label: string; value: number; color: string; max?: number; display?: string }) {
  return (
    <div className="p-2 rounded border border-[#1a2540] bg-[#060a12]">
      <div className="text-[#3a5070] text-xs mb-1">{label}</div>
      <div className="w-full bg-[#0a0f1e] rounded-full h-1.5 mb-1">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
      </div>
      <div className="font-mono font-bold text-xs" style={{ color }}>{display ?? value.toFixed(1)}</div>
    </div>
  );
}

export function BalancePanel({ balance, metrics, era }: Props) {
  const mNavPct = Math.min((metrics.mNAV / 4) * 100, 100);
  const mNavColor = metrics.mNAV >= 2.5 ? '#a855f7' : metrics.mNAV >= 1.8 ? '#22c55e' : metrics.mNAV >= 1.0 ? '#f59e0b' : '#ef4444';
  const leverageColor = metrics.leverageRatio > 1.5 ? '#ef4444' : metrics.leverageRatio > 0.7 ? '#f59e0b' : '#22c55e';
  const runwayColor = metrics.monthsRunway < 4 ? '#ef4444' : metrics.monthsRunway < 12 ? '#f59e0b' : '#22c55e';
  const leverageDisplay = metrics.leverageRatio === 999 ? 'CLEAN' : `${(metrics.leverageRatio * 100).toFixed(0)}%`;
  const runwayDisplay = metrics.monthsRunway === 999 ? '∞' : `${Math.floor(Math.min(metrics.monthsRunway, 36))}mo`;
  const prefCoverDisplay = metrics.preferredCoverageRatio === 999 ? 'N/A' : `${metrics.preferredCoverageRatio.toFixed(1)}x`;

  return (
    <div className="space-y-2 h-full overflow-y-auto pr-0.5">

      {/* BTC Treasury */}
      <div className="game-card p-3">
        <div className="section-label mb-2 flex items-center gap-2">
          <span className="text-bitcoin">₿</span> BITCOIN TREASURY
        </div>
        <div className="text-bitcoin font-bold text-xl font-mono glow-text-bitcoin">
          {balance.btcHeld >= 1000
            ? `${(balance.btcHeld / 1000).toFixed(2)}K ₿`
            : `${balance.btcHeld.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₿`}
        </div>
        <div className="text-slate-400 text-xs font-mono mt-0.5">{fmtMM(metrics.btcValueMM)}</div>
        <div className="text-[#2a3a52] text-xs mt-1">
          {(balance.btcHeld / balance.sharesOutstanding).toFixed(4)} ₿/share
        </div>
      </div>

      {/* mNAV Meter */}
      <div className="game-card p-3">
        <div className="section-label mb-2">mNAV PREMIUM</div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-xl font-mono" style={{ color: mNavColor }}>{metrics.mNAV.toFixed(2)}x</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: mNavColor, background: `${mNavColor}22`, border: `1px solid ${mNavColor}44` }}>
            {metrics.mNAVStatus.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="w-full bg-[#0a0f1e] rounded-full h-2 mb-1">
          <div className="mnav-bar" style={{ width: `${mNavPct}%`, background: `linear-gradient(90deg, ${mNavColor}88, ${mNavColor})` }} />
        </div>
        <div className="flex justify-between text-xs text-[#2a3a52]">
          <span>0.5x discount</span>
          <span>4x max</span>
        </div>
        <div className="mt-1.5 text-xs rounded px-2 py-1"
          style={{ background: `${mNavColor}11`, border: `1px solid ${mNavColor}22`, color: mNavColor }}>
          {metrics.mNAV >= 2.0
            ? '▲ Premium — SMASH the ATM'
            : metrics.mNAV < 1.0
            ? '▼ Discount — ATM destroys value'
            : '◆ Neutral — assess before issuing'}
        </div>
      </div>

      {/* Stock */}
      <div className="game-card p-3">
        <div className="section-label mb-2">📈 EQUITY</div>
        <Row label="Stock Price" value={`$${metrics.stockPrice.toFixed(2)}`} color="#F7931A" />
        <Row label="NAV/Share" value={`$${metrics.navPerShare.toFixed(2)}`} color={metrics.navPerShare > 0 ? '#94a3b8' : '#ef4444'} />
        <Row label="Shares Out" value={`${balance.sharesOutstanding.toFixed(1)}M`} />
        <Row label="Market Cap" value={fmtMM(metrics.stockPrice * balance.sharesOutstanding)} color="#e2e8f0" />
      </div>

      {/* Balance Sheet */}
      <div className="game-card p-3">
        <div className="section-label mb-2">⚖ BALANCE SHEET</div>
        <Row
          label="Cash"
          value={fmtMM(balance.cashMM)}
          color={balance.cashMM > 100 ? '#22c55e' : balance.cashMM > 20 ? '#f59e0b' : '#ef4444'}
        />
        <Row
          label="Conv. Debt"
          value={balance.convertibleDebtMM > 0 ? fmtMM(balance.convertibleDebtMM) : 'CLEAR'}
          color={balance.convertibleDebtMM === 0 ? '#22c55e' : '#ef4444'}
          sub={balance.convertibleDebtMM > 0 ? `$${(balance.convertibleDebtMM * 0.06 / 12).toFixed(1)}M/mo` : undefined}
        />
        <Row
          label="Preferred"
          value={balance.preferredFaceValueMM > 0 ? fmtMM(balance.preferredFaceValueMM) : 'NONE'}
          color={balance.preferredFaceValueMM > 0 ? '#f59e0b' : '#22c55e'}
          sub={balance.preferredFaceValueMM > 0 ? `$${(balance.preferredFaceValueMM * 0.08 / 12).toFixed(1)}M/mo div` : undefined}
        />
        <Row
          label="Net Asset Value"
          value={fmtMM(metrics.netAssetValueMM)}
          color={metrics.netAssetValueMM > 0 ? '#22c55e' : '#ef4444'}
        />
        {balance.preferredDivAccruedMM > 0.01 && (
          <Row
            label="Div Accrued"
            value={fmtMM(balance.preferredDivAccruedMM)}
            color="#f59e0b"
            sub="pays monthly"
          />
        )}
      </div>

      {/* Risk Gauges */}
      <div className="game-card p-3">
        <div className="section-label mb-2">⚠ RISK GAUGES</div>
        <div className="grid grid-cols-2 gap-2">
          <Gauge label="LEVERAGE" value={metrics.leverageRatio === 999 ? 0 : metrics.leverageRatio * 100} color={leverageColor} max={200} display={leverageDisplay} />
          <Gauge label="RUNWAY" value={Math.min(metrics.monthsRunway === 999 ? 36 : metrics.monthsRunway, 36)} color={runwayColor} max={36} display={runwayDisplay} />
          <Gauge
            label="PREF COVER"
            value={metrics.preferredCoverageRatio === 999 ? 100 : Math.min(metrics.preferredCoverageRatio / 5 * 100, 100)}
            color={metrics.preferredCoverageRatio > 2 ? '#22c55e' : metrics.preferredCoverageRatio > 1 ? '#f59e0b' : '#ef4444'}
            max={100}
            display={prefCoverDisplay}
          />
          <Gauge label="SENTIMENT" value={metrics.sentiment} color={metrics.sentimentColor} max={100} display={`${metrics.sentiment.toFixed(0)}/100`} />
        </div>
      </div>

      {/* Software Biz */}
      <div className="game-card p-3">
        <div className="section-label mb-2">💼 SOFTWARE OPERATIONS</div>
        <Row label="Revenue/Qtr" value={`$${era.softwareRevenue}M`} color="#94a3b8" />
        <Row label="Op Margin" value="15%" color="#64748b" />
        <div className="text-[#2a3a52] text-xs mt-1">Steady background cash. Not the objective.</div>
      </div>
    </div>
  );
}
