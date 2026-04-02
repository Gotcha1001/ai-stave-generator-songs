// ============================================================
// MUSIC THEORY ENGINE
// ============================================================

import { MusicNote } from "@/types/music";
import { NoteType } from "./musicGenerator";

export function musicNoteToVexNote(note: MusicNote): NoteType {
  let vexDuration: string;

  // Map your number durations to VexFlow strings
  switch (note.duration) {
    case 4:
      vexDuration = "w";
      break;
    case 3:
      vexDuration = "hd";
      break; // half dotted
    case 2:
      vexDuration = "h";
      break;
    case 1.5:
      vexDuration = "qd";
      break; // quarter dotted
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
    // If you later add ties/dynamics in MIDI recording, map them here too
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

// Key signatures: sharps or flats on the staff
export const KEY_SIGNATURES: Record<
  string,
  {
    sharps: number;
    flats: number;
    isMinor: boolean;
    relative?: string;
  }
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

// Note value weights by difficulty
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
    { v: 0.5, w: 0.35 }, // quavers!
  ],
  advanced: [
    { v: 4, w: 0.03 },
    { v: 2, w: 0.12 },
    { v: 1, w: 0.3 },
    { v: 0.5, w: 0.38 }, // quavers!
    { v: 0.25, w: 0.17 }, // semiquavers!
  ],
};

// Dotted note pairs for 3/4 and 6/8
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

// Convert pitch to MIDI number
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

// Staff position: treble clef middle line = B4 = pos 0, up = positive
export function getStaffPosition(
  note: string,
  octave: number,
  clef: "treble" | "bass",
): number {
  const noteBase = note.replace("#", "").replace("b", "");
  const idx = DIATONIC.indexOf(noteBase as (typeof DIATONIC)[number]);
  if (idx === -1) return 0;
  if (clef === "treble") {
    // B4 = reference (middle of treble staff)
    return (octave - 4) * 7 + (idx - 6); // B is index 6
  } else {
    // D3 = reference (middle of bass staff)
    return (octave - 3) * 7 + (idx - 1); // D is index 1
  }
}

export function beatsPerBar(timeSig: string): number {
  const [n, d] = timeSig.split("/").map(Number);
  // For 6/8: 6 eighth notes = 2 beats of 3, so 3 beat-units of 1 each if unit=0.5
  if (d === 8) return n * 0.5;
  return n;
}

export function getBarDuration(timeSig: string): number {
  const [num, denom] = timeSig.split("/").map(Number);
  if (!num || !denom) return 4; // fallback

  // General formula: (numerator / denominator) × 4 quarters
  return (num / denom) * 4;
}

export function midiToPitch(midi: number, preferFlats = false): string {
  if (midi < 0 || midi > 127) {
    console.warn(`MIDI note ${midi} out of range (0-127)`);
    return "C4"; // fallback
  }

  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;

  const sharpNames = CHROMATIC; // already defined: ["C", "C#", "D", ...]
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

// The notes that each key signature makes sharp or flat, in order
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

/**
 * Given a pitch like "F#4" or "Bb3" and the current key (e.g. "G", "Bb", "Am"),
 * returns the pitch with the accidental stripped if the key signature already
 * implies it — i.e. "F#4" in G major becomes "F4".
 * Chromatic notes outside the key are left unchanged.
 */
export function stripKeyAccidental(pitch: string, key: string): string {
  if (!pitch || pitch === "rest") return pitch;

  // Resolve minor keys to their relative major for sharp/flat counting
  const keySig = KEY_SIGNATURES[key];
  if (!keySig) return pitch; // unknown key — leave as-is

  const { sharps, flats } = keySig;

  // Parse the pitch: e.g. "F#4" → noteName="F#", octave="4"
  const match = pitch.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) return pitch;

  const [, noteName, octave] = match;
  const letter = noteName[0].toUpperCase();
  const acc = noteName.slice(1); // "#", "b", or ""

  if (acc === "#" && sharps > 0) {
    // Check if this sharp is in the key signature
    const sharpsInKey = SHARP_ORDER.slice(0, sharps);
    if (sharpsInKey.includes(letter)) {
      return letter + octave; // remove the "#" — key sig covers it
    }
  }

  if (acc === "b" && flats > 0) {
    const flatsInKey = FLAT_ORDER.slice(0, flats);
    if (flatsInKey.includes(letter)) {
      return letter + octave; // remove the "b" — key sig covers it
    }
  }

  return pitch; // chromatic note — keep accidental
}

/**
 * Inverse of stripKeyAccidental.
 * Given a pitch like "F4" in G major, returns "F#4" so playback
 * sounds the correct pitch implied by the key signature.
 */
// export function restoreKeyAccidental(pitch: string, key: string): string {
//   if (!pitch || pitch === "rest") return pitch;

//   const keySig = KEY_SIGNATURES[key];
//   if (!keySig) return pitch;

//   const match = pitch.match(/^([A-Ga-g])(\d+)$/);
//   if (!match) return pitch; // already has accidental or is unusual — leave alone

//   const [, letter, octave] = match;
//   const upper = letter.toUpperCase();
//   const { sharps, flats } = keySig;

//   if (sharps > 0) {
//     const sharpsInKey = SHARP_ORDER.slice(0, sharps);
//     if (sharpsInKey.includes(upper)) return upper + "#" + octave;
//   }

//   if (flats > 0) {
//     const flatsInKey = FLAT_ORDER.slice(0, flats);
//     if (flatsInKey.includes(upper)) return upper + "b" + octave;
//   }

//   return pitch;
// }

/**
 * Inverse of stripKeyAccidental.
 * Given a pitch like "F4" that was stored without its accidental
 * (because the key signature covers it), returns "F#4" so playback
 * sounds the note the key signature implies.
 * Only acts on pitches that are a plain letter+octave (no accidental).
 */
export function restoreKeyAccidental(pitch: string, key: string): string {
  if (!pitch || pitch === "rest") return pitch;

  const keySig = KEY_SIGNATURES[key];
  if (!keySig) return pitch;

  // Only act on bare pitches like "F4", "B3" — not "F#4" or "Bb3"
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
