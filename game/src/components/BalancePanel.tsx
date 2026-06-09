import { fmtMM, fmtPrice, fmtBTC } from '../utils/format';
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
        <span className="font-mono font-semibold text-xs" style={{ color: color ?? '#e0f4ff' }}>{value}</span>
        {sub && <div className="text-[#3a1070] text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function Gauge({ label, value, color, display }: { label: string; value: number; color: string; display?: string }) {
  return (
    <div className="p-2 rounded border" style={{ borderColor: '#2d0060', background: '#04000a' }}>
      <div className="text-[#6a3090] text-xs mb-1">{label}</div>
      <div className="w-full bg-[#07000f] rounded-full h-1.5 mb-1">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <div className="font-mono font-bold text-xs" style={{ color }}>{display ?? `${value.toFixed(0)}%`}</div>
    </div>
  );
}

function MNavBadge({ label, value, sub }: { label: string; value: number; sub: string }) {
  const color = value >= 2.5 ? '#a855f7' : value >= 1.5 ? '#00FF88' : value >= 1.0 ? '#f59e0b' : '#FF3355';
  return (
    <div className="p-2 rounded border text-center" style={{ borderColor: `${color}44`, background: `${color}11` }}>
      <div className="text-[#6a3090] text-xs mb-0.5" style={{ fontSize: '0.58rem', letterSpacing: '0.1em' }}>{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color }}>{value.toFixed(2)}x</div>
      <div className="text-xs mt-0.5" style={{ color: '#4a2a7a', fontSize: '0.58rem' }}>{sub}</div>
    </div>
  );
}

