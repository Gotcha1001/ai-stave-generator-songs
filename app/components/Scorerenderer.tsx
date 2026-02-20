// "use client";

// import { useEffect, useRef } from "react";
// import type { MusicPiece, Bar } from "../../types/music";
// import type { Clef } from "../../types/music";
// import {
//   parsePitch,
//   getStaffPosition,
//   KEY_SIGNATURES,
// } from "@/lib/musicTheory";

// interface ScoreRendererProps {
//   piece: MusicPiece;
//   clef: Clef;
//   className?: string;
// }

// const SL = 10; // staff line spacing px
// const BARS_PER_ROW = 4;
// const BAR_WIDTH = 165;
// const MARGIN_LEFT = 90;
// const MARGIN_RIGHT = 40;
// const MARGIN_TOP = 70;
// const ROW_HEIGHT = 140;

// const SECTION_COLORS: Record<string, string> = {
//   A: "#c9973a",
//   B: "#4a7fbf",
//   C: "#5ba86a",
//   D: "#9b6dc0",
// };

// export default function ScoreRenderer({
//   piece,
//   clef,
//   className,
// }: ScoreRendererProps) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

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
//     // Fallback: iterate sections directly if structure doesn't map properly
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

//       // Per-row clef width so staff lines and content can accommodate it
//       const CLEF_WIDTH = clef === "treble" ? 22 : 18;

//       // 5 staff lines
//       ctx.strokeStyle = "#2a2015";
//       ctx.lineWidth = 0.8;
//       const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
//       for (let l = 0; l < 5; l++) {
//         const y = staffTop + l * SL;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
//         ctx.lineTo(staffRight, y);
//         ctx.stroke();
//       }

//       // Left edge vertical line (continuation rows only)
//       if (row > 0) {
//         ctx.strokeStyle = "#2a2015";
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, staffTop);
//         ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH, staffTop + 4 * SL);
//         ctx.stroke();
//       }

//       // Clef
//       ctx.fillStyle = "#1a1510";
//       if (clef === "treble") {
//         ctx.font = `${SL * 6.5}px serif`;
//         ctx.textAlign = "left";
//         ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);
//       } else {
//         ctx.font = `${SL * 4.2}px serif`;
//         ctx.textAlign = "left";
//         ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 2.2);
//       }

//       // Key signature — first row only
//       let ksSigWidth = 0;
//       if (ks && row === 0) {
//         ksSigWidth = drawKeySignature(ctx, MARGIN_LEFT + 10, staffTop, ks, SL);
//       }

//       // Time signature (first row only)
//       let headerEndX = MARGIN_LEFT;

//       if (row === 0) {
//         const [top, bot] = piece.timeSig.split("/");

//         const tsX = MARGIN_LEFT + ksSigWidth + 20;

//         ctx.fillStyle = "#1a1510";
//         ctx.font = `bold ${SL * 2.4}px "Georgia", serif`;
//         ctx.textAlign = "center";

//         ctx.fillText(top, tsX, staffTop + SL * 1.6);
//         ctx.fillText(bot, tsX, staffTop + SL * 3.8);

//         // FIX 1: Tighter spacing after time signature (was +18, now +10)
//         headerEndX = tsX + 10;
//       }

//       // Draw each bar
//       for (let b = 0; b < rowBars.length; b++) {
//         const bar = rowBars[b];

//         // FIX 2: Only bar 0 on row 0 gets the header offset.
//         // Continuation rows (row > 0, b === 0) get a small clef clearance offset.
//         // All other bars use MARGIN_LEFT as base so bar 4 stays within staff bounds.
//         const barX =
//           row === 0 && b === 0
//             ? headerEndX + 6
//             : row > 0 && b === 0
//               ? MARGIN_LEFT + 14 // small nudge right so notes clear the clef
//               : MARGIN_LEFT + b * BAR_WIDTH;

//         const globalIdx = row * BARS_PER_ROW + b;
//         const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;

