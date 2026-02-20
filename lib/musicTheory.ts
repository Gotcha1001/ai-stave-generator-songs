// ============================================================
// MUSIC THEORY ENGINE
// ============================================================

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
