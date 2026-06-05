export interface Era {
  id: string;
  name: string;
  subtitle: string;
  startYear: number;
  startMonth: number;
  startPrice: number;
  historicalPrices: number[];
  volatility: number;
  drift: number;
  jumpFreq: number;
  jumpMean: number;
  jumpStd: number;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  difficultyColor: string;
  startingBTC: number;
  startingCash: number;
  startingDebt: number;
  startingShares: number;
  startingPreferred: number;
  softwareRevenue: number;
  interestRate: number;
  macroEnv: string;
}

// Build a noisy price path through waypoints
function buildCurve(waypoints: { day: number; price: number }[], totalDays: number, noise: number = 0.04): number[] {
  const prices: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    // Find surrounding waypoints
    let before = waypoints[0];
    let after = waypoints[waypoints.length - 1];
    for (const wp of waypoints) {
      if (wp.day <= i) before = wp;
    }
    for (const wp of [...waypoints].reverse()) {
      if (wp.day >= i) after = wp;
    }
    const t = before.day === after.day ? 1 : (i - before.day) / (after.day - before.day);
    const logInterp = Math.log(before.price) + t * (Math.log(after.price) - Math.log(before.price));
    // Extra noise burst every ~7 days for weekly candle effect
    const weeklyJolt = (i % 7 === 0) ? (Math.random() - 0.5) * noise * 2 : 0;
    const n = (Math.random() - 0.5) * 2 * noise + weeklyJolt;
    prices.push(Math.exp(logInterp + n));
  }
  return prices;
}

