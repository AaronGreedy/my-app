// Preset routine = le abitudini "core" già presenti nella Home (HOME_CORE_HABITS
// + Doccia fredda). Servono a far combaciare Home e Routines: Aaron le aggiunge
// con un tap invece di ribatterle. Slot/orari indicativi, modificabili dopo.

import type { RoutineSlot } from './routines-store';

export interface RoutinePreset {
  name: string;
  slot: RoutineSlot;
  time: string;
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  { name: 'Stretching',        slot: 'mattina', time: '07:30' },
  { name: 'Meditazione',       slot: 'mattina', time: '07:45' },
  { name: 'Doccia fredda',     slot: 'mattina', time: '08:00' },
  { name: 'Luci rosse',        slot: 'sera',    time: '21:00' },
  { name: 'Candle',            slot: 'sera',    time: '21:30' },
  { name: 'No scroll a letto', slot: 'sera',    time: '22:30' },
];
