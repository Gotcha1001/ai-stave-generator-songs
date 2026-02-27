// export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

// export type NoteType = {
//   pitch: string;
//   duration: string;
//   isRest?: boolean;
//   dynamic?: Dynamic;
//   tie?: boolean;
//   swingOffset?: number;
// };

// export interface GeneratorOptions {
//   bars?: number;
//   key?: string;
//   mode?: "major" | "minor";
//   seed?: number;
//   tempo?: number;
//   swing?: number;
// }

// export interface GeneratedSong {
//   right: NoteType[];
//   left: NoteType[];
//   bars: number;
//   key: string;
//   mode: "major" | "minor";
//   tempo: number;
//   swing: number;
// }

// /* ============================================================
//    TICK SYSTEM  (replaces all float beat arithmetic)
//    1 quarter note = TICKS_PER_BEAT ticks
//    1 bar          = TICKS_PER_BAR  ticks
//    All arithmetic is integer — no float drift possible.
// ============================================================ */

// const TICKS_PER_BEAT = 4; // 16th = 1, 8th = 2, q = 4, h = 8, w = 16
// const TICKS_PER_BAR = TICKS_PER_BEAT * 4; // 16

// const DUR_TO_TICKS: Record<string, number> = {
//   w: 16,
//   h: 8,
//   q: 4,
//   "8": 2,
//   "16": 1,
// };

// /** Ordered from longest to shortest — used for greedy fill */
// const ORDERED_DURS: string[] = ["w", "h", "q", "8", "16"];

// function ticksToDur(ticks: number): string {
//   return ORDERED_DURS.find((d) => DUR_TO_TICKS[d] <= ticks) ?? "16";
// }

// /** Trim / pad a note array to EXACTLY targetTicks. */
// function fitToExactTicks(
//   notes: NoteType[],
//   targetTicks: number,
//   dyn: Dynamic = "mf",
// ): NoteType[] {
//   const result: NoteType[] = [];
//   let total = 0;

//   for (const note of notes) {
//     if (total >= targetTicks) break;
//     const t = DUR_TO_TICKS[note.duration] ?? TICKS_PER_BEAT;
//     const remaining = targetTicks - total;

//     if (t <= remaining) {
//       result.push(note);
//       total += t;
//     } else if (remaining >= 1) {
//       // Trim note to fit remaining ticks
//       const fitDur = ticksToDur(remaining);
//       result.push({ ...note, duration: fitDur });
//       total += DUR_TO_TICKS[fitDur];
//     }
//   }

//   // Pad any shortfall with rests
//   while (total < targetTicks) {
//     const rem = targetTicks - total;
//     const dur = ticksToDur(rem);
//     result.push({ pitch: "rest", duration: dur, isRest: true, dynamic: dyn });
//     total += DUR_TO_TICKS[dur];
//   }

//   return result;
// }

// function fitBarExactly(notes: NoteType[], dyn: Dynamic = "mf"): NoteType[] {
//   return fitToExactTicks(notes, TICKS_PER_BAR, dyn);
// }

// function fitPhraseExactly(
//   notes: NoteType[],
//   bars: number,
//   dyn: Dynamic = "mf",
// ): NoteType[] {
//   return fitToExactTicks(notes, bars * TICKS_PER_BAR, dyn);
// }

// /* ============================================================
//    RANDOM
// ============================================================ */

// function makePrng(seed: number): () => number {
//   let s = seed >>> 0;
//   return (): number => {
//     s += 0x6d2b79f5;
//     let t = Math.imul(s ^ (s >>> 15), 1 | s);
//     t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
//     return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
//   };
// }

// let rand: () => number = Math.random;
// const rnd = (n: number) => Math.floor(rand() * n);
// const pick = <T>(arr: readonly T[]): T => arr[rnd(arr.length)];
// const clamp = (v: number, lo: number, hi: number) =>
//   Math.max(lo, Math.min(hi, v));

// /* ============================================================
//    THEORY CORE
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

// const SCALES: Record<string, number[]> = {
//   major: [0, 2, 4, 5, 7, 9, 11],
//   minor: [0, 2, 3, 5, 7, 8, 10],
// };

// const CHORD_DEGREES: Record<string, Record<string, number[]>> = {
//   major: {
//     I: [0, 2, 4],
//     II: [1, 3, 5],
//     III: [2, 4, 6],
//     IV: [3, 5, 0],
//     V: [4, 6, 1],
//     VI: [5, 0, 2],
//   },
//   minor: {
//     I: [0, 2, 4],
//     II: [1, 3, 5],
//     III: [2, 4, 6],
//     IV: [3, 5, 0],
//     V: [4, 6, 1],
//     VI: [5, 0, 2],
//     VII: [6, 1, 3],
//   },
// };

