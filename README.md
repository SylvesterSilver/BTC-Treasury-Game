# Bitcoin Treasury Strategy Simulator

Arcade CFO sim: you run a Bitcoin treasury company. Stack sats, issue stock and preferred, manage convertibles, and survive two years without blowing up the balance sheet.

Live: [GitHub Pages](https://sylvestersilver.github.io/BTC-Treasury-Game/) · created by [@Benny_Stacks](https://twitter.com/Benny_Stacks)

## Play

```bash
cd game
npm install
npm run dev
```

Open the local Vite URL, pick an era, set starting cash, read the briefing, take the desk.

- **Win:** survive 730 days without insolvency. Leaderboard rank is final stock price.
- **Loop:** ATM at a premium → buy BTC → grow BTC/share. Buy back stock at a discount. Preferred is cheap dry powder until coverage slips.
- **Death:** cash crisis auto-sells BTC, preferred yield explodes below 2x coverage, negative equity ends the run.

## v15

- Briefing + first-run tutorial + in-game help (`H`)
- Autosave / continue last run
- Convertible issuance and share buybacks
- ATM 7-day window and overheat cap
- Mission objectives on the HUD
- Keyboard: `Space` pause, `1/2/3` speed, `M` mute, `S` save
- Seeded historical paths (stable across reloads)
- Survive-730 win condition (no more hidden $10B BTC gate)

## Keyboard

| Key | Action |
|-----|--------|
| Space | Pause / resume |
| 1 / 2 / 3 | Day / week / month speed |
| M | Mute |
| H or ? | Help |
| S | Save now |
| Esc | Close overlay |

## Scripts

```bash
npm run dev       # Vite
npm run build     # typecheck + production bundle
npm run test      # engine unit tests
npm run preview   # serve dist
```

Not financial advice. Historical prices are game representations.
