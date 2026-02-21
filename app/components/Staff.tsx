// "use client";

// import { useEffect, useRef } from "react";
// import {
//   Renderer,
//   Stave,
//   StaveNote,
//   Stem,
//   Formatter,
//   StaveConnector,
//   Voice,
//   Barline,
//   Beam,
// } from "vexflow";

// export interface NoteType {
//   pitch: string;
//   duration: string;
//   isRest?: boolean;
// }

// interface StaffProps {
//   right: NoteType[];
//   left: NoteType[];
//   bars?: number;
// }

// const TICKS: Record<string, number> = { w: 16, h: 8, q: 4, "8": 2 };

// function splitIntoBars(notes: NoteType[]): NoteType[][] {
//   const bars: NoteType[][] = [];
//   let bar: NoteType[] = [];
//   let ticks = 0;
//   for (const note of notes) {
//     bar.push(note);
//     ticks += TICKS[note.duration] ?? 4;
//     if (ticks >= 16) {
//       bars.push(bar);
//       bar = [];
//       ticks = 0;
//     }
//   }
//   if (bar.length) bars.push(bar);
//   return bars;
// }

// /**
//  * Convert generator pitch "C4" → VexFlow key "c/4".
//  * Also clamps the octave to a range that sits on or near the staff:
//  *   treble: octave 4–5  (C4–B5)
//  *   bass:   octave 2–4  (C2–B4, but prefer 3–4 for on-staff notes)
//  */
// function pitchToKey(pitch: string, clef: "treble" | "bass"): string {
//   const m = pitch.match(/^([A-G]#?)(\d)$/);
//   if (!m) return clef === "treble" ? "b/4" : "d/3";

//   const note = m[1].toLowerCase();
//   let oct = parseInt(m[2]);

//   if (clef === "treble") {
//     // Treble staff sits on E4–F5; clamp to 4–5
//     oct = Math.max(4, Math.min(5, oct));
//   } else {
//     // Bass staff sits on G2–A3; clamp to 2–4 but nudge up if too low
//     oct = Math.max(2, Math.min(4, oct));
//     // Anything in octave 2 is below the staff — push to 3
//     if (oct < 3) oct = 3;
//   }

//   return `${note}/${oct}`;
// }

// /**
//  * Stem direction by middle-line rule.
//  * Treble: B4 = middle line → notes on or above get stem down.
//  * Bass:   D3 = middle line → notes on or above get stem down.
//  */
// function stemDir(key: string, clef: "treble" | "bass"): number {
//   const m = key.match(/^([a-g]#?)\/(\d)$/);
//   if (!m) return Stem.UP;
//   const noteOrder = ["c", "d", "e", "f", "g", "a", "b"];
//   const n = noteOrder.indexOf(m[1].replace("#", ""));
//   const oct = parseInt(m[2]);
//   // Convert to a simple comparable number: oct*7 + noteIndex
//   const pos = oct * 7 + n;
//   const middleTreble = 4 * 7 + noteOrder.indexOf("b"); // B4
//   const middleBass = 3 * 7 + noteOrder.indexOf("d"); // D3
//   const middle = clef === "treble" ? middleTreble : middleBass;
//   return pos >= middle ? Stem.DOWN : Stem.UP;
// }

// export default function Staff({ right, left }: StaffProps) {
//   const ref = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!ref.current) return;
//     ref.current.innerHTML = "";
//     if (!right.length && !left.length) return;

//     const rightBars = splitIntoBars(right);
//     const leftBars = splitIntoBars(left);
//     const totalBars = Math.min(rightBars.length, leftBars.length);
//     if (totalBars === 0) return;

//     const BARS_PER_ROW = 4;
//     const LEFT_MARGIN = 16;
//     const CLEF_EXTRA = 80;
//     const BAR_WIDTH = 200;
//     const RIGHT_MARGIN = 20;
//     const TREBLE_Y_OFF = 20;
//     const BASS_Y_OFF = 160;
//     const ROW_HEIGHT = 270;

//     const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
//     const CANVAS_W =
//       LEFT_MARGIN + CLEF_EXTRA + BARS_PER_ROW * BAR_WIDTH + RIGHT_MARGIN;
//     const CANVAS_H = totalRows * ROW_HEIGHT + 20;