// const HARMONY_GRAPH: Record<string, Record<string, string[]>> = {
//   major: {
//     I: ["IV", "V", "VI", "II"],
//     II: ["V", "IV"],
//     III: ["VI", "IV"],
//     IV: ["V", "II", "I"],
//     V: ["I", "VI"],
//     VI: ["II", "IV"],
//   },
//   minor: {
//     I: ["IV", "V", "VII", "VI"],
//     II: ["V"],
//     III: ["VI", "VII"],
//     IV: ["V", "I"],
//     V: ["I", "VI"],
//     VI: ["II", "IV"],
//     VII: ["I", "V"],
//   },
// };

// const SECTION_PROGRESSIONS: Record<string, Record<string, string[]>> = {
//   major: {
//     A: ["I", "IV", "V", "I"],
//     B: ["VI", "II", "V", "I"],
//     Ap: ["I", "V", "VI", "IV"],
//     Coda: ["IV", "V", "V", "I"],
//   },
//   minor: {
//     A: ["I", "VII", "IV", "V"],
//     B: ["VI", "VII", "I", "V"],
//     Ap: ["I", "IV", "VII", "I"],
//     Coda: ["IV", "V", "V", "I"],
//   },
// };

// const SECTION_DYNAMICS: Dynamic[][] = [
//   ["mp", "mf"],
//   ["mf", "f"],
//   ["mp", "mf"],
//   ["p", "mp"],
// ];

// function rootToMidi(key: string): number {
//   const enhar: Record<string, string> = {
//     Db: "C#",
//     Eb: "D#",
//     Fb: "E",
//     Gb: "F#",
//     Ab: "G#",
//     Bb: "A#",
//     Cb: "B",
//   };
//   const bare = key.replace(/m(in)?$/i, "");
//   const note = enhar[bare] ?? bare;
//   const idx = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]);
//   return idx === -1 ? 0 : idx;
// }

// function buildScale(
//   rootIdx: number,
//   intervals: number[],
//   octaves: number[],
// ): number[] {
//   const notes: number[] = [];
//   for (const oct of octaves)
//     for (const iv of intervals) notes.push((oct + 1) * 12 + rootIdx + iv);
//   return notes.sort((a, b) => a - b);
// }

// function chordMidi(
//   numeral: string,
//   rootIdx: number,
//   mode: "major" | "minor",
//   octave: number,
// ): number[] {
//   const degrees = CHORD_DEGREES[mode][numeral] ?? CHORD_DEGREES[mode]["I"];
//   const intervals = SCALES[mode];
//   return degrees.map((d) => (octave + 1) * 12 + rootIdx + intervals[d % 7]);
// }

// function walkHarmonyGraph(
//   start: string,
//   length: number,
//   mode: "major" | "minor",
// ): string[] {
//   const graph = HARMONY_GRAPH[mode];
//   const result = [start];
//   let current = start;
//   for (let i = 1; i < length; i++) {
//     const options = graph[current] ?? ["I"];
//     current = pick(options);
//     result.push(current);
//   }
//   return result;
// }

// function midiToPitch(midi: number): string {
//   const oct = Math.floor(midi / 12) - 1;
//   return `${CHROMATIC[midi % 12]}${clamp(oct, 2, 6)}`;
// }

// /* ============================================================
//    MOTIF POOL
// ============================================================ */

// type MotifNote = { deg: number; dur: string };
// type Motif = MotifNote[];

// const MOTIF_POOL: { tags: string[]; motif: Motif }[] = [
//   {
//     tags: ["stable", "stepwise", "A"],
//     motif: [
//       { deg: 0, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//   },
//   {
//     tags: ["stable", "A", "tonic"],
//     motif: [
//       { deg: 0, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 4, dur: "h" },
//       { deg: 2, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//   },
//   {
//     tags: ["leap", "contrast", "B"],
//     motif: [
//       { deg: 4, dur: "q" },
//       { deg: 4, dur: "8" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "h" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//   },
//   {
//     tags: ["arch", "syncopated", "B"],
//     motif: [
//       { deg: 0, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 4, dur: "q" },
//       { deg: 3, dur: "h" },
//       { deg: 2, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//   },
//   {
//     tags: ["descending", "Coda", "Ap"],
//     motif: [
//       { deg: 6, dur: "q" },
//       { deg: 5, dur: "q" },
//       { deg: 4, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//   },
//   {
//     tags: ["arpeggio", "leap", "B"],
//     motif: [
//       { deg: 0, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 4, dur: "8" },
//       { deg: 6, dur: "8" },
//       { deg: 5, dur: "h" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//   },
//   {
//     tags: ["short-short-long", "A"],
//     motif: [
//       { deg: 2, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 0, dur: "8" },
//       { deg: 1, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//   },
//   {
//     tags: ["neighbour", "Ap"],
//     motif: [
//       { deg: 2, dur: "q" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 1, dur: "h" },
//       { deg: 0, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//   },
//   {
//     tags: ["call-response", "A", "stable"],
//     motif: [
//       { deg: 4, dur: "q" },
//       { deg: 5, dur: "q" },
//       { deg: 4, dur: "8" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//       { deg: 2, dur: "h" },
//     ],
//   },
//   {
//     tags: ["Coda", "descending", "stable"],
//     motif: [
//       { deg: 4, dur: "q" },
//       { deg: 3, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 0, dur: "h" },
//       { deg: 0, dur: "h" },
//     ],
//   },
// ];

