"use client";
import { useEffect, useRef } from "react";
import type { MusicPiece, Bar, MusicNote } from "../../types/music";
import type { Clef, NotationStyle } from "../../types/music";
import {
  parsePitch,
  getStaffPosition,
  KEY_SIGNATURES,
  getBarDuration,
} from "@/lib/musicTheory";

interface ScoreRendererProps {
  piece: MusicPiece;
  clef: Clef;
  notation?: NotationStyle;
  currentBeat?: number;
  className?: string;
}

// ── Layout constants ────────────────────────────────────────────────────────
const SL = 10;
const ACC_SPACE = SL * 2.8; // reserved left-of-notehead for accidental glyph
const BARS_PER_ROW = 3;
const BAR_WIDTH = 220;
const MARGIN_LEFT = 90;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 70;
const STAFF_GAP = 50;
const CLEF_WIDTH = 22;

const SECTION_COLORS: Record<string, string> = {
  A: "#c9973a",
  B: "#4a7fbf",
  C: "#5ba86a",
  D: "#9b6dc0",
};

// ── Which note names are already accidentalled by a given key signature ──────
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

function buildKeySigNotes(ks: { sharps: number; flats: number }): Set<string> {
  const set = new Set<string>();
  if (ks.sharps > 0) {
    for (let n = 0; n < ks.sharps; n++) set.add(SHARP_ORDER[n] + "#");
  } else if (ks.flats > 0) {
    for (let n = 0; n < ks.flats; n++) set.add(FLAT_ORDER[n] + "b");
  }
  return set;
}

export default function ScoreRenderer({
  piece,
  clef,
  notation,
  currentBeat = 0,
  className,
}: ScoreRendererProps) {
  const scoreCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = scoreCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars: Array<Bar & { sectionId: string }> = [];
    for (const secId of piece.structure) {
      const sec = piece.sections.find((s) => s.id === secId);
      if (sec?.bars) {
        for (const bar of sec.bars) bars.push({ ...bar, sectionId: secId });
      }
    }
    if (bars.length === 0) {
      for (const sec of piece.sections) {
        for (const bar of sec.bars || [])
          bars.push({ ...bar, sectionId: sec.id });
      }
    }

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
    // Pre-build set of note names already covered by the key signature
    const keySigNotes = ks ? buildKeySigNotes(ks) : new Set<string>();

    for (let row = 0; row < numRows; row++) {
      const rowBars = bars.slice(row * BARS_PER_ROW, (row + 1) * BARS_PER_ROW);
      const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
      const bassTop = staffTop + 4 * SL + STAFF_GAP;
      const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;

      ctx.strokeStyle = "#2a2015";
      ctx.lineWidth = 0.8;
      for (let l = 0; l < 5; l++) {
        const y = staffTop + l * SL;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
        ctx.lineTo(staffRight, y);
        ctx.stroke();
      }

      if (isGrandStaff) {
        for (let l = 0; l < 5; l++) {
          const y = bassTop + l * SL;
          ctx.beginPath();
          ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
          ctx.lineTo(staffRight, y);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH - 1, staffTop);
        ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH - 1, bassTop + 4 * SL);
        ctx.stroke();
        ctx.lineWidth = 0.8;
      }

      ctx.fillStyle = "#1a1510";
      ctx.font = `${SL * 6.5}px serif`;
      ctx.textAlign = "left";
      ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);

      if (isGrandStaff) {
        ctx.font = `${SL * 4.2}px serif`;
        ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, bassTop + SL * 3.2);
      } else if (clef === "bass") {
        ctx.font = `${SL * 4.2}px serif`;
        ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 3.2);
      }

      let ksSigWidth = 0;
      let headerEndX = MARGIN_LEFT;
      if (row === 0) {
        if (ks) {
          ksSigWidth = drawKeySignature(
            ctx,
            MARGIN_LEFT + 10,
            staffTop,
            ks,
            SL,
          );
          if (isGrandStaff)
            drawKeySignature(ctx, MARGIN_LEFT + 10, bassTop, ks, SL);
        }

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
        headerEndX = tsX + 12;
      }

      for (let b = 0; b < rowBars.length; b++) {
        const bar = rowBars[b];
        const isFirstBarOfPiece = row === 0 && b === 0;

        const barStartX = isFirstBarOfPiece
          ? headerEndX + 6
          : row > 0 && b === 0
            ? MARGIN_LEFT + 14
            : MARGIN_LEFT + b * BAR_WIDTH;

        const barRight = MARGIN_LEFT + (b + 1) * BAR_WIDTH;

        const beatGrid = buildBeatGrid(
          barStartX,
          barRight,
          piece.timeSig,
          isFirstBarOfPiece,
        );

        // ── FIX 2: Only draw barlines between bars within a row (b > 0).
        // The left edge of each row is already the staff start line — no
        // extra barline needed at b === 0 for rows > 0.
        if (b > 0) {
          ctx.strokeStyle = "#2a2015";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(barStartX, staffTop);
          ctx.lineTo(
            barStartX,
            isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL,
          );
          ctx.stroke();
        }

        const globalIdx = row * BARS_PER_ROW + b;
        const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;
        const secColor = SECTION_COLORS[bar.sectionId] || "#888";
        if (!prevBar || prevBar.sectionId !== bar.sectionId) {
          ctx.fillStyle = secColor;
          ctx.font = `bold 9px monospace`;
          ctx.textAlign = "left";
          ctx.fillText(`[${bar.sectionId}]`, barStartX + 2, staffTop - 14);
        }
        ctx.fillStyle = "#bbb";
        ctx.font = "8px monospace";
        ctx.fillText(String(globalIdx + 1), barStartX + 2, staffTop - 4);

        if (bar.chordName || bar.chord) {
          ctx.fillStyle = "#6b5c44";
          ctx.font = 'italic 10px "Georgia", serif';
          ctx.textAlign = "center";
          ctx.fillText(
            bar.chordName || bar.chord,
            barStartX + BAR_WIDTH / 2,
            staffTop - 4,
          );
        }

        // Pass keySigNotes to both staves so accidentals are suppressed correctly
        drawBarNotes(
          ctx,
          bar.notes || [],
          beatGrid,
          staffTop,
          piece.timeSig,
          "treble",
          SL,
          keySigNotes,
        );

        if (isGrandStaff && bar.leftNotes?.length) {
          drawBarNotes(
            ctx,
            bar.leftNotes,
            beatGrid,
            bassTop,
            piece.timeSig,
            "bass",
            SL,
            keySigNotes,
          );
        }
      }

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
      } else {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lastX, staffTop);
        ctx.lineTo(lastX, lineBottom);
        ctx.stroke();
      }
    }
  }, [piece, clef, notation]);

  // ── Playhead overlay ───────────────────────────────────────────────────────
  useEffect(() => {
    const score = scoreCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!score || !overlay || currentBeat <= 0) return;

    overlay.width = score.width;
    overlay.height = score.height;
    overlay.style.width = score.style.width;
    overlay.style.height = score.style.height;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);

    const bars: Array<Bar & { sectionId: string }> = [];
    for (const secId of piece.structure) {
      const sec = piece.sections.find((s) => s.id === secId);
      if (sec?.bars)
        for (const bar of sec.bars) bars.push({ ...bar, sectionId: secId });
    }

    const hasLeft = bars.some((b) => b.leftNotes?.length);
    const isGrand =
      notation === "classical" || (notation === undefined && hasLeft);
    const ROW_HEIGHT = isGrand ? 4 * SL + STAFF_GAP + 4 * SL + 60 : 140;

    const [tsNum, tsDenom] = piece.timeSig.split("/").map(Number);
    const beatsPerBar = (tsNum / tsDenom) * 4;

    const totalBar = Math.floor(currentBeat / beatsPerBar);
    const beatInBar = currentBeat % beatsPerBar;

    if (totalBar >= bars.length) return;

    const row = Math.floor(totalBar / BARS_PER_ROW);
    const col = totalBar % BARS_PER_ROW;

    const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
    const bassTop = staffTop + 4 * SL + STAFF_GAP;
    const lineBottom = isGrand ? bassTop + 4 * SL : staffTop + 4 * SL;

    let barStartX: number;
    if (row === 0 && col === 0) {
      const ks = KEY_SIGNATURES[piece.key];
      const sigCount = ks ? Math.max(ks.sharps || 0, ks.flats || 0) : 0;
      const ksSigWidthEst = sigCount * 12 + (sigCount > 0 ? 10 : 0);
      const tsX = MARGIN_LEFT + ksSigWidthEst + 20;
      const headerEndX = tsX + 12;
      barStartX = headerEndX + 6;
    } else if (row > 0 && col === 0) {
      barStartX = MARGIN_LEFT + 14;
    } else {
      barStartX = MARGIN_LEFT + col * BAR_WIDTH;
    }

    const barRight = MARGIN_LEFT + (col + 1) * BAR_WIDTH;

    const beatGrid = buildBeatGrid(
      barStartX,
      barRight,
      piece.timeSig,
      row === 0 && col === 0,
    );
    const innerLeft = beatGrid[0];
    const innerRight = beatGrid[1];
    const usableWidth = innerRight - innerLeft;
    // Match note placement: same formula as computeNoteXPositions
    // Same slot formula as computeNoteXPositions
    // Same pair formula as computeNoteXPositions
    const totalPairs = beatsPerBar / 0.5;
    const pairW = usableWidth / totalPairs;
    const x = innerLeft + (beatInBar / 0.5) * pairW + pairW * 0.5;

    ctx.save();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x, staffTop - 4);
    ctx.lineTo(x, lineBottom + 4);
    ctx.stroke();
    ctx.restore();
  }, [currentBeat, piece, notation]);

  return (
    <div
      className={`relative inline-block ${className ?? ""}`}
      style={{ lineHeight: 0 }}
    >
      <canvas ref={scoreCanvasRef} style={{ display: "block" }} />
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          display: "block",
        }}
      />
    </div>
  );
}