//     const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
//     renderer.resize(CANVAS_W, CANVAS_H);
//     const ctx = renderer.getContext();

//     function makeNote(note: NoteType, clef: "treble" | "bass"): StaveNote {
//       const restKey = clef === "treble" ? "b/4" : "d/3";

//       if (note.isRest || note.pitch === "rest") {
//         return new StaveNote({
//           clef,
//           keys: [restKey],
//           duration: note.duration + "r",
//         });
//       }

//       const key = pitchToKey(note.pitch, clef);
//       const sd = stemDir(key, clef);

//       return new StaveNote({
//         clef,
//         keys: [key],
//         duration: note.duration,
//         stemDirection: sd,
//         // auto_stem: false so our stemDirection is always respected
//       });
//     }

//     for (let row = 0; row < totalRows; row++) {
//       const rowY = row * ROW_HEIGHT;
//       const yTreble = rowY + TREBLE_Y_OFF;
//       const yBass = rowY + BASS_Y_OFF;
//       const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

//       for (let b = 0; b < barsInRow; b++) {
//         const barIndex = row * BARS_PER_ROW + b;
//         const isFirstInRow = b === 0;
//         const isLastBar = barIndex === totalBars - 1;

//         const x = isFirstInRow
//           ? LEFT_MARGIN
//           : LEFT_MARGIN + CLEF_EXTRA + b * BAR_WIDTH;
//         const width = isFirstInRow ? CLEF_EXTRA + BAR_WIDTH : BAR_WIDTH;

//         const treble = new Stave(x, yTreble, width);
//         const bass = new Stave(x, yBass, width);

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

//         const rNotes = rightBars[barIndex].map((n) => makeNote(n, "treble"));
//         const lNotes = leftBars[barIndex].map((n) => makeNote(n, "bass"));

//         const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.SOFT) // SOFT so minor tick mismatches don't throw
//           .addTickables(rNotes);
//         const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.SOFT)
//           .addTickables(lNotes);

//         const usableWidth = width - 30;
//         new Formatter().joinVoices([rVoice]).format([rVoice], usableWidth);
//         new Formatter().joinVoices([lVoice]).format([lVoice], usableWidth);

//         // Beam only eighth notes — non-eighth notes already have correct stems
//         // from stemDirection set in makeNote(). Don't use applyAndGetBeams as
//         // it overrides ALL stem directions, breaking non-beamed notes.
//         const rBeams = buildBeams(rNotes, Stem.UP);
//         const lBeams = buildBeams(lNotes, Stem.DOWN);

//         rVoice.draw(ctx, treble);
//         lVoice.draw(ctx, bass);

//         rBeams.forEach((bm) => bm.setContext(ctx).draw());
//         lBeams.forEach((bm) => bm.setContext(ctx).draw());
//       }
//     }
//   }, [right, left]);

//   return <div ref={ref} className="overflow-x-auto" />;
// }

// /**
//  * Build Beam objects only for consecutive eighth note groups.
//  * Non-eighth notes are skipped — their stems are already correct from stemDirection.
//  * This avoids the pitfall of Beam.applyAndGetBeams() which resets ALL stem directions.
//  */
// function buildBeams(notes: StaveNote[], direction: number): Beam[] {
//   const beams: Beam[] = [];
//   let group: StaveNote[] = [];

//   const flush = () => {
//     if (group.length >= 2) {
//       // Set consistent stem direction on the whole group before beaming
//       group.forEach((n) => n.setStemDirection(direction));
//       beams.push(new Beam(group));
//     } else if (group.length === 1) {
//       // Single eighth note — keep its own stem direction, no beam needed
//     }
//     group = [];
//   };

//   for (const note of notes) {
//     // getDuration() returns "8" for eighth notes
//     if (note.getDuration() === "8" && !note.isRest()) {
//       group.push(note);
//     } else {
//       flush();
//     }
//   }
//   flush();

//   return beams;
// }

"use client";

import { useEffect, useRef } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Stem,
  Formatter,
  StaveConnector,
  Voice,
  Barline,
  Beam,
  Accidental,
} from "vexflow";

export interface NoteType {
  pitch: string;
  duration: string;
  isRest?: boolean;
  dynamic?: string;
  tie?: boolean;
  swingOffset?: number;
}

