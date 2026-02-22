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
  Stem,
  Formatter,
  StaveConnector,
  Voice,
  Barline,
  Beam,
  Accidental,
  Fraction,
} from "vexflow";
import { RenderContext, StaveNote, StaveTie } from "vexflow";

export interface NoteType {
  pitch: string;
  duration: string;
  isRest?: boolean;
  dynamic?: string;
  tie?: boolean;
  tieId?: string;
  swingOffset?: number;
}

interface StaffProps {
  right: NoteType[];
  left: NoteType[];
  bars?: number;
}

const TICKS_PER_BAR = 400;

const DUR_TO_TICKS: Record<string, number> = {
  w: 400,
  h: 200,
  q: 100,
  "8": 50,
  "16": 25,
};

const VALID_DURATIONS = new Set(["w", "h", "q", "8", "16"]);

// How much space the clef + time signature consume inside the first bar.
// Subtract this from the formatter width so notes don't drift into that area.
const CLEF_TIMESIG_OVERHEAD = 80;

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
  if (clef === "treble") {
    if (octave < 4) octave = 4;
    if (octave > 6) octave = 6;
  } else {
    if (octave < 2) octave = 2;
    if (octave > 4) octave = 4;
  }
  return `${note}${acc}${octave}`;
}

function bestDur(ticks: number): string {
  if (ticks >= 400) return "w";
  if (ticks >= 200) return "h";
  if (ticks >= 100) return "q";
  if (ticks >= 50) return "8";
  return "16";
}

function sanitizeNote(note: NoteType): NoteType {
  const dur = VALID_DURATIONS.has(note.duration) ? note.duration : "q";
  const isRest =
    note.isRest || !note.pitch || note.pitch === "rest" || note.pitch === "";
  return { ...note, duration: dur, isRest };
}

