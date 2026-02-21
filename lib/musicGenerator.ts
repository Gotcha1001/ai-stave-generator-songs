// export type NoteType = {
//   pitch: string;
//   duration: string;
//   isRest?: boolean;
// };

// interface GeneratorOptions {
//   bars?: number;
//   key?: string;
//   mode?: "major" | "minor";
// }

// interface GeneratedSong {
//   right: NoteType[];
//   left: NoteType[];
//   bars: number;
//   key: string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

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

// const SCALES = {
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
//     IV: [3, 5, 0],
//     V: [4, 6, 1],
//     VI: [5, 0, 2],
//     VII: [6, 1, 3],
//   },
// };

// /**
//  * Functional harmony graph — each chord lists valid successors.
//  * Now actively used for dynamic progressions.
//  */
// const HARMONY_GRAPH: Record<string, Record<string, string[]>> = {
//   major: {
//     I: ["IV", "V", "VI", "II"],
//     II: ["V", "IV"],
//     III: ["VI", "IV"],
//     IV: ["V", "II", "I"],
//     V: ["I", "VI"], // V→VI is a deceptive cadence — adds surprise
//     VI: ["II", "IV"],
//   },
//   minor: {
//     I: ["IV", "V", "VII", "VI"],
//     II: ["V"],
//     IV: ["V", "I"],
//     V: ["I", "VI"],
//     VI: ["II", "IV"],
//     VII: ["I", "V"],
//   },
// };

// // Section-specific harmonic characters
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

// /**
//  * Tension degrees → resolution target.
//  *
//  * These are only applied as a *nudge*, not an override,
//  * to preserve the melodic shape of the motif.
//  */
// const TENSION_RESOLUTION: Record<number, number> = {
//   6: 0, // leading tone → tonic
//   3: 2, // 4th scale degree → 3rd (avoid the tritone pull)
// };

// const DUR_TO_BEATS: Record<string, number> = {
//   w: 4,
//   h: 2,
//   q: 1,
//   "8": 0.5,
//   "16": 0.25,
// };
// const BEATS_TO_DUR: [number, string][] = [
//   [4, "w"],
//   [2, "h"],
//   [1, "q"],
//   [0.5, "8"],
//   [0.25, "16"],
// ];
// const BEATS_PER_BAR = 4;

// // ─── Utility ─────────────────────────────────────────────────────────────────

// function rnd(n: number) {
//   return Math.floor(Math.random() * n);
// }
// function pick<T>(arr: readonly T[]): T {
//   return arr[rnd(arr.length)];
// }
// function clamp(v: number, lo: number, hi: number) {
//   return Math.max(lo, Math.min(hi, v));
// }
// function midiToPitch(midi: number): string {
//   const oct = Math.floor(midi / 12) - 1;
//   return `${CHROMATIC[midi % 12]}${clamp(oct, 2, 6)}`;
// }
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
//   const note = enhar[key] ?? key;
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
//   // Immutable — no in-place sort
//   return degrees.map((d) => (octave + 1) * 12 + rootIdx + intervals[d % 7]);
// }

// /** Walk the harmony graph for `length` steps. Now used for dynamic sections. */
// function walkHarmonyGraph(
//   start: string,
//   length: number,
//   mode: "major" | "minor",
// ): string[] {
//   const graph = HARMONY_GRAPH[mode];
//   const result: string[] = [start];
//   let current = start;
//   for (let i = 1; i < length; i++) {
//     const options = graph[current] ?? ["I"];
//     current = pick(options);
//     result.push(current);
//   }
//   return result;
// }

// // ─── Rhythmic variety helpers ─────────────────────────────────────────────────

// /**
//  * Returns a set of rhythmic durations that sum exactly to `beats`.
//  * Produces varied, natural-feeling rhythms rather than uniform note values.
//  */
// function rhythmicFill(
//   beats: number,
//   style: "steady" | "syncopated" | "flowing",
// ): string[] {
//   const durs: string[] = [];
//   let remaining = beats;

//   if (style === "steady") {
//     // Even quarter notes
//     while (remaining >= 1) {
//       durs.push("q");
//       remaining -= 1;
//     }
//     while (remaining >= 0.5) {
//       durs.push("8");
//       remaining -= 0.5;
//     }
//   } else if (style === "syncopated") {
//     // Dotted rhythms and ties across beats
//     const patterns: [string, number][][] = [
//       [
//         ["8", 0.5],
//         ["q", 1],
//         ["8", 0.5],
//         ["q", 1],
//       ], // short-long feel
//       [
//         ["q", 1],
//         ["8", 0.5],
//         ["8", 0.5],
//         ["h", 2],
//       ], // push + land
//     ];
//     const chosen = pick(patterns);
//     for (const [dur, b] of chosen) {
//       if (remaining <= 0) break;
//       durs.push(dur);
//       remaining -= b;
//     }
//   } else {
//     // Flowing eighth note runs with occasional halves
//     const options: [string, number][] = [
//       ["h", 2],
//       ["q", 1],
//       ["8", 0.5],
//     ];
//     while (remaining > 0) {
//       const valid = options.filter(([, b]) => b <= remaining);
//       if (!valid.length) break;
//       // Bias toward quarter notes for readability
//       const weights = valid.map(([dur]) =>
//         dur === "q" ? 3 : dur === "8" ? 2 : 1,
//       );
//       const total = weights.reduce((a, b) => a + b, 0);
//       let r = Math.random() * total;
//       let chosen: [string, number] = valid[0];
//       for (let i = 0; i < valid.length; i++) {
//         r -= weights[i];
//         if (r <= 0) {
//           chosen = valid[i];
//           break;
//         }
//       }
//       durs.push(chosen[0]);
//       remaining -= chosen[1];
//     }
//   }

//   return durs;
// }

// // ─── Motif definition ─────────────────────────────────────────────────────────

// type MotifNote = { deg: number; dur: string };
// type Motif = MotifNote[];

// function generateSeedMotif(): Motif {
//   const shapes: Motif[] = [
//     // Rising stepwise question → settling answer
//     [
//       { deg: 0, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//     // Leap then stepwise descent
//     [
//       { deg: 4, dur: "q" },
//       { deg: 4, dur: "8" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "h" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//     // Syncopated arch
//     [
//       { deg: 0, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 4, dur: "q" },
//       { deg: 3, dur: "h" },
//       { deg: 2, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//     // Descending scale
//     [
//       { deg: 6, dur: "q" },
//       { deg: 5, dur: "q" },
//       { deg: 4, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//     // Arpeggio upward then step down
//     [
//       { deg: 0, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 4, dur: "8" },
//       { deg: 6, dur: "8" },
//       { deg: 5, dur: "h" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "q" },
//       { deg: 0, dur: "h" },
//     ],
//     // Short-short-long (Beethoven-ish)
//     [
//       { deg: 2, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 0, dur: "8" },
//       { deg: 1, dur: "h" },
//       { deg: 3, dur: "q" },
//       { deg: 4, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//     // Neighbour-note ornament feel (baroque-ish)
//     [
//       { deg: 2, dur: "q" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "8" },
//       { deg: 1, dur: "h" },
//       { deg: 0, dur: "q" },
//       { deg: 1, dur: "q" },
//       { deg: 2, dur: "h" },
//     ],
//     // Call-and-response with rest gap
//     [
//       { deg: 4, dur: "q" },
//       { deg: 5, dur: "q" },
//       { deg: 4, dur: "8" },
//       { deg: 3, dur: "8" },
//       { deg: 2, dur: "q" },
//       // rest built in via duration padding in realise
//       { deg: 0, dur: "h" },
//       { deg: 2, dur: "h" },
//     ],
//   ];
//   return pick(shapes);
// }

// // ─── Motif transformations ────────────────────────────────────────────────────