// function generateSeedMotifForSection(
//   section: "A" | "B" | "Ap" | "Coda",
// ): Motif {
//   const scored = MOTIF_POOL.map((e) => ({
//     e,
//     score: e.tags.includes(section) ? 2 : e.tags.includes("stable") ? 1 : 0,
//   }));
//   const best = Math.max(...scored.map((s) => s.score));
//   return pick(scored.filter((s) => s.score === best).map((s) => s.e.motif));
// }

// /* ============================================================
//    REALISE  (tick-based)
//    phraseTicks replaces phraseBars * BEATS_PER_BAR float arithmetic
// ============================================================ */

// function realise(
//   motif: Motif,
//   scale: number[],
//   chordToneMap: number[][],
//   minMidi: number,
//   maxMidi: number,
//   isClimax: boolean,
//   prevMidi: number,
//   prevDeg: number,
//   dynamic: Dynamic,
//   phraseBars: number,
// ): { notes: NoteType[]; lastMidi: number; lastDeg: number } {
//   const notes: NoteType[] = [];
//   const totalTicks = phraseBars * TICKS_PER_BAR; // integer, exact
//   let ticks = 0;
//   let last = prevMidi;
//   let lastDeg = prevDeg;
//   let prevLeap = 0;

//   for (let mi = 0; mi < motif.length; mi++) {
//     if (ticks >= totalTicks) break;
//     const m = motif[mi];
//     const isLastNote = mi === motif.length - 1;
//     const t = DUR_TO_TICKS[m.dur] ?? TICKS_PER_BEAT;

//     // Bar/beat position for chord-tone snapping (tick-exact)
//     const barIndex = clamp(
//       Math.floor(ticks / TICKS_PER_BAR),
//       0,
//       chordToneMap.length - 1,
//     );
//     const tickInBar = ticks % TICKS_PER_BAR;
//     const isStrongBeat = tickInBar === 0 || tickInBar === TICKS_PER_BAR / 2;

//     let deg = m.deg;
//     if (lastDeg === 6 && rand() < 0.95) deg = 0;
//     else if (lastDeg === 3 && rand() < 0.7) deg = 2;
//     deg = clamp(deg, 0, 6);
//     const baseMidi = scale[deg]; // scale[] is built at octave 4

//     // ── Nearest-neighbour voice leading ──────────────────────────────────────
//     // Enumerate this pitch class at octaves 3, 4, 5 and pick whichever is
//     // closest to the previous note, staying strictly inside [minMidi, maxMidi].
//     // This replaces the old probabilistic octave-shift which could jump registers.
//     const pitchClass = baseMidi % 12;
//     const octaveCandidates = [-12, 0, 12]
//       .map((s) => baseMidi + s)
//       .filter((c) => c >= minMidi && c <= maxMidi);
//     let midi =
//       octaveCandidates.length > 0
//         ? octaveCandidates.reduce(
//             (best, c) =>
//               Math.abs(c - last) < Math.abs(best - last) ? c : best,
//             octaveCandidates[0],
//           )
//         : clamp(baseMidi, minMidi, maxMidi);

//     // On strong beats, nudge to nearest chord tone ONLY if same pitch class
//     // and within a semitone — avoids cross-register jumps.
//     if (isStrongBeat) {
//       const ctones = chordToneMap[barIndex];
//       const chordCandidates = ctones
//         .flatMap((c) => [-12, 0, 12].map((s) => c + s))
//         .filter((c) => c >= minMidi && c <= maxMidi);
//       if (chordCandidates.length > 0) {
//         const nearestChord = chordCandidates.reduce(
//           (best, c) => (Math.abs(c - last) < Math.abs(best - last) ? c : best),
//           chordCandidates[0],
//         );
//         if (
//           nearestChord % 12 === pitchClass &&
//           Math.abs(nearestChord - midi) <= 1
//         ) {
//           midi = nearestChord;
//         }
//       }
//     }

//     midi = clamp(midi, minMidi, maxMidi);
//     prevLeap = Math.abs(midi - last);

