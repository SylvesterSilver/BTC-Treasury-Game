import { useState } from 'react';
import type { GameMetrics, BalanceSheet } from '../engine/financialModel';

type ActionTab = 'BUY_BTC' | 'ISSUE_STOCK' | 'PREFERRED' | 'DEBT' | 'CONV_DEBT' | 'BUYBACK';

interface Props {
  balance: BalanceSheet;
  metrics: GameMetrics;
  onBuyBTC: (amountMM: number) => void;
  onSellBTC: (btcAmount: number) => void;
  onIssueCommon: (sharesMM: number) => void;
  onIssuePreferred: (amountMM: number) => void;
  onPayDebt: (amountMM: number) => void;
  onIssueConvertibleDebt: (amountMM: number) => void;
  onBuyBackStock: (sharesMM: number) => void;
}

function QuickAmount({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="text-xs px-2 py-1 rounded border border-terminal-border text-slate-400 hover:border-bitcoin hover:text-bitcoin transition-colors"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ActionPanel({
  balance, metrics, onBuyBTC, onSellBTC, onIssueCommon, onIssuePreferred, onPayDebt,
  onIssueConvertibleDebt, onBuyBackStock,
}: Props) {
  const [tab, setTab] = useState<ActionTab>('BUY_BTC');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellBTC, setSellBTC] = useState('');
  const [shareAmount, setShareAmount] = useState('');
  const [prefAmount, setPrefAmount] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [convDebtAmount, setConvDebtAmount] = useState('');
  const [buybackAmount, setBuybackAmount] = useState('');

  const tabs: { id: ActionTab; label: string; color: string }[] = [
    { id: 'BUY_BTC', label: '₿ BTC', color: '#F7931A' },
    { id: 'ISSUE_STOCK', label: '📈 ATM', color: '#22c55e' },
    { id: 'BUYBACK', label: '🔄 BUYBACK', color: '#06b6d4' },
    { id: 'CONV_DEBT', label: '📋 CONV', color: '#3b82f6' },
    { id: 'PREFERRED', label: '💎 PREF', color: '#a855f7' },
    { id: 'DEBT', label: '💸 PAY DEBT', color: '#ef4444' },
  ];

  return (
    <div className="game-card h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-terminal-border">
        {tabs.map(t => (
          <button
            key={t.id}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: tab === t.id ? t.color : '#475569',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              background: tab === t.id ? `${t.color}11` : 'transparent',
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* BUY BTC TAB */}
        {tab === 'BUY_BTC' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Buy Bitcoin with Cash</div>
              <div className="text-slate-600 text-xs mb-3">
                Available: <span className="text-emerald-400 font-mono">${balance.cashMM.toFixed(1)}M</span>
              </div>
              <div className="flex gap-2 flex-wrap mb-2">
                {[10, 50, 100, 250, 500].map(v => (
                  <QuickAmount key={v} label={`$${v}M`} onClick={() => setBuyAmount(String(v))} />
                ))}
                <QuickAmount
                  label="ALL IN"
                  onClick={() => setBuyAmount(((balance.cashMM * 0.95)).toFixed(0))}
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-bitcoin focus:outline-none"
                  placeholder="Amount in $M"
                  type="number"
                  value={buyAmount}
                  onChange={e => setBuyAmount(e.target.value)}
                />
                <button
                  className="btn-bitcoin"
                  disabled={!buyAmount || parseFloat(buyAmount) <= 0}
                  onClick={() => { onBuyBTC(parseFloat(buyAmount)); setBuyAmount(''); }}
                >
                  BUY
                </button>
              </div>
              {buyAmount && parseFloat(buyAmount) > 0 && (
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  ≈ {((parseFloat(buyAmount) * 1e6) / metrics.btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC at ${metrics.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              )}
            </div>

            <div className="border-t border-terminal-border pt-4">
              <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider text-red-400">⚠ Sell Bitcoin</div>
              <div className="text-slate-600 text-xs mb-3">
                Held: <span className="text-bitcoin font-mono">{balance.btcHeld.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC</span>
                <span className="text-red-400 ml-2">(hurts mNAV)</span>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-red-400 focus:outline-none"
                  placeholder="BTC amount"
                  type="number"
                  value={sellBTC}
                  onChange={e => setSellBTC(e.target.value)}
                />
                <button
                  className="btn-red"
                  disabled={!sellBTC || parseFloat(sellBTC) <= 0}
                  onClick={() => { onSellBTC(parseFloat(sellBTC)); setSellBTC(''); }}
                >
                  SELL
                </button>
              </div>
              {sellBTC && parseFloat(sellBTC) > 0 && (
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  ≈ ${((parseFloat(sellBTC) * metrics.btcPrice) / 1e6).toFixed(1)}M proceeds
                </div>
              )}
            </div>
          </div>
        )}

        {/* ISSUE COMMON STOCK TAB */}
        {tab === 'ISSUE_STOCK' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Issue Common Shares (ATM)</div>

              {/* mNAV guidance */}
              <div className={`rounded p-3 text-xs mb-3 ${
                metrics.mNAVStatus === 'HIGH_PREMIUM' || metrics.mNAVStatus === 'EXTREME_PREMIUM'
                  ? 'bg-emerald-900/30 border border-emerald-800 text-emerald-400'
                  : metrics.mNAVStatus === 'DISCOUNT' || metrics.mNAVStatus === 'DEEP_DISCOUNT'
                  ? 'bg-red-900/30 border border-red-800 text-red-400'
                  : 'bg-yellow-900/20 border border-yellow-800 text-yellow-400'
              }`}>
                <div className="font-bold mb-1">mNAV: {metrics.mNAV.toFixed(2)}x</div>
                {metrics.mNAV >= 2.0
                  ? `Premium: You sell shares at $${metrics.stockPrice.toFixed(0)}/sh, backed by $${metrics.navPerShare.toFixed(0)} NAV. Market pays the premium — use this!`
                  : metrics.mNAV < 1.0
                  ? `Discount: Issuing here means selling $${metrics.navPerShare.toFixed(0)} of assets for $${metrics.stockPrice.toFixed(0)}. Destroys value.`
                  : `Fair value zone — issuance is roughly neutral to NAV per share.`}
              </div>

              <div className="text-slate-600 text-xs mb-2">
                Price: <span className="text-white font-mono">${metrics.stockPrice.toFixed(2)}</span>
                {' | '}Shares: <span className="text-white font-mono">{balance.sharesOutstanding.toFixed(1)}M</span>
              </div>

              <div className="flex gap-2 flex-wrap mb-2">
                {[1, 5, 10, 20, 50].map(v => (
                  <QuickAmount key={v} label={`${v}M sh`} onClick={() => setShareAmount(String(v))} />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Shares (millions)"
                  type="number"
                  value={shareAmount}
                  onChange={e => setShareAmount(e.target.value)}
                />
                <button
                  className="btn-green"
                  disabled={!shareAmount || parseFloat(shareAmount) <= 0}
                  onClick={() => { onIssueCommon(parseFloat(shareAmount)); setShareAmount(''); }}
                >
                  ISSUE
                </button>
              </div>
              {shareAmount && parseFloat(shareAmount) > 0 && (
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Raises ≈ ${(parseFloat(shareAmount) * metrics.stockPrice).toFixed(1)}M
                  {' | '}Dilution: {((parseFloat(shareAmount) / (balance.sharesOutstanding + parseFloat(shareAmount))) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREFERRED STOCK TAB */}
        {tab === 'PREFERRED' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Issue Fixed-Dividend Preferred</div>
              <div className="rounded p-3 text-xs mb-3 bg-purple-900/20 border border-purple-800 text-purple-300">
                <div className="font-bold mb-1">STRK-Style Preferred @ 8% Annual</div>
                <p>Each $100M raised costs $8M/year forever. High leverage — powerful when BTC rises, catastrophic in a crash if you can't cover divs.</p>
              </div>

              {balance.preferredFaceValueMM > 0 && (
                <div className="text-xs text-slate-500 mb-3">
                  Current preferred: <span className="text-yellow-400 font-mono">${balance.preferredFaceValueMM.toFixed(0)}M</span>
                  {' → '}div cost: <span className="text-red-400 font-mono">${(balance.preferredFaceValueMM * 0.08 / 4).toFixed(1)}M/qtr</span>
                </div>
              )}

              <div className="flex gap-2 flex-wrap mb-2">
                {[50, 100, 200, 500].map(v => (
                  <QuickAmount key={v} label={`$${v}M`} onClick={() => setPrefAmount(String(v))} />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-purple-400 focus:outline-none"
                  placeholder="Raise amount $M"
                  type="number"
                  value={prefAmount}
                  onChange={e => setPrefAmount(e.target.value)}
                />
                <button
                  className="px-4 py-2 text-xs font-bold uppercase rounded"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  disabled={!prefAmount || parseFloat(prefAmount) <= 0}
                  onClick={() => { onIssuePreferred(parseFloat(prefAmount)); setPrefAmount(''); }}
                >
                  ISSUE
                </button>
              </div>
              {prefAmount && parseFloat(prefAmount) > 0 && (
                <div className="text-xs text-red-400 mt-1 font-mono">
                  Adds ${(parseFloat(prefAmount) * 0.08 / 4).toFixed(1)}M/quarter in fixed dividends
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAY DOWN DEBT TAB */}
        {tab === 'DEBT' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Pay Down Convertible Debt</div>
              <div className="rounded p-3 text-xs mb-3 bg-red-900/20 border border-red-800 text-red-300">
                <div className="font-bold mb-1">Convertible Notes @ 6% Annual</div>
                <p>Paying down debt reduces interest expense, improves NAV, and boosts mNAV. Use excess cash when BTC is expensive to accumulate.</p>
              </div>

              <div className="text-xs text-slate-500 mb-3">
                Outstanding: <span className="text-red-400 font-mono">${balance.convertibleDebtMM.toFixed(0)}M</span>
                {' | '}Cash: <span className="text-emerald-400 font-mono">${balance.cashMM.toFixed(1)}M</span>
              </div>

              <div className="flex gap-2 flex-wrap mb-2">
                {[50, 100, 250, 500].map(v => (
                  <QuickAmount
                    key={v}
                    label={`$${v}M`}
                    onClick={() => setDebtAmount(String(Math.min(v, balance.convertibleDebtMM)))}
                  />
                ))}
                <QuickAmount
                  label="PAY ALL"
                  onClick={() => setDebtAmount(Math.min(balance.convertibleDebtMM, balance.cashMM * 0.9).toFixed(0))}
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-red-400 focus:outline-none"
                  placeholder="Amount $M"
                  type="number"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value)}
                />
                <button
                  className="btn-red"
                  disabled={!debtAmount || parseFloat(debtAmount) <= 0 || balance.convertibleDebtMM <= 0}
                  onClick={() => { onPayDebt(parseFloat(debtAmount)); setDebtAmount(''); }}
                >
                  PAY
                </button>
              </div>
              {debtAmount && parseFloat(debtAmount) > 0 && (
                <div className="text-xs text-emerald-400 mt-1 font-mono">
                  Saves ${(parseFloat(debtAmount) * 0.06 / 4).toFixed(2)}M/quarter in interest
                </div>
              )}
            </div>
          </div>
        )}

        {/* ISSUE CONVERTIBLE DEBT TAB */}
        {tab === 'CONV_DEBT' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Issue Convertible Notes</div>
              <div className="rounded p-3 text-xs mb-3 bg-blue-900/20 border border-blue-800 text-blue-300">
                <div className="font-bold mb-1">MSTR-Style Convertibles @ 6% Annual</div>
                <p>Raise cheap debt — convertible notes let bondholders convert to equity if the stock runs. Capped at 50% of BTC value. Cheap leverage when BTC is rising.</p>
              </div>

              <div className="text-xs text-slate-500 mb-3">
                Outstanding: <span className="text-blue-400 font-mono">${balance.convertibleDebtMM.toFixed(0)}M</span>
                {' | '}Cash: <span className="text-emerald-400 font-mono">${balance.cashMM.toFixed(1)}M</span>
              </div>

              <div className="flex gap-2 flex-wrap mb-2">
                {[100, 250, 500, 1000].map(v => (
                  <QuickAmount key={v} label={`$${v}M`} onClick={() => setConvDebtAmount(String(v))} />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-blue-400 focus:outline-none"
                  placeholder="Raise amount $M"
                  type="number"
                  value={convDebtAmount}
                  onChange={e => setConvDebtAmount(e.target.value)}
                />
                <button
                  className="px-4 py-2 text-xs font-bold uppercase rounded"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  disabled={!convDebtAmount || parseFloat(convDebtAmount) <= 0}
                  onClick={() => { onIssueConvertibleDebt(parseFloat(convDebtAmount)); setConvDebtAmount(''); }}
                >
                  ISSUE
                </button>
              </div>
              {convDebtAmount && parseFloat(convDebtAmount) > 0 && (
                <div className="text-xs text-red-400 mt-1 font-mono">
                  Adds ${(parseFloat(convDebtAmount) * 0.06 / 4).toFixed(1)}M/quarter in interest
                </div>
              )}
            </div>
          </div>
        )}

        {/* STOCK BUYBACK TAB */}
        {tab === 'BUYBACK' && (
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Repurchase Common Shares</div>

              <div className={`rounded p-3 text-xs mb-3 ${
                metrics.mNAVStatus === 'DISCOUNT' || metrics.mNAVStatus === 'DEEP_DISCOUNT'
                  ? 'bg-cyan-900/30 border border-cyan-800 text-cyan-400'
                  : 'bg-yellow-900/20 border border-yellow-800 text-yellow-400'
              }`}>
                <div className="font-bold mb-1">mNAV: {metrics.mNAV.toFixed(2)}x</div>
                {metrics.mNAV <= 1.5
                  ? `Discount: Buy back shares at $${metrics.stockPrice.toFixed(0)}/sh — each share holds $${metrics.navPerShare.toFixed(0)} of NAV. Accretive!`
                  : `Premium: Buying back at ${metrics.mNAV.toFixed(1)}x NAV destroys value. Wait for a discount.`}
              </div>

              <div className="text-slate-600 text-xs mb-2">
                Price: <span className="text-white font-mono">${metrics.stockPrice.toFixed(2)}</span>
                {' | '}Shares: <span className="text-white font-mono">{balance.sharesOutstanding.toFixed(1)}M</span>
                {' | '}Cash: <span className="text-emerald-400 font-mono">${balance.cashMM.toFixed(1)}M</span>
              </div>

              <div className="flex gap-2 flex-wrap mb-2">
                {[1, 2, 5, 10].map(v => (
                  <QuickAmount
                    key={v}
                    label={`${v}M sh`}
                    onClick={() => setBuybackAmount(String(Math.min(v, balance.sharesOutstanding * 0.1)))}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="Shares (millions)"
                  type="number"
                  value={buybackAmount}
                  onChange={e => setBuybackAmount(e.target.value)}
                />
                <button
                  className="px-4 py-2 text-xs font-bold uppercase rounded"
                  style={{ background: 'linear-gradient(135deg, #0e7490, #06b6d4)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  disabled={!buybackAmount || parseFloat(buybackAmount) <= 0}
                  onClick={() => { onBuyBackStock(parseFloat(buybackAmount)); setBuybackAmount(''); }}
                >
                  BUY
                </button>
              </div>
              {buybackAmount && parseFloat(buybackAmount) > 0 && (
                <div className="text-xs text-cyan-400 mt-1 font-mono">
                  Cost ≈ ${(parseFloat(buybackAmount) * metrics.stockPrice).toFixed(1)}M
                  {' | '}Max 10% of float per action
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
