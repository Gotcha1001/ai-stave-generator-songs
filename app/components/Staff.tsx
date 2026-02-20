// "use client";

// import { useEffect, useRef } from "react";
// import {
//   Renderer,
//   Stave,
//   StaveNote,
//   Formatter,
//   StaveConnector,
//   Voice,
//   Barline,
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

// const TICKS: Record<string, number> = {
//   w: 16,
//   h: 8,
//   q: 4,
// };

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
//   return bars;
// }

// // Middle-line stem direction rules
// // Treble middle line = B4: on/above → stem down, below → stem up
// function trebleStemDir(pitch: string): number {
//   const order = [
//     "C4",
//     "D4",
//     "E4",
//     "F4",
//     "G4",
//     "A4",
//     "B4",
//     "C5",
//     "D5",
//     "E5",
//     "F5",
//     "G5",
//   ];
//   return order.indexOf(pitch) >= 6 ? -1 : 1;
// }

// // Bass middle line = D3: on/above → stem down, below → stem up
// function bassStemDir(pitch: string): number {
//   const order = [
//     "G2",
//     "A2",
//     "B2",
//     "C3",
//     "D3",
//     "E3",
//     "F3",
//     "G3",
//     "A3",
//     "B3",
//     "C4",
//   ];
//   return order.indexOf(pitch) >= 4 ? -1 : 1;
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

//     // ── Layout ────────────────────────────────────────────────────
//     const BARS_PER_ROW = 4;
//     const LEFT_MARGIN = 16;
//     const CLEF_EXTRA = 80;
//     const BAR_WIDTH = 200;
//     const RIGHT_MARGIN = 20;
//     const TREBLE_Y_OFF = 20;
//     const BASS_Y_OFF = 160;
//     const ROW_HEIGHT = 270;

//     const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
//     const CANVAS_WIDTH =
//       LEFT_MARGIN + CLEF_EXTRA + BARS_PER_ROW * BAR_WIDTH + RIGHT_MARGIN;
//     const CANVAS_HEIGHT = totalRows * ROW_HEIGHT + 20;

//     const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
//     renderer.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
//     const context = renderer.getContext();

//     const toTrebleNote = (note: NoteType): StaveNote => {
//       if (note.isRest) {
//         // VexFlow rest: append "r" to duration, keys use a position just for placement
//         return new StaveNote({
//           clef: "treble",
//           keys: ["b/4"], // rests sit on middle line
//           duration: note.duration + "r",
//         });
//       }
//       return new StaveNote({
//         clef: "treble",
//         keys: [`${note.pitch[0].toLowerCase()}/${note.pitch.slice(1)}`],
//         duration: note.duration,
//         stemDirection: trebleStemDir(note.pitch),
//       });
//     };

//     const toBassNote = (note: NoteType): StaveNote => {
//       if (note.isRest) {
//         return new StaveNote({
//           clef: "bass",
//           keys: ["d/3"], // rests sit on middle line of bass
//           duration: note.duration + "r",
//         });
//       }
//       return new StaveNote({
//         clef: "bass",
//         keys: [`${note.pitch[0].toLowerCase()}/${note.pitch.slice(1)}`],
//         duration: note.duration,
//         stemDirection: bassStemDir(note.pitch),
//       });
//     };

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

//         treble.setContext(context).draw();
//         bass.setContext(context).draw();

//         if (isFirstInRow) {
//           new StaveConnector(treble, bass)
//             .setType("brace")
//             .setContext(context)
//             .draw();
//           new StaveConnector(treble, bass)
//             .setType("singleLeft")
//             .setContext(context)
//             .draw();
//         }

//         const rNotes = rightBars[barIndex].map(toTrebleNote);
//         const lNotes = leftBars[barIndex].map(toBassNote);

//         const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.STRICT)
//           .addTickables(rNotes);
//         const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
//           .setMode(Voice.Mode.STRICT)
//           .addTickables(lNotes);

//         const usableWidth = width - 30;
//         new Formatter().joinVoices([rVoice]).format([rVoice], usableWidth);
//         new Formatter().joinVoices([lVoice]).format([lVoice], usableWidth);

//         rVoice.draw(context, treble);
//         lVoice.draw(context, bass);
//       }
//     }
//   }, [right, left]);

//   return <div ref={ref} className="overflow-x-auto" />;
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
} from "vexflow";

export interface NoteType {
  pitch: string;
  duration: string;
  isRest?: boolean;
}

interface StaffProps {
  right: NoteType[];
  left: NoteType[];
  bars?: number;
}

const TICKS: Record<string, number> = {
  w: 16,
  h: 8,
  q: 4,
  "8": 2,
};

function splitIntoBars(notes: NoteType[]): NoteType[][] {
  const bars: NoteType[][] = [];
  let bar: NoteType[] = [];
  let ticks = 0;
  for (const note of notes) {
    bar.push(note);
    ticks += TICKS[note.duration] ?? 4;
    if (ticks >= 16) {
      bars.push(bar);
      bar = [];
      ticks = 0;
    }
  }
  return bars;
}

