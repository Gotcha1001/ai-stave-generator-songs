// export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

// export type NoteType = {
//   pitch: string;
//   duration: string;
//   isRest?: boolean;
//   dynamic?: Dynamic;
//   tie?: boolean;
//   swingOffset?: number;
// };

// export type Genre = "classical" | "rock" | "folk" | "nursery" | "jazz";
// export type TimeSig = "4/4" | "3/4" | "6/8" | "2/4";

// export interface GeneratorOptions {
//   bars?: number;
//   key?: string;
//   mode?: "major" | "minor";
//   seed?: number;
//   tempo?: number;
//   swing?: number;
//   genre?: Genre;
//   timeSig?: TimeSig;
// }

// export interface GeneratedSong {
//   right: NoteType[];
//   left: NoteType[];
//   bars: number;
//   key: string;
//   mode: "major" | "minor";
//   tempo: number;
//   swing: number;
//   genre: Genre;
//   timeSig: TimeSig;
// }

// /* ============================================================
//    TICK SYSTEM (quarter-note based)
//    ────────────────────────────────────────────────────────────
//    1 quarter = 4 ticks
//    4/4 bar = 16 ticks
//    3/4 bar = 12 ticks
//    6/8 bar = 12 ticks (6 eighths = 3 quarters)
//    2/4 bar = 8 ticks
// ============================================================ */
// const TICKS_PER_BEAT = 4;
// function barTicks(timeSig: TimeSig): number {
//   switch (timeSig) {
//     case "3/4":
//       return 12;
//     case "6/8":
//       return 12;
//     case "2/4":
//       return 8;
//     default:
//       return 16; // 4/4
//   }
// }

// function ticksToDur(ticks: number): string {
//   if (ticks >= 16) return "w";
//   if (ticks >= 8) return "h";
//   if (ticks >= 4) return "q";
//   if (ticks >= 2) return "8";
//   return "16";
// }

// function fitToExactTicks(notes: NoteType[], targetTicks: number): NoteType[] {
//   const result: NoteType[] = [];
//   let used = 0;
//   for (const note of notes) {
//     const durTicks = durationToTicks(note.duration);
//     const rem = targetTicks - used;
//     if (rem <= 0) break;
//     if (durTicks <= rem) {
//       result.push(note);
//       used += durTicks;
//     } else {
//       result.push({ ...note, duration: ticksToDur(rem) });
//       used = targetTicks;
//       break;
//     }
//   }
//   while (used < targetTicks) {
//     const rem = targetTicks - used;
//     result.push({
//       pitch: "rest",
//       duration: ticksToDur(Math.min(rem, 16)),
//       isRest: true,
//     });
//     used += Math.min(rem, 16);
//   }
//   return result;
// }

// function durationToTicks(dur: string): number {
//   switch (dur) {
//     case "w":
//       return 16;
//     case "h":
//       return 8;
//     case "q":
//       return 4;
//     case "8":
//       return 2;
//     case "16":
//       return 1;
//     default:
//       return 4;
//   }
// }

// /* ============================================================
//    RNG & utilities
// ============================================================ */
// let rand: () => number = Math.random;

// function makePrng(seed: number): () => number {
//   let s = seed >>> 0;
//   return () => {
//     s ^= s << 13;
//     s ^= s >>> 17;
//     s ^= s << 5;
//     return (s >>> 0) / 0xffffffff;
//   };
// }

// const rnd = (n: number) => Math.floor(rand() * n);
// const pick = <T>(arr: readonly T[]): T => arr[rnd(arr.length)];
// const clamp = (v: number, lo: number, hi: number) =>
//   Math.max(lo, Math.min(hi, v));
// const maybe = (p: number) => rand() < p;

// /* ============================================================
//    Music theory basics
// ============================================================ */
// const CHROMATIC = [
//   "C",
//   "C#",
//   "D",
//   "D#",
//   "E",
//   "F",
//   "F#",
//   "G",
//   "G#",
//   "A",
//   "A#",
//   "B",
// ] as const;
// const CHROMATIC_FLATS = [
//   "C",
//   "Db",
//   "D",
//   "Eb",
//   "E",
//   "F",
//   "Gb",
//   "G",
//   "Ab",
//   "A",
//   "Bb",
//   "B",
// ] as const;
// const FLAT_KEYS = new Set([
//   "F",
//   "Bb",
//   "Eb",
//   "Ab",
//   "Db",
//   "Gb",
//   "Dm",
//   "Gm",
//   "Cm",
//   "Fm",
//   "Bbm",
//   "Ebm",
//   "Abm",
//   "Dbm",
// ]);
// const ENHARMONIC: Record<string, string> = {
//   Db: "C#",
//   Eb: "D#",
//   Gb: "F#",
//   Ab: "G#",
//   Bb: "A#",
// };

// const SCALES: Record<"major" | "minor", number[]> = {
//   major: [0, 2, 4, 5, 7, 9, 11],
//   minor: [0, 2, 3, 5, 7, 8, 10],
// };

// const PENTATONIC_MAJOR = [0, 2, 4, 7, 9];
// const PENTATONIC_MINOR = [0, 3, 5, 7, 10];
// const BLUES_SCALE = [0, 3, 5, 6, 7, 10];

// function rootToMidi(key: string): number {
//   const bare = key.replace(/\s*m(in)?$/i, ""); // only strip "m"/"min", never "b"
//   const note = ENHARMONIC[bare] ?? bare;
//   const idx = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]);
//   return idx === -1 ? 0 : idx;
// }

// function buildScale(
//   rootIdx: number,
//   intervals: number[],
//   octaves: number[],
// ): number[] {
//   const out: number[] = [];
//   for (const oct of octaves)
//     for (const i of intervals) out.push(rootIdx + i + (oct + 1) * 12);
//   return out;
// }

// function midiToPitch(midi: number, preferFlats = false): string {
//   const oct = Math.floor(midi / 12) - 1;
//   const note = preferFlats ? CHROMATIC_FLATS[midi % 12] : CHROMATIC[midi % 12];
//   return `${note}${oct}`;
// }

