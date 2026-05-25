import { useState } from 'react';
import type { Era } from '../data/eras';
import type { GameConfig } from '../data/gameConfig';
import { CAPITAL_PRESETS, MAX_CAPITAL_MM } from '../data/gameConfig';

interface Props {
  era: Era;
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

function fmt(mm: number): string {
  if (mm >= 1000) return `$${(mm / 1000).toFixed(mm % 1000 === 0 ? 0 : 2)}B`;
  return `$${mm}M`;
}

export function ConfigScreen({ era, onStart, onBack }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(era.startingCash);
  const [customValue, setCustomValue] = useState('');
  const [customActive, setCustomActive] = useState(false);

  const effectiveCapital = customActive
    ? (parseFloat(customValue) || 0)
    : (selectedPreset ?? era.startingCash);

  const isValid = effectiveCapital > 0 && effectiveCapital <= MAX_CAPITAL_MM;

  // Derived: how many BTC can you immediately buy at start price?
  const maxBTCImmediately = (effectiveCapital * 1e6) / era.startPrice;

  // Quarterly preferred dividend burden
  const quarterlyPrefDivMM = (era.startingPreferred * 0.08) / 4;

  // Runway with this capital vs. quarterly burn
  const quarterlyInterest = (era.startingDebt * 0.06) / 4;
  const quarterlyOpex = era.softwareRevenue * 0.85;
  const quarterlyRevenue = era.softwareRevenue;
  const quarterlyBurn = quarterlyInterest + quarterlyPrefDivMM + quarterlyOpex - quarterlyRevenue;
  const runwayMonths = quarterlyBurn > 0 ? (effectiveCapital / quarterlyBurn) * 3 : 999;

  const runwayColor = runwayMonths < 6 ? '#ef4444' : runwayMonths < 18 ? '#f59e0b' : '#22c55e';
  const runwayLabel = runwayMonths === 999 ? 'SELF-SUSTAINING' : `${Math.floor(runwayMonths)} months`;

  const handlePresetClick = (val: number) => {
    setSelectedPreset(val);
    setCustomActive(false);
    setCustomValue('');
  };

  const handleCustomChange = (v: string) => {
    setCustomValue(v);
    setCustomActive(true);
    setSelectedPreset(null);
  };

  const handleStart = () => {
    if (!isValid) return;
    onStart({ era, startingCapitalMM: effectiveCapital });
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-300 text-xs uppercase tracking-wider transition-colors mb-4 flex items-center gap-2"
          >
            ← Back to Era Select
          </button>
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-3"
            style={{
              color: era.difficultyColor,
              background: `${era.difficultyColor}22`,
              border: `1px solid ${era.difficultyColor}44`,
            }}
          >
            {era.difficulty} · {era.name}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Configure Starting Capital</h2>
          <p className="text-slate-500 text-sm">
            How much dry powder do you bring to the treasury?
          </p>
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {CAPITAL_PRESETS.map(preset => {
            const isSelected = !customActive && selectedPreset === preset.value;
            return (
              <button
                key={preset.value}
                className="relative p-4 rounded-lg border transition-all duration-150 text-left"
                style={{
                  background: isSelected ? '#111827' : '#0f1629',
                  borderColor: isSelected ? '#F7931A' : '#1e2d4a',
                  boxShadow: isSelected ? '0 0 20px rgba(247,147,26,0.2)' : 'none',
                }}
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.tag && (
                  <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: isSelected ? '#F7931A22' : '#ffffff11',
                      color: isSelected ? '#F7931A' : '#475569',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {preset.tag}
                  </div>
                )}
                <div className="text-xl font-bold font-mono" style={{ color: isSelected ? '#F7931A' : '#e2e8f0' }}>
                  {preset.label}
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  {(preset.value * 1e6 / era.startPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC max
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom input */}
        <div className="game-card p-4 mb-6">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Custom Amount</div>
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
              <input
                className="w-full bg-terminal-muted border border-terminal-border rounded pl-7 pr-12 py-3 text-white font-mono text-sm focus:border-bitcoin focus:outline-none transition-colors"
                style={{ borderColor: customActive ? '#F7931A' : undefined }}
                type="number"
                placeholder="e.g. 750"
                min={1}
                max={MAX_CAPITAL_MM}
                value={customValue}
                onChange={e => handleCustomChange(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">M</span>
            </div>
            <div className="text-slate-500 text-xs text-right min-w-[80px]">
              <div className="text-slate-400">max</div>
              <div className="font-mono text-white">{fmt(MAX_CAPITAL_MM)}</div>
            </div>
          </div>
          {customActive && parseFloat(customValue) > MAX_CAPITAL_MM && (
            <div className="text-red-400 text-xs mt-2">Maximum starting capital is $10B</div>
          )}
        </div>

        {/* Impact preview */}
        {isValid && (
          <div className="game-card p-4 mb-6">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-4">Starting Position Preview</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-600 text-xs mb-1">Starting Cash</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{fmt(effectiveCapital)}</div>
              </div>
              <div>
                <div className="text-slate-600 text-xs mb-1">Max BTC You Can Buy Now</div>
                <div className="text-2xl font-bold font-mono text-bitcoin">
                  {maxBTCImmediately >= 1000
                    ? `${(maxBTCImmediately / 1000).toFixed(1)}K ₿`
                    : `${maxBTCImmediately.toFixed(0)} ₿`}
                </div>
                <div className="text-slate-600 text-xs">@ {fmt(era.startPrice / 1e6 * 1)}{era.startPrice >= 1000 ? '' : ''} per BTC</div>
              </div>
              <div>
                <div className="text-slate-600 text-xs mb-1">Quarterly Burn Rate</div>
                <div className="font-bold font-mono text-lg" style={{ color: quarterlyBurn > 0 ? '#ef4444' : '#22c55e' }}>
                  {quarterlyBurn > 0 ? `-${fmt(quarterlyBurn)}/qtr` : `+${fmt(Math.abs(quarterlyBurn))}/qtr`}
                </div>
                <div className="text-slate-600 text-xs">
                  {quarterlyBurn > 0 ? 'net cash burn' : 'net cash generation'}
                </div>
              </div>
              <div>
                <div className="text-slate-600 text-xs mb-1">Cash Runway</div>
                <div className="font-bold font-mono text-lg" style={{ color: runwayColor }}>
                  {runwayLabel}
                </div>
                <div className="text-slate-600 text-xs">before cash runs out</div>
              </div>
            </div>

            {/* Starting liabilities reminder */}
            {(era.startingDebt > 0 || era.startingPreferred > 0) && (
              <div className="mt-4 pt-4 border-t border-terminal-border">
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Inherited Liabilities</div>
                <div className="flex gap-6">
                  {era.startingDebt > 0 && (
                    <div>
                      <div className="text-slate-600 text-xs">Convertible Debt</div>
                      <div className="text-red-400 font-mono font-bold text-sm">{fmt(era.startingDebt)}</div>
                      <div className="text-slate-600 text-xs">6% annual interest</div>
                    </div>
                  )}
                  {era.startingPreferred > 0 && (
                    <div>
                      <div className="text-slate-600 text-xs">Preferred Stack</div>
                      <div className="text-yellow-400 font-mono font-bold text-sm">{fmt(era.startingPreferred)}</div>
                      <div className="text-slate-600 text-xs">{fmt(quarterlyPrefDivMM)}/qtr in divs</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          className="btn-bitcoin w-full py-4 text-base"
          disabled={!isValid}
          onClick={handleStart}
        >
          {isValid
            ? `▶ START WITH ${fmt(effectiveCapital)} — ${era.name}`
            : 'Enter a valid capital amount to start'}
        </button>
      </div>
    </div>
  );
}