interface StaffProps {
  right: NoteType[];
  left: NoteType[];
  bars?: number;
}

// ─── Beat constants ───────────────────────────────────────────────────────────
// CRITICAL: must include ALL durations the generator emits.
// The previous bug was "16" missing → treated as 0 beats → bar overflow.

const DUR_TO_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
  "16": 0.25,
};
const BEATS_PER_BAR = 4;

// ─── Bar slicer ───────────────────────────────────────────────────────────────
// Converts a flat NoteType[] into exactly-4-beat bars.
// Uses float arithmetic with epsilon tolerance for 16th-note precision.

function splitIntoBars(notes: NoteType[]): NoteType[][] {
  const bars: NoteType[][] = [];
  let current: NoteType[] = [];
  let acc = 0;

  const bestDur = (beats: number): string => {
    if (beats >= 4 - 0.01) return "w";
    if (beats >= 2 - 0.01) return "h";
    if (beats >= 1 - 0.01) return "q";
    if (beats >= 0.5 - 0.01) return "8";
    return "16";
  };

  const closebar = () => {
    // Pad any remaining space to exactly 4 beats
    let rem = BEATS_PER_BAR - acc;
    while (rem > 0.01) {
      const dur = bestDur(rem);
      current.push({ pitch: "rest", duration: dur, isRest: true });
      rem -= DUR_TO_BEATS[dur];
    }
    bars.push(current);
    current = [];
    acc = 0;
  };

  for (const note of notes) {
    const b = DUR_TO_BEATS[note.duration] ?? 1;
    const remaining = BEATS_PER_BAR - acc;

    if (b <= remaining + 0.01) {
      current.push(note);
      acc += b;
      if (acc >= BEATS_PER_BAR - 0.01) closebar();
    } else {
      // Note overflows bar — fill rest of bar with a matching-length rest,
      // then start the next bar with the note (at potentially shorter duration)
      if (remaining > 0.01) {
        const fillDur = bestDur(remaining);
        current.push({ ...note, duration: fillDur });
        acc += DUR_TO_BEATS[fillDur];
      }
      closebar();

      // Put remaining duration of the note at the start of next bar
      const carried =
        b - DUR_TO_BEATS[bestDur(remaining > 0.01 ? remaining : 0)];
      if (carried > 0.01) {
        const carriedDur = bestDur(carried);
        current.push({ ...note, duration: carriedDur });
        acc += DUR_TO_BEATS[carriedDur];
        if (acc >= BEATS_PER_BAR - 0.01) closebar();
      }
    }
  }

  if (current.length > 0) closebar();
  return bars;
}

// ─── Pitch helpers ────────────────────────────────────────────────────────────

// Generator emits "C4", "D#4", "Bb3" — VexFlow wants "c/4", "d#/4", "bb/3"
function pitchToKey(pitch: string): string {
  if (!pitch || pitch === "rest") return "b/4";
  const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return "b/4";
  const acc = m[2] ?? "";
  return `${m[1].toLowerCase()}${acc}/${m[3]}`;
}