// function transposeMotif(motif: Motif, steps: number): Motif {
//   return motif.map((n) => ({ ...n, deg: clamp(n.deg + steps, 0, 6) }));
// }

// function invertMotif(motif: Motif): Motif {
//   const pivot = motif[0]?.deg ?? 0;
//   return motif.map((n) => ({ ...n, deg: clamp(2 * pivot - n.deg, 0, 6) }));
// }

// function retrogradeMotif(motif: Motif): Motif {
//   return [...motif].reverse();
// }

// /**
//  * Fragmentation: split motif into "call" (first bar) + "response" (echoed, shorter).
//  * Response notes are rhythmically diminished (halved) and slightly transposed.
//  */
// function fragmentMotif(motif: Motif): Motif {
//   const call: Motif = [];
//   let beats = 0;
//   for (const n of motif) {
//     const b = DUR_TO_BEATS[n.dur] ?? 1;
//     if (beats + b > BEATS_PER_BAR) break;
//     call.push(n);
//     beats += b;
//   }

//   const response: Motif = [];
//   let rBeats = 0;
//   for (const n of call) {
//     if (rBeats >= BEATS_PER_BAR) break;
//     const b = DUR_TO_BEATS[n.dur] ?? 1;
//     const halved = Math.max(b / 2, 0.5);
//     const dur = BEATS_TO_DUR.find(([bv]) => bv <= halved)?.[1] ?? "q";
//     response.push({ deg: clamp(n.deg + 2, 0, 6), dur });
//     rBeats += DUR_TO_BEATS[dur] ?? 1;
//   }
//   // Pad response bar to full bar length
//   while (rBeats < BEATS_PER_BAR) {
//     const rem = BEATS_PER_BAR - rBeats;
//     const [, dur] = BEATS_TO_DUR.find(([b]) => b <= rem) ?? [1, "q"];
//     response.push({ deg: clamp((call[0]?.deg ?? 0) + 1, 0, 6), dur });
//     rBeats += DUR_TO_BEATS[dur] ?? 1;
//   }
//   return [...call, ...response];
// }

// /**
//  * Augmentation: double all note values (capped at whole note).
//  * Creates a stately, hymn-like broadening in the Coda.
//  */
// function augmentMotif(motif: Motif): Motif {
//   const result: Motif = [];
//   let beats = 0;
//   for (const n of motif) {
//     if (beats >= BEATS_PER_BAR * 2) break;
//     const b = DUR_TO_BEATS[n.dur] ?? 1;
//     const doubled = Math.min(b * 2, 4);
//     const dur = BEATS_TO_DUR.find(([bv]) => bv <= doubled)?.[1] ?? "h";
//     result.push({ ...n, dur });
//     beats += DUR_TO_BEATS[dur] ?? 1;
//   }
//   return result;
// }

// /**
//  * Diminution: halve all note values.
//  * Creates excitement and urgency — good for development sections.
//  */
// function diminishMotif(motif: Motif): Motif {
//   return motif.map((n) => {
//     const b = DUR_TO_BEATS[n.dur] ?? 1;
//     const halved = Math.max(b / 2, 0.25);
//     const dur = BEATS_TO_DUR.find(([bv]) => bv <= halved)?.[1] ?? "8";
//     return { ...n, dur };
//   });
// }

// // ─── Chord-aware realisation ──────────────────────────────────────────────────

// /**
//  * Realise a motif into NoteType[] with full harmonic awareness.
//  *
//  * KEY FIXES vs. previous version:
//  *  - Tension resolution is a *nudge* (25% chance), not an override
//  *    This preserves melodic shape while still pulling toward resolution
//  *  - Strong-beat snapping uses a proximity threshold — if the nearest
//  *    chord tone is >5 semitones away, we allow the scale tone instead
//  *    (avoids jarring leaps just to hit a chord tone)
//  *  - Mid-phrase rests are injected probabilistically for breath/phrasing
//  *  - Ornamental neighbour notes added on weak beats for expressiveness
//  *  - Voice leading range enforced more softly (soft clamp instead of hard)
//  */
// function realise(
//   motif: Motif,
//   scale: number[],
//   chordToneMap: number[][],
//   minMidi: number,
//   maxMidi: number,
//   prevMidi: number = 64,
//   prevDeg: number = 0,
// ): { notes: NoteType[]; lastMidi: number; lastDeg: number } {
//   const notes: NoteType[] = [];
//   let beats = 0;
//   const totalBeats = BEATS_PER_BAR * 2;
//   let last = prevMidi;
//   let lastDeg = prevDeg;
//   let prevLeapSize = 0;

//   // Decide whether to add an anacrusis (pickup) rest at phrase start (~20%)
//   if (Math.random() < 0.2) {
//     notes.push({ pitch: "rest", duration: "8", isRest: true });
//     beats += 0.5;
//   }

//   for (const m of motif) {
//     if (beats >= totalBeats) break;

//     const b = DUR_TO_BEATS[m.dur] ?? 1;
//     const remaining = totalBeats - beats;
//     const actualBeats = Math.min(b, remaining);
//     const dur = BEATS_TO_DUR.find(([bv]) => bv <= actualBeats)?.[1] ?? "q";

//     const barIndex = Math.floor(beats / BEATS_PER_BAR);
//     const beatInBar = beats % BEATS_PER_BAR;
//     const isStrongBeat = beatInBar === 0 || beatInBar === 2;

//     // ── Nudge toward tension resolution (not override) ────────────────────
//     let deg = m.deg;
//     if (TENSION_RESOLUTION[lastDeg] !== undefined && Math.random() < 0.25) {
//       deg = TENSION_RESOLUTION[lastDeg];
//     }
//     deg = clamp(deg, 0, 6);

//     const baseMidi = scale[deg];

//     // ── Octave selection via voice leading ────────────────────────────────
//     const scaleCandidates = [-12, 0, 12, 24]
//       .map((s) => baseMidi + s)
//       .filter((m) => m >= minMidi && m <= maxMidi);

//     let midi = scaleCandidates.reduce(
//       (best, c) => (Math.abs(c - last) < Math.abs(best - last) ? c : best),
//       scaleCandidates[0] ?? last,
//     );

//     if (isStrongBeat) {
//       // Strong beat: snap to nearest chord tone ONLY if it's within 4 semitones
//       const chordTones = chordToneMap[barIndex] ?? chordToneMap[0];
//       const chordCandidates = chordTones
//         .flatMap((t) => [-12, 0, 12, 24].map((s) => t + s))
//         .filter((c) => c >= minMidi && c <= maxMidi);

//       if (chordCandidates.length > 0) {
//         const nearestChord = chordCandidates.reduce(
//           (best, c) => (Math.abs(c - last) < Math.abs(best - last) ? c : best),
//           chordCandidates[0],
//         );
//         // Only snap if it doesn't cause a jarring leap
//         if (Math.abs(nearestChord - midi) <= 4) {
//           midi = nearestChord;
//         }
//       }
//     } else {
//       // Weak beat: occasionally add a neighbour-note ornament
//       if (Math.random() < 0.12) {
//         const neighbour = last + (Math.random() < 0.5 ? 1 : -1);
//         if (neighbour >= minMidi && neighbour <= maxMidi) {
//           notes.push({ pitch: midiToPitch(neighbour), duration: "16" });
//           beats += 0.25;
//           if (beats >= totalBeats) break;
//         }
//       }
//     }

//     // ── Leap limiting ─────────────────────────────────────────────────────
//     const leap = Math.abs(midi - last);
//     if (leap > 9) {
//       midi = last + (midi > last ? 2 : -2);
//       midi = clamp(midi, minMidi, maxMidi);
//     }
//     if (prevLeapSize > 5 && Math.abs(midi - last) > 5) {
//       midi = last + (midi > last ? 1 : -1);
//       midi = clamp(midi, minMidi, maxMidi);
//     }

