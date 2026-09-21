# ₿ Bitcoin Treasury Strategy Simulator

You are the CFO of a publicly traded Bitcoin treasury company. Stack Bitcoin, maximize the stock price, and survive a 730-day market cycle without going bust.

**Play it:** https://sylvestersilver.github.io/BTC-Treasury-Game/

Created by [@Benny_Stacks](https://x.com/Benny_Stacks). Historical prices are approximate game representations. Not financial advice.

## Gameplay

Pick one of eight eras (2013 mania through a stochastic "FUTURE"), choose your starting capital, then run the treasury day by day, week by week, or month by month.

| Lever | What it does |
|---|---|
| **Stack** | Buy BTC with cash. Large buys visibly move the market. |
| **Dump** | Sell BTC. Tanks sentiment, mNAV, and the stock. |
| **ATM** | Issue common stock at market. Accretive above 1x mNAV, destructive below. Repeated issuance overheats. |
| **STRC Preferred** | Raise perpetual preferred at an 11.5% base dividend. The rate escalates exponentially as BTC coverage deteriorates. |
| **Retire debt** | Pay down convertible notes to clean up the balance sheet. |
| **Suspend dividends** | Nuclear option. Stops the cash drain; closes the preferred market and craters sentiment. |

News events (ETF approvals, FTX, Fed hikes) shock the price, sentiment, and interest rates. When cash runs out the engine force-sells BTC to cover obligations.

### Outcomes

- **STACKED** — reached day 730 with more than $10B of BTC.
- **CLOSING BELL** — reached day 730 solvent, below the win line.
- **REKT** — insolvent before the horizon.

Top-10 scores per era (by stock price) are kept in a local leaderboard.

### Metrics modeled

Stock price, market cap, NAV/share, three mNAV multiples (market cap, EV, and CEBE per [cebetracker.io](https://cebetracker.io)), BTC yield, cost basis, leverage, preferred coverage, runway, and a dynamic STRC market price.

## Development

```bash
cd game
npm ci
npm run dev      # http://localhost:5173
npm run lint
npm run build    # tsc -b && vite build → game/dist
```

Stack: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Web Audio API (procedural synth, no audio files).

```
game/src
├── engine/        priceSimulator (historical waypoints → GBM w/ jumps), financialModel, gameEngine, synthEngine, leaderboard
├── data/          eras, newsEvents, gameConfig
├── components/    EraSelect → ConfigScreen → GameScreen (PriceChart, ActionPanel, BalancePanel, NewsTicker) → GameOverScreen
└── utils/         number formatting
```

## Deployment

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. The Vite `base` is set to `/BTC-Treasury-Game/` when `GITHUB_PAGES=true`.
