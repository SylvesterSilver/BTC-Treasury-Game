import { useState, useEffect } from 'react';
import { fmtMM, fmtPrice, fmtBTC } from '../utils/format';
import type { GameMetrics, BalanceSheet } from '../engine/financialModel';
import type { Era } from '../data/eras';
import {
  getLeaderboard,
  qualifiesForLeaderboard,
  submitScore,
  type LeaderboardEntry,
} from '../engine/leaderboard';

interface Props {
  isWin: boolean;
  metrics: GameMetrics;
  balance: BalanceSheet;
  era: Era;
  daysSurvived: number;
  onRestart: () => void;
  onChangeEra: () => void;
}

function getRating(btcValueMM: number, daysSurvived: number): { title: string; color: string; desc: string } {
  const b = btcValueMM / 1000;
  if (b >= 50)         return { title: 'HYPERBITCOINIZATION', color: '#a855f7', desc: 'You accumulated enough BTC to reshape the financial system.' };
  if (b >= 20)         return { title: 'LEGENDARY STACK',     color: '#F7931A', desc: 'The treasury speaks for itself. Orange-pilled entire institutions.' };
  if (b >= 10)         return { title: 'DIAMOND HANDS',       color: '#00FF88', desc: 'You navigated volatility like a pro.' };
  if (b >= 5)          return { title: 'STRONG HOLD',         color: '#00D4FF', desc: 'Solid treasury operations. Room to grow further.' };
  if (daysSurvived >= 365) return { title: 'SURVIVOR',        color: '#f59e0b', desc: 'One full year of operations. Not easy.' };
  return               { title: 'OPERATOR',                   color: '#7a5a9a', desc: 'You kept the lights on. Bitcoin treasury management is harder than it looks.' };
}

