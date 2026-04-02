// "use client";

// import { useEffect, useRef } from "react";
// import {
//   Renderer,
//   Stave,
//   Stem,
//   Formatter,
//   StaveConnector,
//   Voice,
//   Barline,
//   Beam,
//   Accidental,
//   Fraction,
// } from "vexflow";
// import { RenderContext, StaveNote, StaveTie } from "vexflow";

// export interface NoteType {
//   pitch: string;
//   duration: string;
//   isRest?: boolean;
//   dynamic?: string;
//   tie?: boolean;
//   tieId?: string;
//   swingOffset?: number;
// }

// interface StaffProps {
//   right: NoteType[];
//   left: NoteType[];
//   bars?: number;
//   currentBeat?: number;
// }

// const TICKS_PER_BAR = 400;

// const DUR_TO_TICKS: Record<string, number> = {
//   w: 400,
//   h: 200,
//   q: 100,
//   "8": 50,
//   "16": 25,
// };

// const VALID_DURATIONS = new Set(["w", "h", "q", "8", "16"]);

// // How much space the clef + time signature consume inside the first bar.
// // Subtract this from the formatter width so notes don't drift into that area.
// const CLEF_TIMESIG_OVERHEAD = 80;

// function calcStemDir(pitch: string, clef: "treble" | "bass"): number {
//   if (!pitch || pitch === "rest") return Stem.UP;
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return Stem.UP;
//   const order = ["C", "D", "E", "F", "G", "A", "B"];
//   const pos = parseInt(m[3]) * 7 + order.indexOf(m[1]);
//   const mid = clef === "treble" ? 34 : 22;
//   return pos >= mid ? Stem.DOWN : Stem.UP;
// }

// function clampPitch(pitch: string, clef: "treble" | "bass"): string {
//   if (!pitch || pitch === "rest") return pitch;
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return pitch;
//   const note = m[1];
//   const acc = m[2] ?? "";
//   let octave = parseInt(m[3]);
//   if (clef === "treble") {
//     if (octave < 4) octave = 4;
//     if (octave > 6) octave = 6;
//   } else {
//     if (octave < 2) octave = 2;
//     if (octave > 4) octave = 4;
//   }
//   return `${note}${acc}${octave}`;
// }

// function bestDur(ticks: number): string {
//   if (ticks >= 400) return "w";
//   if (ticks >= 200) return "h";
//   if (ticks >= 100) return "q";
//   if (ticks >= 50) return "8";
//   return "16";
// }

// function sanitizeNote(note: NoteType): NoteType {
//   const dur = VALID_DURATIONS.has(note.duration) ? note.duration : "q";
//   const isRest =
//     note.isRest || !note.pitch || note.pitch === "rest" || note.pitch === "";
//   return { ...note, duration: dur, isRest };
// }

// function splitIntoBars(rawNotes: NoteType[]): NoteType[][] {
//   const notes = rawNotes.map(sanitizeNote);
//   const bars: NoteType[][] = [];
//   let current: NoteType[] = [];
//   let acc = 0;

//   const closebar = () => {
//     let rem = TICKS_PER_BAR - acc;
//     while (rem > 0) {
//       const dur = bestDur(rem);
//       const durTicks = DUR_TO_TICKS[dur] ?? 0;
//       if (durTicks <= 0) break;
//       current.push({ pitch: "rest", duration: dur, isRest: true });
//       rem -= durTicks;
//     }
//     bars.push(current);
//     current = [];
//     acc = 0;
//   };

//   for (const note of notes) {
//     const ticks = DUR_TO_TICKS[note.duration] ?? 100;
//     const remaining = TICKS_PER_BAR - acc;

//     if (ticks <= remaining) {
//       current.push({ ...note });
//       acc += ticks;
//       if (acc >= TICKS_PER_BAR) closebar();
//     } else {
//       // Note does not fit — fill rest of current bar completely, then start fresh.
//       // Use closebar() directly: it pads with rests until acc reaches TICKS_PER_BAR.
//       closebar();

//       // Now place the note at the start of the new bar.
//       // A whole note (w = 400) exactly fills one bar — safe.
//       // Any shorter note just accumulates normally.
//       current.push({ ...note });
//       acc += ticks;
//       if (acc >= TICKS_PER_BAR) closebar();
//     }
//   }

//   if (current.length > 0) closebar();

//   // Nuclear guard: every bar must be exactly TICKS_PER_BAR with no duplicate positions
//   return bars.map((bar, i) => {
//     const total = bar.reduce((s, n) => s + (DUR_TO_TICKS[n.duration] ?? 0), 0);
//     if (total !== TICKS_PER_BAR) {
//       console.error(
//         `Staff bar ${i} has ${total} ticks (expected ${TICKS_PER_BAR})`,
//       );
//       return [{ pitch: "rest", duration: "w", isRest: true }];
//     }
//     const positions: number[] = [];
//     let t = 0;
//     for (const n of bar) {
//       positions.push(t);
//       t += DUR_TO_TICKS[n.duration] ?? 0;
//     }
//     if (new Set(positions).size !== positions.length) {
//       console.error(
//         `Staff bar ${i} has duplicate tick positions — replacing with whole rest`,
//       );
//       return [{ pitch: "rest", duration: "w", isRest: true }];
//     }
//     return bar;
//   });
// }

// function pitchToKey(pitch: string): string {
//   if (!pitch || pitch === "rest") return "b/4";
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return "b/4";
//   return `${m[1].toLowerCase()}${m[2] ?? ""}/${m[3]}`;
// }

// function getAccidental(pitch: string): "#" | "b" | null {
//   const m = pitch.match(/^[A-G](#|b)\d$/);
//   if (!m) return null;
//   return m[1] as "#" | "b";
// }

// function makeNote(note: NoteType, clef: "treble" | "bass"): StaveNote {
//   const restKey = clef === "treble" ? "b/4" : "d/3";
//   const isRest = note.isRest || note.pitch === "rest" || !note.pitch;

//   if (isRest) {
//     return new StaveNote({
//       clef,
//       keys: [restKey],
//       duration: note.duration + "r",
//     });
//   }