// function nearestInScale(midi: number, scaleNotes: number[]): number {
//   return scaleNotes.reduce((a, b) =>
//     Math.abs(b - midi) < Math.abs(a - midi) ? b : a,
//   );
// }

// /* ============================================================
//    Chord helpers
// ============================================================ */
// const CHORD_INTERVALS: Record<string, number[]> = {
//   I: [0, 4, 7],
//   II: [2, 5, 9],
//   III: [4, 7, 11],
//   IV: [5, 9, 12],
//   V: [7, 11, 14],
//   VI: [9, 12, 16],
//   VII: [11, 14, 17],
//   im: [0, 3, 7],
//   ivm: [5, 8, 12],
//   vm: [7, 10, 14],
// };

// function chordMidi(
//   numeral: string,
//   rootIdx: number,
//   mode: "major" | "minor",
//   octave = 4,
// ): number[] {
//   const base = rootIdx + (octave + 1) * 12;
//   const intervals =
//     mode === "minor"
//       ? {
//           I: [0, 3, 7],
//           II: [2, 5, 8],
//           III: [3, 7, 10],
//           IV: [5, 8, 12],
//           V: [7, 11, 14],
//           VI: [8, 12, 15],
//           VII: [10, 14, 17],
//         }
//       : CHORD_INTERVALS;
//   return (intervals[numeral] ?? [0, 4, 7]).map((i) => base + i);
// }

// /* ============================================================
//    GENRE CONFIGS
// ============================================================ */
// interface GenreConfig {
//   defaultTempo: number;
//   defaultMode: "major" | "minor";
//   defaultTimeSig: TimeSig;
//   swing: number;
//   progressions: { major: string[][]; minor: string[][] };
//   scaleType: "diatonic" | "pentatonic" | "blues";
//   rightHandStyle: "melodic" | "pentatonic" | "blues";
//   leftHandStyle:
//     | "alberti"
//     | "power"
//     | "oom-pah"
//     | "walking"
//     | "stride"
//     | "block";
//   rhythmPattern: number[][];
//   dynamicsRange: Dynamic[];
// }

// const GENRE_CONFIGS: Record<Genre, GenreConfig> = {
//   classical: {
//     defaultTempo: 120,
//     defaultMode: "major",
//     defaultTimeSig: "4/4",
//     swing: 0,
//     progressions: {
//       major: [
//         ["I", "IV", "V", "I"],
//         ["I", "II", "V", "I"],
//         ["I", "VI", "IV", "V"],
//       ],
//       minor: [
//         ["Im", "IVm", "V", "Im"],
//         ["Im", "VII", "IVm", "V"],
//       ],
//     },
//     scaleType: "diatonic",
//     rightHandStyle: "melodic",
//     leftHandStyle: "alberti",
//     rhythmPattern: [
//       [4, 4, 4, 4],
//       [4, 2, 2, 4, 4],
//       [2, 2, 2, 2, 4, 4],
//     ],
//     dynamicsRange: ["mp", "mf", "f"],
//   },
//   rock: {
//     defaultTempo: 140,
//     defaultMode: "minor",
//     defaultTimeSig: "4/4",
//     swing: 0,
//     progressions: {
//       major: [
//         ["I", "IV", "V", "IV"],
//         ["I", "V", "VI", "IV"],
//         ["I", "IV", "I", "V"],
//       ],
//       minor: [
//         ["Im", "VII", "VI", "VII"],
//         ["Im", "IVm", "Im", "V"],
//         ["Im", "VI", "III", "VII"],
//       ],
//     },
//     scaleType: "pentatonic",
//     rightHandStyle: "pentatonic",
//     leftHandStyle: "power",
//     rhythmPattern: [
//       [4, 4, 4, 4],
//       [4, 2, 2, 4, 4],
//       [4, 4, 2, 2, 4],
//     ],
//     dynamicsRange: ["mf", "f", "ff"],
//   },
//   folk: {
//     defaultTempo: 108,
//     defaultMode: "major",
//     defaultTimeSig: "3/4",
//     swing: 0,
//     progressions: {
//       major: [
//         ["I", "IV", "I", "V"],
//         ["I", "V", "IV", "I"],
//         ["I", "II", "V", "I"],
//       ],
//       minor: [
//         ["Im", "VII", "VI", "VII"],
//         ["Im", "IVm", "V", "Im"],
//       ],
//     },
//     scaleType: "diatonic",
//     rightHandStyle: "melodic",
//     leftHandStyle: "oom-pah",
//     rhythmPattern: [
//       [4, 4, 4],
//       [2, 2, 4, 4],
//       [4, 2, 2, 2, 2],
//     ],
//     dynamicsRange: ["p", "mp", "mf"],
//   },
//   nursery: {
//     defaultTempo: 100,
//     defaultMode: "major",
//     defaultTimeSig: "4/4",
//     swing: 0,
//     progressions: {
//       major: [
//         ["I", "V", "I", "V"],
//         ["I", "IV", "V", "I"],
//         ["I", "I", "V", "I"],
//       ],
//       minor: [["Im", "V", "Im", "V"]],
//     },
//     scaleType: "pentatonic",
//     rightHandStyle: "pentatonic",
//     leftHandStyle: "block",
//     rhythmPattern: [
//       [4, 4, 4, 4],
//       [2, 2, 2, 2, 4, 4],
//       [4, 4, 4, 4],
//     ],
//     dynamicsRange: ["mp", "mf"],
//   },
//   jazz: {
//     defaultTempo: 130,
//     defaultMode: "minor",
//     defaultTimeSig: "4/4",
//     swing: 0.3,
//     progressions: {
//       major: [
//         ["I", "VI", "II", "V"],
//         ["I", "IV", "VII", "III"],
//         ["II", "V", "I", "VI"],
//       ],
//       minor: [
//         ["Im", "IVm", "VII", "III"],
//         ["II", "V", "Im", "V"],
//         ["Im", "VI", "II", "V"],
//       ],
//     },
//     scaleType: "blues",
//     rightHandStyle: "blues",
//     leftHandStyle: "stride",
//     rhythmPattern: [
//       [4, 2, 2, 4, 4],
//       [2, 2, 4, 2, 2, 4],
//       [4, 4, 2, 2, 4],
//     ],
//     dynamicsRange: ["mp", "mf", "f"],
//   },
// };

