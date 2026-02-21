// "use client";

// import { useEffect, useRef } from "react";
// import type { MusicPiece, Bar } from "../../types/music";
// import type { Clef, NotationStyle } from "../../types/music";
// import {
//   parsePitch,
//   getStaffPosition,
//   KEY_SIGNATURES,
// } from "@/lib/musicTheory";

// interface ScoreRendererProps {
//   piece: MusicPiece;
//   clef: Clef;
//   notation: NotationStyle; // 👈 added
//   className?: string;
// }

// const SL = 10; // staff line spacing px
// const BARS_PER_ROW = 4;
// const BAR_WIDTH = 165;
// const MARGIN_LEFT = 90;
// const MARGIN_RIGHT = 40;
// const MARGIN_TOP = 70;
// const STAFF_GAP = 50; // gap between treble and bass staves (grand staff only)

// const SECTION_COLORS: Record<string, string> = {
//   A: "#c9973a",
//   B: "#4a7fbf",
//   C: "#5ba86a",
//   D: "#9b6dc0",
// };

// export default function ScoreRenderer({
//   piece,
//   clef,
//   notation,
//   className,
// }: ScoreRendererProps) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const isGrandStaff = notation === "classical";

//     // Row height depends on notation — grand staff needs room for two staves
//     const ROW_HEIGHT = isGrandStaff ? 4 * SL + STAFF_GAP + 4 * SL + 60 : 140;

//     // Build flat bar list with section tags
//     const bars: Array<Bar & { sectionId: string }> = [];
//     for (const secId of piece.structure) {
//       const sec = piece.sections.find((s) => s.id === secId);
//       if (sec?.bars) {
//         for (const bar of sec.bars) {
//           bars.push({ ...bar, sectionId: secId });
//         }
//       }
//     }
//     if (bars.length === 0) {
//       for (const sec of piece.sections) {
//         for (const bar of sec.bars || []) {
//           bars.push({ ...bar, sectionId: sec.id });
//         }
//       }
//     }

//     const numRows = Math.ceil(bars.length / BARS_PER_ROW);
//     const canvasW = MARGIN_LEFT + BARS_PER_ROW * BAR_WIDTH + MARGIN_RIGHT;
//     const canvasH = MARGIN_TOP + numRows * ROW_HEIGHT + 60;

//     const dpr = window.devicePixelRatio || 1;
//     canvas.width = canvasW * dpr;
//     canvas.height = canvasH * dpr;
//     canvas.style.width = canvasW + "px";
//     canvas.style.height = canvasH + "px";
//     ctx.scale(dpr, dpr);

//     // Background
//     ctx.fillStyle = "#faf8f2";
//     ctx.fillRect(0, 0, canvasW, canvasH);

//     // Title
//     ctx.fillStyle = "#1a1510";
//     ctx.font = 'bold 18px "Georgia", serif';
//     ctx.textAlign = "center";
//     ctx.fillText(piece.title, canvasW / 2, 28);

//     // Subtitle
//     ctx.fillStyle = "#6b5c44";
//     ctx.font = "11px monospace";
//     ctx.fillText(
//       `${piece.key} ${piece.mode} · ${piece.timeSig} · ${piece.genre} · ${piece.tempo} BPM`,
//       canvasW / 2,
//       44,
//     );

//     const ks = KEY_SIGNATURES[piece.key];

//     for (let row = 0; row < numRows; row++) {
//       const rowBars = bars.slice(row * BARS_PER_ROW, (row + 1) * BARS_PER_ROW);
//       const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
//       const bassTop = staffTop + 4 * SL + STAFF_GAP; // only used in grand staff mode

//       const CLEF_WIDTH = 22;
//       const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;

//       // ── Treble staff lines ──────────────────────────────────────
//       ctx.strokeStyle = "#2a2015";
//       ctx.lineWidth = 0.8;
//       for (let l = 0; l < 5; l++) {
//         const y = staffTop + l * SL;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
//         ctx.lineTo(staffRight, y);
//         ctx.stroke();
//       }

//       // ── Bass staff lines (grand staff only) ────────────────────
//       if (isGrandStaff) {
//         for (let l = 0; l < 5; l++) {
//           const y = bassTop + l * SL;
//           ctx.beginPath();
//           ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
//           ctx.lineTo(staffRight, y);
//           ctx.stroke();
//         }

