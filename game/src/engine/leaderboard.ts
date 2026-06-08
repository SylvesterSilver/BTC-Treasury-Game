const STORAGE_KEY = 'btcs_leaderboard_v1';
const MAX_ENTRIES = 10;

export interface LeaderboardEntry {
  name: string;
  stockPrice: number;
  marketCapMM: number;
  btcHeld: number;
  btcValueMM: number;
  mNAV: number;
  daysSurvived: number;
  date: string;
  isWin: boolean;
}

type EraLeaderboard = LeaderboardEntry[];
type AllLeaderboards = Record<string, EraLeaderboard>;

function load(): AllLeaderboards {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: AllLeaderboards): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private browsing etc.) — fail silently
  }
}

export function getLeaderboard(eraId: string): EraLeaderboard {
  const all = load();
  return all[eraId] ?? [];
}

export function qualifiesForLeaderboard(eraId: string, stockPrice: number): boolean {
  const board = getLeaderboard(eraId);
  if (board.length < MAX_ENTRIES) return true;
  return stockPrice > board[board.length - 1].stockPrice;
}

export function submitScore(eraId: string, entry: Omit<LeaderboardEntry, 'date'>): EraLeaderboard {
  const all = load();
  const board = all[eraId] ?? [];

  const newEntry: LeaderboardEntry = {
    ...entry,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
  };

  const updated = [...board, newEntry]
    .sort((a, b) => b.stockPrice - a.stockPrice)
    .slice(0, MAX_ENTRIES);

  all[eraId] = updated;
  save(all);
  return updated;
}

export function getRank(eraId: string, stockPrice: number): number {
  const board = getLeaderboard(eraId);
  const sorted = [...board].sort((a, b) => b.stockPrice - a.stockPrice);
  const rank = sorted.findIndex(e => stockPrice > e.stockPrice);
  if (rank === -1) return board.length + 1;
  return rank + 1;
}