//     // ── Mid-phrase breathing rest (~8% chance on weak beats) ─────────────
//     if (!isStrongBeat && Math.random() < 0.08 && remaining > 1.5) {
//       notes.push({ pitch: "rest", duration: "8", isRest: true });
//       beats += 0.5;
//       if (beats >= totalBeats) break;
//     }

//     prevLeapSize = Math.abs(midi - last);
//     last = midi;
//     lastDeg = deg;
//     beats += DUR_TO_BEATS[dur] ?? 1;

//     notes.push({ pitch: midiToPitch(midi), duration: dur });
//   }

//   // ── Pad to 2 bars ─────────────────────────────────────────────────────
//   let total = notes.reduce((s, n) => s + (DUR_TO_BEATS[n.duration] ?? 1), 0);
//   while (total < totalBeats) {
//     const rem = totalBeats - total;
//     const [, dur] = BEATS_TO_DUR.find(([b]) => b <= rem) ?? [1, "q"];
//     notes.push({ pitch: "rest", duration: dur, isRest: true });
//     total += DUR_TO_BEATS[dur] ?? 1;
//   }

//   return { notes, lastMidi: last, lastDeg };
// }

// // ─── Perfect cadence (V → I) ─────────────────────────────────────────────────

// /**
//  * Two bars of authentic cadence.
//  *
//  * FIX: No longer mutates chord arrays in-place via .sort().
//  * Uses separate sorted copies, and resolves to an octave that's
//  * near the previous melody note rather than always landing low.
//  */
// function perfectCadence(
//   scale: number[],
//   tonicChord: number[],
//   dominantChord: number[],
//   prevMidi: number,
// ): NoteType[] {
//   // Safe sorted copies — don't mutate the originals
//   const tonicSorted = [...tonicChord].sort((a, b) => a - b);
//   const dominantSorted = [...dominantChord].sort((a, b) => a - b);

//   const leadingTone = scale[6]; // degree 7 → tonic
//   const fifth = dominantSorted[0];

//   // Choose tonic pitch nearest to where melody currently is
//   const tonicCandidates = tonicSorted
//     .flatMap((t) => [-12, 0, 12].map((s) => t + s))
//     .filter((m) => m >= 48 && m <= 84);
//   const tonic = tonicCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
//     tonicCandidates[0] ?? scale[0],
//   );

//   // Bar 15: approach the dominant (V) — 5th → leading tone → 5th
//   // Bar 16: resolve to tonic (I) whole note
//   return [
//     { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "q" },
//     { pitch: midiToPitch(clamp(leadingTone, 52, 79)), duration: "q" },
//     { pitch: midiToPitch(clamp(fifth + 2, 52, 79)), duration: "q" }, // step up for interest
//     { pitch: midiToPitch(clamp(leadingTone, 52, 79)), duration: "q" },
//     { pitch: midiToPitch(clamp(tonic, 52, 79)), duration: "w" }, // resolve
//   ];
// }

// // ─── Left hand patterns ───────────────────────────────────────────────────────

// function albertiBassBar(
//   tones: number[],
//   prevRoot: number,
//   variety: boolean = false,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const rootCandidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= 36 && m <= 60);
//   const root = rootCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     rootCandidates[0],
//   );
//   const third = clamp(sorted[1] ?? root + 4, root + 2, root + 9);
//   const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 11);

//   // Occasionally use root-third-fifth-third instead of root-fifth-third-fifth
//   const pattern =
//     variety && Math.random() < 0.3
//       ? [root, third, fifth, third]
//       : [root, fifth, third, fifth];

//   return {
//     notes: pattern.map((midi) => ({
//       pitch: midiToPitch(clamp(midi, 36, 62)),
//       duration: "q",
//     })),
//     lastRoot: root,
//   };
// }

// function blockChordBar(
//   tones: number[],
//   prevRoot: number,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const rootCandidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= 36 && m <= 58);
//   const root = rootCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     rootCandidates[0],
//   );
//   const third = clamp(sorted[1] ?? root + 4, root + 2, root + 9);
//   const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 11);

//   // Occasionally arpeggiate the block chord instead of playing all at once
//   if (Math.random() < 0.25) {
//     return {
//       notes: [
//         { pitch: midiToPitch(root), duration: "8" },
//         { pitch: midiToPitch(third), duration: "8" },
//         { pitch: midiToPitch(fifth), duration: "h" },
//         { pitch: midiToPitch(root), duration: "q" },
//       ],
//       lastRoot: root,
//     };
//   }

//   return {
//     notes: [
//       { pitch: midiToPitch(root), duration: "h" },
//       { pitch: midiToPitch(third), duration: "h" },
//     ],
//     lastRoot: root,
//   };
// }

// function walkingBassBar(
//   tones: number[],
//   nextTones: number[],
//   scaleBass: number[],
//   prevRoot: number,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const rootCandidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= 36 && m <= 56);
//   const root = rootCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     rootCandidates[0],
//   );
//   const nextRoot = clamp([...nextTones].sort((a, b) => a - b)[0], 36, 56);

//   const direction = nextRoot >= root ? 1 : -1;
//   let cursor = root;
//   const walkNotes: number[] = [root];

//   for (let step = 0; step < 3; step++) {
//     const candidates = scaleBass
//       .filter((m) =>
//         direction > 0
//           ? m > cursor && m <= nextRoot + 2
//           : m < cursor && m >= nextRoot - 2,
//       )
//       .sort((a, b) => (direction > 0 ? a - b : b - a));

//     cursor =
//       candidates[0] !== undefined
//         ? candidates[0]
//         : clamp(cursor + direction * 2, 34, 58);
//     walkNotes.push(clamp(cursor, 34, 58));
//   }

//   return {
//     notes: walkNotes.slice(0, 4).map((midi) => ({
//       pitch: midiToPitch(midi),
//       duration: "q",
//     })),
//     lastRoot: root,
//   };
// }

// function pedalPointBar(
//   tones: number[],
//   prevRoot: number,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const rootCandidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= 36 && m <= 56);
//   const root = rootCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     rootCandidates[0],
//   );
//   const fifth = clamp(sorted[2] ?? root + 7, root, root + 10);
//   return {
//     notes: [
//       { pitch: midiToPitch(root), duration: "h" },
//       { pitch: midiToPitch(fifth), duration: "h" },
//     ],
//     lastRoot: root,
//   };
// }

// /**
//  * NEW: Broken chord arpeggiation — rolls up the chord on beat 1,
//  * sustaining through. More fluid and pianistic than block chords.
//  */
// function brokenChordBar(
//   tones: number[],
//   prevRoot: number,
// ): { notes: NoteType[]; lastRoot: number } {
//   const sorted = [...tones].sort((a, b) => a - b);
//   const rootCandidates = [-12, 0, 12]
//     .map((s) => sorted[0] + s)
//     .filter((m) => m >= 36 && m <= 56);
//   const root = rootCandidates.reduce(
//     (best, c) =>
//       Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
//     rootCandidates[0],
//   );
//   const third = clamp(sorted[1] ?? root + 4, root + 2, root + 9);
//   const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 11);
//   const oct = clamp(root + 12, 36, 65);

//   return {
//     notes: [
//       { pitch: midiToPitch(root), duration: "8" },
//       { pitch: midiToPitch(third), duration: "8" },
//       { pitch: midiToPitch(fifth), duration: "8" },
//       { pitch: midiToPitch(oct), duration: "8" },
//       { pitch: midiToPitch(fifth), duration: "8" },
//       { pitch: midiToPitch(third), duration: "8" },
//       { pitch: midiToPitch(root), duration: "q" },
//     ],
//     lastRoot: root,
//   };
// }