//   const safePitch = clampPitch(note.pitch, clef);
//   const key = pitchToKey(safePitch);
//   const stemDirection = calcStemDir(safePitch, clef);
//   const sn = new StaveNote({
//     clef,
//     keys: [key],
//     duration: note.duration,
//     stemDirection,
//   });
//   const acc = getAccidental(safePitch);
//   if (acc) sn.addModifier(new Accidental(acc), 0);
//   return sn;
// }

// function buildBeams(notes: StaveNote[]): Beam[] {
//   return Beam.generateBeams(notes, { groups: [new Fraction(2, 8)] });
// }

// function drawTies(ctx: RenderContext, notes: StaveNote[], data: NoteType[]) {
//   for (let i = 0; i < data.length - 1; i++) {
//     const cur = data[i];
//     const next = data[i + 1];
//     if (cur.tie && next.tie && cur.tieId && cur.tieId === next.tieId) {
//       new StaveTie({
//         firstNote: notes[i],
//         lastNote: notes[i + 1],
//         firstIndexes: [0],
//         lastIndexes: [0],
//       })
//         .setContext(ctx)
//         .draw();
//     }
//   }
// }

// export default function Staff({ right, left, currentBeat }: StaffProps) {
//   const ref = useRef<HTMLDivElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     if (!ref.current) return;
//     ref.current.innerHTML = "";
//     if (!right.length && !left.length) return;

//     const rightBars = splitIntoBars(right);
//     const leftBars = splitIntoBars(left);
//     const totalBars = Math.max(rightBars.length, leftBars.length);
//     if (totalBars === 0) return;

//     const BARS_PER_ROW = 4;
//     const LEFT_MARGIN = 16;
//     const CLEF_WIDTH = 80; // extra width added to the first stave in each row
//     const BAR_WIDTH = 240; // note-area width — wider to give accidentals room
//     const TREBLE_Y = 20;
//     const BASS_Y = 160;
//     const ROW_HEIGHT = 280;

//     const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
//     const canvasW = LEFT_MARGIN + CLEF_WIDTH + BARS_PER_ROW * BAR_WIDTH + 20;
//     const canvasH = totalRows * ROW_HEIGHT + 40;

//     const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
//     renderer.resize(canvasW, canvasH);
//     const ctx = renderer.getContext();

//     const fallbackBar = (): NoteType[] => [
//       { pitch: "rest", duration: "w", isRest: true },
//     ];

//     const safeBar = (
//       bar: NoteType[],
//       hand: string,
//       idx: number,
//     ): NoteType[] => {
//       let t = 0;
//       const seen = new Set<number>();
//       for (const n of bar) {
//         if (seen.has(t)) {
//           console.error(`${hand} bar ${idx}: duplicate at tick ${t}`);
//           return [{ pitch: "rest", duration: "w", isRest: true }];
//         }
//         seen.add(t);
//         t += DUR_TO_TICKS[n.duration] ?? 0;
//       }
//       return bar;
//     };

//     for (let row = 0; row < totalRows; row++) {
//       const rowY = row * ROW_HEIGHT;
//       const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

//       for (let b = 0; b < barsInRow; b++) {
//         const barIdx = row * BARS_PER_ROW + b;
//         const isFirstInRow = b === 0;
//         const isLastBar = barIdx === totalBars - 1;

//         // ── Stave geometry ──────────────────────────────────────────────────
//         // First bar in a row is wider to accommodate clef + time signature.
//         // BAR_WIDTH is always the pure note-area width.
//         const staveX = isFirstInRow
//           ? LEFT_MARGIN
//           : LEFT_MARGIN + CLEF_WIDTH + b * BAR_WIDTH;
//         const staveWidth = isFirstInRow ? CLEF_WIDTH + BAR_WIDTH : BAR_WIDTH;

//         const treble = new Stave(staveX, rowY + TREBLE_Y, staveWidth);
//         const bass = new Stave(staveX, rowY + BASS_Y, staveWidth);

//         if (isFirstInRow) {
//           treble.addClef("treble").addTimeSignature("4/4");
//           bass.addClef("bass").addTimeSignature("4/4");
//         }
//         if (isLastBar) {
//           treble.setEndBarType(Barline.type.END);
//           bass.setEndBarType(Barline.type.END);
//         }

//         treble.setContext(ctx).draw();
//         bass.setContext(ctx).draw();

//         if (isFirstInRow) {
//           new StaveConnector(treble, bass)
//             .setType("brace")
//             .setContext(ctx)
//             .draw();
//           new StaveConnector(treble, bass)
//             .setType("singleLeft")
//             .setContext(ctx)
//             .draw();
//         }

//         // ── Formatter width ─────────────────────────────────────────────────
//         // THIS is the key fix: the formatter must only see the note-area width,
//         // not the full stave width. For the first bar, the clef + time signature
//         // already occupy CLEF_TIMESIG_OVERHEAD px inside the stave, so we
//         // subtract that. For all other bars, it's just BAR_WIDTH minus a small margin.
//         const formatterW = isFirstInRow
//           ? BAR_WIDTH - CLEF_TIMESIG_OVERHEAD
//           : BAR_WIDTH - 10;

//         const rData = safeBar(
//           rightBars[barIdx] ?? fallbackBar(),
//           "treble",
//           barIdx,
//         );
//         const lData = safeBar(
//           leftBars[barIdx] ?? fallbackBar(),
//           "bass",
//           barIdx,
//         );

//         const rNotes = rData.map((n) => makeNote(n, "treble"));
//         const lNotes = lData.map((n) => makeNote(n, "bass"));

//         const rBeams = buildBeams(rNotes);
//         const lBeams = buildBeams(lNotes);

//         const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.SOFT)
//           .addTickables(rNotes);
//         const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.SOFT)
//           .addTickables(lNotes);

//         // Format both voices together — VexFlow resolves accidental collisions
//         // and adds horizontal padding automatically when voices share a formatter.
//         new Formatter()
//           .joinVoices([rVoice])
//           .joinVoices([lVoice])
//           .format([rVoice, lVoice], formatterW, { alignRests: true });

