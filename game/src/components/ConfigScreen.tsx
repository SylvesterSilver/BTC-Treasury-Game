import { fmtMM } from '../utils/format';
import { useState } from 'react';
import type { Era } from '../data/eras';
import type { GameConfig } from '../data/gameConfig';
import { CAPITAL_PRESETS, MAX_CAPITAL_MM } from '../data/gameConfig';

interface Props {
  era: Era;
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

export function ConfigScreen({ era, onStart, onBack }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(era.startingCash);
  const [customValue, setCustomValue] = useState('');
  const [customActive, setCustomActive] = useState(false);

  const effectiveCapital = customActive ? (parseFloat(customValue) || 0) : (selectedPreset ?? era.startingCash);
  const isValid = effectiveCapital > 0 && effectiveCapital <= MAX_CAPITAL_MM;

  const maxBTC = (effectiveCapital * 1e6) / era.startPrice;
  const quarterlyPrefDivMM = (era.startingPreferred * 0.115) / 4;
  const quarterlyInterest = (era.startingDebt * era.interestRate) / 4;
  const quarterlyOpex = era.softwareRevenue * 0.85;
  const quarterlyRevenue = era.softwareRevenue;
  const quarterlyBurn = quarterlyInterest + quarterlyPrefDivMM + quarterlyOpex - quarterlyRevenue;
  const runwayMonths = quarterlyBurn > 0 ? (effectiveCapital / quarterlyBurn) * 3 : 999;
  const runwayColor = runwayMonths < 6 ? '#FF3355' : runwayMonths < 18 ? '#f59e0b' : '#00FF88';
  const runwayLabel = runwayMonths === 999 ? 'SELF-SUSTAINING' : `${Math.floor(runwayMonths)} months`;

  return (
    <div className="min-h-screen terminal-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Terminal window chrome */}
        <div className="flex items-center justify-between border border-[#2d0060] rounded-t bg-[#030008] px-4 py-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[#3a1070] text-xs font-mono">BTCS://TERMINAL/CONFIG</span>
          <span className="text-bitcoin text-xs font-mono">₿</span>
        </div>

        <div className="border border-t-0 border-[#2d0060] rounded-b bg-[#04000a] p-6">

          {/* Back + era badge */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="text-[#6a3090] hover:text-slate-300 text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
              ← BACK
            </button>
            <div className="h-4 w-px bg-[#2d0060]" />
            <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{ color: era.difficultyColor, background: `${era.difficultyColor}22`, border: `1px solid ${era.difficultyColor}44` }}>
              {era.difficulty}
            </span>
            <span className="text-white text-xs font-bold">{era.name}</span>
            <span className="text-[#6a3090] text-xs">{era.macroEnv}</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Configure Treasury Capital</h2>
          <p className="text-[#6a3090] text-xs mb-5">How much dry powder do you bring to the treasury?</p>

          {/* Presets */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {CAPITAL_PRESETS.map(preset => {
              const isSelected = !customActive && selectedPreset === preset.value;
              return (
                <button key={preset.value}
                  className="relative p-3 rounded border transition-all duration-150 text-left"
                  style={{
                    background: isSelected ? '#050008' : '#07000f',
                    borderColor: isSelected ? '#F7931A' : '#2d0060',
                    boxShadow: isSelected ? '0 0 16px rgba(247,147,26,0.2)' : 'none',
                  }}
                  onClick={() => { setSelectedPreset(preset.value); setCustomActive(false); setCustomValue(''); }}>
                  {preset.tag && (
                    <div className="absolute top-1.5 right-1.5 text-xs px-1 py-0.5 rounded font-bold"
                      style={{ background: isSelected ? '#F7931A22' : '#ffffff11', color: isSelected ? '#F7931A' : '#6a3090', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
                      {preset.tag}
                    </div>
                  )}
                  <div className="text-lg font-bold font-mono" style={{ color: isSelected ? '#F7931A' : '#e2e8f0' }}>{preset.label}</div>
                  <div className="text-[#6a3090] text-xs mt-0.5">
                    {(preset.value * 1e6 / era.startPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC max
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          <div className="game-card p-3 mb-4">
            <div className="section-label mb-2">CUSTOM AMOUNT</div>
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a3090] font-mono text-sm">$</span>
                <input
                  className="w-full bg-[#04000a] border border-[#2d0060] rounded pl-7 pr-12 py-2.5 text-white font-mono text-sm focus:outline-none transition-colors"
                  style={{ borderColor: customActive ? '#F7931A' : '#2d0060' }}
                  type="number" placeholder="e.g. 750" min={1} max={MAX_CAPITAL_MM}
                  value={customValue}
                  onChange={e => { setCustomValue(e.target.value); setCustomActive(true); setSelectedPreset(null); }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a3090] text-xs font-mono">M</span>
              </div>
              <span className="text-[#3a1070] text-xs text-right">max<br /><span className="font-mono text-slate-400">{fmtMM(MAX_CAPITAL_MM)}</span></span>
            </div>
          </div>

          {/* Impact preview */}
          {isValid && (
            <div className="game-card p-4 mb-5">
              <div className="section-label mb-3">STARTING POSITION PREVIEW</div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-[#6a3090] text-xs mb-0.5">Starting Cash</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">{fmtMM(effectiveCapital)}</div>
                </div>
                <div>
                  <div className="text-[#6a3090] text-xs mb-0.5">Max BTC Immediately</div>
                  <div className="text-xl font-bold font-mono text-bitcoin">
                    {maxBTC >= 1000 ? `${(maxBTC/1000).toFixed(1)}K ₿` : `${maxBTC.toFixed(0)} ₿`}
                  </div>
                  <div className="text-[#3a1070] text-xs">@ {fmtMM(era.startPrice / 1e6 * 1e6 / 1e6 * 1)}{''} per BTC</div>
                </div>
                <div>
                  <div className="text-[#6a3090] text-xs mb-0.5">Quarterly Burn</div>
                  <div className="font-bold font-mono text-base" style={{ color: quarterlyBurn > 0 ? '#FF3355' : '#00FF88' }}>
                    {quarterlyBurn > 0 ? `-${fmtMM(Math.abs(quarterlyBurn))}/qtr` : `+${fmtMM(Math.abs(quarterlyBurn))}/qtr`}
                  </div>
                </div>
                <div>
                  <div className="text-[#6a3090] text-xs mb-0.5">Cash Runway</div>
                  <div className="font-bold font-mono text-base" style={{ color: runwayColor }}>{runwayLabel}</div>
                </div>
              </div>
              {/* Debt rate */}
              <div className="flex items-center gap-3 text-xs border-t border-[#2d0060] pt-3">
                <span className="text-[#6a3090]">Debt interest rate:</span>
                <span className="font-mono font-bold" style={{ color: era.interestRate >= 0.065 ? '#FF3355' : era.interestRate >= 0.04 ? '#f59e0b' : '#00FF88' }}>
                  {(era.interestRate * 100).toFixed(1)}% annually
                </span>
                <span className="text-[#3a1070]">· {era.macroEnv}</span>
              </div>
              {(era.startingDebt > 0 || era.startingPreferred > 0) && (
                <div className="flex gap-6 text-xs border-t border-[#2d0060] pt-3 mt-3">
                  {era.startingDebt > 0 && (
                    <div>
                      <div className="text-[#6a3090]">Conv. Debt</div>
                      <div className="text-red-400 font-mono font-bold">{fmtMM(era.startingDebt)}</div>
                      <div className="text-[#3a1070]">{(era.interestRate*100).toFixed(1)}%/yr interest</div>
                    </div>
                  )}
                  {era.startingPreferred > 0 && (
                    <div>
                      <div className="text-[#6a3090]">Preferred Stack</div>
                      <div className="text-yellow-400 font-mono font-bold">{fmtMM(era.startingPreferred)}</div>
                      <div className="text-[#3a1070]">{fmtMM(quarterlyPrefDivMM)}/qtr in divs</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BIG GLOWING PLAY BUTTON */}
          <button
            disabled={!isValid}
            onClick={() => isValid && onStart({ era, startingCapitalMM: effectiveCapital })}
            className={`w-full relative overflow-hidden rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${isValid ? "play-btn-pulse" : ""}`}
            style={{
              padding: '20px 24px',
              background: isValid ? 'linear-gradient(135deg, #F7931A, #e07800)' : '#2d0060',
              boxShadow: isValid ? '0 0 40px rgba(247,147,26,0.5), 0 0 80px rgba(247,147,26,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
              border: isValid ? '1px solid rgba(247,147,26,0.8)' : '1px solid #3a1070',
            }}
          >
            <div className="relative z-10 flex items-center justify-center gap-4">
              <span className="text-3xl font-bold" style={{ color: isValid ? '#000' : '#6a3090' }}>₿</span>
              <div className="text-left">
                <div className="font-bold tracking-widest uppercase" style={{ color: isValid ? '#000' : '#6a3090', fontSize: '1.1rem', letterSpacing: '0.12em' }}>
                  {isValid ? '▶  LAUNCH SIMULATOR' : 'SELECT CAPITAL AMOUNT'}
                </div>
                {isValid && (
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(0,0,0,0.6)' }}>
                    {fmtMM(effectiveCapital)} starting capital · {era.name}
                  </div>
                )}
              </div>
              <span className="text-3xl font-bold" style={{ color: isValid ? '#000' : '#6a3090' }}>₿</span>
            </div>
            {isValid && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
