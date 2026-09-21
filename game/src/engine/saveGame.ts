import type { EngineSnapshot } from './gameEngine';

const SAVE_KEY = 'btcs_save_v15';
const MUTE_KEY = 'btcs_muted';
const TUTORIAL_KEY = 'btcs_tutorial_v15_seen';

export interface SaveSummary {
  eraId: string;
  eraName: string;
  currentDate: string;
  daysSurvived: number;
  stockPrice: number;
  btcHeld: number;
  savedAt: string;
}

export interface PersistedSave {
  summary: SaveSummary;
  snapshot: EngineSnapshot;
}

export function saveGame(save: PersistedSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // private browsing / quota
  }
}

export function loadGame(): PersistedSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSave;
    if (!parsed?.snapshot || parsed.snapshot.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function getMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMutedPref(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // ignore
  }
}
