import { fmtQuickLabel } from '../utils/format';
import { useState } from 'react';
import type { GameMetrics, BalanceSheet } from '../engine/financialModel';

type ActionTab = 'BUY_BTC' | 'ATM' | 'PREFERRED' | 'DEBT';

interface Props {
  balance: BalanceSheet;
  metrics: GameMetrics;
  onBuyBTC: (amountMM: number) => void;
  onSellBTC: (btcAmount: number) => void;
  onIssueCommon: (sharesMM: number) => void;
  onIssuePreferred: (amountMM: number) => void;
  onPayDebt: (amountMM: number) => void;
}

function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="text-xs px-2 py-1 rounded border border-[#2d0060] text-[#6a3090] hover:border-bitcoin hover:text-bitcoin transition-colors font-mono"
      onClick={onClick}
    >{label}</button>
  );
}

export function ActionPanel({ balance, metrics, onBuyBTC, onSellBTC, onIssueCommon, onIssuePreferred, onPayDebt }: Props) {
  const [tab, setTab] = useState<ActionTab>('BUY_BTC');
  const [buyAmt, setBuyAmt] = useState('');
  const [sellAmt, setSellAmt] = useState('');
  const [shareAmt, setShareAmt] = useState('');
  const [prefAmt, setPrefAmt] = useState('');
  const [debtAmt, setDebtAmt] = useState('');

  const TABS: { id: ActionTab; label: string; color: string }[] = [
    { id: 'BUY_BTC',   label: '₿ STACK',   color: '#F7931A' },
    { id: 'ATM',       label: '📈 ATM',     color: '#00FF88' },
    { id: 'PREFERRED', label: '💎 PREF',    color: '#a855f7' },
    { id: 'DEBT',      label: '🔓 DEBT',    color: '#FF3355' },
  ];

  const atmOverheated = metrics.atmCooldown >= 75;

  return (
    <div className="game-card h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-[#2d0060]">
        {TABS.map(t => (
          <button key={t.id}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: tab === t.id ? t.color : '#6a3090',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              background: tab === t.id ? `${t.color}11` : 'transparent',
            }}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3">

        {/* ── STACK SATS ── */}
        {tab === 'BUY_BTC' && (
          <>
            <div className="card-bitcoin p-3 rounded">
              <div className="text-[#F7931A] text-xs font-bold uppercase tracking-wider mb-1">₿ ACQUIRE BITCOIN</div>
              <div className="text-[#6a3090] text-xs mb-2">
                Cash: <span className="text-emerald-400 font-mono">${balance.cashMM.toFixed(1)}M</span>
                <span className="text-[#3a1070] mx-2">·</span>
                Price: <span className="text-white font-mono">${metrics.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {[10, 50, 100, 250, 500, 1000].map(v => (
                  <Quick key={v} label={fmtQuickLabel(v)} onClick={() => setBuyAmt(String(v))} />
                ))}
                <Quick label="MAX" onClick={() => setBuyAmt(Math.floor(balance.cashMM * 0.94).toString())} />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#04000a] border border-[#2d0060] rounded px-3 py-2 text-sm font-mono text-white focus:border-bitcoin focus:outline-none"
                  placeholder="$M to spend"
                  type="number"
                  value={buyAmt}
                  onChange={e => setBuyAmt(e.target.value)}
                />
                <button className="btn-bitcoin px-4"
                  disabled={!buyAmt || parseFloat(buyAmt) <= 0}
                  onClick={() => { onBuyBTC(parseFloat(buyAmt)); setBuyAmt(''); }}>
                  STACK
                </button>
              </div>
              {buyAmt && parseFloat(buyAmt) > 0 && (
                <div className="text-xs text-[#6a3090] mt-1 font-mono">
                  ≈ {((parseFloat(buyAmt) * 1e6) / metrics.btcPrice).toLocaleString(undefined, { maximumFractionDigits: 1 })} BTC
                  {parseFloat(buyAmt) >= 100 && <span className="text-bitcoin ml-2">↑ large buy moves market!</span>}
                </div>
              )}
            </div>

            <div className="p-3 rounded border border-red-900/40 bg-red-950/20">
              <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">⚠ SELL BTC — TANKS STOCK</div>
              <div className="text-[#6a3090] text-xs mb-2">
                Held: <span className="text-bitcoin font-mono">{balance.btcHeld.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₿</span>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#04000a] border border-red-900/50 rounded px-3 py-2 text-sm font-mono text-white focus:border-red-400 focus:outline-none"
                  placeholder="BTC to sell"
                  type="number"
                  value={sellAmt}
                  onChange={e => setSellAmt(e.target.value)}
                />
                <button className="btn-red px-4"
                  disabled={!sellAmt || parseFloat(sellAmt) <= 0}
                  onClick={() => { onSellBTC(parseFloat(sellAmt)); setSellAmt(''); }}>
                  DUMP
                </button>
              </div>
              {sellAmt && parseFloat(sellAmt) > 0 && (
                <div className="text-xs text-red-500 mt-1 font-mono">
                  ≈ ${((parseFloat(sellAmt) * metrics.btcPrice) / 1e6).toFixed(1)}M proceeds · stock price will crater!
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SMASH THE ATM ── */}
        {tab === 'ATM' && (
          <>
            <div className="p-3 rounded border bg-[#04000a]"
              style={{ borderColor: atmOverheated ? '#ef444455' : '#2d0060' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">📈 ISSUE COMMON STOCK</div>
                {atmOverheated && (
                  <span className="text-xs text-red-400 font-bold animate-pulse">⚠ OVERHEATING</span>
                )}
              </div>

              {/* mNAV signal */}
              <div className={`rounded p-2 text-xs mb-3 border ${
                metrics.mNAVStatus === 'HIGH_PREMIUM' || metrics.mNAVStatus === 'EXTREME_PREMIUM'
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : metrics.mNAVStatus === 'DISCOUNT' || metrics.mNAVStatus === 'DEEP_DISCOUNT'
                  ? 'bg-red-950/40 border-red-800/50 text-red-400'
                  : 'bg-yellow-950/30 border-yellow-800/40 text-yellow-400'
              }`}>
                <span className="font-bold">mNAV {metrics.mNAV.toFixed(2)}x · </span>
                {metrics.mNAV >= 1.8
                  ? `PREMIUM — sell ${metrics.mNAV.toFixed(1)}x your NAV and buy more BTC`
                  : metrics.mNAV < 1.0
                  ? `DISCOUNT — issuing here DESTROYS stock price`
                  : `Fair value zone — neutral issuance`}
              </div>

              {/* ATM cooldown bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#6a3090] mb-1">
                  <span>ATM HEAT</span>
                  <span style={{ color: metrics.atmCooldown > 50 ? '#FF3355' : '#00FF88' }}>
                    {metrics.atmCooldown < 25 ? 'COOL — FIRE!' : metrics.atmCooldown < 50 ? 'WARM' : metrics.atmCooldown < 75 ? 'HOT' : 'OVERHEATED — BACK OFF!'}
                  </span>
                </div>
                <div className="w-full bg-[#07000f] rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${metrics.atmCooldown}%`,
                      background: metrics.atmCooldown < 50
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : metrics.atmCooldown < 75
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                    }}
                  />
                </div>
                <div className="text-xs text-[#3a1070] mt-1">Repeated issuance hurts sentiment & depresses stock</div>
              </div>

              <div className="text-[#6a3090] text-xs mb-2">
                Price: <span className="text-white font-mono">${metrics.stockPrice.toFixed(2)}</span>
                <span className="mx-2">·</span>
                Out: <span className="text-white font-mono">{balance.sharesOutstanding.toFixed(1)}M sh</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {[1, 5, 10].map(v => (
                  <Quick key={v} label={`${v}M sh`} onClick={() => setShareAmt(String(v))} />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#04000a] border border-[#2d0060] rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Millions of shares"
                  type="number"
                  value={shareAmt}
                  onChange={e => setShareAmt(e.target.value)}
                />
                <button className="btn-smash" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.7rem' }}
                  disabled={!shareAmt || parseFloat(shareAmt) <= 0}
                  onClick={() => { onIssueCommon(parseFloat(shareAmt)); setShareAmt(''); }}>
                  SMASH ATM
                </button>
              </div>
              {shareAmt && parseFloat(shareAmt) > 0 && (
                <div className="text-xs text-[#6a3090] mt-1 font-mono">
                  Raises ≈ ${(parseFloat(shareAmt) * metrics.stockPrice).toFixed(1)}M
                  · dilution {((parseFloat(shareAmt) / (balance.sharesOutstanding + parseFloat(shareAmt))) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </>
        )}

        {/* ── PREFERRED ── */}
        {tab === 'PREFERRED' && (
          <div className="space-y-2">
            {/* STRC Price Chart */}
            <div className="rounded border p-2" style={{borderColor:'rgba(120,0,180,0.4)', background:'rgba(60,0,100,0.15)'}}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">STRC MARKET PRICE</span>
                <span className="font-mono font-bold text-sm" style={{color: metrics.strcMarketPrice >= 90 ? '#00FF88' : metrics.strcMarketPrice >= 60 ? '#f59e0b' : '#FF3355'}}>
                  ${metrics.strcMarketPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6a3090] mb-1.5">
                <span>$100 par ·</span>
                <span>${(100 * 0.115).toFixed(2)}/yr div ·</span>
                <span style={{color: metrics.strcRate > 0.20 ? '#FF3355' : '#a855f7'}}>
                  {(metrics.strcRate * 100).toFixed(1)}% effective yield
                </span>
              </div>
              {/* Mini SVG chart */}
              {metrics.strcPriceHistory.length > 1 && (
                <svg width="100%" height="44" style={{display:'block'}}>
                  {(() => {
                    const data = metrics.strcPriceHistory;
                    const mn = Math.min(...data) * 0.97;
                    const mx = Math.max(...data) * 1.03;
                    const w = 100, h = 40;
                    const pts = data.map((v, i) => {
                      const x = (i / (data.length - 1)) * w;
                      const y = h - ((v - mn) / (mx - mn)) * h;
                      return `${x},${y}`;
                    }).join(' ');
                    const lastPct = ((data[data.length-1] - 100) / 100) * 100;
                    const lineColor = data[data.length-1] >= data[0] ? '#00FF88' : '#FF3355';
                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="40">
                        <defs>
                          <linearGradient id="strc-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2"/>
                            <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5"/>
                        <text x={w-1} y={h-2} textAnchor="end" fill={lineColor} fontSize="6" fontFamily="monospace">
                          {lastPct >= 0 ? '+' : ''}{lastPct.toFixed(1)}%
                        </text>
                      </svg>
                    );
                  })()}
                </svg>
              )}
            </div>

            <div className="rounded p-2 text-xs" style={{background:'rgba(80,0,120,0.2)', border:'1px solid rgba(120,0,180,0.3)', color:'#cc88ff'}}>
              <span className="font-bold text-purple-300">STRC Perpetual Preferred — 11.5% base annual dividend, paid monthly.</span>
              {' '}Rate adjusts dynamically with coverage risk: rising exponentially when preferred obligations exceed BTC treasury value.
              {' '}<span className="font-bold" style={{color:'#FF3355'}}>Structurally leveraged to Bitcoin — accretive in bull cycles, compounding liability in sustained drawdowns.</span>
            </div>

            {metrics.strcRate > 0.20 && (
              <div className="rounded p-2 text-xs font-bold animate-pulse" style={{background:'rgba(200,0,30,0.15)', border:'1px solid rgba(255,51,85,0.6)', color:'#FF3355'}}>
                ⚠ ELEVATED RISK: STRC yield at {(metrics.strcRate * 100).toFixed(1)}% — preferred obligations approaching or exceeding BTC coverage. Dividend service may become structurally unsustainable.
              </div>
            )}

            {balance.preferredFaceValueMM > 0 && (
              <div className="text-xs text-[#6a3090] font-mono px-1">
                Stack: <span className="text-yellow-400">${balance.preferredFaceValueMM >= 1000 ? (balance.preferredFaceValueMM/1000).toFixed(2)+'B' : balance.preferredFaceValueMM.toFixed(0)+'M'}</span>
                {' · '}monthly div: <span className="text-red-400">${(balance.preferredFaceValueMM * metrics.strcRate / 12).toFixed(1)}M</span>
                {' · '}<span style={{color: metrics.strcMarketPrice < 80 ? '#FF3355' : '#a855f7'}}>STRC @ ${metrics.strcMarketPrice.toFixed(2)}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {[50, 100, 500, 1000, 5000, 10000].map(v => (
                <Quick key={v} label={fmtQuickLabel(v)} onClick={() => setPrefAmt(String(v))} />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#04000a] border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{borderColor: prefAmt ? 'rgba(167,85,247,0.8)' : 'rgba(120,0,180,0.4)'}}
                placeholder="Raise $M (no limit)"
                type="number"
                min="1"
                value={prefAmt}
                onChange={e => setPrefAmt(e.target.value)}
              />
              <button
                className="px-4 py-2 text-xs font-bold uppercase rounded transition-all hover:brightness-125"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow:'0 0 12px rgba(124,58,237,0.4)' }}
                disabled={!prefAmt || parseFloat(prefAmt) <= 0}
                onClick={() => { onIssuePreferred(parseFloat(prefAmt)); setPrefAmt(''); }}>
                ISSUE
              </button>
            </div>
            {prefAmt && parseFloat(prefAmt) > 0 && (
              <div className="text-xs text-red-400 font-mono px-1">
                +${(parseFloat(prefAmt) * metrics.strcRate / 12).toFixed(1)}M/month div at {(metrics.strcRate * 100).toFixed(1)}% effective yield
              </div>
            )}
          </div>
        )}

        {/* ── PAY DEBT ── */}
        {tab === 'DEBT' && (
          <div className="p-3 rounded border border-red-900/30 bg-red-950/10">
            <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">🔓 RETIRE CONVERTIBLE DEBT</div>
            <div className="rounded p-2 text-xs mb-3 bg-red-950/20 border border-red-800/30 text-red-300">
              6% annual interest. Paying down cleans the balance sheet, boosts NAV, and lifts mNAV. Use when BTC is expensive.
            </div>
            <div className="text-xs text-[#6a3090] mb-3 font-mono">
              Debt: <span className="text-red-400">${balance.convertibleDebtMM.toFixed(0)}M</span>
              <span className="mx-2">·</span>
              Cash: <span className="text-emerald-400">${balance.cashMM.toFixed(1)}M</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {[50, 100, 250, 500].map(v => (
                <Quick key={v} label={fmtQuickLabel(v)} onClick={() => setDebtAmt(String(Math.min(v, balance.convertibleDebtMM)))} />
              ))}
              <Quick label="ALL" onClick={() => setDebtAmt(Math.min(balance.convertibleDebtMM, balance.cashMM * 0.9).toFixed(0))} />
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#04000a] border border-red-900/40 rounded px-3 py-2 text-sm font-mono text-white focus:border-red-400 focus:outline-none"
                placeholder="Amount $M"
                type="number"
                value={debtAmt}
                onChange={e => setDebtAmt(e.target.value)}
              />
              <button className="btn-red px-4"
                disabled={!debtAmt || parseFloat(debtAmt) <= 0 || balance.convertibleDebtMM <= 0}
                onClick={() => { onPayDebt(parseFloat(debtAmt)); setDebtAmt(''); }}>
                RETIRE
              </button>
            </div>
            {debtAmt && parseFloat(debtAmt) > 0 && (
              <div className="text-xs text-emerald-400 mt-1 font-mono">
                Saves ${(parseFloat(debtAmt) * 0.06 / 12).toFixed(2)}M/month in interest
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