// // ─── Main generator ───────────────────────────────────────────────────────────

// export function generateSimpleSong({
//   bars = 16,
//   key = pick(["C", "G", "D", "F", "A", "Bb", "E"]),
//   mode = Math.random() < 0.4 ? "minor" : "major",
// }: GeneratorOptions = {}): GeneratedSong {
//   const rootIdx = rootToMidi(key);
//   const intervals = SCALES[mode];
//   const scaleOct4 = buildScale(rootIdx, intervals, [4]).slice(0, 7);
//   const scaleBass = buildScale(rootIdx, intervals, [2, 3]);

//   // ── Section progressions ──────────────────────────────────────────────────
//   // A and A' use fixed, character-specific progressions.
//   // B section uses the harmony graph for varied chord walks — more dynamic.
//   const sectionProgs = SECTION_PROGRESSIONS[mode];
//   const progA = sectionProgs.A;
//   const progB = walkHarmonyGraph("VI", 4, mode); // B: walk from VI for contrast
//   const progAp = sectionProgs.Ap;
//   const progCoda = sectionProgs.Coda;

//   function sectionChordTones(prog: string[], octave = 4): number[][] {
//     return prog.map((numeral) => chordMidi(numeral, rootIdx, mode, octave));
//   }

//   const chordA = sectionChordTones(progA);
//   const chordB = sectionChordTones(progB, 5); // B section: higher register
//   const chordAp = sectionChordTones(progAp);
//   const chordCoda = sectionChordTones(progCoda);

//   // ── Motif + transformations ───────────────────────────────────────────────
//   const seed = generateSeedMotif();

//   const sectionA1 = seed;
//   const sectionA2 = transposeMotif(seed, 1); // step up
//   const sectionB1 = invertMotif(transposeMotif(seed, 3)); // contrast: inverted + up
//   const sectionB2 = diminishMotif(transposeMotif(sectionB1, -1)); // excitement via diminution
//   const sectionAp1 = fragmentMotif(seed); // development: call & response
//   const sectionAp2 = retrogradeMotif(transposeMotif(seed, 2)); // retrograde
//   const codaM = augmentMotif(seed); // broad, stately

//   // ── Right hand realisation ────────────────────────────────────────────────
//   let lastMidi = 64;
//   let lastDeg = 0;

//   function realiseSection(
//     motif: Motif,
//     chords: number[][],
//     minMidi: number,
//     maxMidi: number,
//     barOffset: number,
//   ): NoteType[] {
//     const ct = [
//       chords[barOffset] ?? chords[0],
//       chords[barOffset + 1] ?? chords[1],
//     ];
//     const result = realise(
//       motif,
//       scaleOct4,
//       ct,
//       minMidi,
//       maxMidi,
//       lastMidi,
//       lastDeg,
//     );
//     lastMidi = result.lastMidi;
//     lastDeg = result.lastDeg;
//     return result.notes;
//   }

//   const right: NoteType[] = [
//     // Section A (bars 1–4): statement — middle register
//     ...realiseSection(sectionA1, chordA, 52, 76, 0),
//     ...realiseSection(sectionA2, chordA, 52, 76, 2),
//     // Section B (bars 5–8): contrast — higher register, inverted + diminished
//     ...realiseSection(sectionB1, chordB, 57, 84, 0),
//     ...realiseSection(sectionB2, chordB, 57, 84, 2),
//     // Section A' (bars 9–12): development — fragment + retrograde
//     ...realiseSection(sectionAp1, chordAp, 52, 79, 0),
//     ...realiseSection(sectionAp2, chordAp, 52, 79, 2),
//     // Coda (bars 13–14): augmented — broad and settling
//     ...realiseSection(codaM, chordCoda, 48, 76, 0),
//     // Bars 15–16: authentic cadence V → I
//     ...perfectCadence(
//       scaleOct4,
//       chordMidi("I", rootIdx, mode, 4),
//       chordMidi("V", rootIdx, mode, 4),
//       lastMidi,
//     ),
//   ];

//   // ── Left hand with voice-leading + varied patterns ────────────────────────
//   const left: NoteType[] = [];
//   let prevRoot = (rootIdx + 1) * 12 + 36;

//   const sectionData = [
//     { prog: progA, pattern: "alberti" as const },
//     { prog: progB, pattern: "mixed" as const }, // NEW: varies bar-to-bar
//     { prog: progAp, pattern: "walking" as const },
//     { prog: progCoda, pattern: "pedal" as const },
//   ];

//   for (let bar = 0; bar < 16; bar++) {
//     const section = Math.floor(bar / 4);
//     const { prog, pattern } = sectionData[section];
//     const progIdx = bar % 4;
//     const numeral = prog[progIdx];
//     const nextNumeral = prog[(progIdx + 1) % 4];

//     const tones = chordMidi(numeral, rootIdx, mode, 2);
//     const nextTones = chordMidi(nextNumeral, rootIdx, mode, 2);

//     let result: { notes: NoteType[]; lastRoot: number };

//     if (pattern === "mixed") {
//       // B section mixes block, broken, and occasional alberti for variety
//       const roll = Math.random();
//       if (roll < 0.4) {
//         result = blockChordBar(tones, prevRoot);
//       } else if (roll < 0.75) {
//         result = brokenChordBar(tones, prevRoot);
//       } else {
//         result = albertiBassBar(tones, prevRoot, true);
//       }
//     } else if (pattern === "alberti") {
//       result = albertiBassBar(tones, prevRoot, true);
//     } else if (pattern === "walking") {
//       result = walkingBassBar(tones, nextTones, scaleBass, prevRoot);
//     } else {
//       result = pedalPointBar(tones, prevRoot);
//     }

//     left.push(...result.notes);
//     prevRoot = result.lastRoot;
//   }

//   return { right, left, bars: 16, key };
// }

// ─── Public types ─────────────────────────────────────────────────────────────

// ─── Public types ─────────────────────────────────────────────────────────────

// ─── Public types ─────────────────────────────────────────────────────────────

export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

export type NoteType = {
  pitch: string;
  duration: string;
  isRest?: boolean;
  dynamic?: Dynamic;
  tie?: boolean;
  swingOffset?: number;
};

export interface GeneratorOptions {
  bars?: number;
  key?: string;
  mode?: "major" | "minor";
  seed?: number;
  tempo?: number;
  swing?: number;
}

export interface GeneratedSong {
  right: NoteType[];
  left: NoteType[];
  bars: number;
  key: string;
  mode: "major" | "minor";
  tempo: number;
  swing: number;
}

function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand: () => number = Math.random;
function rnd(n: number) {
  return Math.floor(rand() * n);
}
function pick<T>(arr: readonly T[]): T {
  return arr[rnd(arr.length)];
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

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
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
const CHORD_DEGREES: Record<string, Record<string, number[]>> = {
  major: {
    I: [0, 2, 4],
    II: [1, 3, 5],
    III: [2, 4, 6],
    IV: [3, 5, 0],
    V: [4, 6, 1],
    VI: [5, 0, 2],
  },
  minor: {
    I: [0, 2, 4],
    II: [1, 3, 5],
    III: [2, 4, 6],
    IV: [3, 5, 0],
    V: [4, 6, 1],
    VI: [5, 0, 2],
    VII: [6, 1, 3],
  },
};
const HARMONY_GRAPH: Record<string, Record<string, string[]>> = {
  major: {
    I: ["IV", "V", "VI", "II"],
    II: ["V", "IV"],
    III: ["VI", "IV"],
    IV: ["V", "II", "I"],
    V: ["I", "VI"],
    VI: ["II", "IV"],
  },
  minor: {
    I: ["IV", "V", "VII", "VI"],
    II: ["V"],
    III: ["VI", "VII"],
    IV: ["V", "I"],
    V: ["I", "VI"],
    VI: ["II", "IV"],
    VII: ["I", "V"],
  },
};
const SECTION_PROGRESSIONS: Record<string, Record<string, string[]>> = {
  major: {
    A: ["I", "IV", "V", "I"],
    B: ["VI", "II", "V", "I"],
    Ap: ["I", "V", "VI", "IV"],
    Coda: ["IV", "V", "V", "I"],
  },
  minor: {
    A: ["I", "VII", "IV", "V"],
    B: ["VI", "VII", "I", "V"],
    Ap: ["I", "IV", "VII", "I"],
    Coda: ["IV", "V", "V", "I"],
  },
};
const SECTION_DYNAMICS: Dynamic[][] = [
  ["mp", "mf"],
  ["mf", "f"],
  ["mp", "mf"],
  ["p", "mp"],
];
const DUR_TO_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
  "16": 0.25,
};
const BEATS_TO_DUR: [number, string][] = [
  [4, "w"],
  [2, "h"],
  [1, "q"],
  [0.5, "8"],
  [0.25, "16"],
];
const BEATS_PER_BAR = 4;