//         // Bar line (left edge): skip b===0 every row, suppress lines inside header zone
//         if (b > 0 && barX >= headerEndX) {
//           ctx.strokeStyle = "#2a2015";
//           ctx.lineWidth = 1;
//           ctx.beginPath();
//           ctx.moveTo(barX, staffTop);
//           ctx.lineTo(barX, staffTop + 4 * SL);
//           ctx.stroke();
//         }

//         // Section label above bar
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

//         // Chord symbol
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

//         // Notes
//         drawBarNotes(ctx, bar, barX, staffTop, piece.timeSig, clef, SL);
//       }

//       // Final bar line of this row
//       const lastX = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
//       ctx.strokeStyle = "#2a2015";
//       if (row === numRows - 1) {
//         // Double final bar line
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(lastX - 3, staffTop);
//         ctx.lineTo(lastX - 3, staffTop + 4 * SL);
//         ctx.stroke();
//         ctx.lineWidth = 3;
//         ctx.beginPath();
//         ctx.moveTo(lastX, staffTop);
//         ctx.lineTo(lastX, staffTop + 4 * SL);
//         ctx.stroke();
//         ctx.lineWidth = 1;
//       } else {
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(lastX, staffTop);
//         ctx.lineTo(lastX, staffTop + 4 * SL);
//         ctx.stroke();
//       }
//     }
//   }, [piece, clef]);

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
//   staffTop: number,
//   timeSig: string,
//   clef: Clef,
//   sl: number,
// ) {
//   const notes = bar.notes || [];
//   const totalDur = notes.reduce((s, n) => s + n.duration, 0);
//   const drawWidth = BAR_WIDTH - 24;
//   // FIX 3: Reduced left padding inside bar from 16 to 10
//   let xCursor = barX + 10;

//   // Detect quaver runs for beam grouping
//   const beamGroups = groupQuaversForBeaming(notes);

//   for (let i = 0; i < notes.length; i++) {
//     const note = notes[i];
//     const noteWidth = (note.duration / Math.max(totalDur, 1)) * drawWidth;
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

//   // Ledger lines above staff
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

//   // Note head
//   ctx.save();
//   ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
//   ctx.strokeStyle = "#1a1510";
//   ctx.lineWidth = 1;
//   ctx.beginPath();
//   ctx.ellipse(x, y, rw, rh, -0.18, 0, Math.PI * 2);
//   ctx.fill();
//   if (!filled) ctx.stroke();
//   ctx.restore();

//   // Accidental
//   if (accidental) {
//     ctx.fillStyle = "#1a1510";
//     ctx.font = `${sl * 1.5}px serif`;
//     ctx.textAlign = "center";
//     ctx.fillText(accidental, x - rw * 2.4, y + rh * 0.8);
//   }

//   // Stem
//   if (duration <= 2) {
//     const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
//     const stemEnd = stemUp ? y - sl * 3.5 : y + sl * 3.5;
//     ctx.strokeStyle = "#1a1510";
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.moveTo(stemX, y);
//     ctx.lineTo(stemX, stemEnd);
//     ctx.stroke();

//     // Flags for quavers (0.5) and semiquavers (0.25)
//     if (duration === 0.5) {
//       drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
//     } else if (duration === 0.25) {
//       drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
//     }
//   }

//   // Dot for dotted notes (1.5, 3)
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
//     // Whole rest: filled rectangle hanging from line 2 (from top)
//     ctx.fillRect(x - sl * 0.9, staffTop + sl - sl * 0.35, sl * 1.8, sl * 0.55);
//   } else if (duration >= 2) {
//     // Half rest: filled rectangle sitting on line 3
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
//   // Staff positions (counting from top line = 0) for sharps: F C G D A E B
//   const sharpStaffPos = [4, 1, 5, 2, 6, 3, 0]; // treble clef
//   const flatStaffPos = [2, 5, 1, 4, 0, 3, 6]; // treble clef

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

// // Simple quaver grouping helper (returns groups of indices that should be beamed)
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
import type { Clef } from "../../types/music";
import {
  parsePitch,
  getStaffPosition,
  KEY_SIGNATURES,
} from "@/lib/musicTheory";

interface ScoreRendererProps {
  piece: MusicPiece;
  clef: Clef;
  className?: string;
}