//         rVoice.draw(ctx, treble);
//         lVoice.draw(ctx, bass);

//         drawTies(ctx, rNotes, rData);
//         drawTies(ctx, lNotes, lData);

//         rBeams.forEach((bm) => bm.setContext(ctx).draw());
//         lBeams.forEach((bm) => bm.setContext(ctx).draw());
//       }
//     }
//   }, [right, left]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const container = ref.current;
//     if (!canvas || !container) return;

//     const svg = container.querySelector("svg");
//     if (!svg) return;

//     const w = parseInt(svg.getAttribute("width") ?? "0");
//     const h = parseInt(svg.getAttribute("height") ?? "0");
//     if (!w || !h) return;

//     canvas.width = w;
//     canvas.height = h;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;
//     ctx.clearRect(0, 0, w, h);

//     if (!currentBeat || currentBeat <= 0) return;

//     // Must match the constants in the VexFlow useEffect above
//     const BARS_PER_ROW = 4;
//     const LEFT_MARGIN = 16;
//     const CLEF_WIDTH = 80;
//     const BAR_WIDTH = 240;
//     const TREBLE_Y = 20;
//     const BASS_Y = 160;
//     const ROW_HEIGHT = 280;
//     const STAVE_HEIGHT = 80;

//     const beatsPerBar = 4;
//     const totalBar = Math.floor(currentBeat / beatsPerBar);
//     const beatInBar = currentBeat % beatsPerBar;

//     const row = Math.floor(totalBar / BARS_PER_ROW);
//     const col = totalBar % BARS_PER_ROW;

//     // X position of note area start for this bar
//     const noteAreaX =
//       col === 0
//         ? LEFT_MARGIN + CLEF_WIDTH
//         : LEFT_MARGIN + CLEF_WIDTH + col * BAR_WIDTH;

//     const x = noteAreaX + (beatInBar / beatsPerBar) * BAR_WIDTH;
//     const rowY = row * ROW_HEIGHT;

//     ctx.save();
//     ctx.strokeStyle = "rgba(251, 146, 60, 0.9)";
//     ctx.lineWidth = 2;
//     ctx.shadowColor = "rgba(251, 146, 60, 0.5)";
//     ctx.shadowBlur = 8;
//     ctx.beginPath();
//     ctx.moveTo(x, rowY + TREBLE_Y);
//     ctx.lineTo(x, rowY + BASS_Y + STAVE_HEIGHT);
//     ctx.stroke();
//     ctx.restore();
//   }, [currentBeat]);

//   // Replace the existing return with:
//   return (
//     <div style={{ position: "relative", display: "inline-block" }}>
//       <div ref={ref} className="overflow-x-auto" />
//       <canvas
//         ref={canvasRef}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           pointerEvents: "none", // clicks pass through to anything below
//         }}
//       />
//     </div>
//   );
// }
// "use client";

// import { useEffect, useRef } from "react";
// import {
//   Renderer,
//   Stave,
//   Stem,
//   Formatter,
//   StaveConnector,
//   Voice,
//   Barline,
//   Beam,
//   Accidental,
//   Fraction,
//   Dot,
// } from "vexflow";
// import { RenderContext, StaveNote, StaveTie } from "vexflow";

// export interface NoteType {
//   pitch: string;
//   duration: string; // "w" | "h" | "hd" | "q" | "qd" | "8" | "8d" | "16"
//   isRest?: boolean;
//   dynamic?: string;
//   tie?: boolean;
//   tieId?: string;
// }

// interface StaffProps {
//   right: NoteType[];
//   left: NoteType[];
//   currentBeat?: number;
//   timeSig?: string;
// }

// // ── Duration tables ───────────────────────────────────────────────────────────
// //
// // Tick values for each duration. Dotted durations use the "d" suffix
// // convention (e.g. "qd" = dotted quarter = 150 ticks when q=100).
// //
// const DUR_TO_TICKS: Record<string, number> = {
//   w: 400,
//   wd: 600, // dotted whole (rare but valid)
//   h: 200,
//   hd: 300, // dotted half
//   q: 100,
//   qd: 150, // dotted quarter
//   "8": 50,
//   "8d": 75, // dotted eighth
//   "16": 25,
// };

// // VexFlow duration strings for dotted notes — we add a dot modifier separately
// const VEX_DUR_BASE: Record<string, string> = {
//   w: "w",
//   wd: "w",
//   h: "h",
//   hd: "h",
//   q: "q",
//   qd: "q",
//   "8": "8",
//   "8d": "8",
//   "16": "16",
// };

// const VALID_DURATIONS = new Set(Object.keys(DUR_TO_TICKS));

// // ── Beat duration (in beats, where quarter = 1) from internal duration string
// const DUR_TO_BEATS: Record<string, number> = {
//   w: 4,
//   wd: 6,
//   h: 2,
//   hd: 3,
//   q: 1,
//   qd: 1.5,
//   "8": 0.5,
//   "8d": 0.75,
//   "16": 0.25,
// };

// // ── Beat value → internal duration string ────────────────────────────────────
// // Used to convert from the hook's numeric beat durations to Staff duration strings.
// export function beatsToStaffDur(beats: number): string {
//   if (beats >= 6) return "wd";
//   if (beats >= 4) return "w";
//   if (beats >= 3) return "hd";
//   if (beats >= 2) return "h";
//   if (beats >= 1.5) return "qd";
//   if (beats >= 1) return "q";
//   if (beats >= 0.75) return "8d";
//   if (beats >= 0.5) return "8";
//   return "16";
// }

// // ── Time signature helpers ────────────────────────────────────────────────────
// function getVoiceAndTickParams(timeSig: string = "4/4") {
//   switch (timeSig) {
//     case "3/4":
//       return { numBeats: 3, beatValue: 4, ticksPerBar: 300 };
//     case "6/8":
//       return { numBeats: 6, beatValue: 8, ticksPerBar: 300 };
//     case "2/4":
//       return { numBeats: 2, beatValue: 4, ticksPerBar: 200 };
//     case "2/2":
//       return { numBeats: 2, beatValue: 2, ticksPerBar: 400 };
//     default:
//       return { numBeats: 4, beatValue: 4, ticksPerBar: 400 }; // 4/4
//   }
// }

