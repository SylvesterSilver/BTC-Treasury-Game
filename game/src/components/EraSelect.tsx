import { useState } from 'react';
import { ERAS } from '../data/eras';
import type { Era } from '../data/eras';

interface Props {
  onSelect: (era: Era) => void;
}

const formatPrice = (p: number) => {
  if (p >= 1000) return `$${(p / 1000).toFixed(0)}K`;
  return `$${p}`;
};

export function EraSelect({ onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen terminal-bg flex flex-col items-center justify-start py-10 px-4">

      {/* Header */}
      <div className="text-center mb-8 w-full max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between border border-[#2d0060] rounded-t bg-[#030008] px-4 py-2 mb-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[#3a1070] text-xs font-mono">BTCS://TERMINAL/ERA_SELECT — v3.0</span>
          <span className="text-bitcoin text-xs font-mono ticker-live">● LIVE</span>
        </div>

        {/* Main header */}
        <div className="border border-t-0 border-[#2d0060] rounded-b bg-gradient-to-b from-[#030008] to-[#04000a] px-8 py-8">
          {/* Big ₿ */}
          <div className="relative mb-4">
            <div className="text-5xl md:text-[5rem] leading-none font-bold text-bitcoin glow-text-bitcoin text-center select-none">₿</div>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-1 tracking-tight glitch">
            BITCOIN TREASURY STRATEGY SIMULATOR
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-bitcoin to-transparent w-96 mx-auto my-3 opacity-40" />
          <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{color:'var(--cyan)', opacity:0.7}}>
            You are the CFO. Stack Bitcoin. Maximize the stock price. Don't go bust.
          </p>
          <p className="text-[#3a1070] text-xs">
            Issue stock · Issue preferred · Buy BTC · Pay debt · Survive the cycle
          </p>
        </div>
      </div>

      {/* Era Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full max-w-6xl">
        {ERAS.map(era => {
          const isHov = hovered === era.id;
          return (
            <button
              key={era.id}
              className="era-card text-left p-4"
              style={{
                borderColor: isHov ? era.difficultyColor : '#2d0060',
                boxShadow: isHov ? `0 0 30px ${era.difficultyColor}33, inset 0 0 30px ${era.difficultyColor}08` : 'none',
                transform: isHov ? 'translateY(-3px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHovered(era.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(era)}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{ color: era.difficultyColor, background: `${era.difficultyColor}22`, border: `1px solid ${era.difficultyColor}44` }}>
                  {era.difficulty}
                </span>
                <span className="text-[#3a1070] text-xs font-mono">{era.startYear}</span>
              </div>

              {/* Era name */}
              <h3 className="text-white font-bold text-sm mb-0.5 leading-tight">{era.name}</h3>
              <p className="text-[#6a3090] text-xs mb-3">{era.subtitle}</p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3 text-xs">
                <div>
                  <div className="text-[#3a1070]">BTC Price</div>
                  <div className="text-bitcoin font-mono font-bold">{formatPrice(era.startPrice)}</div>
                </div>
                <div>
                  <div className="text-[#3a1070]">Cash</div>
                  <div className="text-emerald-400 font-mono font-bold">${era.startingCash}M</div>
                </div>
                <div>
                  <div className="text-[#3a1070]">BTC Held</div>
                  <div className="text-slate-300 font-mono font-bold">
                    {era.startingBTC === 0 ? '—' : era.startingBTC >= 1000 ? `${(era.startingBTC/1000).toFixed(0)}K` : era.startingBTC.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#3a1070]">Debt</div>
                  <div className="font-mono font-bold" style={{ color: era.startingDebt === 0 ? '#00FF88' : '#FF3355' }}>
                    {era.startingDebt === 0 ? 'CLEAN' : era.startingDebt >= 1000 ? `$${(era.startingDebt/1000).toFixed(1)}B` : `$${era.startingDebt}M`}
                  </div>
                </div>
              </div>

              {/* Macro env */}
              <div className="text-xs px-2 py-1 rounded mb-2 font-mono"
                style={{ background: '#07000f', border: '1px solid #2d0060', color: '#6a3090' }}>
                {era.macroEnv}
              </div>

              {/* Rate */}
              <div className="text-xs text-[#3a1070] mb-2">
                Debt rate: <span className="font-mono" style={{ color: era.interestRate >= 0.065 ? '#FF3355' : era.interestRate >= 0.04 ? '#f59e0b' : '#00FF88' }}>
                  {(era.interestRate * 100).toFixed(1)}%
                </span>
              </div>

              {/* Description */}
              <p className="text-[#3a1070] text-xs leading-relaxed border-t border-[#2d0060] pt-2">
                {era.description}
              </p>

              {/* CTA */}
              <div className="mt-3 text-xs font-bold tracking-widest uppercase text-center py-1.5 rounded transition-all"
                style={{
                  color: isHov ? '#000' : era.difficultyColor,
                  background: isHov ? era.difficultyColor : 'transparent',
                  border: `1px solid ${era.difficultyColor}55`,
                }}>
                {isHov ? '▶ SELECT ERA' : 'SELECT'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <div className="font-cursive text-xl mb-1" style={{ color: '#FF0080BB', letterSpacing:'0.05em' }}>created by @Benny_Stacks</div>
        <div className="text-[#2d0060] text-xs font-mono">Historical prices are approximate game representations · Not financial advice · ₿</div>
      </div>
    </div>
  );
}
