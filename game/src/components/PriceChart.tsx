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
  height?: number;   // explicit pixel height — required on mobile
}

const formatPrice = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: '#07000f', border: '1px solid #2d0060', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ color: '#6a3090', marginBottom: 4 }}>Day {d.day}</div>
      {d.price !== undefined && (
        <div style={{ color: '#F7931A', fontWeight: 700 }}>₿ {formatPrice(d.price)}</div>
      )}
      {d.upper !== undefined && (
        <>
          <div style={{ color: 'rgba(247,147,26,0.5)' }}>↑ {formatPrice(d.upper)}</div>
          <div style={{ color: 'rgba(247,147,26,0.7)' }}>~ {formatPrice(d.median ?? 0)}</div>
          <div style={{ color: 'rgba(247,147,26,0.5)' }}>↓ {formatPrice(d.lower ?? 0)}</div>
        </>
      )}
    </div>
  );
};

export function PriceChart({ priceHistory, conePoints, currentPrice, isHistorical, height }: Props) {
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

  // Use explicit height when provided (needed on mobile), otherwise use 100%
  const containerStyle = height
    ? { width: '100%', height }
    : { width: '100%', height: '100%' };

  return (
    <div style={containerStyle} className="relative">

      {/* ── CHART HEADER ── clear BTC/USD label */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-3 pt-2 pointer-events-none">
        {/* Left: label + price */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span style={{ color: 'var(--cyan)', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              ₿  BTC / USD
            </span>
            <span style={{ color: '#2d0060', fontSize: '0.65rem', fontFamily: 'monospace' }}>LOG SCALE</span>
          </div>
          <div style={{ color: 'var(--bitcoin)', fontWeight: 700, fontSize: '1.4rem', fontFamily: 'monospace', lineHeight: 1, textShadow: '0 0 20px rgba(247,147,26,0.6)' }}>
            {formatPrice(currentPrice)}
          </div>
        </div>
        {/* Right: status */}
        <div className="text-right">
          {isHistorical ? (
            <span style={{ color: '#6a3090', fontSize: '0.6rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              HISTORICAL
            </span>
          ) : (
            <span style={{ color: '#f59e0b', fontSize: '0.6rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              className="ticker-live">
              ● PROJECTING
            </span>
          )}
          {!isHistorical && (
            <div style={{ color: '#3a1070', fontSize: '0.55rem', fontFamily: 'monospace', marginTop: 2 }}>
              cone = 80% CI
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 52, right: 12, bottom: 8, left: 4 }}
        >
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#F7931A" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="coneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#F7931A" stopOpacity={0.10} />
              <stop offset="95%" stopColor="#F7931A" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            tick={{ fill: '#3a1070', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#2d0060' }}
            interval="preserveStartEnd"
            tickFormatter={(v: number) => `D${v}`}
          />
          <YAxis
            scale="log"
            domain={[yMin, yMax]}
            tick={{ fill: '#3a1070', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatPrice}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* "NOW" reference line */}
          <ReferenceLine
            x={currentDay}
            stroke="var(--cyan)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
            label={{ value: 'NOW', position: 'top', fill: 'rgba(0,212,255,0.6)', fontSize: 8, fontFamily: 'monospace' }}
          />

          {/* Cone upper */}
          <Area dataKey="upper" stroke="none" fill="url(#coneGrad)" fillOpacity={1} connectNulls={false} />
          {/* Cone lower mask */}
          <Area dataKey="lower" stroke="none" fill="#04000a" fillOpacity={1} connectNulls={false} />
          {/* Cone median */}
          <Line dataKey="median" stroke="#F7931A" strokeWidth={1} strokeDasharray="5 3" dot={false} connectNulls={false} opacity={0.35} />

          {/* Main BTC price line */}
          <Area
            dataKey="price"
            stroke="#F7931A"
            strokeWidth={2.5}
            fill="url(#priceGrad)"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 5, fill: '#F7931A', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
