import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PricePoint } from '../engine/priceSimulator';

interface ConePoint {
  day: number;
  upper: number;
  lower: number;
  median: number;
}

interface ChartDataPoint {
  day: number;
  price?: number;
  upper?: number;
  lower?: number;
  median?: number;
}

interface Props {
  priceHistory: PricePoint[];
  conePoints: ConePoint[];
  currentPrice: number;
  isHistorical: boolean;
}

const formatPrice = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-terminal-card border border-terminal-border rounded px-3 py-2 text-xs font-mono">
      <div className="text-slate-400 mb-1">Day {d.day}</div>
      {d.price !== undefined && (
        <div className="text-bitcoin font-bold">{formatPrice(d.price)}</div>
      )}
      {d.upper !== undefined && (
        <>
          <div className="text-orange-300/60 text-xs">Upper: {formatPrice(d.upper)}</div>
          <div className="text-orange-400/80 text-xs">Median: {formatPrice(d.median ?? 0)}</div>
          <div className="text-orange-300/60 text-xs">Lower: {formatPrice(d.lower ?? 0)}</div>
        </>
      )}
    </div>
  );
};

export function PriceChart({ priceHistory, conePoints, currentPrice, isHistorical }: Props) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const histData: ChartDataPoint[] = priceHistory.map(p => ({
      day: p.day,
      price: p.price,
    }));

    const coneData: ChartDataPoint[] = conePoints.map(c => ({
      day: c.day,
      upper: c.upper,
      lower: c.lower,
      median: c.median,
    }));

    const combined: ChartDataPoint[] = [...histData];
    if (coneData.length > 0 && histData.length > 0) {
      const lastHist = histData[histData.length - 1];
      combined.push({
        day: lastHist.day,
        price: lastHist.price,
        upper: (lastHist.price ?? 0) * 1.01,
        lower: (lastHist.price ?? 0) * 0.99,
        median: lastHist.price,
      });
      combined.push(...coneData);
    }

    return combined;
  }, [priceHistory, conePoints]);

  const allPrices = priceHistory.map(p => p.price);
  const allCone = conePoints.flatMap(c => [c.upper, c.lower]);
  const allVals = [...allPrices, ...allCone].filter((v): v is number => v !== undefined && v > 0);
  const yMin = allVals.length ? Math.min(...allVals) * 0.85 : 1;
  const yMax = allVals.length ? Math.max(...allVals) * 1.1 : 100000;

  const currentDay = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].day : 0;

  return (
    <div className="w-full h-full relative">
      {/* Price display overlay */}
      <div className="absolute top-2 left-3 z-10 flex items-baseline gap-3">
        <span className="text-bitcoin font-bold text-2xl font-mono">
          {formatPrice(currentPrice)}
        </span>
        <span className="text-slate-500 text-xs uppercase tracking-wider">
          {isHistorical ? 'HISTORICAL' : 'LIVE SIMULATION'}
        </span>
        {!isHistorical && (
          <span className="text-orange-400 text-xs ticker-live">● PROJECTING</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 40, right: 20, bottom: 10, left: 10 }}
        >
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F7931A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="coneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F7931A" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#F7931A" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2d4a' }}
            interval="preserveStartEnd"
            tickFormatter={(v: number) => `D${v}`}
          />
          <YAxis
            scale="log"
            domain={[yMin, yMax]}
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatPrice}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            x={currentDay}
            stroke="#F7931A"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.4}
          />

          {/* Cone upper fill */}
          <Area
            dataKey="upper"
            stroke="none"
            fill="url(#coneGrad)"
            fillOpacity={1}
            connectNulls={false}
          />
          {/* Cone lower mask */}
          <Area
            dataKey="lower"
            stroke="none"
            fill="#0a0e1a"
            fillOpacity={1}
            connectNulls={false}
          />

          {/* Cone median line */}
          <Line
            dataKey="median"
            stroke="#F7931A"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            opacity={0.4}
          />

          {/* Main price line */}
          <Area
            dataKey="price"
            stroke="#F7931A"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: '#F7931A', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
