import type { BalanceSheet, GameMetrics } from '../engine/financialModel';

interface Props {
  balance: BalanceSheet;
  metrics: GameMetrics;
}

function fmt(v: number, decimals = 1): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(2)}B`;
  return `$${v.toFixed(decimals)}M`;
}

function fmtBTC(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)}K ₿`;
  return `${v.toFixed(2)} ₿`;
}

function StatusBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded border"
      style={{ borderColor: `${color}44`, background: `${color}11` }}>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      <span className="text-slate-600 text-xs mt-0.5">{label}</span>
    </div>
  );
}

function StatRow({ label, value, valueColor = '#e2e8f0', sub }: {
  label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-terminal-border/40 last:border-0">
      <span className="text-slate-500 text-xs">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono font-semibold" style={{ color: valueColor }}>{value}</span>
        {sub && <div className="text-slate-600 text-xs">{sub}</div>}
      </div>
    </div>
  );
}

export function BalancePanel({ balance, metrics }: Props) {
  const mNavColors: Record<string, string> = {
    EXTREME_PREMIUM: '#a855f7',
    HIGH_PREMIUM: '#22c55e',
    FAIR: '#f59e0b',
    DISCOUNT: '#ef4444',
    DEEP_DISCOUNT: '#7f1d1d',
  };

  const mNavLabels: Record<string, string> = {
    EXTREME_PREMIUM: 'EXTREME PREMIUM',
    HIGH_PREMIUM: 'HIGH PREMIUM',
    FAIR: 'FAIR VALUE',
    DISCOUNT: 'DISCOUNT',
    DEEP_DISCOUNT: 'DEEP DISCOUNT',
  };

  const mNavColor = mNavColors[metrics.mNAVStatus] ?? '#94a3b8';
  const mNavPct = Math.min((metrics.mNAV / 5) * 100, 100);

  const leverageColor = metrics.leverageRatio > 1.5 ? '#ef4444'
    : metrics.leverageRatio > 0.8 ? '#f59e0b'
    : '#22c55e';

  const runwayColor = metrics.monthsRunway < 6 ? '#ef4444'
    : metrics.monthsRunway < 18 ? '#f59e0b'
    : '#22c55e';

  return (
    <div className="space-y-3 h-full overflow-y-auto pr-1">

      {/* Bitcoin Treasury */}
      <div className="game-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-bitcoin text-lg">₿</span>
          <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Bitcoin Treasury</span>
        </div>
        <div className="text-bitcoin text-2xl font-bold font-mono mb-1">
          {fmtBTC(balance.btcHeld)}
        </div>
        <div className="text-slate-400 text-sm font-mono">
          {fmt(metrics.btcValueMM)} at ${metrics.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="mt-2 text-xs text-slate-600">
          {(balance.btcHeld / balance.sharesOutstanding).toFixed(4)} BTC/share
        </div>
      </div>

      {/* mNAV Meter */}
      <div className="game-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">mNAV Multiple</span>
          <span className="font-bold text-sm font-mono" style={{ color: mNavColor }}>
            {metrics.mNAV.toFixed(2)}x
          </span>
        </div>
        <div className="w-full bg-terminal-muted rounded-full h-2 mb-1">
          <div
            className="mnav-bar"
            style={{
              width: `${mNavPct}%`,
              background: `linear-gradient(90deg, ${mNavColor}99, ${mNavColor})`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-600">0.5x</span>
          <span className="font-semibold" style={{ color: mNavColor }}>
            {mNavLabels[metrics.mNAVStatus]}
          </span>
          <span className="text-slate-600">5x</span>
        </div>
        {metrics.mNAVStatus === 'HIGH_PREMIUM' || metrics.mNAVStatus === 'EXTREME_PREMIUM' ? (
          <div className="mt-2 text-xs text-emerald-400 bg-emerald-400/10 rounded px-2 py-1">
            ▲ Good time to issue shares (selling at premium to NAV)
          </div>
        ) : metrics.mNAVStatus === 'DISCOUNT' || metrics.mNAVStatus === 'DEEP_DISCOUNT' ? (
          <div className="mt-2 text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
            ▼ Issuing shares destroys value — consider alternatives
          </div>
        ) : (
          <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 rounded px-2 py-1">
            ◆ Neutral — evaluate market conditions before issuing
          </div>
        )}
      </div>

      {/* Stock Price */}
      <div className="game-card p-4">
        <div className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">Equity</div>
        <StatRow
          label="Stock Price (MSTR)"
          value={`$${metrics.stockPrice.toFixed(2)}`}
          valueColor="#e2e8f0"
        />
        <StatRow
          label="NAV per Share"
          value={`$${metrics.navPerShare.toFixed(2)}`}
          valueColor={metrics.navPerShare > 0 ? '#94a3b8' : '#ef4444'}
        />
        <StatRow
          label="Shares Outstanding"
          value={`${balance.sharesOutstanding.toFixed(1)}M`}
          valueColor="#94a3b8"
        />
        <StatRow
          label="Market Cap"
          value={fmt(metrics.stockPrice * balance.sharesOutstanding)}
          valueColor="#e2e8f0"
        />
      </div>

      {/* Cash & Liabilities */}
      <div className="game-card p-4">
        <div className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">Balance Sheet</div>
        <StatRow
          label="Cash Reserves"
          value={fmt(balance.cashMM)}
          valueColor={balance.cashMM > 200 ? '#22c55e' : balance.cashMM > 50 ? '#f59e0b' : '#ef4444'}
        />
        <StatRow
          label="Convertible Debt"
          value={balance.convertibleDebtMM > 0 ? fmt(balance.convertibleDebtMM) : 'NONE'}
          valueColor={balance.convertibleDebtMM === 0 ? '#22c55e' : '#ef4444'}
          sub={balance.convertibleDebtMM > 0 ? '6% annual interest' : undefined}
        />
        <StatRow
          label="Preferred Stack"
          value={balance.preferredFaceValueMM > 0 ? fmt(balance.preferredFaceValueMM) : 'NONE'}
          valueColor={balance.preferredFaceValueMM > 0 ? '#f59e0b' : '#22c55e'}
          sub={balance.preferredFaceValueMM > 0 ? `8% div = ${fmt((balance.preferredFaceValueMM * 0.08)/ 4)}/qtr` : undefined}
        />
        <StatRow
          label="Net Asset Value"
          value={fmt(metrics.netAssetValueMM)}
          valueColor={metrics.netAssetValueMM > 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* Risk Gauges */}
      <div className="game-card p-4">
        <div className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">Risk Gauges</div>
        <div className="grid grid-cols-2 gap-2">
          <StatusBadge
            label="Leverage"
            value={metrics.leverageRatio === 999 ? 'CLEAN' : `${(metrics.leverageRatio * 100).toFixed(0)}%`}
            color={leverageColor}
          />
          <StatusBadge
            label="Runway"
            value={metrics.monthsRunway === 999 ? 'INFINITE' : `${Math.floor(metrics.monthsRunway)}mo`}
            color={runwayColor}
          />
          <StatusBadge
            label="Pref Cover"
            value={metrics.preferredCoverageRatio === 999 ? 'N/A' : `${metrics.preferredCoverageRatio.toFixed(1)}x`}
            color={metrics.preferredCoverageRatio > 2 ? '#22c55e' : metrics.preferredCoverageRatio > 1 ? '#f59e0b' : '#ef4444'}
          />
          <StatusBadge
            label="Div Accrued"
            value={balance.preferredDivAccruedMM > 0 ? fmt(balance.preferredDivAccruedMM) : 'NONE'}
            color={balance.preferredDivAccruedMM > 0 ? '#f59e0b' : '#22c55e'}
          />
        </div>
      </div>
    </div>
  );
}