// const CLEF_TIMESIG_OVERHEAD = 90;

// // ── Stem direction ────────────────────────────────────────────────────────────
// function calcStemDir(pitch: string, clef: "treble" | "bass"): number {
//   if (!pitch || pitch === "rest") return Stem.UP;
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return Stem.UP;
//   const order = ["C", "D", "E", "F", "G", "A", "B"];
//   const pos = parseInt(m[3]) * 7 + order.indexOf(m[1]);
//   const mid = clef === "treble" ? 34 : 22;
//   return pos >= mid ? Stem.DOWN : Stem.UP;
// }

// // ── Pitch clamping ────────────────────────────────────────────────────────────
// function clampPitch(pitch: string, clef: "treble" | "bass"): string {
//   if (!pitch || pitch === "rest") return pitch;
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return pitch;
//   const note = m[1];
//   const acc = m[2] ?? "";
//   let octave = parseInt(m[3]);
//   octave =
//     clef === "treble"
//       ? Math.min(Math.max(octave, 3), 6)
//       : Math.min(Math.max(octave, 1), 4);
//   return `${note}${acc}${octave}`;
// }

// // ── Best rest fill value ──────────────────────────────────────────────────────
// function bestDur(ticks: number): string {
//   if (ticks >= 600) return "wd";
//   if (ticks >= 400) return "w";
//   if (ticks >= 300) return "hd";
//   if (ticks >= 200) return "h";
//   if (ticks >= 150) return "qd";
//   if (ticks >= 100) return "q";
//   if (ticks >= 75) return "8d";
//   if (ticks >= 50) return "8";
//   return "16";
// }

// // ── Note sanitization ─────────────────────────────────────────────────────────
// function sanitizeNote(note: NoteType): NoteType {
//   const dur = VALID_DURATIONS.has(note.duration) ? note.duration : "q";
//   const isRest =
//     note.isRest || !note.pitch || note.pitch === "rest" || note.pitch === "";
//   return { ...note, duration: dur, isRest };
// }

// // ── Bar splitting ─────────────────────────────────────────────────────────────
// function splitIntoBars(
//   rawNotes: NoteType[],
//   ticksPerBar: number,
// ): NoteType[][] {
//   const notes = rawNotes.map(sanitizeNote);
//   const bars: NoteType[][] = [];
//   let current: NoteType[] = [];
//   let acc = 0;

//   const closebar = () => {
//     let rem = ticksPerBar - acc;
//     while (rem > 0) {
//       const dur = bestDur(rem);
//       const durTicks = DUR_TO_TICKS[dur] ?? 0;
//       if (durTicks <= 0) break;
//       current.push({ pitch: "rest", duration: dur, isRest: true });
//       rem -= durTicks;
//     }
//     bars.push(current);
//     current = [];
//     acc = 0;
//   };

//   for (const note of notes) {
//     const ticks = DUR_TO_TICKS[note.duration] ?? 100;

//     // Note is too large for bar — split with tie across barline
//     if (ticks > ticksPerBar) {
//       let rem = ticks;
//       while (rem > 0) {
//         const space = ticksPerBar - acc;
//         const chunk = Math.min(rem, space);
//         const chunkDur = bestDur(chunk);
//         const chunkTicks = DUR_TO_TICKS[chunkDur] ?? chunk;
//         const isFirst = rem === ticks;
//         const isLast = rem - chunkTicks <= 0;
//         current.push({
//           ...note,
//           duration: chunkDur,
//           tie: !isLast,
//           // carry tie from original note if it already has one
//         });
//         acc += chunkTicks;
//         rem -= chunkTicks;
//         if (acc >= ticksPerBar) closebar();
//       }
//       continue;
//     }

//     if (acc + ticks > ticksPerBar) closebar();
//     current.push({ ...note });
//     acc += ticks;
//     if (acc >= ticksPerBar) closebar();
//   }

//   if (current.length > 0) closebar();

//   // Validate each bar
//   return bars.map((bar, i) => {
//     const total = bar.reduce((s, n) => s + (DUR_TO_TICKS[n.duration] ?? 0), 0);
//     if (Math.abs(total - ticksPerBar) > 2) {
//       console.warn(
//         `Bar ${i}: ${total} ticks (expected ${ticksPerBar}), auto-correcting`,
//       );
//       return [{ pitch: "rest", duration: bestDur(ticksPerBar), isRest: true }];
//     }
//     return bar;
//   });
// }

// // ── Pitch → VexFlow key ───────────────────────────────────────────────────────
// function pitchToKey(pitch: string): string {
//   if (!pitch || pitch === "rest") return "b/4";
//   const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
//   if (!m) return "b/4";
//   return `${m[1].toLowerCase()}${m[2] ?? ""}/${m[3]}`;
// }

// function getAccidental(pitch: string): "#" | "b" | null {
//   const m = pitch.match(/^[A-G](#|b)\d$/);
//   return m ? (m[1] as "#" | "b") : null;
// }

// // ── StaveNote factory ─────────────────────────────────────────────────────────
// function makeNote(note: NoteType, clef: "treble" | "bass"): StaveNote {
//   const restKey = clef === "treble" ? "b/4" : "d/3";
//   const isRest = note.isRest || note.pitch === "rest" || !note.pitch;
//   const isDotted = note.duration.endsWith("d");
//   const vexDur = VEX_DUR_BASE[note.duration] ?? note.duration.replace("d", "");

//   if (isRest) {
//     const sn = new StaveNote({
//       clef,
//       keys: [restKey],
//       duration: vexDur + "r",
//     });
//     if (isDotted) Dot.buildAndAttach([sn], { all: true });
//     return sn;
//   }

//   const safePitch = clampPitch(note.pitch, clef);
//   const key = pitchToKey(safePitch);
//   const stemDirection = calcStemDir(safePitch, clef);
//   const sn = new StaveNote({
//     clef,
//     keys: [key],
//     duration: vexDur,
//     stemDirection,
//   });
//   if (isDotted) Dot.buildAndAttach([sn], { all: true });
//   const acc = getAccidental(safePitch);
//   if (acc) sn.addModifier(new Accidental(acc), 0);
//   return sn;
// }

