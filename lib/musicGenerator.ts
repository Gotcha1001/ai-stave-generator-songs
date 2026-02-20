export type NoteType = {
  pitch: string;
  duration: string;
  isRest?: boolean;
};

// Treble: strictly within stave lines (no ledger lines)
const RIGHT_HAND = ["E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5"];

// Bass: strictly within stave lines (no ledger lines)
const LEFT_HAND = [
  "G2",
  "A2",
  "B2",
  "C3",
  "D3",
  "E3",
  "F3",
  "G3",
  "A3",
  "B3",
  "C4",
];

// Integer ticks: 1 bar = 16 ticks
// Notes and rests share the same duration values — rests just render differently
const DURATIONS: { vex: string; ticks: number; weight: number }[] = [
  { vex: "w", ticks: 16, weight: 2 }, // semibreve / whole rest
  { vex: "h", ticks: 8, weight: 5 }, // minim / half rest
  { vex: "q", ticks: 4, weight: 10 }, // crotchet / quarter rest
];

// Chance a given note slot becomes a rest (20%)
const REST_CHANCE = 0.2;

function pickPitch(hand: string[]): string {
  return hand[Math.floor(Math.random() * hand.length)];
}

function pickDuration(maxTicks: number): { vex: string; ticks: number } {
  const valid = DURATIONS.filter((d) => d.ticks <= maxTicks);
  const total = valid.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of valid) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return valid[valid.length - 1];
}

function generateBar(hand: string[]): NoteType[] {
  const notes: NoteType[] = [];
  let remaining = 16;

  while (remaining > 0) {
    const { vex, ticks } = pickDuration(remaining);
    const isRest = Math.random() < REST_CHANCE;

    notes.push({
      // VexFlow rests still need a pitch key for placement on the stave
      // "b/4" centres a rest in the treble stave; "d/3" centres in bass
      pitch: isRest ? (hand === RIGHT_HAND ? "B4" : "D3") : pickPitch(hand),
      duration: vex,
      isRest,
    });

    remaining -= ticks;
  }

  return notes;
}

export function generateSimpleSong({ bars = 16 }: { bars?: number } = {}) {
  const right: NoteType[] = [];
  const left: NoteType[] = [];
  for (let i = 0; i < bars; i++) {
    right.push(...generateBar(RIGHT_HAND));
    left.push(...generateBar(LEFT_HAND));
  }
  return { right, left, bars };
}
