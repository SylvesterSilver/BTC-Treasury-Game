export interface Era {
  id: string;
  name: string;
  subtitle: string;
  startYear: number;
  startMonth: number;
  startPrice: number;
  historicalPrices: number[];  // ~180 days of daily prices
  volatility: number;  // annualized vol for GBM
  drift: number;       // annualized drift for GBM
  jumpFreq: number;    // jumps per year
  jumpMean: number;    // avg jump size (log)
  jumpStd: number;     // jump size std
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  difficultyColor: string;
  // Starting balance sheet
  startingBTC: number;      // BTC held
  startingCash: number;     // USD cash (millions)
  startingDebt: number;     // convertible notes outstanding (millions)
  startingShares: number;   // shares outstanding (millions)
  startingPreferred: number; // preferred stock face value (millions)
  softwareRevenue: number;  // quarterly software revenue (millions)
}

// Approximate historical Bitcoin prices (daily, simplified representative curves)

// Helper: generate a smooth historical curve with noise
function historicalCurve(
  start: number,
  end: number,
  days: number,
  peaks: { day: number; price: number }[],
  noise: number = 0.02
): number[] {
  const prices: number[] = [];
  for (let i = 0; i < days; i++) {
    // Find segment
    let segStart = { day: 0, price: start };
    let segEnd = { day: days - 1, price: end };
    for (const p of peaks) {
      if (p.day <= i && p.day > segStart.day) segStart = p;
    }
    for (const p of [...peaks].reverse()) {
      if (p.day >= i && p.day < segEnd.day) segEnd = p;
    }
    const t = (i - segStart.day) / Math.max(1, segEnd.day - segStart.day);
    const logInterp = Math.log(segStart.price) + t * (Math.log(segEnd.price) - Math.log(segStart.price));
    const n = (Math.random() - 0.5) * 2 * noise;
    prices.push(Math.exp(logInterp + n));
  }
  return prices;
}