//     // Occasional expressive rest — pushed INSTEAD of the note this iteration.
//     // We use `continue` so the note is NOT also pushed in the same iteration,
//     // which was the root cause of same-tick stacking.
//     // Only fire when there is strictly more room than the rest itself needs.
//     if (
//       !isStrongBeat &&
//       !isLastNote &&
//       rand() < 0.07 &&
//       totalTicks - ticks > 2 * TICKS_PER_BEAT
//     ) {
//       notes.push({ pitch: "rest", duration: "q", isRest: true, dynamic });
//       ticks += TICKS_PER_BEAT;
//       // Do NOT push the note this iteration — loop will revisit this motif note
//       // next iteration via mi staying... but we can't do that with a for loop,
//       // so instead we just skip the note (rest replaces it). This is intentional:
//       // the expressive rest IS the musical event for this slot.
//       continue;
//     }

//     // Compute dur AFTER any rest decision so remaining is accurate.
//     // No last-note extension — that logic caused tick overflow beyond totalTicks.
//     const remaining = totalTicks - ticks;
//     if (remaining <= 0) break;
//     const actualTicks = Math.min(t, remaining);
//     const dur = ticksToDur(actualTicks);

//     last = midi;
//     lastDeg = deg;
//     ticks += DUR_TO_TICKS[dur] ?? TICKS_PER_BEAT;
//     notes.push({ pitch: midiToPitch(midi), duration: dur, dynamic });
//   }

//   // Optional tie on last real note
//   const lastIdx = notes.reduce<number>((f, n, i) => (!n.isRest ? i : f), -1);
//   if (lastIdx >= 0 && rand() < 0.15)
//     notes[lastIdx] = { ...notes[lastIdx], tie: true };

//   // Pad remainder with rests
//   let usedTicks = notes.reduce(
//     (s, n) => s + (DUR_TO_TICKS[n.duration] ?? TICKS_PER_BEAT),
//     0,
//   );
//   while (usedTicks < totalTicks) {
//     const rem = totalTicks - usedTicks;
//     const dur = ticksToDur(rem);
//     notes.push({ pitch: "rest", duration: dur, isRest: true, dynamic });
//     usedTicks += DUR_TO_TICKS[dur];
//   }

//   return { notes, lastMidi: last, lastDeg };
// }

// /* ============================================================
//    CADENCES  (tick-based)
// ============================================================ */

// function perfectCadence(
//   scale: number[],
//   tonicC: number[],
//   dominantC: number[],
//   prevMidi: number,
//   dyn: Dynamic,
// ): NoteType[] {
//   const dSorted = [...dominantC].sort((a, b) => a - b);
//   const tCands = [...tonicC]
//     .sort((a, b) => a - b)
//     .flatMap((t) => [-12, 0, 12].map((s) => t + s))
//     .filter((m) => m >= 48 && m <= 84);
//   const fifth = dSorted[0];
//   const leading = scale[6];
//   const tonic = tCands.reduce(
//     (best, c) =>
//       Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
//     tCands[0] ?? scale[0],
//   );
//   return [
//     { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "q", dynamic: dyn },
//     { pitch: midiToPitch(clamp(leading, 52, 79)), duration: "q", dynamic: dyn },
//     {
//       pitch: midiToPitch(clamp(fifth + 2, 52, 79)),
//       duration: "q",
//       dynamic: dyn,
//     },
//     { pitch: midiToPitch(clamp(leading, 52, 79)), duration: "q", dynamic: dyn },
//     { pitch: midiToPitch(clamp(tonic, 52, 79)), duration: "w", dynamic: "p" },
//   ];
// }

// function halfCadence(
//   scale: number[],
//   dominantC: number[],
//   dyn: Dynamic,
// ): NoteType[] {
//   const dSorted = [...dominantC].sort((a, b) => a - b);
//   const fifth = dSorted[0];
//   const third = dSorted[1] ?? fifth + 4;
//   return [
//     {
//       pitch: midiToPitch(clamp(scale[0], 52, 76)),
//       duration: "q",
//       dynamic: dyn,
//     },
//     {
//       pitch: midiToPitch(clamp(scale[6], 52, 79)),
//       duration: "q",
//       dynamic: dyn,
//     },
//     { pitch: midiToPitch(clamp(third, 52, 79)), duration: "h", dynamic: dyn },
//     { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "w", dynamic: dyn },
//   ];
// }