// // ── Beaming ───────────────────────────────────────────────────────────────────
// // Group 8th and 16th notes into beams by beat, respecting dotted notes.
// // VexFlow's generateBeams handles most cases; we just pass the right groups.
// function buildBeams(
//   notes: StaveNote[],
//   numBeats: number,
//   beatValue: number,
// ): Beam[] {
//   // For compound time (6/8), group in 3-eighth beats
//   const groups = beatValue === 8 ? [new Fraction(3, 8)] : [new Fraction(2, 8)];

//   return Beam.generateBeams(notes, {
//     groups,
//     stemDirection: -1,
//     beamMiddleOnly: false,
//   });
// }

// // ── Ties ──────────────────────────────────────────────────────────────────────
// function drawTies(ctx: RenderContext, notes: StaveNote[], data: NoteType[]) {
//   for (let i = 0; i < data.length - 1; i++) {
//     if (!data[i].tie) continue;
//     const cur = data[i];
//     const next = data[i + 1];
//     // Tie if explicitly flagged OR pitches match (cross-bar tie)
//     const samePitch = !cur.isRest && !next.isRest && cur.pitch === next.pitch;
//     if (cur.tie || (cur.tieId && cur.tieId === next.tieId) || samePitch) {
//       try {
//         new StaveTie({
//           firstNote: notes[i],
//           lastNote: notes[i + 1],
//           firstIndexes: [0],
//           lastIndexes: [0],
//         })
//           .setContext(ctx)
//           .draw();
//       } catch {
//         // VexFlow occasionally throws on degenerate ties — safe to ignore
//       }
//     }
//   }
// }

// // ── Layout constants ──────────────────────────────────────────────────────────
// const BARS_PER_ROW = 4;
// const LEFT_MARGIN = 20;
// const CLEF_WIDTH = 90; // wider to accommodate clef + time sig cleanly
// const BAR_WIDTH = 240;
// const TREBLE_Y = 20;
// const BASS_Y = 160;
// const ROW_HEIGHT = 290;

// // ─────────────────────────────────────────────────────────────────────────────
// // COMPONENT
// // ─────────────────────────────────────────────────────────────────────────────
// export default function Staff({
//   right,
//   left,
//   currentBeat = 0,
//   timeSig = "4/4",
// }: StaffProps) {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const cursorRef = useRef<HTMLCanvasElement>(null);

//   const { numBeats, beatValue, ticksPerBar } = getVoiceAndTickParams(timeSig);

//   // ── Main score render ───────────────────────────────────────────────────────
//   useEffect(() => {
//     const el = containerRef.current;
//     if (!el) return;
//     el.innerHTML = "";
//     if (!right.length && !left.length) return;

//     const rightBars = splitIntoBars(right, ticksPerBar);
//     const leftBars = splitIntoBars(left, ticksPerBar);
//     const totalBars = Math.max(rightBars.length, leftBars.length);
//     if (totalBars === 0) return;

//     const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
//     const canvasW = LEFT_MARGIN + CLEF_WIDTH + BARS_PER_ROW * BAR_WIDTH + 30;
//     const canvasH = totalRows * ROW_HEIGHT + 60;

//     const renderer = new Renderer(el, Renderer.Backends.SVG);
//     renderer.resize(canvasW, canvasH);
//     const ctx = renderer.getContext();

//     // Slightly increase default font size for readability
//     ctx.setFont("Arial", 10);

//     const fallbackBar = (): NoteType[] => [
//       { pitch: "rest", duration: bestDur(ticksPerBar), isRest: true },
//     ];

//     for (let row = 0; row < totalRows; row++) {
//       const rowY = row * ROW_HEIGHT;
//       const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

//       for (let b = 0; b < barsInRow; b++) {
//         const barIdx = row * BARS_PER_ROW + b;
//         const isFirstInRow = b === 0;
//         const isLastBar = barIdx === totalBars - 1;

//         const staveX = isFirstInRow
//           ? LEFT_MARGIN
//           : LEFT_MARGIN + CLEF_WIDTH + b * BAR_WIDTH;
//         const staveWidth = isFirstInRow ? CLEF_WIDTH + BAR_WIDTH : BAR_WIDTH;

//         const treble = new Stave(staveX, rowY + TREBLE_Y, staveWidth);
//         const bass = new Stave(staveX, rowY + BASS_Y, staveWidth);

//         if (isFirstInRow) {
//           treble.addClef("treble").addTimeSignature(timeSig);
//           bass.addClef("bass").addTimeSignature(timeSig);
//         }
//         if (isLastBar) {
//           treble.setEndBarType(Barline.type.END);
//           bass.setEndBarType(Barline.type.END);
//         }

//         treble.setContext(ctx).draw();
//         bass.setContext(ctx).draw();

//         // Grand-staff bracket + left barline connector on first bar of each row
//         if (isFirstInRow) {
//           new StaveConnector(treble, bass)
//             .setType("brace")
//             .setContext(ctx)
//             .draw();
//           new StaveConnector(treble, bass)
//             .setType("singleLeft")
//             .setContext(ctx)
//             .draw();
//         }

//         // Join right barlines of both staves
//         new StaveConnector(treble, bass)
//           .setType("singleRight")
//           .setContext(ctx)
//           .draw();

//         const formatterW = isFirstInRow
//           ? BAR_WIDTH - CLEF_TIMESIG_OVERHEAD
//           : BAR_WIDTH - 12;

//         const rData = rightBars[barIdx] ?? fallbackBar();
//         const lData = leftBars[barIdx] ?? fallbackBar();

//         const rNotes = rData.map((n) => makeNote(n, "treble"));
//         const lNotes = lData.map((n) => makeNote(n, "bass"));

//         const rBeams = buildBeams(rNotes, numBeats, beatValue);
//         const lBeams = buildBeams(lNotes, numBeats, beatValue);

//         const rVoice = new Voice({ numBeats, beatValue })
//           .setMode(Voice.Mode.SOFT)
//           .addTickables(rNotes);