// /* ============================================================
//    RIGHT-HAND BAR BUILDERS
// ============================================================ */
// function buildMelodicBar(
//   scaleNotes: number[],
//   chordTones: number[],
//   targetTicks: number,
//   dyn: Dynamic,
//   pattern: number[],
//   preferFlats = false,
// ): NoteType[] {
//   const notes: NoteType[] = [];
//   let lastMidi = scaleNotes[3] ?? 64;
//   for (const t of pattern) {
//     if (
//       notes.reduce((s, n) => s + durationToTicks(n.duration), 0) >= targetTicks
//     )
//       break;
//     const candidates = maybe(0.6) ? chordTones : scaleNotes;
//     const target = clamp(
//       lastMidi + rnd(7) - 3,
//       scaleNotes[0] ?? 52,
//       (scaleNotes[0] ?? 52) + 24,
//     );
//     const midi = nearestInScale(target, candidates);
//     lastMidi = midi;
//     const isRest = maybe(0.08);
//     notes.push({
//       pitch: isRest ? "rest" : midiToPitch(midi, preferFlats),
//       duration: ticksToDur(t),
//       isRest,
//       dynamic: dyn,
//     });
//   }
//   return fitToExactTicks(notes, targetTicks);
// }

// function buildPentatonicBar(
//   rootIdx: number,
//   mode: "major" | "minor",
//   chordTones: number[],
//   targetTicks: number,
//   dyn: Dynamic,
//   pattern: number[],
//   preferFlats = false,
// ): NoteType[] {
//   const pent = mode === "minor" ? PENTATONIC_MINOR : PENTATONIC_MAJOR;
//   const scaleNotes = buildScale(rootIdx, pent, [4]);
//   return buildMelodicBar(
//     scaleNotes,
//     chordTones,
//     targetTicks,
//     dyn,
//     pattern,
//     preferFlats,
//   );
// }

// function buildBluesBar(
//   rootIdx: number,
//   chordTones: number[],
//   targetTicks: number,
//   dyn: Dynamic,
//   pattern: number[],
//   preferFlats = false,
// ): NoteType[] {
//   const scaleNotes = buildScale(rootIdx, BLUES_SCALE, [4]);
//   return buildMelodicBar(
//     scaleNotes,
//     chordTones,
//     targetTicks,
//     dyn,
//     pattern,
//     preferFlats,
//   );
// }

// /* ============================================================
//    LEFT-HAND BAR BUILDERS
// ============================================================ */
// function nearestRoot(tones: number[], prev: number): number {
//   return tones
//     .map((t) => {
//       let m = t;
//       while (m > 52) m -= 12;
//       while (m < 40) m += 12;
//       return m;
//     })
//     .reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
// }

