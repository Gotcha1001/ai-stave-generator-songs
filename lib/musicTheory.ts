// ============================================================
// MUSIC THEORY ENGINE
// ============================================================

import { MusicNote } from "@/types/music";
import { NoteType } from "./musicGenerator";

export function musicNoteToVexNote(note: MusicNote): NoteType {
  let vexDuration: string;

  switch (note.duration) {
    case 4:
      vexDuration = "w";
      break;
    case 3:
      vexDuration = "hd";
      break;
    case 2:
      vexDuration = "h";
      break;
    case 1.5:
      vexDuration = "qd";
      break;
    case 1:
      vexDuration = "q";
      break;
    case 0.5:
      vexDuration = "8";
      break;
    case 0.25:
      vexDuration = "16";
      break;
    default:
      console.warn(`Unsupported duration ${note.duration}, using quarter`);
      vexDuration = "q";
  }

  return {
    pitch: note.pitch,
    duration: vexDuration,
    isRest: note.rest ?? false,
  };
}

export const CHROMATIC = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const DIATONIC = ["C", "D", "E", "F", "G", "A", "B"] as const;

export const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
} as const;

// Key signatures
export const KEY_SIGNATURES: Record<
  string,
  { sharps: number; flats: number; isMinor: boolean; relative?: string }
> = {
  C: { sharps: 0, flats: 0, isMinor: false },
  G: { sharps: 1, flats: 0, isMinor: false },
  D: { sharps: 2, flats: 0, isMinor: false },
  A: { sharps: 3, flats: 0, isMinor: false },
  E: { sharps: 4, flats: 0, isMinor: false },
  F: { sharps: 0, flats: 1, isMinor: false },
  Bb: { sharps: 0, flats: 2, isMinor: false },
  Eb: { sharps: 0, flats: 3, isMinor: false },
  Am: { sharps: 0, flats: 0, isMinor: true, relative: "C" },
  Em: { sharps: 1, flats: 0, isMinor: true, relative: "G" },
  Bm: { sharps: 2, flats: 0, isMinor: true, relative: "D" },
  Dm: { sharps: 0, flats: 1, isMinor: true, relative: "F" },
  Gm: { sharps: 0, flats: 2, isMinor: true, relative: "Bb" },
};

export type Duration = 4 | 2 | 1 | 0.5 | 0.25 | 1.5 | 3;

export const DURATION_NAMES: Record<number, string> = {
  4: "Whole",
  3: "Dotted Half",
  2: "Half",
  1.5: "Dotted Quarter",
  1: "Quarter",
  0.5: "Quaver (Eighth)",
  0.25: "Semiquaver (Sixteenth)",
};

export const DURATION_WEIGHTS: Record<
  string,
  Array<{ v: number; w: number }>
> = {
  beginner: [
    { v: 4, w: 0.05 },
    { v: 2, w: 0.35 },
    { v: 1, w: 0.6 },
  ],
  intermediate: [
    { v: 4, w: 0.05 },
    { v: 2, w: 0.2 },
    { v: 1, w: 0.4 },
    { v: 0.5, w: 0.35 },
  ],
  advanced: [
    { v: 4, w: 0.03 },
    { v: 2, w: 0.12 },
    { v: 1, w: 0.3 },
    { v: 0.5, w: 0.38 },
    { v: 0.25, w: 0.17 },
  ],
};

export const GENRE_DURATION_OVERRIDES: Record<
  string,
  Array<{ v: number; w: number }>
> = {
  waltz: [
    { v: 2, w: 0.1 },
    { v: 1.5, w: 0.3 },
    { v: 1, w: 0.4 },
    { v: 0.5, w: 0.2 },
  ],
  march: [
    { v: 2, w: 0.1 },
    { v: 1, w: 0.45 },
    { v: 0.5, w: 0.45 },
  ],
  ragtime: [
    { v: 1, w: 0.3 },
    { v: 0.5, w: 0.5 },
    { v: 0.25, w: 0.2 },
  ],
  blues: [
    { v: 1.5, w: 0.3 },
    { v: 1, w: 0.35 },
    { v: 0.5, w: 0.35 },
  ],
};