//         const lVoice = new Voice({ numBeats, beatValue })
//           .setMode(Voice.Mode.SOFT)
//           .addTickables(lNotes);

//         try {
//           new Formatter()
//             .joinVoices([rVoice])
//             .joinVoices([lVoice])
//             .format([rVoice, lVoice], formatterW, { alignRests: true });
//         } catch (e) {
//           console.warn("Formatter error on bar", barIdx, e);
//         }

//         rVoice.draw(ctx, treble);
//         lVoice.draw(ctx, bass);

//         drawTies(ctx, rNotes, rData);
//         drawTies(ctx, lNotes, lData);

//         rBeams.forEach((bm) => bm.setContext(ctx).draw());
//         lBeams.forEach((bm) => bm.setContext(ctx).draw());
//       }
//     }
//   }, [right, left, timeSig, numBeats, beatValue, ticksPerBar]);

//   // ── Playhead cursor overlay ─────────────────────────────────────────────────
//   useEffect(() => {
//     const container = containerRef.current;
//     const canvas = cursorRef.current;
//     if (!canvas || !container) return;

//     const svg = container.querySelector("svg");
//     if (!svg) return;

//     const w = parseInt(svg.getAttribute("width") ?? "0");
//     const h = parseInt(svg.getAttribute("height") ?? "0");
//     if (!w || !h) return;

//     canvas.width = w;
//     canvas.height = h;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;
//     ctx.clearRect(0, 0, w, h);
//     if (currentBeat <= 0) return;

//     // Beat → bar index + intra-bar beat position
//     // q=100 ticks → 1 beat; ticksPerBar / 100 = beats per bar
//     const beatsPerBar = ticksPerBar / 100;
//     const totalBar = Math.floor(currentBeat / beatsPerBar);
//     const beatInBar = currentBeat % beatsPerBar;

//     const row = Math.floor(totalBar / BARS_PER_ROW);
//     const col = totalBar % BARS_PER_ROW;

//     // X: note area starts at LEFT_MARGIN + CLEF_WIDTH for col 0, then shifts
//     const noteAreaStart =
//       col === 0
//         ? LEFT_MARGIN + CLEF_WIDTH
//         : LEFT_MARGIN + CLEF_WIDTH + col * BAR_WIDTH;

//     const x = noteAreaStart + (beatInBar / beatsPerBar) * BAR_WIDTH;
//     const rowY = row * ROW_HEIGHT;

//     // Draw a glowing vertical line spanning both staves
//     const gradient = ctx.createLinearGradient(
//       0,
//       rowY + TREBLE_Y,
//       0,
//       rowY + BASS_Y + 80,
//     );
//     gradient.addColorStop(0, "rgba(251,146,60,0)");
//     gradient.addColorStop(0.1, "rgba(251,146,60,0.9)");
//     gradient.addColorStop(0.9, "rgba(251,146,60,0.9)");
//     gradient.addColorStop(1, "rgba(251,146,60,0)");

//     ctx.save();
//     ctx.strokeStyle = gradient;
//     ctx.lineWidth = 2;
//     ctx.shadowColor = "rgba(251,146,60,0.5)";
//     ctx.shadowBlur = 8;
//     ctx.beginPath();
//     ctx.moveTo(x, rowY + TREBLE_Y);
//     ctx.lineTo(x, rowY + BASS_Y + 80);
//     ctx.stroke();
//     ctx.restore();
//   }, [currentBeat, timeSig, ticksPerBar]);

//   return (
//     <div
//       style={{
//         position: "relative",
//         display: "inline-block",
//         minWidth: "100%",
//       }}
//     >
//       <div
//         ref={containerRef}
//         className="overflow-x-auto"
//         style={{ lineHeight: 0 }}
//       />
//       <canvas
//         ref={cursorRef}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           pointerEvents: "none",
//         }}
//       />
//     </div>
//   );
// }

"use client";

import { useEffect, useRef } from "react";

import {
  Renderer,
  Stave,
  Stem,
  Formatter,
  StaveConnector,
  Voice,
  Barline,
  Beam,
  Accidental,
  Fraction,
  Dot,
} from "vexflow";

import { RenderContext, StaveNote, StaveTie } from "vexflow";

import { shouldShowAccidental } from "@/lib/musicTheory"; // ← NEW IMPORT

export interface NoteType {
  pitch: string;
  duration: string; // "w" | "h" | "hd" | "q" | "qd" | "8" | "8d" | "16"
  isRest?: boolean;
  dynamic?: string;
  tie?: boolean;
  tieId?: string;
}

interface StaffProps {
  right: NoteType[];
  left: NoteType[];
  currentBeat?: number;
  timeSig?: string;
  keySig?: string; // e.g. "G", "Bb", "Am"
}

const DUR_TO_TICKS: Record<string, number> = {
  w: 400,
  wd: 600,
  h: 200,
  hd: 300,
  q: 100,
  qd: 150,
  "8": 50,
  "8d": 75,
  "16": 25,
};

const VEX_DUR_BASE: Record<string, string> = {
  w: "w",
  wd: "w",
  h: "h",
  hd: "h",
  q: "q",
  qd: "q",
  "8": "8",
  "8d": "8",
  "16": "16",
};

const VALID_DURATIONS = new Set(Object.keys(DUR_TO_TICKS));

function getVoiceAndTickParams(timeSig: string = "4/4") {
  switch (timeSig) {
    case "3/4":
      return { numBeats: 3, beatValue: 4, ticksPerBar: 300 };
    case "6/8":
      return { numBeats: 6, beatValue: 8, ticksPerBar: 300 };
    case "2/4":
      return { numBeats: 2, beatValue: 4, ticksPerBar: 200 };
    case "2/2":
      return { numBeats: 2, beatValue: 2, ticksPerBar: 400 };
    default:
      return { numBeats: 4, beatValue: 4, ticksPerBar: 400 };
  }
}

const CLEF_TIMESIG_OVERHEAD = 90;