// function albertiBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 40, 52);
//   const t = clamp(sorted[1] ?? r + 4, r + 3, r + 9);
//   const f = clamp(sorted[2] ?? r + 7, t + 2, t + 7);
//   const pat = [r, f, t, f];
//   const repeats = Math.floor(targetTicks / (2 * pat.length));
//   const notes: NoteType[] = [];
//   for (let i = 0; i < Math.max(1, repeats); i++)
//     for (const p of pat)
//       notes.push({
//         pitch: midiToPitch(p, preferFlats),
//         duration: "8",
//         dynamic: dyn,
//       });
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function powerChordBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 36, 48);
//   const fifth = r + 7;
//   const beats = targetTicks / 4;
//   const notes: NoteType[] = [];
//   for (let b = 0; b < beats; b++) {
//     if (b % 2 === 0) {
//       notes.push({
//         pitch: midiToPitch(r, preferFlats),
//         duration: "8",
//         dynamic: dyn,
//       });
//       notes.push({
//         pitch: midiToPitch(fifth, preferFlats),
//         duration: "8",
//         dynamic: dyn,
//       });
//     } else {
//       notes.push({ pitch: "rest", duration: "q", isRest: true });
//     }
//   }
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function oomPahBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 40, 52);
//   const chordHi = sorted.map((t) => {
//     let m = t;
//     while (m < r + 3) m += 12;
//     return clamp(m, r + 3, r + 12);
//   });
//   const beats = targetTicks / 4;
//   const notes: NoteType[] = [];
//   for (let b = 0; b < beats; b++) {
//     if (b === 0)
//       notes.push({
//         pitch: midiToPitch(r, preferFlats),
//         duration: "q",
//         dynamic: dyn,
//       });
//     else
//       notes.push({
//         pitch: midiToPitch(chordHi[1] ?? r + 4, preferFlats),
//         duration: "q",
//         dynamic: dyn,
//       });
//   }
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function walkingBassBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   scaleNotes: number[],
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 36, 48);
//   const beats = targetTicks / 4;
//   const notes: NoteType[] = [];
//   let cur = r;
//   for (let b = 0; b < beats; b++) {
//     notes.push({
//       pitch: midiToPitch(cur, preferFlats),
//       duration: "q",
//       dynamic: dyn,
//     });
//     const step = rnd(3) - 1;
//     const scaleFiltered = scaleNotes.filter((s) => s >= 36 && s <= 52);
//     const next = nearestInScale(
//       cur + step * 2,
//       scaleFiltered.length > 0 ? scaleFiltered : [cur],
//     );
//     cur = clamp(next, 36, 52);
//   }
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function strideBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 40, 52);
//   const chord = sorted.map((t) => {
//     let m = t;
//     while (m < 55) m += 12;
//     return clamp(m, 55, 72);
//   });
//   const beats = targetTicks / 4;
//   const notes: NoteType[] = [];
//   for (let b = 0; b < beats; b++) {
//     if (b % 2 === 0)
//       notes.push({
//         pitch: midiToPitch(r, preferFlats),
//         duration: "q",
//         dynamic: dyn,
//       });
//     else
//       notes.push({
//         pitch: midiToPitch(chord[0] ?? r + 7, preferFlats),
//         duration: "q",
//         dynamic: dyn,
//       });
//   }
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function blockChordBar(
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const root = nearestRoot(tones, prev);
//   const r = clamp(root, 40, 52);
//   const chord = sorted.slice(0, 3).map((t) => {
//     let m = t;
//     while (m < 48) m += 12;
//     return clamp(m, 48, 62);
//   });
//   const beats = targetTicks / 4;
//   const notes: NoteType[] = [];
//   for (let b = 0; b < beats; b++) {
//     // alternate root and chord tone for a simple oom-pah feel
//     const pitch =
//       b % 2 === 0
//         ? midiToPitch(r, preferFlats)
//         : midiToPitch(chord[0] ?? r + 4, preferFlats);
//     notes.push({ pitch, duration: "q", dynamic: dyn });
//   }
//   return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
// }

// function buildLeftBar(
//   style: GenreConfig["leftHandStyle"],
//   tones: number[],
//   prev: number,
//   dyn: Dynamic,
//   targetTicks: number,
//   scaleNotes: number[],
//   preferFlats = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   switch (style) {
//     case "alberti":
//       return albertiBar(tones, prev, dyn, targetTicks, preferFlats);
//     case "power":
//       return powerChordBar(tones, prev, dyn, targetTicks, preferFlats);
//     case "oom-pah":
//       return oomPahBar(tones, prev, dyn, targetTicks, preferFlats);
//     case "walking":
//       return walkingBassBar(
//         tones,
//         prev,
//         dyn,
//         targetTicks,
//         scaleNotes,
//         preferFlats,
//       );
//     case "stride":
//       return strideBar(tones, prev, dyn, targetTicks, preferFlats);
//     case "block":
//       return blockChordBar(tones, prev, dyn, targetTicks, preferFlats);
//   }
// }

// /* ============================================================
//    MAIN GENERATOR
// ============================================================ */
// export function generateSimpleSong({
//   bars = 16,
//   key,
//   mode,
//   seed,
//   tempo,
//   swing,
//   genre = "classical",
//   timeSig,
// }: GeneratorOptions = {}): GeneratedSong {
//   if (seed !== undefined) rand = makePrng(seed);

//   const cfg = GENRE_CONFIGS[genre];
//   const resolvedTempo = tempo ?? cfg.defaultTempo;
//   const resolvedSwing = swing ?? cfg.swing;
//   const resolvedTimeSig = timeSig ?? cfg.defaultTimeSig;
//   const totalBars = Math.max(4, Math.round(bars / 4) * 4);
//   const tpb = barTicks(resolvedTimeSig);

//   // ── FIX: resolve the key once up-front so every downstream use and the
//   //         returned `key` field all refer to the same value.  Previously
//   //         `key` (the param) was passed to `rootToMidi` while the return
//   //         statement fell back to the hard-coded strings "Am"/"C", meaning
//   //         a randomly-chosen key would be used for generation but never
//   //         surfaced to the caller.
//   const resolvedKey =
//     key ?? pick(["C", "G", "D", "F", "A", "Bb", "E", "Am", "Em", "Dm"]);

//   const inferredMode: "major" | "minor" =
//     mode ?? (resolvedKey.match(/m(in)?$/i) ? "minor" : cfg.defaultMode);

//   const rootIdx = rootToMidi(resolvedKey);
//   const preferFlats = FLAT_KEYS.has(resolvedKey);
//   const scaleInts = SCALES[inferredMode];
//   const scaleOct4 = buildScale(rootIdx, scaleInts, [4]);
//   const scaleOct3 = buildScale(rootIdx, scaleInts, [3]);

//   const progPool = cfg.progressions[inferredMode];
//   const progressions = Array.from(
//     { length: Math.ceil(totalBars / 4) },
//     (_, i) => progPool[i % progPool.length],
//   );

//   const dynamics = cfg.dynamicsRange;

//   const rightRaw: NoteType[] = [];
//   const leftRaw: NoteType[] = [];
//   let prevRoot = rootIdx + 3 * 12 + 7; // ~G3

//   for (let blockIdx = 0; blockIdx < progressions.length; blockIdx++) {
//     const prog = progressions[blockIdx];
//     const dyn = dynamics[clamp(blockIdx, 0, dynamics.length - 1)];
//     const patIdx = rnd(cfg.rhythmPattern.length);
//     let rawPat = [...cfg.rhythmPattern[patIdx]];

//     // Scale pattern to match current time signature's tick count
//     const patSum = rawPat.reduce((a, b) => a + b, 0);
//     if (patSum !== tpb) {
//       const scaleFactor = tpb / patSum;
//       rawPat = rawPat.map((t) => Math.max(1, Math.round(t * scaleFactor)));
//     }

//     for (
//       let barInBlock = 0;
//       barInBlock < Math.min(4, prog.length);
//       barInBlock++
//     ) {
//       const numeral = prog[barInBlock % prog.length];
//       const chordTones = chordMidi(numeral, rootIdx, inferredMode, 4);

//       // Right hand
//       let rightBar: NoteType[];
//       switch (cfg.rightHandStyle) {
//         case "pentatonic":
//           rightBar = buildPentatonicBar(
//             rootIdx,
//             inferredMode,
//             chordTones,
//             tpb,
//             dyn,
//             rawPat,
//             preferFlats,
//           );
//           break;
//         case "blues":
//           rightBar = buildBluesBar(
//             rootIdx,
//             chordTones,
//             tpb,
//             dyn,
//             rawPat,
//             preferFlats,
//           );
//           break;
//         default:
//           rightBar = buildMelodicBar(
//             scaleOct4,
//             chordTones,
//             tpb,
//             dyn,
//             rawPat,
//             preferFlats,
//           );
//       }
//       rightRaw.push(...rightBar);

//       // Left hand
//       const lhResult = buildLeftBar(
//         cfg.leftHandStyle,
//         chordTones,
//         prevRoot,
//         dyn,
//         tpb,
//         scaleOct3,
//         preferFlats,
//       );
//       leftRaw.push(...lhResult.notes);
//       prevRoot = lhResult.lastRoot;
//     }
//   }

//   function applySwing(notes: NoteType[], swingAmt: number): NoteType[] {
//     if (!swingAmt) return notes;
//     return notes.map((n, i) => {
//       if (n.isRest) return n;
//       return { ...n, swingOffset: i % 2 === 1 ? swingAmt : 0 };
//     });
//   }

//   return {
//     right: applySwing(rightRaw, resolvedSwing),
//     left: applySwing(leftRaw, resolvedSwing),
//     bars: totalBars,
//     key: resolvedKey, // ── FIX: was `key ?? "Am"/"C"`, now always the actual key used
//     mode: inferredMode,
//     tempo: resolvedTempo,
//     swing: resolvedSwing,
//     genre,
//     timeSig: resolvedTimeSig,
//   };
// }
export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

export type NoteType = {
  pitch: string;
  duration: string;
  isRest?: boolean;
  dynamic?: Dynamic;
  tie?: boolean;
  swingOffset?: number;
};

export type Genre = "classical" | "rock" | "folk" | "nursery" | "jazz";
export type TimeSig = "4/4" | "3/4" | "6/8" | "2/4";

export interface GeneratorOptions {
  bars?: number;
  key?: string;
  mode?: "major" | "minor";
  seed?: number;
  tempo?: number;
  swing?: number;
  genre?: Genre;
  timeSig?: TimeSig;
}

export interface GeneratedSong {
  right: NoteType[];
  left: NoteType[];
  bars: number;
  key: string;
  mode: "major" | "minor";
  tempo: number;
  swing: number;
  genre: Genre;
  timeSig: TimeSig;
}

/* ============================================================
   TICK SYSTEM (quarter-note based)
   ────────────────────────────────────────────────────────────
   1 quarter = 4 ticks
   4/4 bar = 16 ticks
   3/4 bar = 12 ticks
   6/8 bar = 12 ticks (6 eighths = 3 quarters)
   2/4 bar = 8 ticks
============================================================ */
const TICKS_PER_BEAT = 4;
function barTicks(timeSig: TimeSig): number {
  switch (timeSig) {
    case "3/4":
      return 12;
    case "6/8":
      return 12;
    case "2/4":
      return 8;
    default:
      return 16; // 4/4
  }
}

function ticksToDur(ticks: number): string {
  if (ticks >= 16) return "w";
  if (ticks >= 8) return "h";
  if (ticks >= 4) return "q";
  if (ticks >= 2) return "8";
  return "16";
}

function fitToExactTicks(notes: NoteType[], targetTicks: number): NoteType[] {
  const result: NoteType[] = [];
  let used = 0;
  for (const note of notes) {
    const durTicks = durationToTicks(note.duration);
    const rem = targetTicks - used;
    if (rem <= 0) break;
    if (durTicks <= rem) {
      result.push(note);
      used += durTicks;
    } else {
      result.push({ ...note, duration: ticksToDur(rem) });
      used = targetTicks;
      break;
    }
  }
  while (used < targetTicks) {
    const rem = targetTicks - used;
    result.push({
      pitch: "rest",
      duration: ticksToDur(Math.min(rem, 16)),
      isRest: true,
    });
    used += Math.min(rem, 16);
  }
  return result;
}

function durationToTicks(dur: string): number {
  switch (dur) {
    case "w":
      return 16;
    case "h":
      return 8;
    case "q":
      return 4;
    case "8":
      return 2;
    case "16":
      return 1;
    default:
      return 4;
  }
}

/* ============================================================
   RNG & utilities
============================================================ */
let rand: () => number = Math.random;

function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

const rnd = (n: number) => Math.floor(rand() * n);
const pick = <T>(arr: readonly T[]): T => arr[rnd(arr.length)];
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const maybe = (p: number) => rand() < p;

/* ============================================================
   Music theory basics
============================================================ */
const CHROMATIC = [
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
const CHROMATIC_FLATS = [
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
] as const;
const FLAT_KEYS = new Set([
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Dm",
  "Gm",
  "Cm",
  "Fm",
  "Bbm",
  "Ebm",
  "Abm",
  "Dbm",
]);
const ENHARMONIC: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const SCALES: Record<"major" | "minor", number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const PENTATONIC_MAJOR = [0, 2, 4, 7, 9];
const PENTATONIC_MINOR = [0, 3, 5, 7, 10];
const BLUES_SCALE = [0, 3, 5, 6, 7, 10];

function rootToMidi(key: string): number {
  const bare = key.replace(/\s*m(in)?$/i, ""); // only strip "m"/"min", never "b"
  const note = ENHARMONIC[bare] ?? bare;
  const idx = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]);
  return idx === -1 ? 0 : idx;
}

