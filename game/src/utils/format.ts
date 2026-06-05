// Unified currency formatter — handles M → B → T → Q
export function fmtMM(mm: number, decimals = 2): string {
  const abs = Math.abs(mm);
  const sign = mm < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(decimals)}Q`;  // quadrillion
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(decimals)}T`;      // trillion
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(decimals)}B`;          // billion
  }
  return `${sign}$${abs.toFixed(1)}M`;
}

// Quick button label formatter — e.g. 1000 → "$1B"
export function fmtQuickLabel(mm: number): string {
  if (mm >= 1_000_000) return `$${(mm / 1_000_000).toFixed(0)}T`;
  if (mm >= 1_000) return `$${(mm / 1_000).toFixed(0)}B`;
  return `$${mm}M`;
}

// Stock / BTC price formatter
export function fmtPrice(p: number): string {
  if (p >= 1e15) return `$${(p / 1e15).toFixed(2)}Q`;
  if (p >= 1e12) return `$${(p / 1e12).toFixed(2)}T`;
  if (p >= 1e9)  return `$${(p / 1e9).toFixed(2)}B`;
  if (p >= 1e6)  return `$${(p / 1e6).toFixed(2)}M`;
  if (p >= 1e3)  return `$${(p / 1e3).toFixed(2)}K`;
  return `$${p.toFixed(2)}`;
}

// BTC amount formatter
export function fmtBTC(btc: number): string {
  if (btc >= 1_000_000) return `${(btc / 1_000_000).toFixed(2)}M ₿`;
  if (btc >= 1_000)     return `${(btc / 1_000).toFixed(2)}K ₿`;
  return `${btc.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₿`;
}