function splitIntoBars(rawNotes: NoteType[]): NoteType[][] {
  const notes = rawNotes.map(sanitizeNote);
  const bars: NoteType[][] = [];
  let current: NoteType[] = [];
  let acc = 0;

  const closebar = () => {
    let rem = TICKS_PER_BAR - acc;
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
    const remaining = TICKS_PER_BAR - acc;

    if (ticks <= remaining) {
      current.push({ ...note });
      acc += ticks;
      if (acc >= TICKS_PER_BAR) closebar();
    } else {
      // Note does not fit — fill rest of current bar completely, then start fresh.
      // Use closebar() directly: it pads with rests until acc reaches TICKS_PER_BAR.
      closebar();

      // Now place the note at the start of the new bar.
      // A whole note (w = 400) exactly fills one bar — safe.
      // Any shorter note just accumulates normally.
      current.push({ ...note });
      acc += ticks;
      if (acc >= TICKS_PER_BAR) closebar();
    }
  }

  if (current.length > 0) closebar();

  // Nuclear guard: every bar must be exactly TICKS_PER_BAR with no duplicate positions
  return bars.map((bar, i) => {
    const total = bar.reduce((s, n) => s + (DUR_TO_TICKS[n.duration] ?? 0), 0);
    if (total !== TICKS_PER_BAR) {
      console.error(
        `Staff bar ${i} has ${total} ticks (expected ${TICKS_PER_BAR})`,
      );
      return [{ pitch: "rest", duration: "w", isRest: true }];
    }
    const positions: number[] = [];
    let t = 0;
    for (const n of bar) {
      positions.push(t);
      t += DUR_TO_TICKS[n.duration] ?? 0;
    }
    if (new Set(positions).size !== positions.length) {
      console.error(
        `Staff bar ${i} has duplicate tick positions — replacing with whole rest`,
      );
      return [{ pitch: "rest", duration: "w", isRest: true }];
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
  if (!m) return null;
  return m[1] as "#" | "b";
}

function makeNote(note: NoteType, clef: "treble" | "bass"): StaveNote {
  const restKey = clef === "treble" ? "b/4" : "d/3";
  const isRest = note.isRest || note.pitch === "rest" || !note.pitch;

  if (isRest) {
    return new StaveNote({
      clef,
      keys: [restKey],
      duration: note.duration + "r",
    });
  }

  const safePitch = clampPitch(note.pitch, clef);
  const key = pitchToKey(safePitch);
  const stemDirection = calcStemDir(safePitch, clef);
  const sn = new StaveNote({
    clef,
    keys: [key],
    duration: note.duration,
    stemDirection,
  });
  const acc = getAccidental(safePitch);
  if (acc) sn.addModifier(new Accidental(acc), 0);
  return sn;
}

function buildBeams(notes: StaveNote[]): Beam[] {
  return Beam.generateBeams(notes, { groups: [new Fraction(2, 8)] });
}

function drawTies(ctx: RenderContext, notes: StaveNote[], data: NoteType[]) {
  for (let i = 0; i < data.length - 1; i++) {
    const cur = data[i];
    const next = data[i + 1];
    if (cur.tie && next.tie && cur.tieId && cur.tieId === next.tieId) {
      new StaveTie({
        firstNote: notes[i],
        lastNote: notes[i + 1],
        firstIndexes: [0],
        lastIndexes: [0],
      })
        .setContext(ctx)
        .draw();
    }
  }
}

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
    const CLEF_WIDTH = 80; // extra width added to the first stave in each row
    const BAR_WIDTH = 240; // note-area width — wider to give accidentals room
    const TREBLE_Y = 20;
    const BASS_Y = 160;
    const ROW_HEIGHT = 280;

    const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
    const canvasW = LEFT_MARGIN + CLEF_WIDTH + BARS_PER_ROW * BAR_WIDTH + 20;
    const canvasH = totalRows * ROW_HEIGHT + 40;

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();

    const fallbackBar = (): NoteType[] => [
      { pitch: "rest", duration: "w", isRest: true },
    ];

    const safeBar = (
      bar: NoteType[],
      hand: string,
      idx: number,
    ): NoteType[] => {
      let t = 0;
      const seen = new Set<number>();
      for (const n of bar) {
        if (seen.has(t)) {
          console.error(`${hand} bar ${idx}: duplicate at tick ${t}`);
          return [{ pitch: "rest", duration: "w", isRest: true }];
        }
        seen.add(t);
        t += DUR_TO_TICKS[n.duration] ?? 0;
      }
      return bar;
    };

    for (let row = 0; row < totalRows; row++) {
      const rowY = row * ROW_HEIGHT;
      const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

      for (let b = 0; b < barsInRow; b++) {
        const barIdx = row * BARS_PER_ROW + b;
        const isFirstInRow = b === 0;
        const isLastBar = barIdx === totalBars - 1;

        // ── Stave geometry ──────────────────────────────────────────────────
        // First bar in a row is wider to accommodate clef + time signature.
        // BAR_WIDTH is always the pure note-area width.
        const staveX = isFirstInRow
          ? LEFT_MARGIN
          : LEFT_MARGIN + CLEF_WIDTH + b * BAR_WIDTH;
        const staveWidth = isFirstInRow ? CLEF_WIDTH + BAR_WIDTH : BAR_WIDTH;

        const treble = new Stave(staveX, rowY + TREBLE_Y, staveWidth);
        const bass = new Stave(staveX, rowY + BASS_Y, staveWidth);

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

        // ── Formatter width ─────────────────────────────────────────────────
        // THIS is the key fix: the formatter must only see the note-area width,
        // not the full stave width. For the first bar, the clef + time signature
        // already occupy CLEF_TIMESIG_OVERHEAD px inside the stave, so we
        // subtract that. For all other bars, it's just BAR_WIDTH minus a small margin.
        const formatterW = isFirstInRow
          ? BAR_WIDTH - CLEF_TIMESIG_OVERHEAD
          : BAR_WIDTH - 10;

        const rData = safeBar(
          rightBars[barIdx] ?? fallbackBar(),
          "treble",
          barIdx,
        );
        const lData = safeBar(
          leftBars[barIdx] ?? fallbackBar(),
          "bass",
          barIdx,
        );

        const rNotes = rData.map((n) => makeNote(n, "treble"));
        const lNotes = lData.map((n) => makeNote(n, "bass"));

        const rBeams = buildBeams(rNotes);
        const lBeams = buildBeams(lNotes);

        const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.SOFT)
          .addTickables(rNotes);
        const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.SOFT)
          .addTickables(lNotes);

        // Format both voices together — VexFlow resolves accidental collisions
        // and adds horizontal padding automatically when voices share a formatter.
        new Formatter()
          .joinVoices([rVoice])
          .joinVoices([lVoice])
          .format([rVoice, lVoice], formatterW, { alignRests: true });

        rVoice.draw(ctx, treble);
        lVoice.draw(ctx, bass);

        drawTies(ctx, rNotes, rData);
        drawTies(ctx, lNotes, lData);

        rBeams.forEach((bm) => bm.setContext(ctx).draw());
        lBeams.forEach((bm) => bm.setContext(ctx).draw());
      }
    }
  }, [right, left]);

  return <div ref={ref} className="overflow-x-auto" />;
}
