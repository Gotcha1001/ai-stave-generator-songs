"use client";

import { MusicPiece } from "@/types/music";
import { DURATION_NAMES } from "../../lib/musicTheory";

interface ScoreInfoProps {
  piece: MusicPiece;
}

const SECTION_COLORS: Record<string, string> = {
  A: "border-amber-500 text-amber-400",
  B: "border-blue-500 text-blue-400",
  C: "border-green-500 text-green-400",
  D: "border-purple-500 text-purple-400",
};

export default function ScoreInfo({ piece }: ScoreInfoProps) {
  // Collect all note durations used
  const durationsUsed = new Set<number>();
  for (const sec of piece.sections) {
    for (const bar of sec.bars || []) {
      for (const note of bar.notes || []) {
        if (!note.rest && note.pitch !== "rest") {
          durationsUsed.add(note.duration);
        }
      }
    }
  }

  const hasQuavers = durationsUsed.has(0.5);
  const hasSemiquavers = durationsUsed.has(0.25);

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 mt-4 text-xs">
      {/* Structure pills */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-stone-500 font-mono uppercase tracking-widest text-[9px]">
          Structure
        </span>
        {piece.structure.map((id, i) => (
          <span
            key={i}
            className={`border rounded-full px-2.5 py-0.5 font-mono text-[10px] ${SECTION_COLORS[id] || "border-stone-600 text-stone-400"}`}
          >
            {id}
          </span>
        ))}
      </div>

      {/* Chord progression */}
      {piece.chordProgression?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-stone-500 font-mono uppercase tracking-widest text-[9px]">
            Chords
          </span>
          <span className="text-stone-300 font-mono">
            {piece.chordProgression.join(" → ")}
          </span>
        </div>
      )}

      {/* Note values used */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-stone-500 font-mono uppercase tracking-widest text-[9px]">
          Note values
        </span>
        {Array.from(durationsUsed)
          .sort((a, b) => b - a)
          .map((dur) => (
            <span
              key={dur}
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                dur <= 0.5
                  ? "bg-amber-900/40 text-amber-300 border border-amber-700"
                  : "bg-stone-800 text-stone-400"
              }`}
            >
              {DURATION_NAMES[dur] || dur}
            </span>
          ))}
      </div>

      {/* Quaver warning if missing */}
      {!hasQuavers && piece.difficulty !== "beginner" && (
        <div className="text-amber-600 text-[10px] font-mono mt-1">
          ⚠ No quavers generated — try regenerating for more rhythmic variety
        </div>
      )}

      {/* Performance notes */}
      {piece.description && (
        <div className="mt-2 text-stone-400 leading-relaxed border-t border-stone-800 pt-2">
          <span className="text-stone-500 font-mono uppercase tracking-widest text-[9px]">
            Performance notes{" "}
          </span>
          {piece.description}
        </div>
      )}
    </div>
  );
}