export function BalancePanel({ balance, metrics }: Props) {
  const leverageColor = metrics.leverageRatio > 1.5 ? '#FF3355' : metrics.leverageRatio > 0.7 ? '#f59e0b' : '#00FF88';
  const runwayColor = metrics.monthsRunway < 4 ? '#FF3355' : metrics.monthsRunway < 12 ? '#f59e0b' : '#00FF88';
  const unrealizedColor = metrics.unrealizedGainMM >= 0 ? '#00FF88' : '#FF3355';
  const yieldColor = metrics.btcYieldPct >= 0 ? '#00FF88' : '#FF3355';
  const strcColor = metrics.strcMarketPrice >= 90 ? '#00FF88' : metrics.strcMarketPrice >= 60 ? '#f59e0b' : '#FF3355';

  return (
    <div className="space-y-2 h-full overflow-y-auto pr-0.5">

      {/* ── BTC Treasury ── */}
      <div className="card-bitcoin p-3">
        <div className="section-label mb-1 flex items-center gap-1" style={{ color: 'rgba(247,147,26,0.6)' }}>
          <span style={{ color: '#F7931A' }}>₿</span> BITCOIN TREASURY
        </div>
        <div className="text-bitcoin font-bold text-xl font-mono glow-text-bitcoin">
          {fmtBTC(balance.btcHeld)}
        </div>
        <div className="text-[#7a5a9a] text-xs font-mono">{fmtMM(metrics.btcValueMM)}</div>
      </div>

      {/* ── Risk Gauges — moved up for visibility ── */}
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
            display={`${metrics.sentiment.toFixed(0)} · ${metrics.sentimentLabel.slice(0,4)}`} />
        </div>
      </div>

      {/* ── mNAV Metrics + CEBE ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">mNAV MULTIPLES</div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <MNavBadge label="mNAV" value={metrics.mNAV} sub="Mkt Cap / BTC" />
          <MNavBadge label="EV mNAV" value={Math.max(0, metrics.evMNAV)} sub="EV / BTC" />
        </div>
        <div className="mt-1.5 text-xs rounded px-2 py-1 mb-2"
          style={{ background: metrics.mNAV >= 2 ? 'rgba(0,255,136,0.08)' : 'rgba(255,51,85,0.08)', border: `1px solid ${metrics.mNAV >= 2 ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,85,0.2)'}`, color: metrics.mNAV >= 2 ? '#00FF88' : '#FF3355' }}>
          {metrics.mNAV >= 2.0 ? '▲ Premium — SMASH the ATM' : metrics.mNAV < 1.0 ? '▼ ATM destroys value here' : '◆ Neutral — assess before issuing'}
        </div>

        {/* CEBE — correct formula */}
        <div className="section-label mb-1.5">CEBE — NET BTC / DILUTED SHARE</div>
        <div className="rounded p-2 text-xs" style={{background:'#04000a', border:'1px solid #2d0060'}}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#6a3090]">CEBE (sats/share)</span>
            <span className="font-mono font-bold" style={{
              color: metrics.cebePerShare > 0 ? '#00FF88' : '#FF3355',
              textShadow: metrics.cebePerShare > 0 ? '0 0 8px rgba(0,255,136,0.5)' : '0 0 8px rgba(255,51,85,0.5)'
            }}>
              {metrics.cebeSats >= 0
                ? `${metrics.cebeSats.toFixed(0)} sats`
                : `−${Math.abs(metrics.cebeSats).toFixed(0)} sats`}
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#6a3090]">CEBE (BTC/share)</span>
            <span className="font-mono font-bold text-xs" style={{color: metrics.cebePerShare >= 0 ? '#00FF88' : '#FF3355'}}>
              {metrics.cebePerShare >= 0 ? '+' : ''}{metrics.cebePerShare.toFixed(6)} ₿
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6a3090]">CEBE Yield</span>
            <span className="font-mono font-bold text-xs" style={{color: metrics.cebeYieldPct >= 0 ? '#00FF88' : '#FF3355'}}>
              {metrics.cebeYieldPct >= 0 ? '+' : ''}{metrics.cebeYieldPct.toFixed(1)}%
            </span>
          </div>
          {metrics.cebePerShare < 0 && (
            <div className="mt-1.5 text-xs font-bold rounded px-1.5 py-1 animate-pulse"
              style={{background:'rgba(255,51,85,0.15)', border:'1px solid rgba(255,51,85,0.5)', color:'#FF3355'}}>
              ⚠ NEGATIVE CEBE: Senior claims exceed BTC treasury. Common equity is underwater.
            </div>
          )}
          <div className="mt-1.5 text-[#3a1070]" style={{fontSize:'0.55rem', letterSpacing:'0.05em'}}>
            Formula: (BTC − (Debt+Pref−Cash)/Price) ÷ Shares
          </div>
        </div>
      </div>

      {/* ── BTC Key Metrics ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">₿ BTC PERFORMANCE</div>
        <Row label="BTC/Share" value={`${(balance.btcHeld / balance.sharesOutstanding).toFixed(4)} ₿`} color="#F7931A" />
        <Row label="BTC Yield" value={`${metrics.btcYieldPct >= 0 ? '+' : ''}${metrics.btcYieldPct.toFixed(1)}%`} color={yieldColor} sub="BTC/share vs start" />
        <Row label="Cost Basis" value={fmtPrice(metrics.costBasisPerBTC)} color="#7a5a9a" sub="avg price paid per ₿" />
        <Row label="Unrealized P&L"
          value={`${metrics.unrealizedGainMM >= 0 ? '+' : ''}${fmtMM(metrics.unrealizedGainMM)}`}
          color={unrealizedColor}
          sub={`${metrics.unrealizedGainPct >= 0 ? '+' : ''}${metrics.unrealizedGainPct.toFixed(1)}%`} />
      </div>

      {/* ── Stock ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">📈 EQUITY</div>
        <Row label="Stock Price" value={fmtPrice(metrics.stockPrice)} color="#00D4FF" />
        <Row label="Market Cap" value={fmtMM(metrics.marketCapMM)} color="#e0f4ff" />
        <Row label="NAV/Share" value={`$${metrics.navPerShare.toFixed(2)}`} color={metrics.navPerShare > 0 ? '#7a5a9a' : '#FF3355'} />
        <Row label="Shares Out" value={`${balance.sharesOutstanding.toFixed(1)}M`} />
      </div>

      {/* ── Balance Sheet ── */}
      <div className="game-card p-3">
        <div className="section-label mb-2">⚖ BALANCE SHEET</div>
        <Row label="Cash"
          value={fmtMM(balance.cashMM)}
          color={balance.cashMM > 100 ? '#00FF88' : balance.cashMM > 20 ? '#f59e0b' : '#FF3355'} />
        <Row label="Conv. Debt"
          value={balance.convertibleDebtMM > 0 ? fmtMM(balance.convertibleDebtMM) : 'CLEAR'}
          color={balance.convertibleDebtMM === 0 ? '#00FF88' : '#FF3355'}
          sub={balance.convertibleDebtMM > 0 ? `${(metrics.currentInterestRate * 100).toFixed(1)}% · $${(balance.convertibleDebtMM * metrics.currentInterestRate / 12).toFixed(1)}M/mo` : undefined} />
        <Row label="STRC Preferred"
          value={balance.preferredFaceValueMM > 0 ? fmtMM(balance.preferredFaceValueMM) : 'NONE'}
          color={balance.preferredFaceValueMM > 0 ? '#f59e0b' : '#00FF88'}
          sub={balance.preferredFaceValueMM > 0 ? `${(metrics.strcRate * 100).toFixed(1)}% eff · $${(balance.preferredFaceValueMM * metrics.strcRate / 12).toFixed(1)}M/mo` : undefined} />
        <Row label="STRC Mkt Price"
          value={`$${metrics.strcMarketPrice.toFixed(2)} / $100 par`}
          color={strcColor} />
        {metrics.preferredDivAccruedMM > 0.01 && (
          <Row label="Div Accrued"
            value={fmtMM(metrics.preferredDivAccruedMM)}
            color="#f59e0b"
            sub="pays monthly" />
        )}
        <Row label="Net Asset Value"
          value={fmtMM(metrics.netAssetValueMM)}
          color={metrics.netAssetValueMM > 0 ? '#00FF88' : '#FF3355'} />
      </div>
    </div>
  );
}