const SL = 10; // staff line spacing px
const BARS_PER_ROW = 4;
const BAR_WIDTH = 165;
const MARGIN_LEFT = 90;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 70;
const ROW_HEIGHT = 140;

const SECTION_COLORS: Record<string, string> = {
  A: "#c9973a",
  B: "#4a7fbf",
  C: "#5ba86a",
  D: "#9b6dc0",
};

export default function ScoreRenderer({
  piece,
  clef,
  className,
}: ScoreRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Build flat bar list with section tags
    const bars: Array<Bar & { sectionId: string }> = [];
    for (const secId of piece.structure) {
      const sec = piece.sections.find((s) => s.id === secId);
      if (sec?.bars) {
        for (const bar of sec.bars) {
          bars.push({ ...bar, sectionId: secId });
        }
      }
    }
    // Fallback: iterate sections directly if structure doesn't map properly
    if (bars.length === 0) {
      for (const sec of piece.sections) {
        for (const bar of sec.bars || []) {
          bars.push({ ...bar, sectionId: sec.id });
        }
      }
    }

    const numRows = Math.ceil(bars.length / BARS_PER_ROW);
    const canvasW = MARGIN_LEFT + BARS_PER_ROW * BAR_WIDTH + MARGIN_RIGHT;
    const canvasH = MARGIN_TOP + numRows * ROW_HEIGHT + 60;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + "px";
    canvas.style.height = canvasH + "px";
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#faf8f2";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Title
    ctx.fillStyle = "#1a1510";
    ctx.font = 'bold 18px "Georgia", serif';
    ctx.textAlign = "center";
    ctx.fillText(piece.title, canvasW / 2, 28);

    // Subtitle
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

      // Per-row clef width so staff lines and content can accommodate it
      const CLEF_WIDTH = clef === "treble" ? 22 : 18;

      // 5 staff lines
      ctx.strokeStyle = "#2a2015";
      ctx.lineWidth = 0.8;
      const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
      for (let l = 0; l < 5; l++) {
        const y = staffTop + l * SL;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
        ctx.lineTo(staffRight, y);
        ctx.stroke();
      }

      // Left edge vertical line (continuation rows only)
      if (row > 0) {
        ctx.strokeStyle = "#2a2015";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, staffTop);
        ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH, staffTop + 4 * SL);
        ctx.stroke();
      }

      // Clef
      ctx.fillStyle = "#1a1510";
      if (clef === "treble") {
        ctx.font = `${SL * 6.5}px serif`;
        ctx.textAlign = "left";
        ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);
      } else {
        ctx.font = `${SL * 4.2}px serif`;
        ctx.textAlign = "left";
        ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 2.2);
      }

      // Key signature — first row only
      let ksSigWidth = 0;
      if (ks && row === 0) {
        ksSigWidth = drawKeySignature(ctx, MARGIN_LEFT + 10, staffTop, ks, SL);
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

        // FIX 1: Tighter spacing after time signature (was +18, now +10)
        headerEndX = tsX + 10;
      }

      // Draw each bar
      for (let b = 0; b < rowBars.length; b++) {
        const bar = rowBars[b];

        // FIX 2: Only bar 0 on row 0 gets the header offset.
        // Continuation rows (row > 0, b === 0) get a small clef clearance offset.
        // All other bars use MARGIN_LEFT as base so bar 4 stays within staff bounds.
        const barX =
          row === 0 && b === 0
            ? headerEndX + 6
            : row > 0 && b === 0
              ? MARGIN_LEFT + 14 // small nudge right so notes clear the clef
              : MARGIN_LEFT + b * BAR_WIDTH;

        const globalIdx = row * BARS_PER_ROW + b;
        const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;

        // Bar line (left edge): skip b===0 every row, suppress lines inside header zone
        if (b > 0 && barX >= headerEndX) {
          ctx.strokeStyle = "#2a2015";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(barX, staffTop);
          ctx.lineTo(barX, staffTop + 4 * SL);
          ctx.stroke();
        }

        // Section label above bar
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

        // Notes — pass the bar's right boundary so bar 1 (which starts later) doesn't overflow
        const barRight = MARGIN_LEFT + (b + 1) * BAR_WIDTH;
        drawBarNotes(
          ctx,
          bar,
          barX,
          barRight,
          staffTop,
          piece.timeSig,
          clef,
          SL,
        );
      }

      // Final bar line of this row
      const lastX = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
      ctx.strokeStyle = "#2a2015";
      if (row === numRows - 1) {
        // Double final bar line
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastX - 3, staffTop);
        ctx.lineTo(lastX - 3, staffTop + 4 * SL);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lastX, staffTop);
        ctx.lineTo(lastX, staffTop + 4 * SL);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastX, staffTop);
        ctx.lineTo(lastX, staffTop + 4 * SL);
        ctx.stroke();
      }
    }
  }, [piece, clef]);

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
  // Bar 1 on row 0 has barX shifted right by the header — use less left padding
  // so notes start earlier and have more spacing room within the bar.
  const isFirstBar = barX > MARGIN_LEFT && barX < MARGIN_LEFT + BAR_WIDTH;
  // If bar 1's first note has an accidental, give a little extra room for it
  const firstNoteHasAccidental = (() => {
    const first = notes[0];
    if (!first || first.rest || first.pitch === "rest") return false;
    const p = parsePitch(first.pitch);
    return p ? p.note.includes("#") || p.note.includes("b") : false;
  })();
  const innerLeft = barX + (isFirstBar ? (firstNoteHasAccidental ? 8 : 2) : 10);
  // Use actual available width so bar 1 (shifted right by header) doesn't overflow
  const drawWidth = barRight - innerLeft - 14;
  let xCursor = innerLeft;

  // Detect quaver runs for beam grouping
  const beamGroups = groupQuaversForBeaming(notes);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteWidth = (note.duration / Math.max(totalDur, 1)) * drawWidth;

    // If this note has an accidental, shift it right so the accidental
    // doesn't bleed into the previous note's space
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
      const parsed = parsePitch(note.pitch);
      if (parsed) {
        const staffPos = getStaffPosition(parsed.note, parsed.octave, clef);
        const noteY = staffTop + 2 * sl - staffPos * (sl / 2);
        const stemUp = noteY > staffTop + 2 * sl;
        const accidental = parsed.note.includes("#")
          ? "♯"
          : parsed.note.includes("b")
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

  // Ledger lines above staff
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

  // Note head
  ctx.save();
  ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
  ctx.strokeStyle = "#1a1510";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rw, rh, -0.18, 0, Math.PI * 2);
  ctx.fill();
  if (!filled) ctx.stroke();
  ctx.restore();

  // Accidental
  if (accidental) {
    ctx.fillStyle = "#1a1510";
    ctx.font = `${sl * 2.2}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(accidental, x - rw * 2.8, y + rh * 0.8);
  }

  // Stem
  if (duration <= 2) {
    const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
    const stemEnd = stemUp ? y - sl * 3.5 : y + sl * 3.5;
    ctx.strokeStyle = "#1a1510";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stemX, y);
    ctx.lineTo(stemX, stemEnd);
    ctx.stroke();

    // Flags for quavers (0.5) and semiquavers (0.25)
    if (duration === 0.5) {
      drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
    } else if (duration === 0.25) {
      drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
    }
  }

  // Dot for dotted notes (1.5, 3)
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
    // Whole rest: filled rectangle hanging from line 2 (from top)
    ctx.fillRect(x - sl * 0.9, staffTop + sl - sl * 0.35, sl * 1.8, sl * 0.55);
  } else if (duration >= 2) {
    // Half rest: filled rectangle sitting on line 3
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
  // Staff positions (counting from top line = 0) for sharps: F C G D A E B
  const sharpStaffPos = [4, 1, 5, 2, 6, 3, 0]; // treble clef
  const flatStaffPos = [2, 5, 1, 4, 0, 3, 6]; // treble clef

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

// Simple quaver grouping helper (returns groups of indices that should be beamed)
function groupQuaversForBeaming(notes: Bar["notes"]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].duration === 0.5 && !notes[i].rest) {
      current.push(i);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [];
    }
  }
  if (current.length >= 2) groups.push(current);
  return groups;
}
