import { fmtMM, fmtPrice, fmtBTC } from '../utils/format';
import type { GameConfig } from '../data/gameConfig';

interface Props {
  config: GameConfig;
  onLaunch: () => void;
  onBack: () => void;
}

export function BriefingScreen({ config, onLaunch, onBack }: Props) {
  const { era, startingCapitalMM } = config;
  const quarterlyPref = (era.startingPreferred * 0.115) / 4;
  const quarterlyInterest = (era.startingDebt * era.interestRate) / 4;
  const quarterlyBurn = quarterlyInterest + quarterlyPref + era.softwareRevenue * 0.85 - era.softwareRevenue;

  const tips = era.difficulty === 'LEGENDARY' || era.difficulty === 'HARD'
    ? [
        'Cash is oxygen. Do not max-buy BTC on day one.',
        'ATM only at a premium — issuing into a discount destroys BTC/share.',
        'Preferred is cheap dry powder until coverage slips. Then it eats you.',
      ]
    : [
        'Smash the ATM when mNAV is rich, then stack sats.',
        'Buybacks at a discount grow BTC per share.',
        'Pay down debt when BTC is expensive and cash is plentiful.',
      ];

  return (
    <div className="min-h-screen terminal-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between border border-[#2d0060] rounded-t bg-[#030008] px-4 py-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[#3a1070] text-xs font-mono">BTCS://TERMINAL/BRIEFING</span>
          <span className="text-bitcoin text-xs font-mono">₿</span>
        </div>

        <div className="border border-t-0 border-[#2d0060] rounded-b bg-[#04000a] p-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={onBack} className="text-[#6a3090] hover:text-slate-300 text-xs uppercase tracking-wider transition-colors">
              ← CONFIG
            </button>
            <div className="h-4 w-px bg-[#2d0060]" />
            <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{ color: era.difficultyColor, background: `${era.difficultyColor}22`, border: `1px solid ${era.difficultyColor}44` }}>
              {era.difficulty}
            </span>
            <span className="text-white text-xs font-bold">{era.name}</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">CFO BRIEFING</h2>
          <p className="text-[#6a3090] text-xs mb-5">
            You run the treasury. Survive two years. Maximize the stock price. Do not go bust.
          </p>

          <div className="game-card p-4 mb-4">
            <div className="section-label mb-3">MISSION</div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li><span className="text-bitcoin font-bold">1.</span> Survive 730 days without insolvency — that is a win.</li>
              <li><span className="text-bitcoin font-bold">2.</span> Grow BTC per share. Dilution without stacking is failure.</li>
              <li><span className="text-bitcoin font-bold">3.</span> Keep preferred coverage healthy. STRC yield explodes below 2x.</li>
              <li><span className="text-bitcoin font-bold">4.</span> Score is final stock price. Leaderboard is per era.</li>
            </ul>
          </div>

          <div className="game-card p-4 mb-4">
            <div className="section-label mb-3">STARTING DESK</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[#6a3090]">Cash</div>
                <div className="font-mono font-bold text-emerald-400">{fmtMM(startingCapitalMM)}</div>
              </div>
              <div>
                <div className="text-[#6a3090]">BTC stack</div>
                <div className="font-mono font-bold text-bitcoin">{fmtBTC(era.startingBTC)}</div>
              </div>
              <div>
                <div className="text-[#6a3090]">BTC price</div>
                <div className="font-mono font-bold text-white">{fmtPrice(era.startPrice)}</div>
              </div>
              <div>
                <div className="text-[#6a3090]">Quarterly burn</div>
                <div className="font-mono font-bold" style={{ color: quarterlyBurn > 0 ? '#FF3355' : '#00FF88' }}>
                  {quarterlyBurn > 0 ? `-${fmtMM(Math.abs(quarterlyBurn))}` : `+${fmtMM(Math.abs(quarterlyBurn))}`}
                </div>
              </div>
            </div>
            <div className="text-[#3a1070] text-xs mt-3 font-mono">{era.macroEnv}</div>
          </div>

          <div className="game-card p-4 mb-4">
            <div className="section-label mb-3">PLAYBOOK FOR THIS ERA</div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {tips.map(t => <li key={t}>▸ {t}</li>)}
            </ul>
          </div>

          <div className="game-card p-4 mb-5">
            <div className="section-label mb-2">KEYBOARD</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-[#6a3090]">
              <div><span className="text-white">Space</span> pause / last speed</div>
              <div><span className="text-white">1 2 3</span> day / week / month</div>
              <div><span className="text-white">M</span> mute audio</div>
              <div><span className="text-white">H / ?</span> help</div>
              <div><span className="text-white">S</span> save now</div>
              <div><span className="text-white">Esc</span> close overlay</div>
            </div>
          </div>

          <button
            onClick={onLaunch}
            className="w-full play-btn-pulse rounded-lg"
            style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #F7931A, #e07800)',
              boxShadow: '0 0 40px rgba(247,147,26,0.5), 0 0 80px rgba(247,147,26,0.2)',
              border: '1px solid rgba(247,147,26,0.8)',
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-3xl font-bold text-black">₿</span>
              <div className="text-left">
                <div className="font-bold tracking-widest uppercase text-black" style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}>
                  ▶  TAKE THE DESK
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(0,0,0,0.6)' }}>
                  Autosave is on · {era.name}
                </div>
              </div>
              <span className="text-3xl font-bold text-black">₿</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