export function weightedRandom<T extends { w: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.w;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function parsePitch(
  pitchStr: string,
): { note: string; octave: number } | null {
  if (!pitchStr || pitchStr === "rest") return null;
  const m = pitchStr.match(/^([A-G][#b]?)(\d)$/);
  if (!m) return null;
  return { note: m[1], octave: parseInt(m[2]) };
}

export function pitchToMidi(note: string, octave: number): number {
  const enhar: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
  };
  const resolved = enhar[note] || note;
  const idx = CHROMATIC.indexOf(resolved as (typeof CHROMATIC)[number]);
  if (idx === -1) return 60;
  return (octave + 1) * 12 + idx;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getStaffPosition(
  note: string,
  octave: number,
  clef: "treble" | "bass",
): number {
  const noteBase = note.replace("#", "").replace("b", "");
  const idx = DIATONIC.indexOf(noteBase as (typeof DIATONIC)[number]);
  if (idx === -1) return 0;

  if (clef === "treble") {
    return (octave - 4) * 7 + (idx - 6); // B4 reference
  } else {
    return (octave - 3) * 7 + (idx - 1); // D3 reference
  }
}

export function beatsPerBar(timeSig: string): number {
  const [n, d] = timeSig.split("/").map(Number);
  if (d === 8) return n * 0.5;
  return n;
}

export function getBarDuration(timeSig: string): number {
  const [num, denom] = timeSig.split("/").map(Number);
  if (!num || !denom) return 4;
  return (num / denom) * 4;
}

export function midiToPitch(midi: number, preferFlats = false): string {
  if (midi < 0 || midi > 127) {
    console.warn(`MIDI note ${midi} out of range`);
    return "C4";
  }

  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;

  const sharpNames = CHROMATIC;
  const flatNames = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];

  const noteName = preferFlats ? flatNames[noteIndex] : sharpNames[noteIndex];
  return `${noteName}${octave}`;
}

// ===================================================================
// NEW: Should we display an accidental symbol?
// ===================================================================
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

export function shouldShowAccidental(pitch: string, key: string): boolean {
  if (!pitch || pitch === "rest") return false;

  const parsed = parsePitch(pitch);
  if (!parsed) return false;

  // No accidental → nothing to show
  if (!parsed.note.includes("#") && !parsed.note.includes("b")) return false;

  const keySig = KEY_SIGNATURES[key];
  if (!keySig) return true;

  const letter = parsed.note[0];
  const acc = parsed.note[1];

  if (acc === "#" && keySig.sharps > 0) {
    const sharpsInKey = SHARP_ORDER.slice(0, keySig.sharps);
    return !sharpsInKey.includes(letter);
  }

  if (acc === "b" && keySig.flats > 0) {
    const flatsInKey = FLAT_ORDER.slice(0, keySig.flats);
    return !flatsInKey.includes(letter);
  }

  return true; // chromatic accidental outside key signature
}

// ===================================================================
// Legacy functions (kept for backward compatibility)
// ===================================================================

/** @deprecated Use shouldShowAccidental instead */
export function stripKeyAccidental(pitch: string, key: string): string {
  if (!pitch || pitch === "rest") return pitch;

  const keySig = KEY_SIGNATURES[key];
  if (!keySig) return pitch;

  const match = pitch.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) return pitch;

  const [, noteName, octave] = match;
  const letter = noteName[0].toUpperCase();
  const acc = noteName.slice(1);

  if (acc === "#" && keySig.sharps > 0) {
    const sharpsInKey = SHARP_ORDER.slice(0, keySig.sharps);
    if (sharpsInKey.includes(letter)) return letter + octave;
  }

  if (acc === "b" && keySig.flats > 0) {
    const flatsInKey = FLAT_ORDER.slice(0, keySig.flats);
    if (flatsInKey.includes(letter)) return letter + octave;
  }

  return pitch;
}

/** @deprecated We no longer strip accidentals — we store full pitches */
export function restoreKeyAccidental(pitch: string, key: string): string {
  if (!pitch || pitch === "rest") return pitch;

  const keySig = KEY_SIGNATURES[key];
  if (!keySig) return pitch;

  const match = pitch.match(/^([A-G])(\d+)$/);
  if (!match) return pitch;

  const [, letter, octave] = match;
  const { sharps, flats } = keySig;

  if (sharps > 0) {
    const sharpsInKey = SHARP_ORDER.slice(0, sharps);
    if (sharpsInKey.includes(letter)) return letter + "#" + octave;
  }

  if (flats > 0) {
    const flatsInKey = FLAT_ORDER.slice(0, flats);
    if (flatsInKey.includes(letter)) return letter + "b" + octave;
  }

  return pitch;
}
