import { useEffect, useRef, useState } from 'react';
import { TICKER_FILLER } from '../data/newsEvents';

interface TickerItem {
  id: string;
  text: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MACRO' | 'FILLER';
}

interface Props {
  activeEvent?: { headline: string; type: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  BULLISH: '#00FF88',
  BEARISH: '#FF3355',
  MACRO: '#f59e0b',
  NEUTRAL: '#00D4FF',
  FILLER: '#6a3090',
};

const TYPE_PREFIXES: Record<string, string> = {
  BULLISH: '▲ BULLISH',
  BEARISH: '▼ BREAKING',
  MACRO: '◆ MACRO',
  NEUTRAL: '● NEWS',
  FILLER: '₿',
};

export function NewsTicker({ activeEvent }: Props) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Seed with filler
  useEffect(() => {
    const seed: TickerItem[] = TICKER_FILLER.slice(0, 8).map((t, i) => ({
      id: `filler_${i}`,
      text: t,
      type: 'FILLER',
    }));
    setItems(seed);
  }, []);

  // Inject active news events
  useEffect(() => {
    if (!activeEvent) return;
    const item: TickerItem = {
      id: `event_${Date.now()}`,
      text: activeEvent.headline,
      type: activeEvent.type as TickerItem['type'],
    };
    setItems(prev => [item, ...prev.slice(0, 14)]);
  }, [activeEvent]);

  // Rotate filler periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const filler = TICKER_FILLER[Math.floor(Math.random() * TICKER_FILLER.length)];
      setItems(prev => {
        const next: TickerItem = { id: `filler_${Date.now()}`, text: filler, type: 'FILLER' };
        return [...prev.slice(-10), next];
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const displayItems = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="border-t border-[#2d0060] bg-[#030008] overflow-hidden flex-shrink-0" style={{ height: 28 }}>
      <div
        ref={tickerRef}
        className="flex items-center gap-0 h-full"
        style={{
          animation: 'ticker-scroll 60s linear infinite',
          width: 'max-content',
        }}
      >
        {displayItems.map((item, i) => {
          const color = TYPE_COLORS[item.type];
          const prefix = TYPE_PREFIXES[item.type];
          return (
            <span key={`${item.id}_${i}`} className="flex items-center gap-2 px-6 text-xs font-mono whitespace-nowrap">
              <span className="font-bold text-xs" style={{ color }}>{prefix}</span>
              <span style={{ color: item.type === 'FILLER' ? '#3a1070' : '#cbd5e1' }}>{item.text}</span>
              <span className="text-[#2d0060] mx-2">·</span>
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