// ── Shared beat grid ────────────────────────────────────────────────────────
function buildBeatGrid(
  barStartX: number,
  barRight: number,
  timeSig: string,
  isFirstBarOfPiece: boolean,
): [number, number] {
  const LEFT_PAD = isFirstBarOfPiece ? 6 : 10;
  const RIGHT_PAD = 14;
  const innerLeft = barStartX + LEFT_PAD;
  const innerRight = barRight - RIGHT_PAD;
  return [innerLeft, Math.max(innerLeft, innerRight)];
}

// ── Compute X positions ─────────────────────────────────────────────────────
// Each note occupies a PAIR of sub-slots:
//   [ ACC_SLOT | NOTE_SLOT ]
// The bar is divided so that every possible quaver position gets its own pair.
// Total pairs = barDur / 0.5 (e.g. 8 for 4/4).
// Each pair width = usableWidth / totalPairs.
// Within each pair: first half = acc zone, second half = note zone.
// notehead x = pairLeft + pairW * 0.5
// accidental x = pairLeft + pairW * 0.25  (centre of acc half)
//
// Both hands use identical barDur → same beat = same pairLeft = same x. Guaranteed.
function computeNoteXPositions(
  notes: MusicNote[],
  beatGrid: [number, number],
  timeSig: string,
  keySigNotes: Set<string>,
): number[] {
  const [innerLeft, innerRight] = beatGrid;
  const usableWidth = innerRight - innerLeft;
  const barDur = getBarDuration(timeSig);

  // One pair per quaver position
  const totalPairs = barDur / 0.5;
  const pairW = usableWidth / totalPairs;

  const xs: number[] = [];
  let cursor = 0;

  for (const note of notes) {
    const pairIndex = cursor / 0.5;
    const pairLeft = innerLeft + pairIndex * pairW;
    // Notehead at the start of the NOTE_SLOT (second half of pair)
    xs.push(Math.round(pairLeft + pairW * 0.5));
    cursor += note.duration;
  }

  return xs;
}