//         // Brace connecting both staves on left edge
//         ctx.strokeStyle = "#2a2015";
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH - 1, staffTop);
//         ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH - 1, bassTop + 4 * SL);
//         ctx.stroke();
//         ctx.lineWidth = 0.8;
//       }

//       // Left edge vertical line (continuation rows)
//       if (row > 0) {
//         ctx.strokeStyle = "#2a2015";
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, staffTop);
//         ctx.lineTo(
//           MARGIN_LEFT - CLEF_WIDTH,
//           isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL,
//         );
//         ctx.stroke();
//       }

//       // ── Treble clef ─────────────────────────────────────────────
//       ctx.fillStyle = "#1a1510";
//       ctx.font = `${SL * 6.5}px serif`;
//       ctx.textAlign = "left";
//       ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);

//       // ── Bass clef (grand staff only) ────────────────────────────
//       if (isGrandStaff) {
//         ctx.font = `${SL * 4.2}px serif`;
//         ctx.textAlign = "left";
//         ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, bassTop + SL * 2.2);
//       }

//       // ── Key signature (first row only) ──────────────────────────
//       let ksSigWidth = 0;
//       if (ks && row === 0) {
//         ksSigWidth = drawKeySignature(ctx, MARGIN_LEFT + 10, staffTop, ks, SL);
//         if (isGrandStaff) {
//           drawKeySignature(ctx, MARGIN_LEFT + 10, bassTop, ks, SL);
//         }
//       }

//       // ── Time signature (first row only) ─────────────────────────
//       let headerEndX = MARGIN_LEFT;
//       if (row === 0) {
//         const [top, bot] = piece.timeSig.split("/");
//         const tsX = MARGIN_LEFT + ksSigWidth + 20;

//         ctx.fillStyle = "#1a1510";
//         ctx.font = `bold ${SL * 2.4}px "Georgia", serif`;
//         ctx.textAlign = "center";
//         ctx.fillText(top, tsX, staffTop + SL * 1.6);
//         ctx.fillText(bot, tsX, staffTop + SL * 3.8);

//         if (isGrandStaff) {
//           ctx.fillText(top, tsX, bassTop + SL * 1.6);
//           ctx.fillText(bot, tsX, bassTop + SL * 3.8);
//         }

//         headerEndX = tsX + 10;
//       }

//       // ── Draw each bar ────────────────────────────────────────────
//       for (let b = 0; b < rowBars.length; b++) {
//         const bar = rowBars[b];

//         const barX =
//           row === 0 && b === 0
//             ? headerEndX + 6
//             : row > 0 && b === 0
//               ? MARGIN_LEFT + 14
//               : MARGIN_LEFT + b * BAR_WIDTH;

//         const globalIdx = row * BARS_PER_ROW + b;
//         const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;

//         // Treble bar line
//         if (b > 0 && barX >= headerEndX) {
//           ctx.strokeStyle = "#2a2015";
//           ctx.lineWidth = 1;
//           ctx.beginPath();
//           ctx.moveTo(barX, staffTop);
//           ctx.lineTo(barX, isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL);
//           ctx.stroke();
//         }

//         // Section label
//         const secColor = SECTION_COLORS[bar.sectionId] || "#888";
//         if (!prevBar || prevBar.sectionId !== bar.sectionId) {
//           ctx.fillStyle = secColor;
//           ctx.font = `bold 9px monospace`;
//           ctx.textAlign = "left";
//           ctx.fillText(`[${bar.sectionId}]`, barX + 2, staffTop - 14);
//         }

//         // Bar number
//         ctx.fillStyle = "#bbb";
//         ctx.font = "8px monospace";
//         ctx.textAlign = "left";
//         ctx.fillText(String(globalIdx + 1), barX + 2, staffTop - 4);

//         // Chord symbol (above treble staff)
//         if (bar.chordName || bar.chord) {
//           ctx.fillStyle = "#6b5c44";
//           ctx.font = 'italic 10px "Georgia", serif';
//           ctx.textAlign = "center";
//           ctx.fillText(
//             bar.chordName || bar.chord,
//             barX + BAR_WIDTH / 2,
//             staffTop - 4,
//           );
//         }

//         const barRight = MARGIN_LEFT + (b + 1) * BAR_WIDTH;

//         // Right hand notes (treble)
//         drawBarNotes(
//           ctx,
//           bar,
//           barX,
//           barRight,
//           staffTop,
//           piece.timeSig,
//           "treble",
//           SL,
//         );