export const ERAS: Era[] = [
  {
    id: 'genesis',
    name: '2013 BULL RUN',
    subtitle: 'The First Mania',
    startYear: 2013,
    startMonth: 1,
    startPrice: 13,
    historicalPrices: historicalCurve(13, 1100, 180, [
      { day: 60, price: 50 },
      { day: 90, price: 150 },
      { day: 120, price: 266 },
      { day: 140, price: 180 },
      { day: 160, price: 1150 },
    ], 0.04),
    volatility: 1.8,
    drift: 2.5,
    jumpFreq: 8,
    jumpMean: 0.12,
    jumpStd: 0.25,
    description: 'Bitcoin explodes from $13 to $1,100. The early days of mania. Extreme volatility, no safety net.',
    difficulty: 'LEGENDARY',
    difficultyColor: '#a855f7',
    startingBTC: 0,
    startingCash: 10,
    startingDebt: 0,
    startingShares: 50,
    startingPreferred: 0,
    softwareRevenue: 3,
  },
  {
    id: 'bull2017',
    name: '2017 EUPHORIA',
    subtitle: 'Retail Discovers Crypto',
    startYear: 2017,
    startMonth: 1,
    startPrice: 998,
    historicalPrices: historicalCurve(998, 19500, 180, [
      { day: 40, price: 1800 },
      { day: 80, price: 2900 },
      { day: 110, price: 4900 },
      { day: 140, price: 7500 },
      { day: 165, price: 19500 },
    ], 0.035),
    volatility: 1.4,
    drift: 3.2,
    jumpFreq: 6,
    jumpMean: 0.1,
    jumpStd: 0.2,
    description: 'The year Bitcoin became a household name. Ride the bull but watch the inevitable crash ahead.',
    difficulty: 'HARD',
    difficultyColor: '#ef4444',
    startingBTC: 10,
    startingCash: 50,
    startingDebt: 50,
    startingShares: 100,
    startingPreferred: 0,
    softwareRevenue: 8,
  },
  {
    id: 'bear2018',
    name: '2018 CRYPTO WINTER',
    subtitle: 'When Diamonds Are Made',
    startYear: 2018,
    startMonth: 1,
    startPrice: 13800,
    historicalPrices: historicalCurve(13800, 3200, 180, [
      { day: 20, price: 11000 },
      { day: 50, price: 9000 },
      { day: 80, price: 6800 },
      { day: 120, price: 4200 },
      { day: 160, price: 3200 },
    ], 0.04),
    volatility: 1.2,
    drift: -0.8,
    jumpFreq: 4,
    jumpMean: -0.08,
    jumpStd: 0.18,
    description: 'Bitcoin crashes 84% over the year. Every bounce is a trap. Survive and accumulate the dip.',
    difficulty: 'HARD',
    difficultyColor: '#ef4444',
    startingBTC: 500,
    startingCash: 100,
    startingDebt: 400,
    startingShares: 150,
    startingPreferred: 50,
    softwareRevenue: 12,
  },
  {
    id: 'covid',
    name: 'COVID CRASH 2020',
    subtitle: 'Black Thursday + The Rebound',
    startYear: 2020,
    startMonth: 1,
    startPrice: 7200,
    historicalPrices: historicalCurve(7200, 29000, 180, [
      { day: 30, price: 9100 },
      { day: 60, price: 4900 },  // Black Thursday
      { day: 70, price: 6500 },
      { day: 100, price: 9000 },
      { day: 130, price: 12000 },
      { day: 160, price: 20000 },
      { day: 175, price: 29000 },
    ], 0.03),
    volatility: 1.1,
    drift: 1.8,
    jumpFreq: 5,
    jumpMean: 0.06,
    jumpStd: 0.22,
    description: 'March 2020: Bitcoin crashes 50% in a day. Then MicroStrategy enters. Can you time the accumulation?',
    difficulty: 'MEDIUM',
    difficultyColor: '#f59e0b',
    startingBTC: 100,
    startingCash: 200,
    startingDebt: 200,
    startingShares: 120,
    startingPreferred: 0,
    softwareRevenue: 25,
  },
  {
    id: 'bull2021',
    name: '2021 INSTITUTIONAL',
    subtitle: 'Wall Street Arrives',
    startYear: 2021,
    startMonth: 1,
    startPrice: 29000,
    historicalPrices: historicalCurve(29000, 47000, 180, [
      { day: 30, price: 38000 },
      { day: 60, price: 58000 },
      { day: 75, price: 65000 },
      { day: 90, price: 48000 },
      { day: 120, price: 34000 },
      { day: 150, price: 47000 },
      { day: 175, price: 67000 },
    ], 0.03),
    volatility: 0.9,
    drift: 0.8,
    jumpFreq: 5,
    jumpMean: 0.05,
    jumpStd: 0.18,
    description: 'Institutions pile in. Two ATH runs, one brutal 54% correction in May. Time your moves perfectly.',
    difficulty: 'MEDIUM',
    difficultyColor: '#f59e0b',
    startingBTC: 70470,
    startingCash: 300,
    startingDebt: 2200,
    startingShares: 160,
    startingPreferred: 0,
    softwareRevenue: 30,
  },
  {
    id: 'bear2022',
    name: '2022 TERRA/FTX COLLAPSE',
    subtitle: 'The Reckoning',
    startYear: 2022,
    startMonth: 1,
    startPrice: 46000,
    historicalPrices: historicalCurve(46000, 16500, 180, [
      { day: 20, price: 43000 },
      { day: 60, price: 38000 },
      { day: 90, price: 28000 },  // LUNA/Terra collapse
      { day: 110, price: 22000 },
      { day: 150, price: 20000 },
      { day: 165, price: 16500 },  // FTX collapse
    ], 0.04),
    volatility: 1.0,
    drift: -1.2,
    jumpFreq: 6,
    jumpMean: -0.12,
    jumpStd: 0.2,
    description: 'LUNA implodes. FTX blows up. BTC falls 65%. Your preferred dividends don\'t stop. Can you survive?',
    difficulty: 'LEGENDARY',
    difficultyColor: '#a855f7',
    startingBTC: 129218,
    startingCash: 60,
    startingDebt: 2400,
    startingShares: 180,
    startingPreferred: 100,
    softwareRevenue: 28,
  },
  {
    id: 'now2024',
    name: '2024-25 ETF ERA',
    subtitle: 'BlackRock Changes Everything',
    startYear: 2024,
    startMonth: 1,
    startPrice: 42000,
    historicalPrices: historicalCurve(42000, 105000, 180, [
      { day: 40, price: 52000 },
      { day: 70, price: 73000 },
      { day: 90, price: 57000 },
      { day: 120, price: 67000 },
      { day: 150, price: 89000 },
      { day: 170, price: 105000 },
    ], 0.025),
    volatility: 0.75,
    drift: 1.2,
    jumpFreq: 4,
    jumpMean: 0.07,
    jumpStd: 0.15,
    description: 'Bitcoin ETFs approved. Halving approaches. Strategy (MSTR) is the template. Now YOU run it.',
    difficulty: 'EASY',
    difficultyColor: '#22c55e',
    startingBTC: 189150,
    startingCash: 800,
    startingDebt: 7200,
    startingShares: 245,
    startingPreferred: 1700,
    softwareRevenue: 30,
  },
  {
    id: 'future2025',
    name: 'FUTURE: THE UNKNOWN',
    subtitle: 'Project the Chaos',
    startYear: 2025,
    startMonth: 6,
    startPrice: 105000,
    historicalPrices: [],  // no historical, pure projection
    volatility: 0.8,
    drift: 0.9,
    jumpFreq: 4,
    jumpMean: 0.05,
    jumpStd: 0.16,
    description: 'No past to anchor you. The price model projects forward from today. Can you navigate pure uncertainty?',
    difficulty: 'HARD',
    difficultyColor: '#ef4444',
    startingBTC: 220000,
    startingCash: 1200,
    startingDebt: 8500,
    startingShares: 260,
    startingPreferred: 2500,
    softwareRevenue: 30,
  }
];