export const ERAS: Era[] = [
  // ── 2013 BULL ──
  {
    id: 'genesis',
    name: '2013 BULL RUN',
    subtitle: 'The First Mania',
    startYear: 2013, startMonth: 1, startPrice: 13,
    historicalPrices: buildCurve([
      { day: 0,   price: 13 },
      { day: 25,  price: 22 },
      { day: 45,  price: 18 },   // early dip
      { day: 65,  price: 70 },   // first pump
      { day: 80,  price: 50 },   // pullback
      { day: 100, price: 180 },  // acceleration
      { day: 115, price: 266 },  // Cyprus crisis ATH
      { day: 125, price: 70 },   // CRASH -74%
      { day: 145, price: 120 },  // recovery
      { day: 158, price: 200 },  // re-accumulation
      { day: 168, price: 700 },  // parabolic
      { day: 175, price: 1150 }, // ATH
      { day: 180, price: 800 },  // slight pullback
    ], 185, 0.06),
    volatility: 2.2, drift: 3.0, jumpFreq: 10, jumpMean: 0.15, jumpStd: 0.30,
    description: '$13 to $1,150 in one year. Wild swings with two distinct manias. No leverage — pure conviction.',
    difficulty: 'LEGENDARY', difficultyColor: '#a855f7',
    startingBTC: 0, startingCash: 10, startingDebt: 0, startingShares: 50, startingPreferred: 0,
    softwareRevenue: 3, interestRate: 0.04,
    macroEnv: 'QE era · Near-zero rates · Pre-institutional',
  },

  // ── 2017 EUPHORIA ──
  {
    id: 'bull2017',
    name: '2017 EUPHORIA',
    subtitle: 'Retail Discovers Crypto',
    startYear: 2017, startMonth: 1, startPrice: 998,
    historicalPrices: buildCurve([
      { day: 0,   price: 998 },
      { day: 20,  price: 1100 },
      { day: 40,  price: 1900 },
      { day: 55,  price: 1400 },  // dip
      { day: 70,  price: 2800 },
      { day: 85,  price: 2200 },  // BTC/BCH fork FUD dip
      { day: 100, price: 4900 },
      { day: 115, price: 3500 },  // China FUD crash
      { day: 130, price: 6000 },  // recovery+
      { day: 145, price: 7400 },
      { day: 158, price: 11000 }, // retail FOMO
      { day: 165, price: 17000 },
      { day: 170, price: 19500 }, // ATH
      { day: 175, price: 13000 }, // correction begins
      { day: 180, price: 15000 },
    ], 185, 0.05),
    volatility: 1.6, drift: 2.8, jumpFreq: 7, jumpMean: 0.12, jumpStd: 0.22,
    description: 'Two major dips before the parabolic final run to $19,500. Every correction looks fatal until it isn\'t.',
    difficulty: 'HARD', difficultyColor: '#ef4444',
    startingBTC: 10, startingCash: 50, startingDebt: 50, startingShares: 100, startingPreferred: 0,
    softwareRevenue: 8, interestRate: 0.045,
    macroEnv: 'Fed hiking · Tax reform · ICO mania',
  },

  // ── 2018 CRYPTO WINTER ── (bearish first half, bottoms & recovers second half)
  {
    id: 'bear2018',
    name: '2018 CRYPTO WINTER',
    subtitle: 'Diamonds Are Made Under Pressure',
    startYear: 2018, startMonth: 1, startPrice: 13800,
    historicalPrices: buildCurve([
      { day: 0,   price: 13800 },
      { day: 15,  price: 17000 }, // one last pump
      { day: 30,  price: 9800 },  // harsh rejection
      { day: 50,  price: 11200 }, // dead cat bounce
      { day: 70,  price: 7500 },
      { day: 90,  price: 6100 },
      { day: 105, price: 8300 },  // summer bounce
      { day: 120, price: 6400 },
      { day: 135, price: 3800 },  // capitulation
      { day: 145, price: 3200 },  // true bottom
      { day: 155, price: 3800 },  // bottoming process
      { day: 162, price: 4200 },  // early recovery
      { day: 170, price: 3600 },  // retest
      { day: 180, price: 5100 },  // recovery begins — always up & to the right
    ], 185, 0.055),
    volatility: 1.3, drift: 0.4, jumpFreq: 5, jumpMean: -0.05, jumpStd: 0.20,
    description: 'Brutal 84% crash. But those who held through to the second half caught the first signs of the next cycle.',
    difficulty: 'HARD', difficultyColor: '#ef4444',
    startingBTC: 500, startingCash: 100, startingDebt: 400, startingShares: 150, startingPreferred: 50,
    softwareRevenue: 12, interestRate: 0.055,
    macroEnv: 'Fed tightening · 10yr @ 3% · Risk-off',
  },

  // ── COVID CRASH 2020 ──
  {
    id: 'covid',
    name: 'COVID CRASH 2020',
    subtitle: 'Black Thursday + The Rebound',
    startYear: 2020, startMonth: 1, startPrice: 7200,
    historicalPrices: buildCurve([
      { day: 0,   price: 7200 },
      { day: 20,  price: 10400 }, // Feb ATH
      { day: 38,  price: 4800 },  // Black Thursday crash
      { day: 43,  price: 6900 },  // snap recovery
      { day: 55,  price: 5800 },  // retest
      { day: 70,  price: 9000 },
      { day: 85,  price: 11000 },
      { day: 100, price: 10200 }, // consolidation
      { day: 115, price: 13500 },
      { day: 130, price: 12000 },
      { day: 145, price: 18500 }, // MicroStrategy enters
      { day: 158, price: 24000 },
      { day: 168, price: 21000 }, // slight pullback
      { day: 178, price: 29000 }, // year end ATH
      { day: 183, price: 27000 },
    ], 185, 0.04),
    volatility: 1.2, drift: 2.2, jumpFreq: 6, jumpMean: 0.08, jumpStd: 0.24,
    description: '50% crash in a single day. Then the greatest BTC accumulation opportunity ever. Time the entry.',
    difficulty: 'MEDIUM', difficultyColor: '#f59e0b',
    startingBTC: 100, startingCash: 200, startingDebt: 200, startingShares: 120, startingPreferred: 0,
    softwareRevenue: 25, interestRate: 0.02,
    macroEnv: 'Fed at 0% · QE infinity · Stimulus checks',
  },

  // ── 2021 INSTITUTIONAL ──
  {
    id: 'bull2021',
    name: '2021 INSTITUTIONAL',
    subtitle: 'Wall Street Arrives',
    startYear: 2021, startMonth: 1, startPrice: 29000,
    historicalPrices: buildCurve([
      { day: 0,   price: 29000 },
      { day: 20,  price: 40000 },
      { day: 38,  price: 58000 },
      { day: 50,  price: 65000 }, // Apr ATH
      { day: 60,  price: 48000 }, // Elon tweet / China ban
      { day: 72,  price: 34000 }, // capitulation
      { day: 83,  price: 29000 }, // May bottom — retest of support
      { day: 95,  price: 40000 }, // strong recovery
      { day: 110, price: 46000 },
      { day: 125, price: 55000 },
      { day: 140, price: 67000 }, // Oct new ATH
      { day: 152, price: 69000 }, // Nov final ATH
      { day: 162, price: 58000 }, // pullback
      { day: 172, price: 50000 },
      { day: 182, price: 46000 }, // year end
    ], 185, 0.04),
    volatility: 1.0, drift: 1.0, jumpFreq: 6, jumpMean: 0.06, jumpStd: 0.20,
    description: 'Two ATHs, one savage 54% correction. The May crash looks catastrophic until the October rebound proves otherwise.',
    difficulty: 'MEDIUM', difficultyColor: '#f59e0b',
    startingBTC: 70470, startingCash: 300, startingDebt: 2200, startingShares: 160, startingPreferred: 0,
    softwareRevenue: 30, interestRate: 0.025,
    macroEnv: 'Fed still dovish · Rates 0% · Institutional FOMO',
  },

  // ── 2022 BEAR ── (crashes hard but shows bottoming and early recovery in second half)
  {
    id: 'bear2022',
    name: '2022 TERRA/FTX COLLAPSE',
    subtitle: 'The Reckoning — Then the Rebuild',
    startYear: 2022, startMonth: 1, startPrice: 46000,
    historicalPrices: buildCurve([
      { day: 0,   price: 46000 },
      { day: 18,  price: 43000 },
      { day: 35,  price: 38000 },
      { day: 55,  price: 45000 }, // spring dead cat
      { day: 75,  price: 30000 }, // LUNA implosion
      { day: 85,  price: 28000 },
      { day: 100, price: 21000 }, // further collapse
      { day: 115, price: 24000 }, // summer bounce
      { day: 128, price: 19000 },
      { day: 140, price: 20500 }, // pre-FTX
      { day: 152, price: 16000 }, // FTX collapse
      { day: 158, price: 15500 }, // true bottom
      { day: 165, price: 17000 }, // first bounce
      { day: 172, price: 16500 }, // retest
      { day: 180, price: 22000 }, // early 2023 recovery — BTC always recovers
    ], 185, 0.05),
    volatility: 1.1, drift: 0.5, jumpFreq: 7, jumpMean: -0.08, jumpStd: 0.22,
    description: 'LUNA. FTX. 65% crash. But the second half shows the floor and the start of the next cycle. Can you survive to catch it?',
    difficulty: 'LEGENDARY', difficultyColor: '#a855f7',
    startingBTC: 129218, startingCash: 60, startingDebt: 2400, startingShares: 180, startingPreferred: 100,
    softwareRevenue: 28, interestRate: 0.075,
    macroEnv: 'Fed hiking 75bps x4 · 10yr @ 4.2% · Liquidity crisis',
  },

  // ── 2024-25 ETF ERA ──
  {
    id: 'now2024',
    name: '2024-25 ETF ERA',
    subtitle: 'BlackRock Changes Everything',
    startYear: 2024, startMonth: 1, startPrice: 42000,
    historicalPrices: buildCurve([
      { day: 0,   price: 42000 },
      { day: 18,  price: 48000 },  // ETF approval
      { day: 30,  price: 44000 },  // sell the news dip
      { day: 45,  price: 57000 },
      { day: 58,  price: 70000 },
      { day: 68,  price: 63000 },  // correction
      { day: 80,  price: 58000 },  // deeper pullback
      { day: 92,  price: 70000 },  // recovery
      { day: 108, price: 65000 },
      { day: 122, price: 85000 },  // halving run
      { day: 138, price: 73000 },  // post-halving dip
      { day: 152, price: 93000 },  // election pump
      { day: 163, price: 105000 }, // $100K broken
      { day: 172, price: 97000 },
      { day: 180, price: 108000 }, // ATH
    ], 185, 0.035),
    volatility: 0.85, drift: 1.4, jumpFreq: 5, jumpMean: 0.08, jumpStd: 0.16,
    description: 'ETF inflows, halving, election. Multiple corrections that all turned into higher highs. The template is set.',
    difficulty: 'EASY', difficultyColor: '#22c55e',
    startingBTC: 189150, startingCash: 800, startingDebt: 7200, startingShares: 245, startingPreferred: 1700,
    softwareRevenue: 30, interestRate: 0.065,
    macroEnv: 'Fed cutting · 10yr @ 4.5% · ETF inflows',
  },

  // ── FUTURE ──
  {
    id: 'future2025',
    name: 'FUTURE: THE UNKNOWN',
    subtitle: 'Project the Chaos',
    startYear: 2025, startMonth: 6, startPrice: 105000,
    historicalPrices: [],
    volatility: 0.95, drift: 1.2, jumpFreq: 6, jumpMean: 0.07, jumpStd: 0.20,
    description: 'Pure stochastic projection. No history to anchor you — just volatility, drift, and your decisions.',
    difficulty: 'HARD', difficultyColor: '#ef4444',
    startingBTC: 220000, startingCash: 1200, startingDebt: 8500, startingShares: 260, startingPreferred: 2500,
    softwareRevenue: 30, interestRate: 0.055,
    macroEnv: 'Unknown macro · Rate trajectory unclear · ₿ season?',
  },
];