// Middle-line rule applied manually for non-beamed notes
// Treble: B4 and above → stem down; below → stem up
function trebleStemDir(pitch: string): number {
  const order = [
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
  ];
  return order.indexOf(pitch) >= 6 ? Stem.DOWN : Stem.UP;
}
// Bass: D3 and above → stem down; below → stem up
function bassStemDir(pitch: string): number {
  const order = [
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
  return order.indexOf(pitch) >= 4 ? Stem.DOWN : Stem.UP;
}

export default function Staff({ right, left }: StaffProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    if (!right.length && !left.length) return;

    const rightBars = splitIntoBars(right);
    const leftBars = splitIntoBars(left);
    const totalBars = Math.min(rightBars.length, leftBars.length);
    if (totalBars === 0) return;

    const BARS_PER_ROW = 4;
    const LEFT_MARGIN = 16;
    const CLEF_EXTRA = 80;
    const BAR_WIDTH = 200;
    const RIGHT_MARGIN = 20;
    const TREBLE_Y_OFF = 20;
    const BASS_Y_OFF = 160;
    const ROW_HEIGHT = 270;

    const totalRows = Math.ceil(totalBars / BARS_PER_ROW);
    const CANVAS_WIDTH =
      LEFT_MARGIN + CLEF_EXTRA + BARS_PER_ROW * BAR_WIDTH + RIGHT_MARGIN;
    const CANVAS_HEIGHT = totalRows * ROW_HEIGHT + 20;

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
    const context = renderer.getContext();

    // For quavers: no stemDirection set here — applyAndGetBeams will handle it
    // For non-quavers: apply middle-line rule manually (no auto_stem, it conflicts)
    const toNote =
      (
        clef: "treble" | "bass",
        restKey: string,
        stemDirFn: (p: string) => number,
      ) =>
      (note: NoteType): StaveNote => {
        if (note.isRest) {
          return new StaveNote({
            clef,
            keys: [restKey],
            duration: note.duration + "r",
          });
        }
        const key = `${note.pitch[0].toLowerCase()}/${note.pitch.slice(1)}`;
        // Quavers: leave stemDirection unset — applyAndGetBeams sets it for the group
        // Non-quavers: set manually using the middle-line rule
        if (note.duration === "8") {
          return new StaveNote({ clef, keys: [key], duration: "8" });
        }
        return new StaveNote({
          clef,
          keys: [key],
          duration: note.duration,
          stemDirection: stemDirFn(note.pitch),
        });
      };

    for (let row = 0; row < totalRows; row++) {
      const rowY = row * ROW_HEIGHT;
      const yTreble = rowY + TREBLE_Y_OFF;
      const yBass = rowY + BASS_Y_OFF;
      const barsInRow = Math.min(BARS_PER_ROW, totalBars - row * BARS_PER_ROW);

      for (let b = 0; b < barsInRow; b++) {
        const barIndex = row * BARS_PER_ROW + b;
        const isFirstInRow = b === 0;
        const isLastBar = barIndex === totalBars - 1;

        const x = isFirstInRow
          ? LEFT_MARGIN
          : LEFT_MARGIN + CLEF_EXTRA + b * BAR_WIDTH;
        const width = isFirstInRow ? CLEF_EXTRA + BAR_WIDTH : BAR_WIDTH;

        const treble = new Stave(x, yTreble, width);
        const bass = new Stave(x, yBass, width);

        if (isFirstInRow) {
          treble.addClef("treble").addTimeSignature("4/4");
          bass.addClef("bass").addTimeSignature("4/4");
        }
        if (isLastBar) {
          treble.setEndBarType(Barline.type.END);
          bass.setEndBarType(Barline.type.END);
        }

        treble.setContext(context).draw();
        bass.setContext(context).draw();

        if (isFirstInRow) {
          new StaveConnector(treble, bass)
            .setType("brace")
            .setContext(context)
            .draw();
          new StaveConnector(treble, bass)
            .setType("singleLeft")
            .setContext(context)
            .draw();
        }

        const rNotes = rightBars[barIndex].map(
          toNote("treble", "b/4", trebleStemDir),
        );
        const lNotes = leftBars[barIndex].map(
          toNote("bass", "d/3", bassStemDir),
        );

        const rVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.STRICT)
          .addTickables(rNotes);
        const lVoice = new Voice({ numBeats: 4, beatValue: 4 })
          .setMode(Voice.Mode.STRICT)
          .addTickables(lNotes);

        const usableWidth = width - 30;
        new Formatter().joinVoices([rVoice]).format([rVoice], usableWidth);
        new Formatter().joinVoices([lVoice]).format([lVoice], usableWidth);

        // applyAndGetBeams takes the Voice, sets stem direction for beam groups,
        // and returns Beam objects ready to draw
        const rBeams = Beam.applyAndGetBeams(rVoice, Stem.UP);
        const lBeams = Beam.applyAndGetBeams(lVoice, Stem.DOWN);

        rVoice.draw(context, treble);
        lVoice.draw(context, bass);

        rBeams.forEach((bm) => bm.setContext(context).draw());
        lBeams.forEach((bm) => bm.setContext(context).draw());
      }
    }
  }, [right, left]);

  return <div ref={ref} className="overflow-x-auto" />;
}
