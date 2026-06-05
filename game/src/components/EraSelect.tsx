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
    <div className="min-h-screen bg-terminal-bg flex flex-col items-center justify-start py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-bitcoin text-xs tracking-[0.3em] uppercase mb-3 opacity-70">₿</div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          BITCOIN TREASURY
        </h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Strategy Simulator
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-terminal-border to-transparent w-64 mx-auto" />
        <p className="text-slate-500 text-xs mt-4 max-w-md mx-auto leading-relaxed">
          You are Michael Saylor. Pick an era, manage the Bitcoin treasury, issue capital,
          weather the volatility. Don't go bust.
        </p>
      </div>

      {/* Era Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-6xl">
        {ERAS.map(era => {
          const isHovered = hovered === era.id;
          return (
            <button
              key={era.id}
              className="text-left p-5 rounded-lg border transition-all duration-200 cursor-pointer"
              style={{
                background: isHovered ? '#111827' : '#0f1629',
                borderColor: isHovered ? era.difficultyColor : '#1e2d4a',
                boxShadow: isHovered ? `0 0 24px ${era.difficultyColor}33` : 'none',
              }}
              onMouseEnter={() => setHovered(era.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(era)}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    color: era.difficultyColor,
                    background: `${era.difficultyColor}22`,
                    border: `1px solid ${era.difficultyColor}44`,
                  }}
                >
                  {era.difficulty}
                </span>
                <span className="text-slate-600 text-xs">
                  {era.startYear}
                </span>
              </div>

              {/* Name */}
              <h3 className="text-white font-bold text-sm mb-0.5 leading-tight">
                {era.name}
              </h3>
              <p className="text-slate-500 text-xs mb-3">{era.subtitle}</p>

              {/* Starting stats */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">BTC Price</span>
                  <span className="text-bitcoin font-mono">{formatPrice(era.startPrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">BTC Held</span>
                  <span className="text-slate-300 font-mono">
                    {era.startingBTC === 0 ? 'NONE' : era.startingBTC.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Cash</span>
                  <span className="text-emerald-400 font-mono">${era.startingCash}M</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Debt</span>
                  <span className="text-red-400 font-mono">
                    {era.startingDebt === 0 ? 'CLEAN' : `$${era.startingDebt >= 1000 ? (era.startingDebt/1000).toFixed(1)+'B' : era.startingDebt+'M'}`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-500 text-xs leading-relaxed border-t border-terminal-border pt-3">
                {era.description}
              </p>

              {/* Hover CTA */}
              <div
                className="mt-3 text-xs font-bold tracking-widest uppercase text-center py-1.5 rounded transition-all"
                style={{
                  color: isHovered ? '#000' : era.difficultyColor,
                  background: isHovered ? era.difficultyColor : 'transparent',
                  border: `1px solid ${era.difficultyColor}66`,
                }}
              >
                {isHovered ? '▶ ENTER ERA' : 'SELECT'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-10 text-slate-700 text-xs text-center">
        <span>Historical prices are approximate representations for gameplay. Not financial advice.</span>
      </div>
    </div>
  );
}