//         // Left hand notes (bass) — grand staff only
//         if (isGrandStaff && bar.leftNotes?.length) {
//           drawBarNotes(
//             ctx,
//             { ...bar, notes: bar.leftNotes },
//             barX,
//             barRight,
//             bassTop,
//             piece.timeSig,
//             "bass",
//             SL,
//           );
//         }
//       }

//       // ── Final bar line of this row ───────────────────────────────
//       const lastX = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
//       ctx.strokeStyle = "#2a2015";
//       const lineBottom = isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL;

//       if (row === numRows - 1) {
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(lastX - 3, staffTop);
//         ctx.lineTo(lastX - 3, lineBottom);
//         ctx.stroke();
//         ctx.lineWidth = 3;
//         ctx.beginPath();
//         ctx.moveTo(lastX, staffTop);
//         ctx.lineTo(lastX, lineBottom);
//         ctx.stroke();
//         ctx.lineWidth = 1;
//       } else {
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(lastX, staffTop);
//         ctx.lineTo(lastX, lineBottom);
//         ctx.stroke();
//       }
//     }
//   }, [piece, clef, notation]); // 👈 notation in deps

//   return (
//     <canvas
//       ref={canvasRef}
//       className={className}
//       style={{ display: "block" }}
//     />
//   );
// }

// // ─── Drawing helpers ───────────────────────────────────────────

// function drawBarNotes(
//   ctx: CanvasRenderingContext2D,
//   bar: Bar,
//   barX: number,
//   barRight: number,
//   staffTop: number,
//   timeSig: string,
//   clef: Clef,
//   sl: number,
// ) {
//   const notes = bar.notes || [];
//   const totalDur = notes.reduce((s, n) => s + n.duration, 0);
//   const isFirstBar = barX > MARGIN_LEFT && barX < MARGIN_LEFT + BAR_WIDTH;
//   const firstNoteHasAccidental = (() => {
//     const first = notes[0];
//     if (!first || first.rest || first.pitch === "rest") return false;
//     const p = parsePitch(first.pitch);
//     return p ? p.note.includes("#") || p.note.includes("b") : false;
//   })();
//   const innerLeft = barX + (isFirstBar ? (firstNoteHasAccidental ? 8 : 2) : 10);
//   const drawWidth = barRight - innerLeft - 14;
//   let xCursor = innerLeft;

//   for (let i = 0; i < notes.length; i++) {
//     const note = notes[i];
//     const noteWidth = (note.duration / Math.max(totalDur, 1)) * drawWidth;

//     const parsed =
//       !note.rest && note.pitch !== "rest" ? parsePitch(note.pitch) : null;
//     const hasAccidental = parsed
//       ? parsed.note.includes("#") || parsed.note.includes("b")
//       : false;
//     const accidentalShift = hasAccidental
//       ? isFirstBar
//         ? sl * 1.8
//         : sl * 1.2
//       : 0;

//     xCursor += accidentalShift;
//     const cx = xCursor + noteWidth * 0.5;

//     if (note.rest || note.pitch === "rest") {
//       drawRest(ctx, cx, staffTop, note.duration, sl);
//     } else {
//       const parsed = parsePitch(note.pitch);
//       if (parsed) {
//         const staffPos = getStaffPosition(parsed.note, parsed.octave, clef);
//         const noteY = staffTop + 2 * sl - staffPos * (sl / 2);
//         const stemUp = noteY > staffTop + 2 * sl;
//         const accidental = parsed.note.includes("#")
//           ? "♯"
//           : parsed.note.includes("b")
//             ? "♭"
//             : null;
//         drawNote(
//           ctx,
//           cx,
//           noteY,
//           note.duration,
//           staffTop,
//           sl,
//           stemUp,
//           accidental,
//         );
//       }
//     }

//     xCursor += noteWidth;
//   }
// }

// function drawNote(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   y: number,
//   duration: number,
//   staffTop: number,
//   sl: number,
//   stemUp: boolean,
//   accidental: string | null,
// ) {
//   const rw = sl * 0.62;
//   const rh = sl * 0.46;
//   const filled = duration < 2;

//   const topLine = staffTop;
//   const bottomLine = staffTop + 4 * sl;