// VexFlow does not auto-render accidentals — we must add them explicitly
function getAccidental(pitch: string): "#" | "b" | null {
  const m = pitch.match(/^[A-G](#|b)\d$/);
  if (!m) return null;
  return m[1] as "#" | "b";
}

// ─── Stem direction ───────────────────────────────────────────────────────────
// Standard rule: notes on or above the middle line get stem down.
// Treble middle line = B4, Bass middle line = D3.

function stemDir(pitch: string, clef: "treble" | "bass"): number {
  if (!pitch || pitch === "rest") return Stem.UP;
  const m = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return Stem.UP;
  const order = ["C", "D", "E", "F", "G", "A", "B"];
  const pos = parseInt(m[3]) * 7 + order.indexOf(m[1]);
  const mid =
    clef === "treble"
      ? 4 * 7 + order.indexOf("B") // B4 = 34
      : 3 * 7 + order.indexOf("D"); // D3 = 22
  return pos >= mid ? Stem.DOWN : Stem.UP;
}

// ─── StaveNote factory ────────────────────────────────────────────────────────

function makeNote(note: NoteType, clef: "treble" | "bass"): StaveNote {
  const restKey = clef === "treble" ? "b/4" : "d/3";
  const isRest = note.isRest || note.pitch === "rest";

  if (isRest) {
    return new StaveNote({
      clef,
      keys: [restKey],
      duration: note.duration + "r",
    });
  }

  const key = pitchToKey(note.pitch);
  const sn = new StaveNote({
    clef,
    keys: [key],
    duration: note.duration,
    stemDirection: stemDir(note.pitch, clef),
  });

  const acc = getAccidental(note.pitch);
  if (acc) sn.addModifier(new Accidental(acc), 0);

  return sn;
}

// ─── Beam builder ─────────────────────────────────────────────────────────────
// Groups consecutive beamable notes (8th + 16th) into Beam objects.
// Handles 16th notes which the old version skipped entirely.

function buildBeams(notes: StaveNote[], direction: number): Beam[] {
  const beams: Beam[] = [];
  let group: StaveNote[] = [];

  const flush = () => {
    if (group.length >= 2) {
      group.forEach((n) => n.setStemDirection(direction));
      beams.push(new Beam(group));
    }
    group = [];
  };

  for (const note of notes) {
    const beamable =
      (note.getDuration() === "8" || note.getDuration() === "16") &&
      !note.isRest();
    if (beamable) group.push(note);
    else flush();
  }
  flush();
  return beams;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Staff({ right, left }: StaffProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    if (!right.length && !left.length) return;

    const rightBars = splitIntoBars(right);
    const leftBars = splitIntoBars(left);
    const totalBars = Math.max(rightBars.length, leftBars.length);
    if (totalBars === 0) return;

    const BARS_PER_ROW = 4;
    const LEFT_MARGIN = 16;
    const CLEF_WIDTH = 80;
    const BAR_WIDTH = 210;
    const TREBLE_Y = 20;
    const BASS_Y = 160;
    const ROW_HEIGHT = 280;

    const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
    const canvasW = LEFT_MARGIN + CLEF_WIDTH + BARS_PER_ROW * BAR_WIDTH + 20;
    const canvasH = totalRows * ROW_HEIGHT + 40;

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();

    const fallbackBar = (clef: "treble" | "bass"): NoteType[] => [
      { pitch: "rest", duration: "w", isRest: true },
    ];

    for (let row = 0; row < totalRows; row++) {
      const rowY = row * ROW_HEIGHT;
      const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

      for (let b = 0; b < barsInRow; b++) {
        const barIdx = row * BARS_PER_ROW + b;
        const isFirstInRow = b === 0;
        const isLastBar = barIdx === totalBars - 1;

        const x = isFirstInRow
          ? LEFT_MARGIN
          : LEFT_MARGIN + CLEF_WIDTH + b * BAR_WIDTH;
        const width = isFirstInRow ? CLEF_WIDTH + BAR_WIDTH : BAR_WIDTH;

        const treble = new Stave(x, rowY + TREBLE_Y, width);
        const bass = new Stave(x, rowY + BASS_Y, width);

        if (isFirstInRow) {
          treble.addClef("treble").addTimeSignature("4/4");
          bass.addClef("bass").addTimeSignature("4/4");
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

        const rData = rightBars[barIdx] ?? fallbackBar("treble");
        const lData = leftBars[barIdx] ?? fallbackBar("bass");
        const rNotes = rData.map((n) => makeNote(n, "treble"));
        const lNotes = lData.map((n) => makeNote(n, "bass"));

        // SOFT mode prevents throws on tiny float rounding errors
        const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.SOFT)
          .addTickables(rNotes);
        const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.SOFT)
          .addTickables(lNotes);

        // Format each hand independently — avoids cross-hand spacing collisions
        const usableW = width - 20;
        new Formatter().joinVoices([rVoice]).format([rVoice], usableW);
        new Formatter().joinVoices([lVoice]).format([lVoice], usableW);

        rVoice.draw(ctx, treble);
        lVoice.draw(ctx, bass);

        buildBeams(rNotes, Stem.UP).forEach((bm) => bm.setContext(ctx).draw());
        buildBeams(lNotes, Stem.DOWN).forEach((bm) =>
          bm.setContext(ctx).draw(),
        );
      }
    }
  }, [right, left]);

  return <div ref={ref} className="overflow-x-auto" />;
}