// function deceptiveCadence(
//   scale: number[],
//   submedC: number[],
//   dominantC: number[],
//   prevMidi: number,
//   dyn: Dynamic,
// ): NoteType[] {
//   const dSorted = [...dominantC].sort((a, b) => a - b);
//   const smSorted = [...submedC].sort((a, b) => a - b);
//   const fifth = dSorted[0];
//   const landing = smSorted
//     .flatMap((t) => [-12, 0, 12].map((s) => t + s))
//     .filter((m) => m >= 48 && m <= 84)
//     .reduce(
//       (best, c) =>
//         Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
//       smSorted[0] ?? scale[5],
//     );
//   return [
//     { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "q", dynamic: dyn },
//     {
//       pitch: midiToPitch(clamp(scale[6], 52, 79)),
//       duration: "q",
//       dynamic: dyn,
//     },
//     {
//       pitch: midiToPitch(clamp(smSorted[0], 52, 79)),
//       duration: "h",
//       dynamic: dyn,
//     },
//     {
//       pitch: midiToPitch(clamp(landing, 52, 79)),
//       duration: "w",
//       dynamic: "mp",
//     },
//   ];
// }

// function plagalCadence(
//   scale: number[],
//   tonicC: number[],
//   subdomC: number[],
//   prevMidi: number,
//   dyn: Dynamic,
// ): NoteType[] {
//   const tCands = [...tonicC]
//     .sort((a, b) => a - b)
//     .flatMap((t) => [-12, 0, 12].map((s) => t + s))
//     .filter((m) => m >= 48 && m <= 84);
//   const fourth = [...subdomC].sort((a, b) => a - b)[0];
//   const tonic = tCands.reduce(
//     (best, c) =>
//       Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
//     tCands[0] ?? scale[0],
//   );
//   return [
//     { pitch: midiToPitch(clamp(fourth, 52, 76)), duration: "h", dynamic: dyn },
//     {
//       pitch: midiToPitch(clamp(scale[3], 52, 79)),
//       duration: "h",
//       dynamic: dyn,
//     },
//     { pitch: midiToPitch(clamp(tonic, 52, 79)), duration: "w", dynamic: "p" },
//   ];
// }

// function cadenceForSection(
//   section: "A" | "B" | "Ap" | "Coda",
//   scale: number[],
//   rootIdx: number,
//   mode: "major" | "minor",
//   prevMidi: number,
//   dyn: Dynamic,
// ): NoteType[] {
//   const tonicC = chordMidi("I", rootIdx, mode, 4);
//   const domC = chordMidi("V", rootIdx, mode, 4);
//   const subdomC = chordMidi("IV", rootIdx, mode, 4);
//   const submedC = chordMidi("VI", rootIdx, mode, 4);

//   let raw: NoteType[];
//   switch (section) {
//     case "Coda":
//     case "Ap":
//       raw = perfectCadence(scale, tonicC, domC, prevMidi, dyn);
//       break;
//     case "B":
//       raw =
//         rand() < 0.6
//           ? halfCadence(scale, domC, dyn)
//           : deceptiveCadence(scale, submedC, domC, prevMidi, dyn);
//       break;
//     default:
//       raw =
//         rand() < 0.7
//           ? perfectCadence(scale, tonicC, domC, prevMidi, dyn)
//           : plagalCadence(scale, tonicC, subdomC, prevMidi, dyn);
//   }
//   // Cadence spans 2 bars — fit to exactly 2 * TICKS_PER_BAR ticks
//   return fitPhraseExactly(raw, 2, dyn);
// }

// /* ============================================================
//    LEFT HAND  (tick-based bar generation)
//    Every helper returns exactly TICKS_PER_BAR ticks.
// ============================================================ */

// function nearestRoot(
//   tones: number[],
//   prevRoot: number,
//   lo = 40,
//   hi = 55,
// ): number {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const candidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= lo && m <= hi);
//   if (!candidates.length) return clamp(prevRoot, lo, hi);
//   return candidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     candidates[0],
//   );
// }

// function albertiBassBar(
//   tones: number[],
//   prevRoot: number,
//   variety = false,
//   dyn: Dynamic = "mf",
// ): { notes: NoteType[]; lastRoot: number } {
//   const root = nearestRoot(tones, prevRoot);
//   const sorted = [...tones].sort((a, b) => a - b);
//   const r = clamp(root, 40, 52);
//   const t = clamp(sorted[1] ?? root + 4, r + 3, r + 9);
//   const f = clamp(sorted[2] ?? root + 7, t + 2, t + 7);
//   const pat = variety && rand() < 0.3 ? [r, t, f, t] : [r, f, t, f];
//   // 4 quarter notes = 4 * 4 = 16 ticks exactly
//   return {
//     notes: pat.map((m) => ({
//       pitch: midiToPitch(m),
//       duration: "q",
//       dynamic: dyn,
//     })),
//     lastRoot: r,
//   };
// }