//   ctx.strokeStyle = "#2a2015";
//   ctx.lineWidth = 0.8;
//   if (y <= topLine - sl / 2) {
//     for (let ly = topLine - sl; ly >= y - rh; ly -= sl) {
//       ctx.beginPath();
//       ctx.moveTo(x - rw * 1.7, ly);
//       ctx.lineTo(x + rw * 1.7, ly);
//       ctx.stroke();
//     }
//   }
//   if (y >= bottomLine + sl / 2) {
//     for (let ly = bottomLine + sl; ly <= y + rh; ly += sl) {
//       ctx.beginPath();
//       ctx.moveTo(x - rw * 1.7, ly);
//       ctx.lineTo(x + rw * 1.7, ly);
//       ctx.stroke();
//     }
//   }

//   ctx.save();
//   ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
//   ctx.strokeStyle = "#1a1510";
//   ctx.lineWidth = 1;
//   ctx.beginPath();
//   ctx.ellipse(x, y, rw, rh, -0.18, 0, Math.PI * 2);
//   ctx.fill();
//   if (!filled) ctx.stroke();
//   ctx.restore();

//   if (accidental) {
//     ctx.fillStyle = "#1a1510";
//     ctx.font = `${sl * 2.2}px serif`;
//     ctx.textAlign = "center";
//     ctx.fillText(accidental, x - rw * 2.8, y + rh * 0.8);
//   }

//   if (duration <= 2) {
//     const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
//     const stemEnd = stemUp ? y - sl * 3.5 : y + sl * 3.5;
//     ctx.strokeStyle = "#1a1510";
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.moveTo(stemX, y);
//     ctx.lineTo(stemX, stemEnd);
//     ctx.stroke();

//     if (duration === 0.5) {
//       drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
//     } else if (duration === 0.25) {
//       drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
//     }
//   }

//   if (duration === 1.5 || duration === 3) {
//     ctx.fillStyle = "#1a1510";
//     ctx.beginPath();
//     ctx.arc(x + rw * 1.9, y - rh * 0.4, 1.8, 0, Math.PI * 2);
//     ctx.fill();
//   }
// }

// function drawFlag(
//   ctx: CanvasRenderingContext2D,
//   stemX: number,
//   stemEnd: number,
//   stemUp: boolean,
//   sl: number,
//   count: number,
// ) {
//   ctx.strokeStyle = "#1a1510";
//   ctx.lineWidth = 1.2;
//   for (let f = 0; f < count; f++) {
//     const fy = stemEnd + (stemUp ? f * sl * 0.65 : -f * sl * 0.65);
//     ctx.beginPath();
//     if (stemUp) {
//       ctx.moveTo(stemX, fy);
//       ctx.bezierCurveTo(
//         stemX + 13,
//         fy + 5,
//         stemX + 11,
//         fy + 13,
//         stemX + 4,
//         fy + 15,
//       );
//     } else {
//       ctx.moveTo(stemX, fy);
//       ctx.bezierCurveTo(
//         stemX + 13,
//         fy - 5,
//         stemX + 11,
//         fy - 13,
//         stemX + 4,
//         fy - 15,
//       );
//     }
//     ctx.stroke();
//   }
// }

// function drawRest(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   staffTop: number,
//   duration: number,
//   sl: number,
// ) {
//   ctx.fillStyle = "#1a1510";
//   ctx.textAlign = "center";
//   const mid = staffTop + 2 * sl;

//   if (duration >= 4) {
//     ctx.fillRect(x - sl * 0.9, staffTop + sl - sl * 0.35, sl * 1.8, sl * 0.55);
//   } else if (duration >= 2) {
//     ctx.fillRect(x - sl * 0.9, staffTop + 2 * sl, sl * 1.8, sl * 0.55);
//   } else if (duration === 1 || duration === 1.5) {
//     ctx.font = `${sl * 2.2}px serif`;
//     ctx.fillText("𝄽", x, mid + sl * 0.5);
//     if (duration === 1.5) {
//       ctx.beginPath();
//       ctx.arc(x + sl * 0.9, mid + sl * 0.1, 2, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   } else if (duration === 0.5) {
//     ctx.font = `${sl * 2}px serif`;
//     ctx.fillText("𝄾", x, mid + sl * 0.5);
//   } else if (duration === 0.25) {
//     ctx.font = `${sl * 2}px serif`;
//     ctx.fillText("𝄿", x, mid + sl * 0.5);
//   }
// }