// Minimum meaningful duration in beats.
// enforceBeats uses this to guard against floating-point drift causing a phantom
// note (e.g. a "q" = 1 beat) to be appended when only 0.001 beats remain.
// Without this guard, bars summed to 5 beats and VexFlow overlapped notes visually.
const MIN_BEAT = 0.24;

function enforceBeats(
  notes: NoteType[],
  targetBeats: number,
  dyn: Dynamic = "p",
): NoteType[] {
  const result: NoteType[] = [];
  let total = 0;
  for (const note of notes) {
    if (total >= targetBeats - 0.01) break;
    const b = DUR_TO_BEATS[note.duration] ?? 1;
    const remaining = targetBeats - total;
    if (b <= remaining + 0.01) {
      result.push(note);
      total += Math.min(b, remaining);
    } else {
      // Only truncate if there is meaningful space — skip if remaining < MIN_BEAT
      // to avoid adding a phantom note to an essentially-full bar.
      if (remaining >= MIN_BEAT) {
        const fitDur =
          BEATS_TO_DUR.find(([bv]) => bv <= remaining)?.[1] ?? "16";
        result.push({ ...note, duration: fitDur });
        total += DUR_TO_BEATS[fitDur] ?? 0.25;
      }
    }
  }
  while (total < targetBeats - 0.01) {
    const rem = targetBeats - total;
    if (rem < MIN_BEAT) break; // float drift — never add a phantom rest
    const pair = BEATS_TO_DUR.find(([b]) => b <= rem);
    const dur = pair ? pair[1] : "16"; // "16" minimum — never "q" as fallback
    result.push({ pitch: "rest", duration: dur, isRest: true, dynamic: dyn });
    total += DUR_TO_BEATS[dur] ?? 0.25;
  }
  return result;
}

function applySwing(notes: NoteType[], ratio: number): NoteType[] {
  if (ratio === 0) return notes;
  const shift = ratio * 0.5 * (2 / 3);
  let prevWas8th = false;
  return notes.map((note) => {
    if (note.duration === "8" && !note.isRest) {
      const isOff = prevWas8th;
      prevWas8th = !isOff;
      if (isOff) return { ...note, swingOffset: shift };
    } else {
      prevWas8th = false;
    }
    return note;
  });
}

function midiToPitch(midi: number): string {
  const oct = Math.floor(midi / 12) - 1;
  return `${CHROMATIC[midi % 12]}${clamp(oct, 2, 6)}`;
}

function rootToMidi(key: string): number {
  const enhar: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
  };
  const bare = key.replace(/m(in)?$/i, "");
  const note = enhar[bare] ?? bare;
  const idx = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]);
  return idx === -1 ? 0 : idx;
}

function buildScale(
  rootIdx: number,
  intervals: number[],
  octaves: number[],
): number[] {
  const notes: number[] = [];
  for (const oct of octaves)
    for (const iv of intervals) notes.push((oct + 1) * 12 + rootIdx + iv);
  return notes.sort((a, b) => a - b);
}

function chordMidi(
  numeral: string,
  rootIdx: number,
  mode: "major" | "minor",
  octave: number,
): number[] {
  const degrees = CHORD_DEGREES[mode][numeral] ?? CHORD_DEGREES[mode]["I"];
  const intervals = SCALES[mode];
  return degrees.map((d) => (octave + 1) * 12 + rootIdx + intervals[d % 7]);
}

function walkHarmonyGraph(
  start: string,
  length: number,
  mode: "major" | "minor",
): string[] {
  const graph = HARMONY_GRAPH[mode];
  const result = [start];
  let current = start;
  for (let i = 1; i < length; i++) {
    const options = graph[current] ?? ["I"];
    current = pick(options);
    result.push(current);
  }
  return result;
}

type MotifNote = { deg: number; dur: string };
type Motif = MotifNote[];

const MOTIF_POOL: { tags: string[]; motif: Motif }[] = [
  {
    tags: ["stable", "stepwise", "A"],
    motif: [
      { deg: 0, dur: "q" },
      { deg: 1, dur: "q" },
      { deg: 2, dur: "h" },
      { deg: 3, dur: "q" },
      { deg: 4, dur: "q" },
      { deg: 2, dur: "h" },
    ],
  },
  {
    tags: ["stable", "A", "tonic"],
    motif: [
      { deg: 0, dur: "q" },
      { deg: 2, dur: "q" },
      { deg: 4, dur: "h" },
      { deg: 2, dur: "q" },
      { deg: 1, dur: "q" },
      { deg: 0, dur: "h" },
    ],
  },
  {
    tags: ["leap", "contrast", "B"],
    motif: [
      { deg: 4, dur: "q" },
      { deg: 4, dur: "8" },
      { deg: 3, dur: "8" },
      { deg: 2, dur: "h" },
      { deg: 1, dur: "q" },
      { deg: 2, dur: "q" },
      { deg: 0, dur: "h" },
    ],
  },
  {
    tags: ["arch", "syncopated", "B"],
    motif: [
      { deg: 0, dur: "8" },
      { deg: 2, dur: "8" },
      { deg: 4, dur: "q" },
      { deg: 3, dur: "h" },
      { deg: 2, dur: "q" },
      { deg: 1, dur: "q" },
      { deg: 0, dur: "h" },
    ],
  },
  {
    tags: ["descending", "Coda", "Ap"],
    motif: [
      { deg: 6, dur: "q" },
      { deg: 5, dur: "q" },
      { deg: 4, dur: "h" },
      { deg: 3, dur: "q" },
      { deg: 2, dur: "q" },
      { deg: 0, dur: "h" },
    ],
  },
  {
    tags: ["arpeggio", "leap", "B"],
    motif: [
      { deg: 0, dur: "8" },
      { deg: 2, dur: "8" },
      { deg: 4, dur: "8" },
      { deg: 6, dur: "8" },
      { deg: 5, dur: "h" },
      { deg: 4, dur: "q" },
      { deg: 2, dur: "q" },
      { deg: 0, dur: "h" },
    ],
  },
  {
    tags: ["short-short-long", "A"],
    motif: [
      { deg: 2, dur: "8" },
      { deg: 2, dur: "8" },
      { deg: 2, dur: "8" },
      { deg: 0, dur: "8" },
      { deg: 1, dur: "h" },
      { deg: 3, dur: "q" },
      { deg: 4, dur: "q" },
      { deg: 2, dur: "h" },
    ],
  },
  {
    tags: ["neighbour", "Ap"],
    motif: [
      { deg: 2, dur: "q" },
      { deg: 3, dur: "8" },
      { deg: 2, dur: "8" },
      { deg: 1, dur: "h" },
      { deg: 0, dur: "q" },
      { deg: 1, dur: "q" },
      { deg: 2, dur: "h" },
    ],
  },
  {
    tags: ["call-response", "A", "stable"],
    motif: [
      { deg: 4, dur: "q" },
      { deg: 5, dur: "q" },
      { deg: 4, dur: "8" },
      { deg: 3, dur: "8" },
      { deg: 2, dur: "q" },
      { deg: 0, dur: "h" },
      { deg: 2, dur: "h" },
    ],
  },
  {
    tags: ["Coda", "descending", "stable"],
    motif: [
      { deg: 4, dur: "q" },
      { deg: 3, dur: "q" },
      { deg: 2, dur: "q" },
      { deg: 1, dur: "q" },
      { deg: 0, dur: "h" },
      { deg: 0, dur: "h" },
    ],
  },
];

