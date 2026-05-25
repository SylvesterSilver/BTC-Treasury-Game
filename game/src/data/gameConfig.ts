import type { Era } from './eras';

export interface GameConfig {
  era: Era;
  startingCapitalMM: number;   // Override era default cash ($M)
  startingBTCOverride?: number; // Optional BTC override (null = use era default)
}

export const CAPITAL_PRESETS: { label: string; value: number; tag?: string }[] = [
  { label: '$100M',  value: 100,   tag: 'MODEST' },
  { label: '$250M',  value: 250,   tag: 'DEFAULT' },
  { label: '$500M',  value: 500 },
  { label: '$1B',    value: 1000,  tag: 'AGGRESSIVE' },
  { label: '$2.5B',  value: 2500 },
  { label: '$5B',    value: 5000,  tag: 'WAR CHEST' },
];

export const MAX_CAPITAL_MM = 9999;