// function drawKeySignature(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   staffTop: number,
//   ks: { sharps: number; flats: number },
//   sl: number,
// ): number {
//   const sharpStaffPos = [4, 1, 5, 2, 6, 3, 0];
//   const flatStaffPos = [2, 5, 1, 4, 0, 3, 6];

//   ctx.fillStyle = "#1a1510";
//   ctx.font = `${sl * 2.2}px serif`;
//   ctx.textAlign = "center";
//   let width = 0;

//   for (let i = 0; i < ks.sharps; i++) {
//     const yOff = staffTop + (4 - sharpStaffPos[i]) * (sl / 2) - sl * 0.15;
//     ctx.fillText("♯", x + i * 12 + 6, yOff + sl * 0.7);
//     width = (i + 1) * 12 + 10;
//   }
//   for (let i = 0; i < ks.flats; i++) {
//     const yOff = staffTop + (4 - flatStaffPos[i]) * (sl / 2) + sl * 1.3;
//     ctx.fillText("♭", x + i * 12 + 8, yOff);
//     width = (i + 1) * 12 + 12;
//   }

//   return width;
// }

// function groupQuaversForBeaming(notes: Bar["notes"]): number[][] {
//   const groups: number[][] = [];
//   let current: number[] = [];
//   for (let i = 0; i < notes.length; i++) {
//     if (notes[i].duration === 0.5 && !notes[i].rest) {
//       current.push(i);
//     } else {
//       if (current.length >= 2) groups.push(current);
//       current = [];
//     }
//   }
//   if (current.length >= 2) groups.push(current);
//   return groups;
// }
"use client";

import { useEffect, useRef } from "react";
import type { MusicPiece, Bar } from "../../types/music";
import type { Clef, NotationStyle } from "../../types/music";
import {
  parsePitch,
  getStaffPosition,
  KEY_SIGNATURES,
} from "@/lib/musicTheory";

interface ScoreRendererProps {
  piece: MusicPiece;
  clef: Clef;
  notation?: NotationStyle; // optional — falls back to auto-detection
  className?: string;
}

const SL = 10;
const BARS_PER_ROW = 4;
const BAR_WIDTH = 165;
const MARGIN_LEFT = 90;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 70;
const STAFF_GAP = 50;

const SECTION_COLORS: Record<string, string> = {
  A: "#c9973a",
  B: "#4a7fbf",
  C: "#5ba86a",
  D: "#9b6dc0",
};