function buildScale(
  rootIdx: number,
  intervals: number[],
  octaves: number[],
): number[] {
  const out: number[] = [];
  for (const oct of octaves)
    for (const i of intervals) out.push(rootIdx + i + (oct + 1) * 12);
  return out;
}

function midiToPitch(midi: number, preferFlats = false): string {
  const oct = Math.floor(midi / 12) - 1;
  const note = preferFlats ? CHROMATIC_FLATS[midi % 12] : CHROMATIC[midi % 12];
  return `${note}${oct}`;
}

function nearestInScale(midi: number, scaleNotes: number[]): number {
  return scaleNotes.reduce((a, b) =>
    Math.abs(b - midi) < Math.abs(a - midi) ? b : a,
  );
}

/* ============================================================
   Chord helpers
============================================================ */
const CHORD_INTERVALS: Record<string, number[]> = {
  I: [0, 4, 7],
  II: [2, 5, 9],
  III: [4, 7, 11],
  IV: [5, 9, 12],
  V: [7, 11, 14],
  VI: [9, 12, 16],
  VII: [11, 14, 17],
  im: [0, 3, 7],
  ivm: [5, 8, 12],
  vm: [7, 10, 14],
};

function chordMidi(
  numeral: string,
  rootIdx: number,
  mode: "major" | "minor",
  octave = 4,
): number[] {
  const base = rootIdx + (octave + 1) * 12;
  const intervals =
    mode === "minor"
      ? {
          I: [0, 3, 7],
          II: [2, 5, 8],
          III: [3, 7, 10],
          IV: [5, 8, 12],
          V: [7, 11, 14],
          VI: [8, 12, 15],
          VII: [10, 14, 17],
        }
      : CHORD_INTERVALS;
  return (intervals[numeral] ?? [0, 4, 7]).map((i) => base + i);
}

