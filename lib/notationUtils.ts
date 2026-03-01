// ─── Notation Utilities ────────────────────────────────────────────────────
// All note durations, rests, time signatures, keys, and helpers for the
// custom notation editor.

export type NoteDuration =
  | "w" // whole
  | "h" // half
  | "q" // quarter
  | "8" // eighth
  | "16" // sixteenth
  | "wr" // whole rest
  | "hr" // half rest
  | "qr" // quarter rest
  | "8r" // eighth rest
  | "16r"; // sixteenth rest;

export interface NoteToolItem {
  id: NoteDuration;
  label: string;
  isRest: boolean;
  /** VexFlow duration string */
  vfDuration: string;
  /** How many quarter-note beats this occupies (in 4/4) */
  beats: number;
  /** Unicode / text symbol for the toolbar button */
  symbol: string;
}

export const NOTE_TOOLS: NoteToolItem[] = [
  {
    id: "w",
    label: "Whole Note",
    isRest: false,
    vfDuration: "w",
    beats: 4,
    symbol: "𝅝",
  },
  {
    id: "h",
    label: "Half Note",
    isRest: false,
    vfDuration: "h",
    beats: 2,
    symbol: "𝅗𝅥",
  },
  {
    id: "q",
    label: "Quarter Note",
    isRest: false,
    vfDuration: "q",
    beats: 1,
    symbol: "♩",
  },
  {
    id: "8",
    label: "Eighth Note",
    isRest: false,
    vfDuration: "8",
    beats: 0.5,
    symbol: "♪",
  },
  {
    id: "16",
    label: "Sixteenth Note",
    isRest: false,
    vfDuration: "16",
    beats: 0.25,
    symbol: "♬",
  },
  {
    id: "wr",
    label: "Whole Rest",
    isRest: true,
    vfDuration: "wr",
    beats: 4,
    symbol: "𝄻",
  },
  {
    id: "hr",
    label: "Half Rest",
    isRest: true,
    vfDuration: "hr",
    beats: 2,
    symbol: "𝄼",
  },
  {
    id: "qr",
    label: "Quarter Rest",
    isRest: true,
    vfDuration: "qr",
    beats: 1,
    symbol: "𝄽",
  },
  {
    id: "8r",
    label: "Eighth Rest",
    isRest: true,
    vfDuration: "8r",
    beats: 0.5,
    symbol: "𝄾",
  },
  {
    id: "16r",
    label: "Sixteenth Rest",
    isRest: true,
    vfDuration: "16r",
    beats: 0.25,
    symbol: "𝄿",
  },
];

// ── Time signatures ──────────────────────────────────────────────────────────
export interface TimeSig {
  label: string;
  beats: number; // beats per bar
  beatValue: number; // which note gets the beat (4 = quarter)
}

export const TIME_SIGNATURES: TimeSig[] = [
  { label: "4/4", beats: 4, beatValue: 4 },
  { label: "3/4", beats: 3, beatValue: 4 },
  { label: "2/4", beats: 2, beatValue: 4 },
  { label: "6/8", beats: 6, beatValue: 8 },
  { label: "3/8", beats: 3, beatValue: 8 },
  { label: "2/2", beats: 2, beatValue: 2 },
];

// ── Key signatures ───────────────────────────────────────────────────────────
export const KEY_SIGNATURES = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Am",
  "Em",
  "Bm",
  "F#m",
  "C#m",
  "G#m",
  "Dm",
  "Gm",
  "Cm",
  "Fm",
  "Bbm",
];

// ── Template types ───────────────────────────────────────────────────────────
export type StaveTemplate = "lead-sheet" | "grand-staff";

// ── Pitch helpers ────────────────────────────────────────────────────────────
/** All pitches shown on the grand staff (treble C4–B5, bass C2–B3) */
export const TREBLE_PITCHES = [
  "f/5",
  "e/5",
  "d/5",
  "c/5",
  "b/4",
  "a/4",
  "g/4",
  "f/4",
  "e/4",
  "d/4",
  "c/4",
];
export const BASS_PITCHES = [
  "a/3",
  "g/3",
  "f/3",
  "e/3",
  "d/3",
  "c/3",
  "b/2",
  "a/2",
  "g/2",
  "f/2",
  "e/2",
];

/** Given a y-position within a stave SVG element, map to the nearest pitch */
export function yToPitch(
  yRelative: number,
  staveTopY: number,
  clef: "treble" | "bass",
): string {
  // VexFlow stave lines are spaced 10px apart; top line = staveTopY
  const pitches = clef === "treble" ? TREBLE_PITCHES : BASS_PITCHES;
  const slotHeight = 10; // half-space between each pitch slot
  const slot = Math.round((yRelative - staveTopY) / slotHeight);
  const idx = Math.max(0, Math.min(slot, pitches.length - 1));
  return pitches[idx];
}

/** How many quarter-beat units a duration occupies */
export function durationBeats(vfDuration: string, timeSig: TimeSig): number {
  const map: Record<string, number> = {
    w: 4,
    h: 2,
    q: 1,
    "8": 0.5,
    "16": 0.25,
    wr: 4,
    hr: 2,
    qr: 1,
    "8r": 0.5,
    "16r": 0.25,
  };
  // Scale relative to beat value (e.g. 6/8 has eighth-note beat)
  const quarterBeats = map[vfDuration] ?? 1;
  return quarterBeats * (4 / timeSig.beatValue);
}

/** Total quarter-beats in one bar */
export function beatsPerBar(ts: TimeSig): number {
  return ts.beats * (4 / ts.beatValue);
}

/** Check if adding a note would overflow the current bar */
export function wouldOverflow(
  currentBeats: number,
  newDuration: string,
  ts: TimeSig,
): boolean {
  return currentBeats + durationBeats(newDuration, ts) > beatsPerBar(ts);
}

/** Remaining beats in the current bar */
export function remainingBeats(currentBeats: number, ts: TimeSig): number {
  return beatsPerBar(ts) - currentBeats;
}