export default function ScoreRenderer({
  piece,
  clef,
  notation,
  className,
}: ScoreRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Build flat bar list
    const bars: Array<Bar & { sectionId: string }> = [];
    for (const secId of piece.structure) {
      const sec = piece.sections.find((s) => s.id === secId);
      if (sec?.bars) {
        for (const bar of sec.bars) {
          bars.push({ ...bar, sectionId: secId });
        }
      }
    }
    if (bars.length === 0) {
      for (const sec of piece.sections) {
        for (const bar of sec.bars || []) {
          bars.push({ ...bar, sectionId: sec.id });
        }
      }
    }

    // Grand staff mode:
    // - If notation prop is explicitly "classical", use grand staff
    // - If notation prop is explicitly "lead-sheet", use single staff
    // - If notation prop is absent (e.g. pieces/[pieceId] page), auto-detect from leftNotes
    const hasLeftNotes = bars.some(
      (b) => b.leftNotes && b.leftNotes.length > 0,
    );
    const isGrandStaff =
      notation === "classical" || (notation === undefined && hasLeftNotes);

    const ROW_HEIGHT = isGrandStaff ? 4 * SL + STAFF_GAP + 4 * SL + 60 : 140;

    const numRows = Math.ceil(bars.length / BARS_PER_ROW);
    const canvasW = MARGIN_LEFT + BARS_PER_ROW * BAR_WIDTH + MARGIN_RIGHT;
    const canvasH = MARGIN_TOP + numRows * ROW_HEIGHT + 60;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + "px";
    canvas.style.height = canvasH + "px";
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#faf8f2";
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = "#1a1510";
    ctx.font = 'bold 18px "Georgia", serif';
    ctx.textAlign = "center";
    ctx.fillText(piece.title, canvasW / 2, 28);

    ctx.fillStyle = "#6b5c44";
    ctx.font = "11px monospace";
    ctx.fillText(
      `${piece.key} ${piece.mode} · ${piece.timeSig} · ${piece.genre} · ${piece.tempo} BPM`,
      canvasW / 2,
      44,
    );

    const ks = KEY_SIGNATURES[piece.key];

    for (let row = 0; row < numRows; row++) {
      const rowBars = bars.slice(row * BARS_PER_ROW, (row + 1) * BARS_PER_ROW);
      const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
      const bassTop = staffTop + 4 * SL + STAFF_GAP;

      const CLEF_WIDTH = 22;
      const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;

      // Treble staff lines
      ctx.strokeStyle = "#2a2015";
      ctx.lineWidth = 0.8;
      for (let l = 0; l < 5; l++) {
        const y = staffTop + l * SL;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
        ctx.lineTo(staffRight, y);
        ctx.stroke();
      }

      // Bass staff lines + connecting bar (grand staff only)
      if (isGrandStaff) {
        for (let l = 0; l < 5; l++) {
          const y = bassTop + l * SL;
          ctx.beginPath();
          ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
          ctx.lineTo(staffRight, y);
          ctx.stroke();
        }

        ctx.strokeStyle = "#2a2015";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH - 1, staffTop);
        ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH - 1, bassTop + 4 * SL);
        ctx.stroke();
        ctx.lineWidth = 0.8;
      }

      // Left edge vertical line (continuation rows)
      if (row > 0) {
        ctx.strokeStyle = "#2a2015";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, staffTop);
        ctx.lineTo(
          MARGIN_LEFT - CLEF_WIDTH,
          isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL,
        );
        ctx.stroke();
      }

      // Treble clef
      ctx.fillStyle = "#1a1510";
      ctx.font = `${SL * 6.5}px serif`;
      ctx.textAlign = "left";
      ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);

      // Bass clef — grand staff gets it below, single-staff respects clef toggle
      if (isGrandStaff) {
        ctx.font = `${SL * 4.2}px serif`;
        ctx.textAlign = "left";
        ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, bassTop + SL * 3.2);
      } else if (clef === "bass") {
        ctx.font = `${SL * 4.2}px serif`;
        ctx.textAlign = "left";
        ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 3.2);
      }

      // Key signature (first row only)
      let ksSigWidth = 0;
      if (ks && row === 0) {
        ksSigWidth = drawKeySignature(ctx, MARGIN_LEFT + 10, staffTop, ks, SL);
        if (isGrandStaff) {
          drawKeySignature(ctx, MARGIN_LEFT + 10, bassTop, ks, SL);
        }
      }

      // Time signature (first row only)
      let headerEndX = MARGIN_LEFT;
      if (row === 0) {
        const [top, bot] = piece.timeSig.split("/");
        const tsX = MARGIN_LEFT + ksSigWidth + 20;

        ctx.fillStyle = "#1a1510";
        ctx.font = `bold ${SL * 2.4}px "Georgia", serif`;
        ctx.textAlign = "center";
        ctx.fillText(top, tsX, staffTop + SL * 1.6);
        ctx.fillText(bot, tsX, staffTop + SL * 3.8);

        if (isGrandStaff) {
          ctx.fillText(top, tsX, bassTop + SL * 1.6);
          ctx.fillText(bot, tsX, bassTop + SL * 3.8);
        }

        headerEndX = tsX + 10;
      }

      // Draw bars
      for (let b = 0; b < rowBars.length; b++) {
        const bar = rowBars[b];

        const barX =
          row === 0 && b === 0
            ? headerEndX + 6
            : row > 0 && b === 0
              ? MARGIN_LEFT + 14
              : MARGIN_LEFT + b * BAR_WIDTH;

        const globalIdx = row * BARS_PER_ROW + b;
        const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;

        // Bar line spanning both staves if grand staff
        if (b > 0 && barX >= headerEndX) {
          ctx.strokeStyle = "#2a2015";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(barX, staffTop);
          ctx.lineTo(barX, isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL);
          ctx.stroke();
        }

        // Section label
        const secColor = SECTION_COLORS[bar.sectionId] || "#888";
        if (!prevBar || prevBar.sectionId !== bar.sectionId) {
          ctx.fillStyle = secColor;
          ctx.font = `bold 9px monospace`;
          ctx.textAlign = "left";
          ctx.fillText(`[${bar.sectionId}]`, barX + 2, staffTop - 14);
        }

        // Bar number
        ctx.fillStyle = "#bbb";
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(String(globalIdx + 1), barX + 2, staffTop - 4);

        // Chord symbol
        if (bar.chordName || bar.chord) {
          ctx.fillStyle = "#6b5c44";
          ctx.font = 'italic 10px "Georgia", serif';
          ctx.textAlign = "center";
          ctx.fillText(
            bar.chordName || bar.chord,
            barX + BAR_WIDTH / 2,
            staffTop - 4,
          );
        }

        const barRight = MARGIN_LEFT + (b + 1) * BAR_WIDTH;

        // Right hand notes (treble)
        drawBarNotes(
          ctx,
          bar,
          barX,
          barRight,
          staffTop,
          piece.timeSig,
          "treble",
          SL,
        );

        // Left hand notes (bass) — grand staff only
        if (isGrandStaff && bar.leftNotes?.length) {
          drawBarNotes(
            ctx,
            { ...bar, notes: bar.leftNotes },
            barX,
            barRight,
            bassTop,
            piece.timeSig,
            "bass",
            SL,
          );
        }
      }

      // Final bar line
      const lastX = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
      const lineBottom = isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL;
      ctx.strokeStyle = "#2a2015";

      if (row === numRows - 1) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastX - 3, staffTop);
        ctx.lineTo(lastX - 3, lineBottom);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lastX, staffTop);
        ctx.lineTo(lastX, lineBottom);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastX, staffTop);
        ctx.lineTo(lastX, lineBottom);
        ctx.stroke();
      }
    }
  }, [piece, clef, notation]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
    />
  );
}