function StatRow({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#2d0060] last:border-0">
      <span className="text-[#6a3090] text-xs">{label}</span>
      <div className="text-right">
        <span className="font-mono font-bold text-xs" style={{ color: color ?? '#e2e8f0' }}>{value}</span>
        {sub && <div className="text-[#3a1070] text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function LeaderboardTable({ entries, highlightScore }: { entries: LeaderboardEntry[]; highlightScore?: number }) {
  if (entries.length === 0) {
    return <div className="text-[#3a1070] text-xs text-center py-3">No scores yet — you'll be first!</div>;
  }
  return (
    <div className="space-y-0.5">
      {entries.map((e, i) => {
        const isHighlight = highlightScore !== undefined && Math.abs(e.stockPrice - highlightScore) < 0.01;
        return (
          <div key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono"
            style={{
              background: isHighlight ? '#F7931A22' : i % 2 === 0 ? '#07000f' : 'transparent',
              border: isHighlight ? '1px solid #F7931A66' : '1px solid transparent',
            }}>
            {/* Rank */}
            <span className="w-5 text-center font-bold flex-shrink-0"
              style={{ color: i === 0 ? '#F7931A' : i === 1 ? '#7a5a9a' : i === 2 ? '#cd7f32' : '#6a3090' }}>
              {i === 0 ? '₿' : `${i + 1}`}
            </span>
            {/* Name */}
            <span className="flex-1 truncate font-bold" style={{ color: isHighlight ? '#F7931A' : '#e2e8f0' }}>
              {e.name}
              {isHighlight && <span className="ml-1 text-bitcoin">← YOU</span>}
            </span>
            {/* Stock price */}
            <span style={{ color: '#F7931A' }}>{fmtPrice(e.stockPrice)}</span>
            {/* Date */}
            <span className="text-[#3a1070] hidden sm:block">{e.date}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GameOverScreen({ isWin, metrics, balance, era, daysSurvived, onRestart, onChangeEra }: Props) {
  const rating = getRating(metrics.btcValueMM, daysSurvived);
  const priceChangePct = ((metrics.btcPrice - era.startPrice) / era.startPrice) * 100;
  const priceUp = metrics.btcPrice >= era.startPrice;

  const qualifies = qualifiesForLeaderboard(era.id, metrics.stockPrice);
  const [nameInput, setNameInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard(era.id));
  const [myScore, setMyScore] = useState<number | undefined>(undefined);

  // Auto-load leaderboard
  useEffect(() => {
    setLeaderboard(getLeaderboard(era.id));
  }, [era.id]);

  const handleSubmit = () => {
    const name = nameInput.trim() || 'Anonymous';
    const updated = submitScore(era.id, {
      name,
      stockPrice: metrics.stockPrice,
      marketCapMM: metrics.marketCapMM,
      btcHeld: balance.btcHeld,
      btcValueMM: metrics.btcValueMM,
      mNAV: metrics.mNAV,
      daysSurvived,
      isWin,
    });
    setLeaderboard(updated);
    setMyScore(metrics.stockPrice);
    setSubmitted(true);
  };

  return (
    <div className="modal-overlay">
      <div
        className="bg-[#07000f] border border-[#2d0060] rounded-xl mx-4 relative overflow-y-auto"
        style={{ maxHeight: '92vh', width: '100%', maxWidth: 520 }}
      >
        <div className="p-5">

          {/* ── STATUS ── */}
          <div className="text-center mb-4">
            {isWin ? (
              <>
                <div className="text-5xl mb-1 glow-text-bitcoin">₿</div>
                <div className="text-bitcoin text-2xl font-bold glow-text-bitcoin">STACKED</div>
                <div className="text-[#6a3090] text-xs mt-1">Bitcoin treasury mission accomplished</div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-1">📉</div>
                <div className="text-red-400 text-2xl font-bold">REKT</div>
                <div className="text-[#6a3090] text-xs mt-1">{metrics.insolventReason ?? 'The preferred dividends ate you alive.'}</div>
              </>
            )}
          </div>

          {/* ── RATING ── */}
          <div className="text-center py-2 mb-4 rounded-lg border"
            style={{ borderColor: `${rating.color}44`, background: `${rating.color}11` }}>
            <div className="font-bold text-sm mb-0.5" style={{ color: rating.color }}>{rating.title}</div>
            <div className="text-[#6a3090] text-xs">{rating.desc}</div>
          </div>

          {/* ── HIGH SCORE ENTRY ── */}
          {qualifies && !submitted && (
            <div className="rounded-lg border border-bitcoin p-4 mb-4 glow-bitcoin"
              style={{ background: '#050008' }}>
              <div className="text-bitcoin text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                <span>🏆</span> YOU MADE THE TOP 10!
              </div>
              <div className="text-[#6a3090] text-xs mb-3">
                Stock price <span className="text-bitcoin font-mono">{fmtPrice(metrics.stockPrice)}</span> qualifies for the {era.name} leaderboard.
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#04000a] border border-bitcoin/50 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-bitcoin"
                  placeholder="Enter your name..."
                  maxLength={20}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  autoFocus
                />
                <button className="btn-bitcoin px-4" onClick={handleSubmit}>
                  SUBMIT
                </button>
              </div>
            </div>
          )}
          {qualifies && submitted && (
            <div className="rounded-lg border border-emerald-700 p-3 mb-4 text-center"
              style={{ background: '#052e16' }}>
              <div className="text-emerald-400 text-xs font-bold">✓ SCORE SAVED — {nameInput.trim() || 'Anonymous'}</div>
            </div>
          )}

          {/* ── LEADERBOARD ── */}
          <div className="game-card p-3 mb-4">
            <div className="section-label mb-2 flex items-center gap-2">
              <span>🏆</span>
              <span>{era.name} · TOP {Math.min(10, leaderboard.length > 0 ? 10 : 0)} LEADERBOARD</span>
              <span className="text-[#3a1070] text-xs ml-auto">by stock price</span>
            </div>
            <LeaderboardTable entries={leaderboard} highlightScore={submitted ? myScore : undefined} />
          </div>

          {/* ── BTC PRICE JOURNEY ── */}
          <div className="rounded-lg border border-[#F7931A33] p-3 mb-4"
            style={{ background: 'linear-gradient(135deg, #050008, #04000a)' }}>
            <div className="section-label mb-2 text-bitcoin/60">₿ BITCOIN PRICE JOURNEY</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <div className="text-[#6a3090] text-xs mb-0.5">Start</div>
                <div className="text-white font-bold font-mono text-sm">{fmtPrice(era.startPrice)}</div>
                <div className="text-[#3a1070] text-xs">{era.startYear}</div>
              </div>
              <div className="text-center">
                <div className={`text-base font-bold font-mono ${priceUp ? 'price-up' : 'price-down'}`}>
                  {priceUp ? '▲' : '▼'} {Math.abs(priceChangePct).toFixed(1)}%
                </div>
                <div className="text-[#3a1070] text-xs">{daysSurvived} days</div>
              </div>
              <div className="text-right">
                <div className="text-[#6a3090] text-xs mb-0.5">End</div>
                <div className={`font-bold font-mono text-sm ${priceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtPrice(metrics.btcPrice)}
                </div>
              </div>
            </div>
          </div>

          {/* ── STATS ── */}
          <div className="game-card p-3 mb-4">
            <div className="section-label mb-2">FINAL STATS</div>
            <StatRow label="Era" value={era.name} />
            <StatRow label="Days Survived" value={`${daysSurvived}`} />
            <StatRow label="Final Stock Price" value={fmtPrice(metrics.stockPrice)} color="#F7931A" />
            <StatRow label="Market Cap" value={fmtMM(metrics.marketCapMM)} />
            <StatRow label="BTC Accumulated" value={fmtBTC(balance.btcHeld)} color="#F7931A" />
            <StatRow label="BTC Treasury Value" value={fmtMM(metrics.btcValueMM)} color={metrics.btcValueMM > 1000 ? '#00FF88' : '#e2e8f0'} />
            <StatRow label="mNAV at End" value={`${metrics.mNAV.toFixed(2)}x`} />
            <StatRow label="Cash Remaining" value={fmtMM(balance.cashMM)} color={balance.cashMM > 0 ? '#00FF88' : '#FF3355'} />
          </div>

          {/* ── ACTIONS ── */}
          <div className="flex gap-3 mb-4">
            <button className="btn-outline flex-1" onClick={onChangeEra}>← CHANGE ERA</button>
            <button className="btn-bitcoin flex-1" onClick={onRestart}>↺ REPLAY ERA</button>
          </div>

          <div className="text-center">
            <span className="font-cursive text-lg" style={{ color: '#F7931A66' }}>created by @Benny_Stacks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