// function blockChordBar(
//   tones: number[],
//   prevRoot: number,
//   dyn: Dynamic = "mf",
// ): { notes: NoteType[]; lastRoot: number } {
//   const root = nearestRoot(tones, prevRoot, 40, 52);
//   const sorted = [...tones].sort((a, b) => a - b);
//   const r = clamp(root, 40, 52);
//   const third = clamp(sorted[1] ?? root + 4, r + 3, r + 8);
//   // h + h = 8 + 8 = 16 ticks exactly
//   return {
//     notes: [
//       { pitch: midiToPitch(r), duration: "h", dynamic: dyn },
//       { pitch: midiToPitch(third), duration: "h", dynamic: dyn },
//     ],
//     lastRoot: r,
//   };
// }

// function brokenChordBar(
//   tones: number[],
//   prevRoot: number,
//   dyn: Dynamic = "mf",
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const r = clamp(sorted[0] ?? 48, 40, 50);
//   const t = clamp(sorted[1] ?? r + 4, r + 3, r + 7);
//   const f = clamp(sorted[2] ?? r + 7, t + 2, t + 6);
//   const oct = clamp(r + 12, f + 1, 64);
//   // 4 quarter notes = 16 ticks exactly
//   return {
//     notes: [
//       { pitch: midiToPitch(r), duration: "q", dynamic: dyn },
//       { pitch: midiToPitch(t), duration: "q", dynamic: dyn },
//       { pitch: midiToPitch(f), duration: "q", dynamic: dyn },
//       { pitch: midiToPitch(oct), duration: "q", dynamic: dyn },
//     ],
//     lastRoot: r,
//   };
// }

// function walkingBassBar(
//   tones: number[],
//   nextTones: number[],
//   scaleBass: number[],
//   prevRoot: number,
//   dyn: Dynamic = "mf",
// ): { notes: NoteType[]; lastRoot: number } {
//   const root = nearestRoot(tones, prevRoot, 40, 55);
//   const nextRoot = clamp([...nextTones].sort((a, b) => a - b)[0], 40, 55);
//   const dir = nextRoot >= root ? 1 : -1;
//   let cursor = root;
//   const walk = [root];

//   for (let step = 0; step < 3; step++) {
//     const opts = scaleBass
//       .filter((m) =>
//         dir > 0
//           ? m > cursor && m <= nextRoot + 2
//           : m < cursor && m >= nextRoot - 2,
//       )
//       .sort((a, b) => (dir > 0 ? a - b : b - a));
//     if (opts[0] !== undefined) {
//       cursor = opts[0];
//     } else {
//       const candidates = [cursor + dir, cursor + dir * 2, cursor - dir]
//         .map((c) => clamp(c, 38, 58))
//         .filter((c) => c !== cursor);
//       cursor = candidates[0] ?? clamp(cursor + 1, 38, 58);
//     }
//     walk.push(clamp(cursor, 38, 58));
//   }

//   while (walk.length < 4)
//     walk.push(clamp((walk[walk.length - 1] ?? root) + 1, 38, 58));

//   // Dedup adjacent same-pitch
//   for (let i = 1; i < walk.length; i++) {
//     if (walk[i] === walk[i - 1])
//       walk[i] = clamp(walk[i] + (walk[i] < 56 ? 1 : -1), 38, 58);
//   }

//   // 4 quarter notes = 16 ticks exactly
//   return {
//     notes: walk.slice(0, 4).map((m) => ({
//       pitch: midiToPitch(clamp(m, 38, 58)),
//       duration: "q",
//       dynamic: dyn,
//     })),
//     lastRoot: root,
//   };
// }

// function pedalPointBar(
//   tones: number[],
//   prevRoot: number,
//   dyn: Dynamic = "p",
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const r = clamp(sorted[0] ?? 48, 40, 50);
//   const fifth = clamp(sorted[2] ?? r + 7, r + 5, r + 10);
//   // h + h = 16 ticks exactly
//   return {
//     notes: [
//       { pitch: midiToPitch(r), duration: "h", dynamic: dyn },
//       { pitch: midiToPitch(fifth), duration: "h", dynamic: dyn },
//     ],
//     lastRoot: r,
//   };
// }

// type LHPattern = "alberti" | "block" | "broken" | "walking" | "pedal";

// function pickLHPattern(section: "A" | "B" | "Ap" | "Coda"): LHPattern {
//   const profiles: Record<string, number[]> = {
//     A: [5, 2, 1, 1, 0],
//     B: [1, 3, 4, 1, 0],
//     Ap: [1, 1, 2, 5, 0],
//     Coda: [0, 2, 0, 1, 5],
//   };
//   const weights = profiles[section];
//   const patterns: LHPattern[] = [
//     "alberti",
//     "block",
//     "broken",
//     "walking",
//     "pedal",
//   ];
//   const totalW = weights.reduce((a, b) => a + b, 0);
//   let r = rand() * totalW;
//   for (let i = 0; i < patterns.length; i++) {
//     r -= weights[i];
//     if (r <= 0) return patterns[i];
//   }
//   return patterns[0];
// }