function calcStemDir(pitch: string, clef: "treble" | "bass"): number {
  if (!pitch || pitch === "rest") return Stem.UP;

  const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return Stem.UP;

  const order = ["C", "D", "E", "F", "G", "A", "B"];
  const pos = parseInt(m[3]) * 7 + order.indexOf(m[1]);
  const mid = clef === "treble" ? 34 : 22;
  return pos >= mid ? Stem.DOWN : Stem.UP;
}

function clampPitch(pitch: string, clef: "treble" | "bass"): string {
  if (!pitch || pitch === "rest") return pitch;

  const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return pitch;

  const note = m[1];
  const acc = m[2] ?? "";
  let octave = parseInt(m[3]);

  octave =
    clef === "treble"
      ? Math.min(Math.max(octave, 3), 6)
      : Math.min(Math.max(octave, 1), 4);

  return `${note}${acc}${octave}`;
}

function bestDur(ticks: number): string {
  if (ticks >= 600) return "wd";
  if (ticks >= 400) return "w";
  if (ticks >= 300) return "hd";
  if (ticks >= 200) return "h";
  if (ticks >= 150) return "qd";
  if (ticks >= 100) return "q";
  if (ticks >= 75) return "8d";
  if (ticks >= 50) return "8";
  return "16";
}

function sanitizeNote(note: NoteType): NoteType {
  const dur = VALID_DURATIONS.has(note.duration) ? note.duration : "q";
  const isRest =
    note.isRest || !note.pitch || note.pitch === "rest" || note.pitch === "";
  return { ...note, duration: dur, isRest };
}

function splitIntoBars(
  rawNotes: NoteType[],
  ticksPerBar: number,
): NoteType[][] {
  const notes = rawNotes.map(sanitizeNote);
  const bars: NoteType[][] = [];
  let current: NoteType[] = [];
  let acc = 0;

  const closebar = () => {
    let rem = ticksPerBar - acc;
    while (rem > 0) {
      const dur = bestDur(rem);
      const durTicks = DUR_TO_TICKS[dur] ?? 0;
      if (durTicks <= 0) break;
      current.push({ pitch: "rest", duration: dur, isRest: true });
      rem -= durTicks;
    }
    bars.push(current);
    current = [];
    acc = 0;
  };

  for (const note of notes) {
    const ticks = DUR_TO_TICKS[note.duration] ?? 100;

    if (ticks > ticksPerBar) {
      let rem = ticks;
      while (rem > 0) {
        const space = ticksPerBar - acc;
        const chunk = Math.min(rem, space);
        const chunkDur = bestDur(chunk);
        const chunkTicks = DUR_TO_TICKS[chunkDur] ?? chunk;
        const isLast = rem - chunkTicks <= 0;

        current.push({ ...note, duration: chunkDur, tie: !isLast });
        acc += chunkTicks;
        rem -= chunkTicks;
        if (acc >= ticksPerBar) closebar();
      }
      continue;
    }

    if (acc + ticks > ticksPerBar) closebar();
    current.push({ ...note });
    acc += ticks;
    if (acc >= ticksPerBar) closebar();
  }

  if (current.length > 0) closebar();

  return bars.map((bar) => {
    const total = bar.reduce((s, n) => s + (DUR_TO_TICKS[n.duration] ?? 0), 0);
    if (Math.abs(total - ticksPerBar) > 2) {
      return [{ pitch: "rest", duration: bestDur(ticksPerBar), isRest: true }];
    }
    return bar;
  });
}

function pitchToKey(pitch: string): string {
  if (!pitch || pitch === "rest") return "b/4";
  const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return "b/4";
  return `${m[1].toLowerCase()}${m[2] ?? ""}/${m[3]}`;
}