/* ============================================================
   GENRE CONFIGS
============================================================ */
interface GenreConfig {
  defaultTempo: number;
  defaultMode: "major" | "minor";
  defaultTimeSig: TimeSig;
  swing: number;
  progressions: { major: string[][]; minor: string[][] };
  scaleType: "diatonic" | "pentatonic" | "blues";
  rightHandStyle: "melodic" | "pentatonic" | "blues";
  leftHandStyle:
    | "alberti"
    | "power"
    | "oom-pah"
    | "walking"
    | "stride"
    | "block";
  rhythmPattern: number[][];
  dynamicsRange: Dynamic[];
}

const GENRE_CONFIGS: Record<Genre, GenreConfig> = {
  classical: {
    defaultTempo: 120,
    defaultMode: "major",
    defaultTimeSig: "4/4",
    swing: 0,
    progressions: {
      major: [
        ["I", "IV", "V", "I"],
        ["I", "II", "V", "I"],
        ["I", "VI", "IV", "V"],
      ],
      minor: [
        ["Im", "IVm", "V", "Im"],
        ["Im", "VII", "IVm", "V"],
      ],
    },
    scaleType: "diatonic",
    rightHandStyle: "melodic",
    leftHandStyle: "alberti",
    rhythmPattern: [
      [4, 4, 4, 4],
      [4, 2, 2, 4, 4],
      [2, 2, 2, 2, 4, 4],
    ],
    dynamicsRange: ["mp", "mf", "f"],
  },
  rock: {
    defaultTempo: 140,
    defaultMode: "minor",
    defaultTimeSig: "4/4",
    swing: 0,
    progressions: {
      major: [
        ["I", "IV", "V", "IV"],
        ["I", "V", "VI", "IV"],
        ["I", "IV", "I", "V"],
      ],
      minor: [
        ["Im", "VII", "VI", "VII"],
        ["Im", "IVm", "Im", "V"],
        ["Im", "VI", "III", "VII"],
      ],
    },
    scaleType: "pentatonic",
    rightHandStyle: "pentatonic",
    leftHandStyle: "power",
    rhythmPattern: [
      [4, 4, 4, 4],
      [4, 2, 2, 4, 4],
      [4, 4, 2, 2, 4],
    ],
    dynamicsRange: ["mf", "f", "ff"],
  },
  folk: {
    defaultTempo: 108,
    defaultMode: "major",
    defaultTimeSig: "3/4",
    swing: 0,
    progressions: {
      major: [
        ["I", "IV", "I", "V"],
        ["I", "V", "IV", "I"],
        ["I", "II", "V", "I"],
      ],
      minor: [
        ["Im", "VII", "VI", "VII"],
        ["Im", "IVm", "V", "Im"],
      ],
    },
    scaleType: "diatonic",
    rightHandStyle: "melodic",
    leftHandStyle: "oom-pah",
    rhythmPattern: [
      [4, 4, 4],
      [2, 2, 4, 4],
      [4, 2, 2, 2, 2],
    ],
    dynamicsRange: ["p", "mp", "mf"],
  },
  nursery: {
    defaultTempo: 100,
    defaultMode: "major",
    defaultTimeSig: "4/4",
    swing: 0,
    progressions: {
      major: [
        ["I", "V", "I", "V"],
        ["I", "IV", "V", "I"],
        ["I", "I", "V", "I"],
      ],
      minor: [["Im", "V", "Im", "V"]],
    },
    scaleType: "pentatonic",
    rightHandStyle: "pentatonic",
    leftHandStyle: "block",
    rhythmPattern: [
      [4, 4, 4, 4],
      [2, 2, 2, 2, 4, 4],
      [4, 4, 4, 4],
    ],
    dynamicsRange: ["mp", "mf"],
  },
  jazz: {
    defaultTempo: 130,
    defaultMode: "minor",
    defaultTimeSig: "4/4",
    swing: 0.3,
    progressions: {
      major: [
        ["I", "VI", "II", "V"],
        ["I", "IV", "VII", "III"],
        ["II", "V", "I", "VI"],
      ],
      minor: [
        ["Im", "IVm", "VII", "III"],
        ["II", "V", "Im", "V"],
        ["Im", "VI", "II", "V"],
      ],
    },
    scaleType: "blues",
    rightHandStyle: "blues",
    leftHandStyle: "stride",
    rhythmPattern: [
      [4, 2, 2, 4, 4],
      [2, 2, 4, 2, 2, 4],
      [4, 4, 2, 2, 4],
    ],
    dynamicsRange: ["mp", "mf", "f"],
  },
};