function generateSeedMotifForSection(
  section: "A" | "B" | "Ap" | "Coda",
): Motif {
  const scored = MOTIF_POOL.map((e) => ({
    e,
    score: e.tags.includes(section) ? 2 : e.tags.includes("stable") ? 1 : 0,
  }));
  const best = Math.max(...scored.map((s) => s.score));
  return pick(scored.filter((s) => s.score === best).map((s) => s.e.motif));
}

function transposeMotif(m: Motif, s: number): Motif {
  return m.map((n) => ({ ...n, deg: clamp(n.deg + s, 0, 6) }));
}
function invertMotif(m: Motif): Motif {
  const p = m[0]?.deg ?? 0;
  return m.map((n) => ({ ...n, deg: clamp(2 * p - n.deg, 0, 6) }));
}
function retrogradeMotif(m: Motif): Motif {
  return [...m].reverse();
}

function augmentMotif(motif: Motif): Motif {
  const result: Motif = [];
  let beats = 0;
  for (const n of motif) {
    if (beats >= BEATS_PER_BAR * 2) break;
    const doubled = Math.min((DUR_TO_BEATS[n.dur] ?? 1) * 2, 4);
    const dur = BEATS_TO_DUR.find(([bv]) => bv <= doubled)?.[1] ?? "h";
    result.push({ ...n, dur });
    beats += DUR_TO_BEATS[dur] ?? 1;
  }
  return result;
}

function diminishMotif(motif: Motif): Motif {
  return motif.map((n) => {
    const halved = Math.max((DUR_TO_BEATS[n.dur] ?? 1) / 2, 0.5);
    const dur = BEATS_TO_DUR.find(([bv]) => bv <= halved)?.[1] ?? "8";
    return { ...n, dur };
  });
}

function realise(
  motif: Motif,
  scale: number[],
  chordToneMap: number[][],
  minMidi: number,
  maxMidi: number,
  isClimax = false,
  prevMidi = 64,
  prevDeg = 0,
  dynamic: Dynamic = "mf",
  phraseBars = 2,
): { notes: NoteType[]; lastMidi: number; lastDeg: number } {
  const notes: NoteType[] = [];
  const totalBeats = BEATS_PER_BAR * phraseBars;
  let beats = 0,
    last = prevMidi,
    lastDeg = prevDeg,
    prevLeap = 0;

  for (let mi = 0; mi < motif.length; mi++) {
    if (beats >= totalBeats - 0.01) break;
    const m = motif[mi];
    const isLastNote = mi === motif.length - 1;
    const b = DUR_TO_BEATS[m.dur] ?? 1;
    const remaining = totalBeats - beats;
    let actualBeats = Math.min(b, remaining);
    if (isLastNote && Math.abs(remaining - b - 1) < 0.01 && b < 4)
      actualBeats = b + 1;
    actualBeats = Math.min(actualBeats, remaining);
    const dur = BEATS_TO_DUR.find(([bv]) => bv <= actualBeats)?.[1] ?? "q";

    const barIndex = clamp(
      Math.floor(beats / BEATS_PER_BAR),
      0,
      chordToneMap.length - 1,
    );
    const beatInBar = beats % BEATS_PER_BAR;
    const isStrongBeat = beatInBar < 0.01 || Math.abs(beatInBar - 2) < 0.01;

    let deg = m.deg;
    if (lastDeg === 6 && rand() < 0.95) deg = 0;
    else if (lastDeg === 3 && rand() < 0.7) deg = 2;
    deg = clamp(deg, 0, 6);
    const baseMidi = scale[deg];

    const center = isClimax ? 72 : 64;
    const shifts = [-12, 0, 12, 24];
    const weights = shifts.map((s) => {
      const m = baseMidi + s;
      if (m < minMidi || m > maxMidi) return 0;
      return Math.max(0, 10 - Math.abs(m - center));
    });
    const totalW = weights.reduce((a, b) => a + b, 0);
    let midi = baseMidi;
    if (totalW > 0) {
      let r = rand() * totalW;
      for (let i = 0; i < shifts.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          midi = baseMidi + shifts[i];
          break;
        }
      }
    }

    if (isStrongBeat) {
      const ctones = chordToneMap[barIndex];
      const candidates = ctones
        .flatMap((t) => [-12, 0, 12, 24].map((s) => t + s))
        .filter((c) => c >= minMidi && c <= maxMidi);
      if (candidates.length > 0) {
        const nearest = candidates.reduce(
          (best, c) => (Math.abs(c - last) < Math.abs(best - last) ? c : best),
          candidates[0],
        );
        if (Math.abs(nearest - midi) <= 5) midi = nearest;
      }
    } else {
      if (rand() < 0.25)
        midi = clamp(midi + (rand() < 0.5 ? 1 : -1), minMidi, maxMidi);
    }

    const leap = Math.abs(midi - last);
    if (leap > 9) {
      midi = last + (midi > last ? 2 : -2);
      midi = clamp(midi, minMidi, maxMidi);
    }
    if (prevLeap > 5 && Math.abs(midi - last) > 5) {
      midi = last + (midi > last ? 1 : -1);
      midi = clamp(midi, minMidi, maxMidi);
    }
    prevLeap = Math.abs(midi - last);

    if (!isStrongBeat && !isLastNote && rand() < 0.07 && remaining > 2.5) {
      notes.push({ pitch: "rest", duration: "q", isRest: true, dynamic });
      beats += 1;
      if (beats >= totalBeats - 0.01) break;
    }

    last = midi;
    lastDeg = deg;
    beats += DUR_TO_BEATS[dur] ?? 1;
    notes.push({ pitch: midiToPitch(midi), duration: dur, dynamic });
  }

  const lastIdx = notes.reduce<number>((f, n, i) => (!n.isRest ? i : f), -1);
  if (lastIdx >= 0 && rand() < 0.15)
    notes[lastIdx] = { ...notes[lastIdx], tie: true };

  let total = notes.reduce((s, n) => s + (DUR_TO_BEATS[n.duration] ?? 1), 0);
  while (total < totalBeats - 0.01) {
    const rem = totalBeats - total;
    if (rem < MIN_BEAT) break;
    const [, dur] = BEATS_TO_DUR.find(([b]) => b <= rem) ?? [0.25, "16"];
    notes.push({ pitch: "rest", duration: dur, isRest: true, dynamic });
    total += DUR_TO_BEATS[dur] ?? 0.25;
  }

  return { notes, lastMidi: last, lastDeg };
}