function getAccidental(pitch: string): "#" | "b" | null {
  const m = pitch.match(/^[A-G](#|b)\d$/);
  return m ? (m[1] as "#" | "b") : null;
}

// Updated makeNote using the new shouldShowAccidental
function makeNote(
  note: NoteType,
  clef: "treble" | "bass",
  keySig = "C",
): StaveNote {
  const restKey = clef === "treble" ? "b/4" : "d/3";
  const isRest = note.isRest || note.pitch === "rest" || !note.pitch;
  const isDotted = note.duration.endsWith("d");
  const vexDur = VEX_DUR_BASE[note.duration] ?? note.duration.replace("d", "");

  if (isRest) {
    const sn = new StaveNote({
      clef,
      keys: [restKey],
      duration: vexDur + "r",
    });
    if (isDotted) Dot.buildAndAttach([sn], { all: true });
    return sn;
  }

  const safePitch = clampPitch(note.pitch, clef);
  const key = pitchToKey(safePitch);
  const stemDirection = calcStemDir(safePitch, clef);

  const sn = new StaveNote({
    clef,
    keys: [key],
    duration: vexDur,
    stemDirection,
  });

  if (isDotted) Dot.buildAndAttach([sn], { all: true });

  // NEW: Use the shared function from musicTheory.ts
  const acc = getAccidental(safePitch);
  if (acc && shouldShowAccidental(safePitch, keySig)) {
    sn.addModifier(new Accidental(acc), 0);
  }

  return sn;
}

function buildBeams(
  notes: StaveNote[],
  numBeats: number,
  beatValue: number,
): Beam[] {
  const groups = beatValue === 8 ? [new Fraction(3, 8)] : [new Fraction(2, 8)];
  return Beam.generateBeams(notes, {
    groups,
    stemDirection: -1,
    beamMiddleOnly: false,
  });
}

function drawTies(ctx: RenderContext, notes: StaveNote[], data: NoteType[]) {
  for (let i = 0; i < data.length - 1; i++) {
    if (!data[i].tie) continue;

    const cur = data[i];
    const next = data[i + 1];
    const samePitch = !cur.isRest && !next.isRest && cur.pitch === next.pitch;

    if (cur.tie || (cur.tieId && cur.tieId === next.tieId) || samePitch) {
      try {
        new StaveTie({
          firstNote: notes[i],
          lastNote: notes[i + 1],
          firstIndexes: [0],
          lastIndexes: [0],
        })
          .setContext(ctx)
          .draw();
      } catch {
        console.log("Tie drawing failed");
      }
    }
  }
}

const BARS_PER_ROW = 4;
const LEFT_MARGIN = 20;
const CLEF_WIDTH = 90;
const BAR_WIDTH = 240;
const TREBLE_Y = 20;
const BASS_Y = 160;
const ROW_HEIGHT = 290;

export default function Staff({
  right,
  left,
  currentBeat = 0,
  timeSig = "4/4",
  keySig = "C",
}: StaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLCanvasElement>(null);

  const { numBeats, beatValue, ticksPerBar } = getVoiceAndTickParams(timeSig);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";
    if (!right.length && !left.length) return;

    const rightBars = splitIntoBars(right, ticksPerBar);
    const leftBars = splitIntoBars(left, ticksPerBar);
    const totalBars = Math.max(rightBars.length, leftBars.length);

    if (totalBars === 0) return;

    const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
    const canvasW = LEFT_MARGIN + CLEF_WIDTH + BARS_PER_ROW * BAR_WIDTH + 30;
    const canvasH = totalRows * ROW_HEIGHT + 60;

    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();
    ctx.setFont("Arial", 10);

    const fallbackBar = (): NoteType[] => [
      { pitch: "rest", duration: bestDur(ticksPerBar), isRest: true },
    ];

    for (let row = 0; row < totalRows; row++) {
      const rowY = row * ROW_HEIGHT;
      const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

      for (let b = 0; b < barsInRow; b++) {
        const barIdx = row * BARS_PER_ROW + b;
        const isFirstInRow = b === 0;
        const isLastBar = barIdx === totalBars - 1;

        const staveX = isFirstInRow
          ? LEFT_MARGIN
          : LEFT_MARGIN + CLEF_WIDTH + b * BAR_WIDTH;

        const staveWidth = isFirstInRow ? CLEF_WIDTH + BAR_WIDTH : BAR_WIDTH;

        const treble = new Stave(staveX, rowY + TREBLE_Y, staveWidth);
        const bass = new Stave(staveX, rowY + BASS_Y, staveWidth);

        if (isFirstInRow) {
          treble
            .addClef("treble")
            .addTimeSignature(timeSig)
            .addKeySignature(keySig);
          bass
            .addClef("bass")
            .addTimeSignature(timeSig)
            .addKeySignature(keySig);
        }

        if (isLastBar) {
          treble.setEndBarType(Barline.type.END);
          bass.setEndBarType(Barline.type.END);
        }

        treble.setContext(ctx).draw();
        bass.setContext(ctx).draw();

        if (isFirstInRow) {
          new StaveConnector(treble, bass)
            .setType("brace")
            .setContext(ctx)
            .draw();
          new StaveConnector(treble, bass)
            .setType("singleLeft")
            .setContext(ctx)
            .draw();
        }
        new StaveConnector(treble, bass)
          .setType("singleRight")
          .setContext(ctx)
          .draw();

        const formatterW = isFirstInRow
          ? BAR_WIDTH - CLEF_TIMESIG_OVERHEAD
          : BAR_WIDTH - 12;

        const rData = rightBars[barIdx] ?? fallbackBar();
        const lData = leftBars[barIdx] ?? fallbackBar();

        const rNotes = rData.map((n) => makeNote(n, "treble", keySig));
        const lNotes = lData.map((n) => makeNote(n, "bass", keySig));

        const rBeams = buildBeams(rNotes, numBeats, beatValue);
        const lBeams = buildBeams(lNotes, numBeats, beatValue);

        const rVoice = new Voice({ numBeats, beatValue })
          .setMode(Voice.Mode.SOFT)
          .addTickables(rNotes);

        const lVoice = new Voice({ numBeats, beatValue })
          .setMode(Voice.Mode.SOFT)
          .addTickables(lNotes);

        try {
          new Formatter()
            .joinVoices([rVoice, lVoice])
            .format([rVoice, lVoice], formatterW, { alignRests: true });
        } catch (e) {
          console.warn("Formatter error on bar", barIdx, e);
        }

        rVoice.draw(ctx, treble);
        lVoice.draw(ctx, bass);

        drawTies(ctx, rNotes, rData);
        drawTies(ctx, lNotes, lData);

        rBeams.forEach((bm) => bm.setContext(ctx).draw());
        lBeams.forEach((bm) => bm.setContext(ctx).draw());
      }
    }
  }, [right, left, timeSig, keySig, numBeats, beatValue, ticksPerBar]);

  // Playhead overlay (unchanged)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = cursorRef.current;
    if (!canvas || !container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    const w = parseInt(svg.getAttribute("width") ?? "0");
    const h = parseInt(svg.getAttribute("height") ?? "0");
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    if (currentBeat <= 0) return;

    const beatsPerBar = ticksPerBar / 100;
    const totalBar = Math.floor(currentBeat / beatsPerBar);
    const beatInBar = currentBeat % beatsPerBar;

    const row = Math.floor(totalBar / BARS_PER_ROW);
    const col = totalBar % BARS_PER_ROW;

    const noteAreaStart =
      col === 0
        ? LEFT_MARGIN + CLEF_WIDTH
        : LEFT_MARGIN + CLEF_WIDTH + col * BAR_WIDTH;

    const x = noteAreaStart + (beatInBar / beatsPerBar) * BAR_WIDTH;
    const rowY = row * ROW_HEIGHT;

    const gradient = ctx.createLinearGradient(
      0,
      rowY + TREBLE_Y,
      0,
      rowY + BASS_Y + 80,
    );
    gradient.addColorStop(0, "rgba(251,146,60,0)");
    gradient.addColorStop(0.1, "rgba(251,146,60,0.9)");
    gradient.addColorStop(0.9, "rgba(251,146,60,0.9)");
    gradient.addColorStop(1, "rgba(251,146,60,0)");

    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(251,146,60,0.5)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, rowY + TREBLE_Y);
    ctx.lineTo(x, rowY + BASS_Y + 80);
    ctx.stroke();
    ctx.restore();
  }, [currentBeat, ticksPerBar]);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        minWidth: "100%",
      }}
    >
      <div
        ref={containerRef}
        className="overflow-x-auto"
        style={{ lineHeight: 0 }}
      />
      <canvas
        ref={cursorRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