// /**
//  * Safety net: ensure a bar array is EXACTLY TICKS_PER_BAR ticks,
//  * and that no two adjacent non-rest notes share a pitch.
//  */
// function assertExactlyOneBar(notes: NoteType[], label: string): NoteType[] {
//   // Step 1: fix tick count
//   const total = notes.reduce(
//     (s, n) => s + (DUR_TO_TICKS[n.duration] ?? TICKS_PER_BEAT),
//     0,
//   );
//   let result = notes;
//   if (total !== TICKS_PER_BAR) {
//     console.error(
//       `LH bar "${label}" has ${total} ticks instead of ${TICKS_PER_BAR} — forcing fit`,
//     );
//     result = fitBarExactly(notes);
//   }

//   // Step 2: fix adjacent duplicate pitches
//   result = result.map((note, i) => {
//     if (note.isRest || i === 0) return note;
//     const prev = result[i - 1];
//     if (!prev.isRest && note.pitch === prev.pitch) {
//       const m = note.pitch.match(/^([A-G]#?)(\d)$/);
//       if (m) {
//         const noteIdx = CHROMATIC.indexOf(m[1] as (typeof CHROMATIC)[number]);
//         const oct = parseInt(m[2]);
//         if (noteIdx !== -1) {
//           const midi = (oct + 1) * 12 + noteIdx;
//           const nudged = midi < 56 ? midi + 1 : midi - 1;
//           const newOct = Math.floor(nudged / 12) - 1;
//           const newNote = CHROMATIC[nudged % 12];
//           return { ...note, pitch: `${newNote}${newOct}` };
//         }
//       }
//     }
//     return note;
//   });

//   return result;
// }

// /* ============================================================
//    SWING  (unchanged — operates on note objects, not tick counts)
// ============================================================ */

// function applySwing(notes: NoteType[], ratio: number): NoteType[] {
//   if (ratio === 0) return notes;
//   const shift = ratio * 0.5 * (2 / 3);
//   let prevWas8th = false;
//   return notes.map((note) => {
//     if (note.duration === "8" && !note.isRest) {
//       const isOff = prevWas8th;
//       prevWas8th = !isOff;
//       if (isOff) return { ...note, swingOffset: shift };
//     } else {
//       prevWas8th = false;
//     }
//     return note;
//   });
// }

// /* ============================================================
//    MAIN EXPORT
// ============================================================ */

// export function generateSimpleSong({
//   bars = 16,
//   key = pick(["C", "G", "D", "F", "A", "Bb", "E", "Am", "Em", "Dm"]),
//   mode,
//   seed,
//   tempo = 120,
//   swing = 0,
// }: GeneratorOptions = {}): GeneratedSong {
//   rand = seed !== undefined ? makePrng(seed) : Math.random;

//   const totalBars = Math.max(4, Math.round(bars / 4) * 4);
//   const inferredMode: "major" | "minor" =
//     mode ?? (/m(in)?$/i.test(key) ? "minor" : rand() < 0.4 ? "minor" : "major");

//   const rootIdx = rootToMidi(key);
//   const intervals = SCALES[inferredMode];
//   const scaleOct4 = buildScale(rootIdx, intervals, [4]).slice(0, 7);
//   const scaleBass = buildScale(rootIdx, intervals, [3]);

//   type SectionId = "A" | "B" | "Ap" | "Coda";
//   const numBlocks = totalBars / 4;
//   const rotator: SectionId[] = ["A", "B", "Ap"];
//   const sectionPlan: SectionId[] = Array.from({ length: numBlocks }, (_, i) =>
//     i === numBlocks - 1 ? "Coda" : rotator[i % 3],
//   );

//   const sectionProg = (id: SectionId): string[] =>
//     id === "B"
//       ? walkHarmonyGraph("VI", 4, inferredMode)
//       : SECTION_PROGRESSIONS[inferredMode][id];

//   const sectionChordTones = (prog: string[], octave = 4): number[][] =>
//     prog.map((n) => chordMidi(n, rootIdx, inferredMode, octave));

//   /* ─── Right hand ───────────────────────────────────────────── */
//   const rightRaw: NoteType[] = [];
//   let lastMidi = 64;
//   let lastDeg = 0;

//   for (let blockIdx = 0; blockIdx < sectionPlan.length; blockIdx++) {
//     const id = sectionPlan[blockIdx];
//     const prog = sectionProg(id);
//     const isClimax = id === "B";
//     const dynPair =
//       SECTION_DYNAMICS[Math.min(blockIdx, SECTION_DYNAMICS.length - 1)];
//     const chords = sectionChordTones(prog, isClimax ? 5 : 4);
//     const [minM, maxM] = isClimax ? [57, 84] : [52, 79];