// ─── Drawing helpers ───────────────────────────────────────────

function drawBarNotes(
  ctx: CanvasRenderingContext2D,
  bar: Bar,
  barX: number,
  barRight: number,
  staffTop: number,
  timeSig: string,
  clef: Clef,
  sl: number,
) {
  const notes = bar.notes || [];
  const totalDur = notes.reduce((s, n) => s + n.duration, 0);
  const isFirstBar = barX > MARGIN_LEFT && barX < MARGIN_LEFT + BAR_WIDTH;

  const firstNoteHasAccidental = (() => {
    const first = notes[0];
    if (!first || first.rest || first.pitch === "rest") return false;
    const p = parsePitch(first.pitch);
    return p ? p.note.includes("#") || p.note.includes("b") : false;
  })();

  const innerLeft = barX + (isFirstBar ? (firstNoteHasAccidental ? 8 : 2) : 10);
  const drawWidth = barRight - innerLeft - 14;
  let xCursor = innerLeft;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteWidth = (note.duration / Math.max(totalDur, 1)) * drawWidth;

    const parsed =
      !note.rest && note.pitch !== "rest" ? parsePitch(note.pitch) : null;
    const hasAccidental = parsed
      ? parsed.note.includes("#") || parsed.note.includes("b")
      : false;
    const accidentalShift = hasAccidental
      ? isFirstBar
        ? sl * 1.8
        : sl * 1.2
      : 0;

    xCursor += accidentalShift;
    const cx = xCursor + noteWidth * 0.5;

    if (note.rest || note.pitch === "rest") {
      drawRest(ctx, cx, staffTop, note.duration, sl);
    } else {
      const p = parsePitch(note.pitch);
      if (p) {
        const staffPos = getStaffPosition(p.note, p.octave, clef);
        const noteY = staffTop + 2 * sl - staffPos * (sl / 2);
        const stemUp = noteY > staffTop + 2 * sl;
        const accidental = p.note.includes("#")
          ? "♯"
          : p.note.includes("b")
            ? "♭"
            : null;
        drawNote(
          ctx,
          cx,
          noteY,
          note.duration,
          staffTop,
          sl,
          stemUp,
          accidental,
        );
      }
    }

    xCursor += noteWidth;
  }
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  duration: number,
  staffTop: number,
  sl: number,
  stemUp: boolean,
  accidental: string | null,
) {
  const rw = sl * 0.62;
  const rh = sl * 0.46;
  const filled = duration < 2;
  const topLine = staffTop;
  const bottomLine = staffTop + 4 * sl;

  ctx.strokeStyle = "#2a2015";
  ctx.lineWidth = 0.8;
  if (y <= topLine - sl / 2) {
    for (let ly = topLine - sl; ly >= y - rh; ly -= sl) {
      ctx.beginPath();
      ctx.moveTo(x - rw * 1.7, ly);
      ctx.lineTo(x + rw * 1.7, ly);
      ctx.stroke();
    }
  }
  if (y >= bottomLine + sl / 2) {
    for (let ly = bottomLine + sl; ly <= y + rh; ly += sl) {
      ctx.beginPath();
      ctx.moveTo(x - rw * 1.7, ly);
      ctx.lineTo(x + rw * 1.7, ly);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
  ctx.strokeStyle = "#1a1510";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rw, rh, -0.18, 0, Math.PI * 2);
  ctx.fill();
  if (!filled) ctx.stroke();
  ctx.restore();

  if (accidental) {
    ctx.fillStyle = "#1a1510";
    ctx.font = `${sl * 2.2}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(accidental, x - rw * 2.8, y + rh * 0.8);
  }

  if (duration <= 2) {
    const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
    const stemEnd = stemUp ? y - sl * 3.5 : y + sl * 3.5;
    ctx.strokeStyle = "#1a1510";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stemX, y);
    ctx.lineTo(stemX, stemEnd);
    ctx.stroke();

    if (duration === 0.5) drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
    else if (duration === 0.25) drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
  }

  if (duration === 1.5 || duration === 3) {
    ctx.fillStyle = "#1a1510";
    ctx.beginPath();
    ctx.arc(x + rw * 1.9, y - rh * 0.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  stemX: number,
  stemEnd: number,
  stemUp: boolean,
  sl: number,
  count: number,
) {
  ctx.strokeStyle = "#1a1510";
  ctx.lineWidth = 1.2;
  for (let f = 0; f < count; f++) {
    const fy = stemEnd + (stemUp ? f * sl * 0.65 : -f * sl * 0.65);
    ctx.beginPath();
    if (stemUp) {
      ctx.moveTo(stemX, fy);
      ctx.bezierCurveTo(
        stemX + 13,
        fy + 5,
        stemX + 11,
        fy + 13,
        stemX + 4,
        fy + 15,
      );
    } else {
      ctx.moveTo(stemX, fy);
      ctx.bezierCurveTo(
        stemX + 13,
        fy - 5,
        stemX + 11,
        fy - 13,
        stemX + 4,
        fy - 15,
      );
    }
    ctx.stroke();
  }
}

function drawRest(
  ctx: CanvasRenderingContext2D,
  x: number,
  staffTop: number,
  duration: number,
  sl: number,
) {
  ctx.fillStyle = "#1a1510";
  ctx.textAlign = "center";
  const mid = staffTop + 2 * sl;

  if (duration >= 4) {
    ctx.fillRect(x - sl * 0.9, staffTop + sl - sl * 0.35, sl * 1.8, sl * 0.55);
  } else if (duration >= 2) {
    ctx.fillRect(x - sl * 0.9, staffTop + 2 * sl, sl * 1.8, sl * 0.55);
  } else if (duration === 1 || duration === 1.5) {
    ctx.font = `${sl * 2.2}px serif`;
    ctx.fillText("𝄽", x, mid + sl * 0.5);
    if (duration === 1.5) {
      ctx.beginPath();
      ctx.arc(x + sl * 0.9, mid + sl * 0.1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (duration === 0.5) {
    ctx.font = `${sl * 2}px serif`;
    ctx.fillText("𝄾", x, mid + sl * 0.5);
  } else if (duration === 0.25) {
    ctx.font = `${sl * 2}px serif`;
    ctx.fillText("𝄿", x, mid + sl * 0.5);
  }
}

function drawKeySignature(
  ctx: CanvasRenderingContext2D,
  x: number,
  staffTop: number,
  ks: { sharps: number; flats: number },
  sl: number,
): number {
  const sharpStaffPos = [4, 1, 5, 2, 6, 3, 0];
  const flatStaffPos = [2, 5, 1, 4, 0, 3, 6];

  ctx.fillStyle = "#1a1510";
  ctx.font = `${sl * 2.2}px serif`;
  ctx.textAlign = "center";
  let width = 0;

  for (let i = 0; i < ks.sharps; i++) {
    const yOff = staffTop + (4 - sharpStaffPos[i]) * (sl / 2) - sl * 0.15;
    ctx.fillText("♯", x + i * 12 + 6, yOff + sl * 0.7);
    width = (i + 1) * 12 + 10;
  }
  for (let i = 0; i < ks.flats; i++) {
    const yOff = staffTop + (4 - flatStaffPos[i]) * (sl / 2) + sl * 1.3;
    ctx.fillText("♭", x + i * 12 + 8, yOff);
    width = (i + 1) * 12 + 12;
  }

  return width;
}