// ── Draw notes ──────────────────────────────────────────────────────────────
function drawBarNotes(
  ctx: CanvasRenderingContext2D,
  notes: MusicNote[],
  beatGrid: [number, number],
  staffTop: number,
  timeSig: string,
  clef: Clef,
  sl: number,
  keySigNotes: Set<string>, // ── FIX 1: notes already covered by key signature
) {
  if (!notes.length) return;

  const noteXs = computeNoteXPositions(notes, beatGrid, timeSig, keySigNotes);

  // Mirror pair geometry from computeNoteXPositions for accidental placement
  const _usableW = beatGrid[1] - beatGrid[0];
  const _barDur = getBarDuration(timeSig);
  const _pairW = _usableW / (_barDur / 0.5); // one pair per quaver position
  // Font fills 70% of the ACC_SLOT (pairW * 0.5), capped at sl*2.
  // This automatically scales down for dense bars without a hard pixel gap.
  const _accFontSize = Math.min(sl * 2.0, (_pairW * 0.5 * 0.7) / 0.55);
  const _glyphHalf = _accFontSize * 0.28;
  // Place glyph centre so right edge has a proportional gap from notehead.
  // Gap = max(3px, pairW * 0.08) — scales with bar density.
  const _gap = Math.max(6, _pairW * 0.15);
  const _accX_off = _glyphHalf + _gap;

  // ── Beam grouping ────────────────────────────────────────────────────────
  const [tsNum, tsDenom] = timeSig.split("/").map(Number);
  const isCompound = tsDenom === 8 && tsNum % 3 === 0;
  const beatDur = isCompound ? 1.5 : 1.0;

  const beatPos: number[] = [];
  let cum = 0;
  for (const n of notes) {
    beatPos.push(cum);
    cum += n.duration;
  }

  const beamGroup = new Array(notes.length).fill(-1);
  let groupId = 0;
  let i = 0;
  while (i < notes.length) {
    if (notes[i].duration === 0.5 && !notes[i].rest) {
      const thisBeat = Math.floor(beatPos[i] / beatDur);
      let j = i;
      while (
        j < notes.length &&
        notes[j].duration === 0.5 &&
        !notes[j].rest &&
        Math.floor(beatPos[j] / beatDur) === thisBeat
      )
        j++;
      const len = j - i;
      if (len >= 2) {
        let k = i;
        while (k < j) {
          const end = Math.min(k + (isCompound ? 3 : 4), j);
          if (end - k >= 2) {
            for (let m = k; m < end; m++) beamGroup[m] = groupId;
            groupId++;
          }
          k = end;
        }
      }
      i = j;
    } else {
      i++;
    }
  }

  // ── Draw notes ────────────────────────────────────────────────────────────
  const rw = sl * 0.62;
  const rh = sl * 0.46;

  for (let idx = 0; idx < notes.length; idx++) {
    const note = notes[idx];
    const x = noteXs[idx];
    const isRest = note.rest || note.pitch === "rest";

    if (isRest) {
      drawRest(ctx, x, staffTop, note.duration, sl);
      continue;
    }

    const parsed = parsePitch(note.pitch)!;
    const staffPos = getStaffPosition(parsed.note, parsed.octave, clef);
    const noteY = staffTop + 2 * sl - staffPos * (sl / 2);
    const stemUp = noteY > staffTop + 2 * sl;

    // ── FIX 1: Only show accidental if NOT already in the key signature ──
    const noteBase = parsed.note.replace("#", "").replace("b", "");
    const noteWithAcc = parsed.note.includes("#")
      ? noteBase + "#"
      : parsed.note.includes("b")
        ? noteBase + "b"
        : null;
    const accidental =
      noteWithAcc && !keySigNotes.has(noteWithAcc)
        ? parsed.note.includes("#")
          ? "♯"
          : "♭"
        : null;

    // Ledger lines
    const topLine = staffTop;
    const bottomLine = staffTop + 4 * sl;
    ctx.strokeStyle = "#2a2015";
    ctx.lineWidth = 0.8;
    if (noteY <= topLine - sl / 2) {
      for (let ly = topLine - sl; ly >= noteY - rh; ly -= sl) {
        ctx.beginPath();
        ctx.moveTo(x - rw * 1.7, ly);
        ctx.lineTo(x + rw * 1.7, ly);
        ctx.stroke();
      }
    }
    if (noteY >= bottomLine + sl / 2) {
      for (let ly = bottomLine + sl; ly <= noteY + rh; ly += sl) {
        ctx.beginPath();
        ctx.moveTo(x - rw * 1.7, ly);
        ctx.lineTo(x + rw * 1.7, ly);
        ctx.stroke();
      }
    }

    // Notehead
    const filled = note.duration < 2;
    ctx.save();
    ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
    ctx.strokeStyle = "#1a1510";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, noteY, rw, rh, -0.18, 0, Math.PI * 2);
    ctx.fill();
    if (!filled) ctx.stroke();
    ctx.restore();

    if (accidental) {
      // Draw in the ACC_SLOT, scaled to fit, with guaranteed gap from notehead
      const accX = x - _accX_off;
      ctx.fillStyle = "#1a1510";
      ctx.font = `${_accFontSize}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(accidental, accX, noteY + rh * 0.8);
    }

    const isBeamed = beamGroup[idx] !== -1;
    if (note.duration <= 2) {
      const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
      const stemEnd = stemUp ? noteY - sl * 3.5 : noteY + sl * 3.5;

      if (!isBeamed) {
        ctx.strokeStyle = "#1a1510";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stemX, noteY);
        ctx.lineTo(stemX, stemEnd);
        ctx.stroke();

        if (note.duration === 0.5) drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
        if (note.duration === 0.25)
          drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
      }
    }

    if (note.duration === 1.5 || note.duration === 3) {
      ctx.fillStyle = "#1a1510";
      ctx.beginPath();
      ctx.arc(x + rw * 1.9, noteY - rh * 0.4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Beams ─────────────────────────────────────────────────────────────────
  const rwBeam = sl * 0.62;
  const groups = new Map<number, number[]>();
  for (let idx = 0; idx < notes.length; idx++) {
    const g = beamGroup[idx];
    if (g === -1) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(idx);
  }

  for (const [, indices] of groups) {
    if (indices.length < 2) continue;

    const first = indices[0];
    const last = indices[indices.length - 1];

    const getNoteY = (idx: number) => {
      const p = parsePitch(notes[idx].pitch!)!;
      const sp = getStaffPosition(p.note, p.octave, clef);
      return staffTop + 2 * sl - sp * (sl / 2);
    };

    const firstNoteY = getNoteY(first);
    const stemUp = firstNoteY > staffTop + 2 * sl;

    const stemEnds = indices.map((idx) => {
      const ny = getNoteY(idx);
      return stemUp ? ny - sl * 3.5 : ny + sl * 3.5;
    });

    const y1 = stemEnds[0];
    const y2 = stemEnds[stemEnds.length - 1];
    const midY = (y1 + y2) / 2;
    const rawTilt = y2 - y1;
    const tilt = Math.sign(rawTilt) * Math.min(Math.abs(rawTilt), sl * 1.5);
    const beamY1 = midY - tilt / 2;
    const beamY2 = midY + tilt / 2;

    const stemX1 = stemUp
      ? noteXs[first] + rwBeam * 0.9
      : noteXs[first] - rwBeam * 0.9;
    const stemX2 = stemUp
      ? noteXs[last] + rwBeam * 0.9
      : noteXs[last] - rwBeam * 0.9;

    for (const idx of indices) {
      const ny = getNoteY(idx);
      const sx = stemUp
        ? noteXs[idx] + rwBeam * 0.9
        : noteXs[idx] - rwBeam * 0.9;
      const t =
        (noteXs[idx] - noteXs[first]) /
        Math.max(noteXs[last] - noteXs[first], 1);
      const beamAtX = beamY1 + t * (beamY2 - beamY1);
      ctx.strokeStyle = "#1a1510";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, ny);
      ctx.lineTo(sx, beamAtX);
      ctx.stroke();
    }

    ctx.lineWidth = sl * 0.55;
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#1a1510";
    ctx.beginPath();
    ctx.moveTo(stemX1, beamY1);
    ctx.lineTo(stemX2, beamY2);
    ctx.stroke();
    ctx.lineCap = "round";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
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

// "use client";
// import { useEffect, useRef } from "react";
// import type { MusicPiece, Bar, MusicNote } from "../../types/music";
// import type { Clef, NotationStyle } from "../../types/music";
// import {
//   parsePitch,
//   getStaffPosition,
//   KEY_SIGNATURES,
//   getBarDuration,
// } from "@/lib/musicTheory";

// interface ScoreRendererProps {
//   piece: MusicPiece;
//   clef: Clef;
//   notation?: NotationStyle;
//   currentBeat?: number;
//   className?: string;
// }

// // ── Layout constants ────────────────────────────────────────────────────────
// const SL = 10;
// const ACC_SPACE = SL * 2.8; // reserved left-of-notehead for accidental glyph
// const BARS_PER_ROW = 3;
// const BAR_WIDTH = 220;
// const MARGIN_LEFT = 90;
// const MARGIN_RIGHT = 40;
// const MARGIN_TOP = 70;
// const STAFF_GAP = 50;
// const CLEF_WIDTH = 22;

// const SECTION_COLORS: Record<string, string> = {
//   A: "#c9973a",
//   B: "#4a7fbf",
//   C: "#5ba86a",
//   D: "#9b6dc0",
// };

// // ── Which note names are already accidentalled by a given key signature ──────
// const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
// const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

// function buildKeySigNotes(ks: { sharps: number; flats: number }): Set<string> {
//   const set = new Set<string>();
//   if (ks.sharps > 0) {
//     for (let n = 0; n < ks.sharps; n++) set.add(SHARP_ORDER[n] + "#");
//   } else if (ks.flats > 0) {
//     for (let n = 0; n < ks.flats; n++) set.add(FLAT_ORDER[n] + "b");
//   }
//   return set;
// }

// export default function ScoreRenderer({
//   piece,
//   clef,
//   notation,
//   currentBeat = 0,
//   className,
// }: ScoreRendererProps) {
//   const scoreCanvasRef = useRef<HTMLCanvasElement>(null);
//   const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     const canvas = scoreCanvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const bars: Array<Bar & { sectionId: string }> = [];
//     for (const secId of piece.structure) {
//       const sec = piece.sections.find((s) => s.id === secId);
//       if (sec?.bars) {
//         for (const bar of sec.bars) bars.push({ ...bar, sectionId: secId });
//       }
//     }
//     if (bars.length === 0) {
//       for (const sec of piece.sections) {
//         for (const bar of sec.bars || [])
//           bars.push({ ...bar, sectionId: sec.id });
//       }
//     }

//     const hasLeftNotes = bars.some(
//       (b) => b.leftNotes && b.leftNotes.length > 0,
//     );
//     const isGrandStaff =
//       notation === "classical" || (notation === undefined && hasLeftNotes);
//     const ROW_HEIGHT = isGrandStaff ? 4 * SL + STAFF_GAP + 4 * SL + 60 : 140;

//     const numRows = Math.ceil(bars.length / BARS_PER_ROW);
//     const canvasW = MARGIN_LEFT + BARS_PER_ROW * BAR_WIDTH + MARGIN_RIGHT;
//     const canvasH = MARGIN_TOP + numRows * ROW_HEIGHT + 60;
//     const dpr = window.devicePixelRatio || 1;

//     canvas.width = canvasW * dpr;
//     canvas.height = canvasH * dpr;
//     canvas.style.width = canvasW + "px";
//     canvas.style.height = canvasH + "px";
//     ctx.scale(dpr, dpr);

//     ctx.fillStyle = "#faf8f2";
//     ctx.fillRect(0, 0, canvasW, canvasH);

//     ctx.fillStyle = "#1a1510";
//     ctx.font = 'bold 18px "Georgia", serif';
//     ctx.textAlign = "center";
//     ctx.fillText(piece.title, canvasW / 2, 28);

//     ctx.fillStyle = "#6b5c44";
//     ctx.font = "11px monospace";
//     ctx.fillText(
//       `${piece.key} ${piece.mode} · ${piece.timeSig} · ${piece.genre} · ${piece.tempo} BPM`,
//       canvasW / 2,
//       44,
//     );

//     const ks = KEY_SIGNATURES[piece.key];
//     // Pre-build set of note names already covered by the key signature
//     const keySigNotes = ks ? buildKeySigNotes(ks) : new Set<string>();

//     for (let row = 0; row < numRows; row++) {
//       const rowBars = bars.slice(row * BARS_PER_ROW, (row + 1) * BARS_PER_ROW);
//       const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
//       const bassTop = staffTop + 4 * SL + STAFF_GAP;
//       const staffRight = MARGIN_LEFT + rowBars.length * BAR_WIDTH;

//       ctx.strokeStyle = "#2a2015";
//       ctx.lineWidth = 0.8;
//       for (let l = 0; l < 5; l++) {
//         const y = staffTop + l * SL;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
//         ctx.lineTo(staffRight, y);
//         ctx.stroke();
//       }

//       if (isGrandStaff) {
//         for (let l = 0; l < 5; l++) {
//           const y = bassTop + l * SL;
//           ctx.beginPath();
//           ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH, y);
//           ctx.lineTo(staffRight, y);
//           ctx.stroke();
//         }
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         ctx.moveTo(MARGIN_LEFT - CLEF_WIDTH - 1, staffTop);
//         ctx.lineTo(MARGIN_LEFT - CLEF_WIDTH - 1, bassTop + 4 * SL);
//         ctx.stroke();
//         ctx.lineWidth = 0.8;
//       }

//       ctx.fillStyle = "#1a1510";
//       ctx.font = `${SL * 6.5}px serif`;
//       ctx.textAlign = "left";
//       ctx.fillText("𝄞", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 4.2);

//       if (isGrandStaff) {
//         ctx.font = `${SL * 4.2}px serif`;
//         ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, bassTop + SL * 3.2);
//       } else if (clef === "bass") {
//         ctx.font = `${SL * 4.2}px serif`;
//         ctx.fillText("𝄢", MARGIN_LEFT - CLEF_WIDTH + 1, staffTop + SL * 3.2);
//       }

//       let ksSigWidth = 0;
//       let headerEndX = MARGIN_LEFT;
//       if (row === 0) {
//         if (ks) {
//           ksSigWidth = drawKeySignature(
//             ctx,
//             MARGIN_LEFT + 10,
//             staffTop,
//             ks,
//             SL,
//           );
//           if (isGrandStaff)
//             drawKeySignature(ctx, MARGIN_LEFT + 10, bassTop, ks, SL);
//         }

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
//         headerEndX = tsX + 12;
//       }

//       for (let b = 0; b < rowBars.length; b++) {
//         const bar = rowBars[b];
//         const isFirstBarOfPiece = row === 0 && b === 0;

//         const barStartX = isFirstBarOfPiece
//           ? headerEndX + 6
//           : row > 0 && b === 0
//             ? MARGIN_LEFT + 14
//             : MARGIN_LEFT + b * BAR_WIDTH;

//         const barRight = MARGIN_LEFT + (b + 1) * BAR_WIDTH;

//         const beatGrid = buildBeatGrid(
//           barStartX,
//           barRight,
//           piece.timeSig,
//           isFirstBarOfPiece,
//         );

//         // ── FIX 2: Only draw barlines between bars within a row (b > 0).
//         // The left edge of each row is already the staff start line — no
//         // extra barline needed at b === 0 for rows > 0.
//         if (b > 0) {
//           ctx.strokeStyle = "#2a2015";
//           ctx.lineWidth = 1;
//           ctx.beginPath();
//           ctx.moveTo(barStartX, staffTop);
//           ctx.lineTo(
//             barStartX,
//             isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL,
//           );
//           ctx.stroke();
//         }

//         const globalIdx = row * BARS_PER_ROW + b;
//         const prevBar = globalIdx > 0 ? bars[globalIdx - 1] : null;
//         const secColor = SECTION_COLORS[bar.sectionId] || "#888";
//         if (!prevBar || prevBar.sectionId !== bar.sectionId) {
//           ctx.fillStyle = secColor;
//           ctx.font = `bold 9px monospace`;
//           ctx.textAlign = "left";
//           ctx.fillText(`[${bar.sectionId}]`, barStartX + 2, staffTop - 14);
//         }
//         ctx.fillStyle = "#bbb";
//         ctx.font = "8px monospace";
//         ctx.fillText(String(globalIdx + 1), barStartX + 2, staffTop - 4);

//         if (bar.chordName || bar.chord) {
//           ctx.fillStyle = "#6b5c44";
//           ctx.font = 'italic 10px "Georgia", serif';
//           ctx.textAlign = "center";
//           ctx.fillText(
//             bar.chordName || bar.chord,
//             barStartX + BAR_WIDTH / 2,
//             staffTop - 4,
//           );
//         }

//         // Pass keySigNotes to both staves so accidentals are suppressed correctly
//         drawBarNotes(
//           ctx,
//           bar.notes || [],
//           beatGrid,
//           staffTop,
//           piece.timeSig,
//           "treble",
//           SL,
//           keySigNotes,
//         );

//         if (isGrandStaff && bar.leftNotes?.length) {
//           drawBarNotes(
//             ctx,
//             bar.leftNotes,
//             beatGrid,
//             bassTop,
//             piece.timeSig,
//             "bass",
//             SL,
//             keySigNotes,
//           );
//         }
//       }

//       const lastX = MARGIN_LEFT + rowBars.length * BAR_WIDTH;
//       const lineBottom = isGrandStaff ? bassTop + 4 * SL : staffTop + 4 * SL;
//       ctx.strokeStyle = "#2a2015";
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
//       } else {
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(lastX, staffTop);
//         ctx.lineTo(lastX, lineBottom);
//         ctx.stroke();
//       }
//     }
//   }, [piece, clef, notation]);

//   // ── Playhead overlay ───────────────────────────────────────────────────────
//   useEffect(() => {
//     const score = scoreCanvasRef.current;
//     const overlay = overlayCanvasRef.current;
//     if (!score || !overlay || currentBeat <= 0) return;

//     overlay.width = score.width;
//     overlay.height = score.height;
//     overlay.style.width = score.style.width;
//     overlay.style.height = score.style.height;

//     const ctx = overlay.getContext("2d");
//     if (!ctx) return;
//     const dpr = window.devicePixelRatio || 1;
//     ctx.clearRect(0, 0, overlay.width, overlay.height);
//     ctx.scale(dpr, dpr);

//     const bars: Array<Bar & { sectionId: string }> = [];
//     for (const secId of piece.structure) {
//       const sec = piece.sections.find((s) => s.id === secId);
//       if (sec?.bars)
//         for (const bar of sec.bars) bars.push({ ...bar, sectionId: secId });
//     }

//     const hasLeft = bars.some((b) => b.leftNotes?.length);
//     const isGrand =
//       notation === "classical" || (notation === undefined && hasLeft);
//     const ROW_HEIGHT = isGrand ? 4 * SL + STAFF_GAP + 4 * SL + 60 : 140;

//     const [tsNum, tsDenom] = piece.timeSig.split("/").map(Number);
//     const beatsPerBar = (tsNum / tsDenom) * 4;

//     const totalBar = Math.floor(currentBeat / beatsPerBar);
//     const beatInBar = currentBeat % beatsPerBar;

//     if (totalBar >= bars.length) return;

//     const row = Math.floor(totalBar / BARS_PER_ROW);
//     const col = totalBar % BARS_PER_ROW;

//     const staffTop = MARGIN_TOP + row * ROW_HEIGHT;
//     const bassTop = staffTop + 4 * SL + STAFF_GAP;
//     const lineBottom = isGrand ? bassTop + 4 * SL : staffTop + 4 * SL;

//     let barStartX: number;
//     if (row === 0 && col === 0) {
//       const ks = KEY_SIGNATURES[piece.key];
//       const sigCount = ks ? Math.max(ks.sharps || 0, ks.flats || 0) : 0;
//       const ksSigWidthEst = sigCount * 12 + (sigCount > 0 ? 10 : 0);
//       const tsX = MARGIN_LEFT + ksSigWidthEst + 20;
//       const headerEndX = tsX + 12;
//       barStartX = headerEndX + 6;
//     } else if (row > 0 && col === 0) {
//       barStartX = MARGIN_LEFT + 14;
//     } else {
//       barStartX = MARGIN_LEFT + col * BAR_WIDTH;
//     }

//     const barRight = MARGIN_LEFT + (col + 1) * BAR_WIDTH;

//     const beatGrid = buildBeatGrid(
//       barStartX,
//       barRight,
//       piece.timeSig,
//       row === 0 && col === 0,
//     );
//     const innerLeft = beatGrid[0];
//     const innerRight = beatGrid[1];
//     const usableWidth = innerRight - innerLeft;
//     // Match note placement: same formula as computeNoteXPositions
//     // Same slot formula as computeNoteXPositions
//     // Same pair formula as computeNoteXPositions
//     const totalPairs = beatsPerBar / 0.5;
//     const pairW = usableWidth / totalPairs;
//     const x = innerLeft + (beatInBar / 0.5) * pairW + pairW * 0.5;

//     ctx.save();
//     ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
//     ctx.lineWidth = 2;
//     ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
//     ctx.shadowBlur = 6;
//     ctx.beginPath();
//     ctx.moveTo(x, staffTop - 4);
//     ctx.lineTo(x, lineBottom + 4);
//     ctx.stroke();
//     ctx.restore();
//   }, [currentBeat, piece, notation]);

//   return (
//     <div
//       className={`relative inline-block ${className ?? ""}`}
//       style={{ lineHeight: 0 }}
//     >
//       <canvas ref={scoreCanvasRef} style={{ display: "block" }} />
//       <canvas
//         ref={overlayCanvasRef}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           pointerEvents: "none",
//           display: "block",
//         }}
//       />
//     </div>
//   );
// }

// // ── Shared beat grid ────────────────────────────────────────────────────────
// function buildBeatGrid(
//   barStartX: number,
//   barRight: number,
//   timeSig: string,
//   isFirstBarOfPiece: boolean,
// ): [number, number] {
//   const LEFT_PAD = isFirstBarOfPiece ? 6 : 10;
//   const RIGHT_PAD = 14;
//   const innerLeft = barStartX + LEFT_PAD;
//   const innerRight = barRight - RIGHT_PAD;
//   return [innerLeft, Math.max(innerLeft, innerRight)];
// }

// // ── Compute X positions ─────────────────────────────────────────────────────
// // Each note occupies a PAIR of sub-slots:
// //   [ ACC_SLOT | NOTE_SLOT ]
// // The bar is divided so that every possible quaver position gets its own pair.
// // Total pairs = barDur / 0.5 (e.g. 8 for 4/4).
// // Each pair width = usableWidth / totalPairs.
// // Within each pair: first half = acc zone, second half = note zone.
// // notehead x = pairLeft + pairW * 0.5
// // accidental x = pairLeft + pairW * 0.25  (centre of acc half)
// //
// // Both hands use identical barDur → same beat = same pairLeft = same x. Guaranteed.
// function computeNoteXPositions(
//   notes: MusicNote[],
//   beatGrid: [number, number],
//   timeSig: string,
//   keySigNotes: Set<string>,
// ): number[] {
//   const [innerLeft, innerRight] = beatGrid;
//   const usableWidth = innerRight - innerLeft;
//   const barDur = getBarDuration(timeSig);

//   // One pair per quaver position
//   const totalPairs = barDur / 0.5;
//   const pairW = usableWidth / totalPairs;

//   const xs: number[] = [];
//   let cursor = 0;

//   for (const note of notes) {
//     const pairIndex = cursor / 0.5;
//     const pairLeft = innerLeft + pairIndex * pairW;
//     // Notehead at the start of the NOTE_SLOT (second half of pair)
//     xs.push(Math.round(pairLeft + pairW * 0.5));
//     cursor += note.duration;
//   }

//   return xs;
// }

// // ── Draw notes ──────────────────────────────────────────────────────────────
// function drawBarNotes(
//   ctx: CanvasRenderingContext2D,
//   notes: MusicNote[],
//   beatGrid: [number, number],
//   staffTop: number,
//   timeSig: string,
//   clef: Clef,
//   sl: number,
//   keySigNotes: Set<string>, // ── FIX 1: notes already covered by key signature
// ) {
//   if (!notes.length) return;

//   const noteXs = computeNoteXPositions(notes, beatGrid, timeSig, keySigNotes);

//   // Mirror pair geometry from computeNoteXPositions for accidental placement
//   const _usableW = beatGrid[1] - beatGrid[0];
//   const _barDur = getBarDuration(timeSig);
//   const _pairW = _usableW / (_barDur / 0.5); // one pair per quaver position
//   // Font fills 70% of the ACC_SLOT (pairW * 0.5), capped at sl*2.
//   // This automatically scales down for dense bars without a hard pixel gap.
//   const _accFontSize = Math.min(sl * 2.0, (_pairW * 0.5 * 0.7) / 0.55);
//   const _glyphHalf = _accFontSize * 0.28;
//   // Place glyph centre so right edge has a proportional gap from notehead.
//   // Gap = max(3px, pairW * 0.08) — scales with bar density.
//   const _gap = Math.max(9, _pairW * 0.22);
//   const _accX_off = _glyphHalf + _gap;

//   // ── Beam grouping ────────────────────────────────────────────────────────
//   const [tsNum, tsDenom] = timeSig.split("/").map(Number);
//   const isCompound = tsDenom === 8 && tsNum % 3 === 0;
//   const beatDur = isCompound ? 1.5 : 1.0;

//   const beatPos: number[] = [];
//   let cum = 0;
//   for (const n of notes) {
//     beatPos.push(cum);
//     cum += n.duration;
//   }

//   const beamGroup = new Array(notes.length).fill(-1);
//   let groupId = 0;
//   let i = 0;
//   while (i < notes.length) {
//     if (notes[i].duration === 0.5 && !notes[i].rest) {
//       const thisBeat = Math.floor(beatPos[i] / beatDur);
//       let j = i;
//       while (
//         j < notes.length &&
//         notes[j].duration === 0.5 &&
//         !notes[j].rest &&
//         Math.floor(beatPos[j] / beatDur) === thisBeat
//       )
//         j++;
//       const len = j - i;
//       if (len >= 2) {
//         let k = i;
//         while (k < j) {
//           const end = Math.min(k + (isCompound ? 3 : 4), j);
//           if (end - k >= 2) {
//             for (let m = k; m < end; m++) beamGroup[m] = groupId;
//             groupId++;
//           }
//           k = end;
//         }
//       }
//       i = j;
//     } else {
//       i++;
//     }
//   }

//   // ── Draw notes ────────────────────────────────────────────────────────────
//   const rw = sl * 0.62;
//   const rh = sl * 0.46;

//   for (let idx = 0; idx < notes.length; idx++) {
//     const note = notes[idx];
//     const x = noteXs[idx];
//     const isRest = note.rest || note.pitch === "rest";

//     if (isRest) {
//       drawRest(ctx, x, staffTop, note.duration, sl);
//       continue;
//     }

//     const parsed = parsePitch(note.pitch)!;
//     const staffPos = getStaffPosition(parsed.note, parsed.octave, clef);
//     const noteY = staffTop + 2 * sl - staffPos * (sl / 2);
//     const stemUp = noteY > staffTop + 2 * sl;

//     // ── FIX 1: Only show accidental if NOT already in the key signature ──
//     const noteBase = parsed.note.replace("#", "").replace("b", "");
//     const noteWithAcc = parsed.note.includes("#")
//       ? noteBase + "#"
//       : parsed.note.includes("b")
//         ? noteBase + "b"
//         : null;
//     const accidental =
//       noteWithAcc && !keySigNotes.has(noteWithAcc)
//         ? parsed.note.includes("#")
//           ? "♯"
//           : "♭"
//         : null;

//     // Ledger lines
//     const topLine = staffTop;
//     const bottomLine = staffTop + 4 * sl;
//     ctx.strokeStyle = "#2a2015";
//     ctx.lineWidth = 0.8;
//     if (noteY <= topLine - sl / 2) {
//       for (let ly = topLine - sl; ly >= noteY - rh; ly -= sl) {
//         ctx.beginPath();
//         ctx.moveTo(x - rw * 1.7, ly);
//         ctx.lineTo(x + rw * 1.7, ly);
//         ctx.stroke();
//       }
//     }
//     if (noteY >= bottomLine + sl / 2) {
//       for (let ly = bottomLine + sl; ly <= noteY + rh; ly += sl) {
//         ctx.beginPath();
//         ctx.moveTo(x - rw * 1.7, ly);
//         ctx.lineTo(x + rw * 1.7, ly);
//         ctx.stroke();
//       }
//     }

//     // Notehead
//     const filled = note.duration < 2;
//     ctx.save();
//     ctx.fillStyle = filled ? "#1a1510" : "#faf8f2";
//     ctx.strokeStyle = "#1a1510";
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.ellipse(x, noteY, rw, rh, -0.18, 0, Math.PI * 2);
//     ctx.fill();
//     if (!filled) ctx.stroke();
//     ctx.restore();

//     if (accidental) {
//       // Draw in the ACC_SLOT, scaled to fit, with guaranteed gap from notehead
//       const accX = x - _accX_off;
//       ctx.fillStyle = "#1a1510";
//       ctx.font = `${_accFontSize}px serif`;
//       ctx.textAlign = "center";
//       ctx.fillText(accidental, accX, noteY + rh * 0.8);
//     }

//     const isBeamed = beamGroup[idx] !== -1;
//     if (note.duration <= 2) {
//       const stemX = stemUp ? x + rw * 0.9 : x - rw * 0.9;
//       const stemEnd = stemUp ? noteY - sl * 3.5 : noteY + sl * 3.5;

//       if (!isBeamed) {
//         ctx.strokeStyle = "#1a1510";
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         ctx.moveTo(stemX, noteY);
//         ctx.lineTo(stemX, stemEnd);
//         ctx.stroke();

//         if (note.duration === 0.5) drawFlag(ctx, stemX, stemEnd, stemUp, sl, 1);
//         if (note.duration === 0.25)
//           drawFlag(ctx, stemX, stemEnd, stemUp, sl, 2);
//       }
//     }

//     if (note.duration === 1.5 || note.duration === 3) {
//       ctx.fillStyle = "#1a1510";
//       ctx.beginPath();
//       ctx.arc(x + rw * 1.9, noteY - rh * 0.4, 1.8, 0, Math.PI * 2);
//       ctx.fill();
//     }
//   }

//   // ── Ties ──────────────────────────────────────────────────────────────────
//   // In compound time (6/8, 9/8, 12/8): when two adjacent quavers share the
//   // same pitch and the first one sits at the last position of a beat group
//   // (e.g. quaver 3 of group 1), draw a tie arc to the next notehead.
//   // No extra noteheads are drawn — both notes already exist in the array.
//   if (isCompound) {
//     for (let idx = 0; idx + 1 < notes.length; idx++) {
//       const note = notes[idx];
//       const nextNote = notes[idx + 1];
//       if (note.rest || note.pitch === "rest") continue;
//       if (nextNote.rest || nextNote.pitch === "rest") continue;

//       const pos = beatPos[idx];
//       const nextPos = beatPos[idx + 1];
//       const beatBoundary = (Math.floor(pos / beatDur) + 1) * beatDur;

//       // This note ends exactly at the beat boundary AND next note starts there
//       // i.e. this is the last note of a beat group tied into the next group
//       const endsAtBoundary =
//         Math.abs(pos + note.duration - beatBoundary) < 0.001;
//       const nextStartsAtBoundary = Math.abs(nextPos - beatBoundary) < 0.001;
//       const samePitch = note.pitch === nextNote.pitch;

//       if (endsAtBoundary && nextStartsAtBoundary && samePitch) {
//         const parsed = parsePitch(note.pitch);
//         if (!parsed) continue;
//         const staffPos2 = getStaffPosition(parsed.note, parsed.octave, clef);
//         const noteY2 = staffTop + 2 * sl - staffPos2 * (sl / 2);
//         const x1 = noteXs[idx];
//         const x2 = noteXs[idx + 1];
//         const stemUp2 = noteY2 > staffTop + 2 * sl;

//         // Tie arc curves below if stem is up, above if stem is down
//         const tieDir = stemUp2 ? 1 : -1; // 1 = below notehead, -1 = above
//         const tieY = noteY2 + tieDir * rh * 2.0;
//         const midX = (x1 + x2) / 2;
//         const bulge = sl * 1.0 * tieDir;
//         ctx.strokeStyle = "#1a1510";
//         ctx.lineWidth = 1.3;
//         ctx.beginPath();
//         ctx.moveTo(x1 + rw * 0.8, tieY);
//         ctx.quadraticCurveTo(midX, tieY + bulge, x2 - rw * 0.8, tieY);
//         ctx.stroke();
//       }
//     }
//   }

//   // ── Beams ─────────────────────────────────────────────────────────────────
//   const rwBeam = sl * 0.62;
//   const groups = new Map<number, number[]>();
//   for (let idx = 0; idx < notes.length; idx++) {
//     const g = beamGroup[idx];
//     if (g === -1) continue;
//     if (!groups.has(g)) groups.set(g, []);
//     groups.get(g)!.push(idx);
//   }

//   for (const [, indices] of groups) {
//     if (indices.length < 2) continue;

//     const first = indices[0];
//     const last = indices[indices.length - 1];

//     const getNoteY = (idx: number) => {
//       const p = parsePitch(notes[idx].pitch!)!;
//       const sp = getStaffPosition(p.note, p.octave, clef);
//       return staffTop + 2 * sl - sp * (sl / 2);
//     };

//     const firstNoteY = getNoteY(first);
//     const stemUp = firstNoteY > staffTop + 2 * sl;

//     const stemEnds = indices.map((idx) => {
//       const ny = getNoteY(idx);
//       return stemUp ? ny - sl * 3.5 : ny + sl * 3.5;
//     });

//     const y1 = stemEnds[0];
//     const y2 = stemEnds[stemEnds.length - 1];
//     const midY = (y1 + y2) / 2;
//     const rawTilt = y2 - y1;
//     const tilt = Math.sign(rawTilt) * Math.min(Math.abs(rawTilt), sl * 1.5);
//     const beamY1 = midY - tilt / 2;
//     const beamY2 = midY + tilt / 2;

//     const stemX1 = stemUp
//       ? noteXs[first] + rwBeam * 0.9
//       : noteXs[first] - rwBeam * 0.9;
//     const stemX2 = stemUp
//       ? noteXs[last] + rwBeam * 0.9
//       : noteXs[last] - rwBeam * 0.9;

//     for (const idx of indices) {
//       const ny = getNoteY(idx);
//       const sx = stemUp
//         ? noteXs[idx] + rwBeam * 0.9
//         : noteXs[idx] - rwBeam * 0.9;
//       const t =
//         (noteXs[idx] - noteXs[first]) /
//         Math.max(noteXs[last] - noteXs[first], 1);
//       const beamAtX = beamY1 + t * (beamY2 - beamY1);
//       ctx.strokeStyle = "#1a1510";
//       ctx.lineWidth = 1;
//       ctx.beginPath();
//       ctx.moveTo(sx, ny);
//       ctx.lineTo(sx, beamAtX);
//       ctx.stroke();
//     }

//     ctx.lineWidth = sl * 0.55;
//     ctx.lineCap = "butt";
//     ctx.strokeStyle = "#1a1510";
//     ctx.beginPath();
//     ctx.moveTo(stemX1, beamY1);
//     ctx.lineTo(stemX2, beamY2);
//     ctx.stroke();
//     ctx.lineCap = "round";
//   }
// }

// // ── Helpers ─────────────────────────────────────────────────────────────────
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
//   } else if (duration === 1.5) {
//     // Dotted quarter rest
//     ctx.font = `${sl * 2.2}px serif`;
//     ctx.fillText("𝄽", x, mid + sl * 0.5);
//     ctx.beginPath();
//     ctx.arc(x + sl * 1.1, mid + sl * 0.05, 2.2, 0, Math.PI * 2);
//     ctx.fill();
//   } else if (duration === 1) {
//     ctx.font = `${sl * 2.2}px serif`;
//     ctx.fillText("𝄽", x, mid + sl * 0.5);
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