/* ============================================================
   RIGHT-HAND BAR BUILDERS
   NOTE: midiToPitch() already produces the correct accidental
   (sharp or flat) based on preferFlats. We store pitches WITH
   their accidentals so playback and Staff rendering are both
   working from the same ground truth. Staff.tsx suppresses
   redundant accidental symbols via isAccidentalInKeySig().
============================================================ */
function buildMelodicBar(
  scaleNotes: number[],
  chordTones: number[],
  targetTicks: number,
  dyn: Dynamic,
  pattern: number[],
  preferFlats = false,
): NoteType[] {
  const notes: NoteType[] = [];
  let lastMidi = scaleNotes[3] ?? 64;
  for (const t of pattern) {
    if (
      notes.reduce((s, n) => s + durationToTicks(n.duration), 0) >= targetTicks
    )
      break;
    const candidates = maybe(0.6) ? chordTones : scaleNotes;
    const target = clamp(
      lastMidi + rnd(7) - 3,
      scaleNotes[0] ?? 52,
      (scaleNotes[0] ?? 52) + 24,
    );
    const midi = nearestInScale(target, candidates);
    lastMidi = midi;
    const isRest = maybe(0.08);
    notes.push({
      // ✅ Store full pitch with accidental — no stripKeyAccidental
      pitch: isRest ? "rest" : midiToPitch(midi, preferFlats),
      duration: ticksToDur(t),
      isRest,
      dynamic: dyn,
    });
  }
  return fitToExactTicks(notes, targetTicks);
}

function buildPentatonicBar(
  rootIdx: number,
  mode: "major" | "minor",
  chordTones: number[],
  targetTicks: number,
  dyn: Dynamic,
  pattern: number[],
  preferFlats = false,
): NoteType[] {
  const pent = mode === "minor" ? PENTATONIC_MINOR : PENTATONIC_MAJOR;
  const scaleNotes = buildScale(rootIdx, pent, [4]);
  // ✅ No key param needed — midiToPitch handles accidentals directly
  return buildMelodicBar(
    scaleNotes,
    chordTones,
    targetTicks,
    dyn,
    pattern,
    preferFlats,
  );
}

function buildBluesBar(
  rootIdx: number,
  chordTones: number[],
  targetTicks: number,
  dyn: Dynamic,
  pattern: number[],
  preferFlats = false,
): NoteType[] {
  const scaleNotes = buildScale(rootIdx, BLUES_SCALE, [4]);
  // ✅ No key param needed — midiToPitch handles accidentals directly
  return buildMelodicBar(
    scaleNotes,
    chordTones,
    targetTicks,
    dyn,
    pattern,
    preferFlats,
  );
}

/* ============================================================
   LEFT-HAND BAR BUILDERS
============================================================ */
function nearestRoot(tones: number[], prev: number): number {
  return tones
    .map((t) => {
      let m = t;
      while (m > 52) m -= 12;
      while (m < 40) m += 12;
      return m;
    })
    .reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
}

function albertiBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const sorted = [...tones].sort((a, b) => a - b);
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 40, 52);
  const t = clamp(sorted[1] ?? r + 4, r + 3, r + 9);
  const f = clamp(sorted[2] ?? r + 7, t + 2, t + 7);
  const pat = [r, f, t, f];
  const repeats = Math.floor(targetTicks / (2 * pat.length));
  const notes: NoteType[] = [];
  for (let i = 0; i < Math.max(1, repeats); i++)
    for (const p of pat)
      notes.push({
        pitch: midiToPitch(p, preferFlats),
        duration: "8",
        dynamic: dyn,
      });
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function powerChordBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 36, 48);
  const fifth = r + 7;
  const beats = targetTicks / 4;
  const notes: NoteType[] = [];
  for (let b = 0; b < beats; b++) {
    if (b % 2 === 0) {
      notes.push({
        pitch: midiToPitch(r, preferFlats),
        duration: "8",
        dynamic: dyn,
      });
      notes.push({
        pitch: midiToPitch(fifth, preferFlats),
        duration: "8",
        dynamic: dyn,
      });
    } else {
      notes.push({ pitch: "rest", duration: "q", isRest: true });
    }
  }
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function oomPahBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const sorted = [...tones].sort((a, b) => a - b);
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 40, 52);
  const chordHi = sorted.map((t) => {
    let m = t;
    while (m < r + 3) m += 12;
    return clamp(m, r + 3, r + 12);
  });
  const beats = targetTicks / 4;
  const notes: NoteType[] = [];
  for (let b = 0; b < beats; b++) {
    if (b === 0)
      notes.push({
        pitch: midiToPitch(r, preferFlats),
        duration: "q",
        dynamic: dyn,
      });
    else
      notes.push({
        pitch: midiToPitch(chordHi[1] ?? r + 4, preferFlats),
        duration: "q",
        dynamic: dyn,
      });
  }
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function walkingBassBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  scaleNotes: number[],
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 36, 48);
  const beats = targetTicks / 4;
  const notes: NoteType[] = [];
  let cur = r;
  for (let b = 0; b < beats; b++) {
    notes.push({
      pitch: midiToPitch(cur, preferFlats),
      duration: "q",
      dynamic: dyn,
    });
    const step = rnd(3) - 1;
    const scaleFiltered = scaleNotes.filter((s) => s >= 36 && s <= 52);
    const next = nearestInScale(
      cur + step * 2,
      scaleFiltered.length > 0 ? scaleFiltered : [cur],
    );
    cur = clamp(next, 36, 52);
  }
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function strideBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const sorted = [...tones].sort((a, b) => a - b);
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 40, 52);
  const chord = sorted.map((t) => {
    let m = t;
    while (m < 55) m += 12;
    return clamp(m, 55, 72);
  });
  const beats = targetTicks / 4;
  const notes: NoteType[] = [];
  for (let b = 0; b < beats; b++) {
    if (b % 2 === 0)
      notes.push({
        pitch: midiToPitch(r, preferFlats),
        duration: "q",
        dynamic: dyn,
      });
    else
      notes.push({
        pitch: midiToPitch(chord[0] ?? r + 7, preferFlats),
        duration: "q",
        dynamic: dyn,
      });
  }
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function blockChordBar(
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  const sorted = [...tones].sort((a, b) => a - b);
  const root = nearestRoot(tones, prev);
  const r = clamp(root, 40, 52);
  const chord = sorted.slice(0, 3).map((t) => {
    let m = t;
    while (m < 48) m += 12;
    return clamp(m, 48, 62);
  });
  const beats = targetTicks / 4;
  const notes: NoteType[] = [];
  for (let b = 0; b < beats; b++) {
    const pitch =
      b % 2 === 0
        ? midiToPitch(r, preferFlats)
        : midiToPitch(chord[0] ?? r + 4, preferFlats);
    notes.push({ pitch, duration: "q", dynamic: dyn });
  }
  return { notes: fitToExactTicks(notes, targetTicks), lastRoot: r };
}

