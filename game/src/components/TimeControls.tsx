import type { TimeSpeed } from '../engine/gameEngine';
import { TIME_SPEEDS } from '../engine/gameEngine';

interface Props {
  speed: TimeSpeed;
  onSpeedChange: (speed: TimeSpeed) => void;
  currentDate: string;
  daysSurvived: number;
  totalDays: number;
  era: { name: string };
}

const SPEEDS: TimeSpeed[] = ['PAUSED', '1D', '1W', '1M'];

export function TimeControls({ speed, onSpeedChange, currentDate, daysSurvived, totalDays, era }: Props) {
  const progress = Math.min((daysSurvived / totalDays) * 100, 100);

  return (
    <div className="game-card px-4 py-3 flex items-center gap-6 flex-wrap">
      {/* Era badge */}
      <div className="flex items-center gap-2">
        <span className="text-bitcoin text-sm">₿</span>
        <div>
          <div className="text-white text-xs font-bold">{era.name}</div>
          <div className="text-slate-500 text-xs font-mono">{currentDate}</div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-8 w-px bg-terminal-border hidden md:block" />

      {/* Speed controls */}
      <div className="flex items-center gap-2">
        <span className="text-slate-600 text-xs uppercase tracking-wider mr-1">Speed</span>
        {SPEEDS.map(s => {
          const cfg = TIME_SPEEDS[s];
          const isActive = speed === s;
          return (
            <button
              key={s}
              className="px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-all"
              style={{
                background: isActive ? (s === 'PAUSED' ? '#1e3a5f' : '#F7931A22') : '#0a0018',
                color: isActive ? (s === 'PAUSED' ? '#00D4FF' : '#F7931A') : '#5a2080',
                border: `1px solid ${isActive ? (s === 'PAUSED' ? '#1a0070' : '#F7931A66') : '#2d0060'}`,
              }}
              onClick={() => onSpeedChange(s)}
            >
              {s === 'PAUSED' ? '⏸ PAUSE' : cfg.label}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-[120px]">
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>Progress</span>
          <span className="font-mono">{daysSurvived}d / {totalDays}d</span>
        </div>
        <div className="w-full bg-terminal-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #F7931A88, #F7931A)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