function perfectCadence(
  scale: number[],
  tonicC: number[],
  dominantC: number[],
  prevMidi: number,
  dyn: Dynamic,
): NoteType[] {
  const dSorted = [...dominantC].sort((a, b) => a - b);
  const tCands = [...tonicC]
    .sort((a, b) => a - b)
    .flatMap((t) => [-12, 0, 12].map((s) => t + s))
    .filter((m) => m >= 48 && m <= 84);
  const fifth = dSorted[0],
    leading = scale[6];
  const tonic = tCands.reduce(
    (best, c) =>
      Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
    tCands[0] ?? scale[0],
  );
  return [
    { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "q", dynamic: dyn },
    { pitch: midiToPitch(clamp(leading, 52, 79)), duration: "q", dynamic: dyn },
    {
      pitch: midiToPitch(clamp(fifth + 2, 52, 79)),
      duration: "q",
      dynamic: dyn,
    },
    { pitch: midiToPitch(clamp(leading, 52, 79)), duration: "q", dynamic: dyn },
    { pitch: midiToPitch(clamp(tonic, 52, 79)), duration: "w", dynamic: "p" },
  ];
}

function halfCadence(
  scale: number[],
  dominantC: number[],
  dyn: Dynamic,
): NoteType[] {
  const dSorted = [...dominantC].sort((a, b) => a - b);
  const fifth = dSorted[0],
    third = dSorted[1] ?? fifth + 4;
  return [
    {
      pitch: midiToPitch(clamp(scale[0], 52, 76)),
      duration: "q",
      dynamic: dyn,
    },
    {
      pitch: midiToPitch(clamp(scale[6], 52, 79)),
      duration: "q",
      dynamic: dyn,
    },
    { pitch: midiToPitch(clamp(third, 52, 79)), duration: "h", dynamic: dyn },
    { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "w", dynamic: dyn },
  ];
}

function deceptiveCadence(
  scale: number[],
  submedC: number[],
  dominantC: number[],
  prevMidi: number,
  dyn: Dynamic,
): NoteType[] {
  const dSorted = [...dominantC].sort((a, b) => a - b);
  const smSorted = [...submedC].sort((a, b) => a - b);
  const fifth = dSorted[0];
  const landing = smSorted
    .flatMap((t) => [-12, 0, 12].map((s) => t + s))
    .filter((m) => m >= 48 && m <= 84)
    .reduce(
      (best, c) =>
        Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
      smSorted[0] ?? scale[5],
    );
  return [
    { pitch: midiToPitch(clamp(fifth, 52, 76)), duration: "q", dynamic: dyn },
    {
      pitch: midiToPitch(clamp(scale[6], 52, 79)),
      duration: "q",
      dynamic: dyn,
    },
    {
      pitch: midiToPitch(clamp(smSorted[0], 52, 79)),
      duration: "h",
      dynamic: dyn,
    },
    {
      pitch: midiToPitch(clamp(landing, 52, 79)),
      duration: "w",
      dynamic: "mp",
    },
  ];
}

function plagalCadence(
  scale: number[],
  tonicC: number[],
  subdomC: number[],
  prevMidi: number,
  dyn: Dynamic,
): NoteType[] {
  const tCands = [...tonicC]
    .sort((a, b) => a - b)
    .flatMap((t) => [-12, 0, 12].map((s) => t + s))
    .filter((m) => m >= 48 && m <= 84);
  const fourth = [...subdomC].sort((a, b) => a - b)[0];
  const tonic = tCands.reduce(
    (best, c) =>
      Math.abs(c - prevMidi) < Math.abs(best - prevMidi) ? c : best,
    tCands[0] ?? scale[0],
  );
  return [
    { pitch: midiToPitch(clamp(fourth, 52, 76)), duration: "h", dynamic: dyn },
    {
      pitch: midiToPitch(clamp(scale[3], 52, 79)),
      duration: "h",
      dynamic: dyn,
    },
    { pitch: midiToPitch(clamp(tonic, 52, 79)), duration: "w", dynamic: "p" },
  ];
}

function cadenceForSection(
  section: "A" | "B" | "Ap" | "Coda",
  scale: number[],
  rootIdx: number,
  mode: "major" | "minor",
  prevMidi: number,
  dyn: Dynamic,
): NoteType[] {
  const tonicC = chordMidi("I", rootIdx, mode, 4),
    domC = chordMidi("V", rootIdx, mode, 4);
  const subdomC = chordMidi("IV", rootIdx, mode, 4),
    submedC = chordMidi("VI", rootIdx, mode, 4);
  let raw: NoteType[];
  switch (section) {
    case "Coda":
    case "Ap":
      raw = perfectCadence(scale, tonicC, domC, prevMidi, dyn);
      break;
    case "B":
      raw =
        rand() < 0.6
          ? halfCadence(scale, domC, dyn)
          : deceptiveCadence(scale, submedC, domC, prevMidi, dyn);
      break;
    default:
      raw =
        rand() < 0.7
          ? perfectCadence(scale, tonicC, domC, prevMidi, dyn)
          : plagalCadence(scale, tonicC, subdomC, prevMidi, dyn);
  }
  return enforceBeats(raw, BEATS_PER_BAR * 2, dyn);
}

function nearestRoot(
  tones: number[],
  prevRoot: number,
  lo = 40,
  hi = 55,
): number {
  const sorted = [...tones].sort((a, b) => a - b);
  const candidates = [-12, 0, 12]
    .map((s) => sorted[0] + s)
    .filter((m) => m >= lo && m <= hi);
  if (!candidates.length) return clamp(prevRoot, lo, hi);
  return candidates.reduce(
    (best, c) =>
      Math.abs(c - prevRoot) < Math.abs(best - prevRoot) ? c : best,
    candidates[0],
  );
}

function albertiBassBar(
  tones: number[],
  prevRoot: number,
  variety = false,
  dyn: Dynamic = "mf",
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prevRoot);
  const sorted = [...tones].sort((a, b) => a - b);
  const third = clamp(sorted[1] ?? root + 4, root + 2, root + 9);
  const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 11);
  const r = clamp(root, 40, 58),
    t = clamp(third, 40, 62),
    f = clamp(fifth, 40, 62);
  const pat = variety && rand() < 0.3 ? [r, t, f, t] : [r, f, t, f];
  return {
    notes: pat.map((m) => ({
      pitch: midiToPitch(m),
      duration: "q",
      dynamic: dyn,
    })),
    lastRoot: r,
  };
}

function blockChordBar(
  tones: number[],
  prevRoot: number,
  dyn: Dynamic = "mf",
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prevRoot, 40, 55);
  const sorted = [...tones].sort((a, b) => a - b);
  const third = clamp(sorted[1] ?? root + 4, root + 2, root + 7);
  return {
    notes: [
      { pitch: midiToPitch(clamp(root, 40, 55)), duration: "h", dynamic: dyn },
      { pitch: midiToPitch(clamp(third, 43, 60)), duration: "h", dynamic: dyn },
    ],
    lastRoot: clamp(root, 40, 55),
  };
}

function brokenChordBar(
  tones: number[],
  prevRoot: number,
  dyn: Dynamic = "mf",
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prevRoot, 40, 52);
  const sorted = [...tones].sort((a, b) => a - b);
  const third = clamp(sorted[1] ?? root + 4, root + 2, root + 7);
  const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 10);
  const oct = clamp(root + 12, root + 9, 60);
  return {
    notes: [
      { pitch: midiToPitch(root), duration: "q", dynamic: dyn },
      { pitch: midiToPitch(third), duration: "q", dynamic: dyn },
      { pitch: midiToPitch(fifth), duration: "q", dynamic: dyn },
      { pitch: midiToPitch(oct), duration: "q", dynamic: dyn },
    ],
    lastRoot: root,
  };
}