function buildLeftBar(
  style: GenreConfig["leftHandStyle"],
  tones: number[],
  prev: number,
  dyn: Dynamic,
  targetTicks: number,
  scaleNotes: number[],
  preferFlats = false,
): { notes: NoteType[]; lastRoot: number } {
  switch (style) {
    case "alberti":
      return albertiBar(tones, prev, dyn, targetTicks, preferFlats);
    case "power":
      return powerChordBar(tones, prev, dyn, targetTicks, preferFlats);
    case "oom-pah":
      return oomPahBar(tones, prev, dyn, targetTicks, preferFlats);
    case "walking":
      return walkingBassBar(
        tones,
        prev,
        dyn,
        targetTicks,
        scaleNotes,
        preferFlats,
      );
    case "stride":
      return strideBar(tones, prev, dyn, targetTicks, preferFlats);
    case "block":
      return blockChordBar(tones, prev, dyn, targetTicks, preferFlats);
  }
}

/* ============================================================
   MAIN GENERATOR
============================================================ */
export function generateSimpleSong({
  bars = 16,
  key,
  mode,
  seed,
  tempo,
  swing,
  genre = "classical",
  timeSig,
}: GeneratorOptions = {}): GeneratedSong {
  if (seed !== undefined) rand = makePrng(seed);

  const cfg = GENRE_CONFIGS[genre];
  const resolvedTempo = tempo ?? cfg.defaultTempo;
  const resolvedSwing = swing ?? cfg.swing;
  const resolvedTimeSig = timeSig ?? cfg.defaultTimeSig;
  const totalBars = Math.max(4, Math.round(bars / 4) * 4);
  const tpb = barTicks(resolvedTimeSig);

  const resolvedKey =
    key ?? pick(["C", "G", "D", "F", "A", "Bb", "E", "Am", "Em", "Dm"]);

  const inferredMode: "major" | "minor" =
    mode ?? (resolvedKey.match(/m(in)?$/i) ? "minor" : cfg.defaultMode);

  const rootIdx = rootToMidi(resolvedKey);
  const preferFlats = FLAT_KEYS.has(resolvedKey);
  const scaleInts = SCALES[inferredMode];
  const scaleOct4 = buildScale(rootIdx, scaleInts, [4]);
  const scaleOct3 = buildScale(rootIdx, scaleInts, [3]);

  const progPool = cfg.progressions[inferredMode];
  const progressions = Array.from(
    { length: Math.ceil(totalBars / 4) },
    (_, i) => progPool[i % progPool.length],
  );

  const dynamics = cfg.dynamicsRange;

  const rightRaw: NoteType[] = [];
  const leftRaw: NoteType[] = [];
  let prevRoot = rootIdx + 3 * 12 + 7; // ~G3

  for (let blockIdx = 0; blockIdx < progressions.length; blockIdx++) {
    const prog = progressions[blockIdx];
    const dyn = dynamics[clamp(blockIdx, 0, dynamics.length - 1)];
    const patIdx = rnd(cfg.rhythmPattern.length);
    let rawPat = [...cfg.rhythmPattern[patIdx]];

    // Scale pattern to match current time signature's tick count
    const patSum = rawPat.reduce((a, b) => a + b, 0);
    if (patSum !== tpb) {
      const scaleFactor = tpb / patSum;
      rawPat = rawPat.map((t) => Math.max(1, Math.round(t * scaleFactor)));
    }

    for (
      let barInBlock = 0;
      barInBlock < Math.min(4, prog.length);
      barInBlock++
    ) {
      const numeral = prog[barInBlock % prog.length];
      const chordTones = chordMidi(numeral, rootIdx, inferredMode, 4);

      // Right hand — no key param needed, pitches stored with full accidentals
      let rightBar: NoteType[];
      switch (cfg.rightHandStyle) {
        case "pentatonic":
          rightBar = buildPentatonicBar(
            rootIdx,
            inferredMode,
            chordTones,
            tpb,
            dyn,
            rawPat,
            preferFlats,
          );
          break;
        case "blues":
          rightBar = buildBluesBar(
            rootIdx,
            chordTones,
            tpb,
            dyn,
            rawPat,
            preferFlats,
          );
          break;
        default:
          rightBar = buildMelodicBar(
            scaleOct4,
            chordTones,
            tpb,
            dyn,
            rawPat,
            preferFlats,
          );
      }
      rightRaw.push(...rightBar);

      // Left hand — already stored with full accidentals, unchanged
      const lhResult = buildLeftBar(
        cfg.leftHandStyle,
        chordTones,
        prevRoot,
        dyn,
        tpb,
        scaleOct3,
        preferFlats,
      );
      leftRaw.push(...lhResult.notes);
      prevRoot = lhResult.lastRoot;
    }
  }

  function applySwing(notes: NoteType[], swingAmt: number): NoteType[] {
    if (!swingAmt) return notes;
    return notes.map((n, i) => {
      if (n.isRest) return n;
      return { ...n, swingOffset: i % 2 === 1 ? swingAmt : 0 };
    });
  }

  return {
    right: applySwing(rightRaw, resolvedSwing),
    left: applySwing(leftRaw, resolvedSwing),
    bars: totalBars,
    key: resolvedKey,
    mode: inferredMode,
    tempo: resolvedTempo,
    swing: resolvedSwing,
    genre,
    timeSig: resolvedTimeSig,
  };
}