//     const seedMotif = generateSeedMotifForSection(id);
//     const ct1 = [chords[0 % chords.length], chords[1 % chords.length]];
//     const r1 = realise(
//       seedMotif,
//       scaleOct4,
//       ct1,
//       minM,
//       maxM,
//       isClimax,
//       lastMidi,
//       lastDeg,
//       dynPair[0],
//       2,
//     );
//     rightRaw.push(...fitPhraseExactly(r1.notes, 2, dynPair[0]));
//     lastMidi = r1.lastMidi;
//     lastDeg = r1.lastDeg;

//     const cadNotes = cadenceForSection(
//       id,
//       scaleOct4,
//       rootIdx,
//       inferredMode,
//       lastMidi,
//       dynPair[1],
//     );
//     rightRaw.push(...cadNotes);
//     lastMidi = 64;
//   }

//   /* ─── Left hand ────────────────────────────────────────────── */
//   const leftRaw: NoteType[] = [];
//   let prevRoot = rootIdx + 12 * 3 + 12;

//   for (let blockIdx = 0; blockIdx < sectionPlan.length; blockIdx++) {
//     const id = sectionPlan[blockIdx];
//     const prog = sectionProg(id);
//     const dynPair =
//       SECTION_DYNAMICS[Math.min(blockIdx, SECTION_DYNAMICS.length - 1)];

//     for (let barInBlock = 0; barInBlock < 4; barInBlock++) {
//       const numeral = prog[barInBlock % prog.length];
//       const nextNumer = prog[(barInBlock + 1) % prog.length];
//       const tones = chordMidi(numeral, rootIdx, inferredMode, 3);
//       const nextTones = chordMidi(nextNumer, rootIdx, inferredMode, 3);
//       const dyn = dynPair[barInBlock < 2 ? 0 : 1];
//       const isTonicDownbeat =
//         numeral === "I" && barInBlock === 0 && (id === "A" || id === "Coda");

//       let result: { notes: NoteType[]; lastRoot: number };

//       if (isTonicDownbeat) {
//         const root = nearestRoot(tones, prevRoot, 40, 52);
//         // h + h = 16 ticks exactly
//         result = {
//           notes: [
//             {
//               pitch: midiToPitch(clamp(root, 40, 52)),
//               duration: "h",
//               dynamic: dyn,
//             },
//             {
//               pitch: midiToPitch(clamp(root + 12, 52, 64)),
//               duration: "h",
//               dynamic: dyn,
//             },
//           ],
//           lastRoot: root,
//         };
//       } else {
//         const pattern = pickLHPattern(id);
//         switch (pattern) {
//           case "alberti":
//             result = albertiBassBar(tones, prevRoot, true, dyn);
//             break;
//           case "block":
//             result = blockChordBar(tones, prevRoot, dyn);
//             break;
//           case "broken":
//             result = brokenChordBar(tones, prevRoot, dyn);
//             break;
//           case "walking":
//             result = walkingBassBar(tones, nextTones, scaleBass, prevRoot, dyn);
//             break;
//           case "pedal":
//             result = pedalPointBar(tones, prevRoot, dyn);
//             break;
//           default:
//             result = albertiBassBar(tones, prevRoot, false, dyn);
//         }
//       }

//       const safeNotes = assertExactlyOneBar(
//         result.notes,
//         `${id} bar${barInBlock} ${numeral}`,
//       );
//       leftRaw.push(...safeNotes);
//       prevRoot = result.lastRoot;
//     }
//   }

//   return {
//     right: applySwing(rightRaw, swing),
//     left: applySwing(leftRaw, swing),
//     bars: totalBars,
//     key,
//     mode: inferredMode,
//     tempo,
//     swing,
//   };
// }

// lib/musicGenerator.ts
// Genre-aware non-AI piano piece generator

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
    // alternate root and chord tone for a simple oom-pah feel
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

  // ── FIX: resolve the key once up-front so every downstream use and the
  //         returned `key` field all refer to the same value.  Previously
  //         `key` (the param) was passed to `rootToMidi` while the return
  //         statement fell back to the hard-coded strings "Am"/"C", meaning
  //         a randomly-chosen key would be used for generation but never
  //         surfaced to the caller.
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

      // Right hand
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

      // Left hand
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
    key: resolvedKey, // ── FIX: was `key ?? "Am"/"C"`, now always the actual key used
    mode: inferredMode,
    tempo: resolvedTempo,
    swing: resolvedSwing,
    genre,
    timeSig: resolvedTimeSig,
  };
}