function walkingBassBar(
  tones: number[],
  nextTones: number[],
  scaleBass: number[],
  prevRoot: number,
  dyn: Dynamic = "mf",
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prevRoot, 40, 55);
  const nextRoot = clamp([...nextTones].sort((a, b) => a - b)[0], 40, 55);
  const dir = nextRoot >= root ? 1 : -1;
  let cursor = root;
  const walk = [root];
  for (let step = 0; step < 3; step++) {
    const opts = scaleBass
      .filter((m) =>
        dir > 0
          ? m > cursor && m <= nextRoot + 2
          : m < cursor && m >= nextRoot - 2,
      )
      .sort((a, b) => (dir > 0 ? a - b : b - a));
    cursor = opts[0] !== undefined ? opts[0] : clamp(cursor + dir * 2, 38, 58);
    walk.push(clamp(cursor, 38, 58));
  }
  return {
    notes: walk
      .slice(0, 4)
      .map((m) => ({
        pitch: midiToPitch(clamp(m, 38, 58)),
        duration: "q",
        dynamic: dyn,
      })),
    lastRoot: root,
  };
}

function pedalPointBar(
  tones: number[],
  prevRoot: number,
  dyn: Dynamic = "p",
): { notes: NoteType[]; lastRoot: number } {
  const root = nearestRoot(tones, prevRoot, 40, 52);
  const sorted = [...tones].sort((a, b) => a - b);
  const fifth = clamp(sorted[2] ?? root + 7, root + 4, root + 10);
  return {
    notes: [
      { pitch: midiToPitch(clamp(root, 40, 52)), duration: "h", dynamic: dyn },
      { pitch: midiToPitch(clamp(fifth, 44, 57)), duration: "h", dynamic: dyn },
    ],
    lastRoot: clamp(root, 40, 52),
  };
}

type LHPattern = "alberti" | "block" | "broken" | "walking" | "pedal";

function pickLHPattern(section: "A" | "B" | "Ap" | "Coda"): LHPattern {
  const profiles: Record<string, number[]> = {
    A: [5, 2, 1, 1, 0],
    B: [1, 3, 4, 1, 0],
    Ap: [1, 1, 2, 5, 0],
    Coda: [0, 2, 0, 1, 5],
  };
  const weights = profiles[section];
  const patterns: LHPattern[] = [
    "alberti",
    "block",
    "broken",
    "walking",
    "pedal",
  ];
  const totalW = weights.reduce((a, b) => a + b, 0);
  let r = rand() * totalW;
  for (let i = 0; i < patterns.length; i++) {
    r -= weights[i];
    if (r <= 0) return patterns[i];
  }
  return patterns[0];
}

export function generateSimpleSong({
  bars = 16,
  key = pick(["C", "G", "D", "F", "A", "Bb", "E", "Am", "Em", "Dm"]),
  mode,
  seed,
  tempo = 120,
  swing = 0,
}: GeneratorOptions = {}): GeneratedSong {
  rand = seed !== undefined ? makePrng(seed) : Math.random;
  const totalBars = Math.max(4, Math.round(bars / 4) * 4);
  const inferredMode: "major" | "minor" =
    mode ?? (/m(in)?$/i.test(key) ? "minor" : rand() < 0.4 ? "minor" : "major");
  const rootIdx = rootToMidi(key);
  const intervals = SCALES[inferredMode];
  const scaleOct4 = buildScale(rootIdx, intervals, [4]).slice(0, 7);
  const scaleBass = buildScale(rootIdx, intervals, [3]);

  type SectionId = "A" | "B" | "Ap" | "Coda";
  const numBlocks = totalBars / 4;
  const rotator: SectionId[] = ["A", "B", "Ap"];
  const sectionPlan: SectionId[] = Array.from({ length: numBlocks }, (_, i) =>
    i === numBlocks - 1 ? "Coda" : rotator[i % 3],
  );

  function sectionProg(id: SectionId): string[] {
    return id === "B"
      ? walkHarmonyGraph("VI", 4, inferredMode)
      : SECTION_PROGRESSIONS[inferredMode][id];
  }
  function sectionChordTones(prog: string[], octave = 4): number[][] {
    return prog.map((n) => chordMidi(n, rootIdx, inferredMode, octave));
  }

  const rightRaw: NoteType[] = [];
  let lastMidi = 64,
    lastDeg = 0;

  for (let blockIdx = 0; blockIdx < sectionPlan.length; blockIdx++) {
    const id = sectionPlan[blockIdx];
    const prog = sectionProg(id);
    const isClimax = id === "B";
    const isCoda = id === "Coda";
    const dynPair =
      SECTION_DYNAMICS[Math.min(blockIdx, SECTION_DYNAMICS.length - 1)];
    const chords = sectionChordTones(prog, isClimax ? 5 : 4);
    const [minM, maxM] = isClimax ? [57, 84] : isCoda ? [52, 79] : [52, 79];
    const seedMotif = generateSeedMotifForSection(id);
    const motif1 = seedMotif;
    const ct1 = [chords[0 % chords.length], chords[1 % chords.length]];
    const r1 = realise(
      motif1,
      scaleOct4,
      ct1,
      minM,
      maxM,
      isClimax,
      lastMidi,
      lastDeg,
      dynPair[0],
    );
    const phrase1 = enforceBeats(r1.notes, BEATS_PER_BAR * 2, dynPair[0]);
    rightRaw.push(...phrase1);
    lastMidi = r1.lastMidi;
    lastDeg = r1.lastDeg;
    const cadenceNotes = cadenceForSection(
      id,
      scaleOct4,
      rootIdx,
      inferredMode,
      lastMidi,
      dynPair[1],
    );
    rightRaw.push(...cadenceNotes);
    lastMidi = 64;
  }

  const leftRaw: NoteType[] = [];
  let prevRoot = rootIdx + 12 * 3 + 12;

  for (let blockIdx = 0; blockIdx < sectionPlan.length; blockIdx++) {
    const id = sectionPlan[blockIdx];
    const prog = sectionProg(id);
    const dynPair =
      SECTION_DYNAMICS[Math.min(blockIdx, SECTION_DYNAMICS.length - 1)];

    for (let barInBlock = 0; barInBlock < 4; barInBlock++) {
      const numeral = prog[barInBlock % prog.length];
      const nextNumer = prog[(barInBlock + 1) % prog.length];
      const tones = chordMidi(numeral, rootIdx, inferredMode, 3);
      const nextTones = chordMidi(nextNumer, rootIdx, inferredMode, 3);
      const dyn = dynPair[barInBlock < 2 ? 0 : 1];
      const isTonicDownbeat =
        numeral === "I" && barInBlock === 0 && (id === "A" || id === "Coda");
      let result: { notes: NoteType[]; lastRoot: number };

      if (isTonicDownbeat) {
        const root = nearestRoot(tones, prevRoot, 40, 52);
        result = {
          notes: [
            {
              pitch: midiToPitch(clamp(root, 40, 52)),
              duration: "h",
              dynamic: dyn,
            },
            {
              pitch: midiToPitch(clamp(root + 12, 52, 64)),
              duration: "h",
              dynamic: dyn,
            },
          ],
          lastRoot: root,
        };
      } else {
        const pattern = pickLHPattern(id);
        switch (pattern) {
          case "alberti":
            result = albertiBassBar(tones, prevRoot, true, dyn);
            break;
          case "block":
            result = blockChordBar(tones, prevRoot, dyn);
            break;
          case "broken":
            result = brokenChordBar(tones, prevRoot, dyn);
            break;
          case "walking":
            result = walkingBassBar(tones, nextTones, scaleBass, prevRoot, dyn);
            break;
          case "pedal":
            result = pedalPointBar(tones, prevRoot, dyn);
            break;
          default:
            result = albertiBassBar(tones, prevRoot, false, dyn);
        }
      }

      // Enforce exactly 1 bar per LH bar — MIN_BEAT guard prevents phantom notes
      const barNotes = enforceBeats(result.notes, BEATS_PER_BAR, dyn);
      leftRaw.push(...barNotes);
      prevRoot = result.lastRoot;
    }
  }

  return {
    right: applySwing(rightRaw, swing),
    left: applySwing(leftRaw, swing),
    bars: totalBars,
    key,
    mode: inferredMode,
    tempo,
    swing,
  };
}
