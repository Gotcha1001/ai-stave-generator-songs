"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { MusicPiece } from "@/types/music";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PieceDoc = {
  _id: Id<"pieces">;
  _creationTime: number;
  title: string;
  key: string;
  mode: "major" | "minor";
  timeSig: string;
  tempo: number;
  genre: string;
  difficulty: string;
  prompt: string;
  chordProgression: string[];
  sections: MusicPiece["sections"];
  structure: string[];
  description?: string;
  createdAt: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-red-500/15 text-red-400 border-red-500/30",
};

const GENRE_EMOJI: Record<string, string> = {
  classical: "🎼",
  romantic: "🌹",
  baroque: "⚜️",
  jazz: "🎷",
  folk: "🪕",
  waltz: "💃",
  march: "🥁",
  blues: "🎸",
  ragtime: "🎹",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Piece Card ────────────────────────────────────────────────────────────────

function PieceCard({
  doc,
  onDelete,
}: {
  doc: PieceDoc;
  onDelete: (id: Id<"pieces">) => void;
}) {
  const router = useRouter();
  const totalBars = doc.sections.reduce((s, sec) => s + sec.bars.length, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(`/pieces/${doc._id}`)}
      className="group relative bg-stone-900 border border-stone-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors"
    >
      <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl mt-0.5 select-none">
            {GENRE_EMOJI[doc.genre] ?? "🎵"}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-stone-100 font-semibold text-base leading-tight truncate">
              {doc.title}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 font-mono truncate">
              {doc.key} {doc.mode} · {doc.timeSig} · {doc.tempo} BPM
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem]">
          {doc.prompt}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${DIFFICULTY_STYLE[doc.difficulty] ?? "bg-stone-700 text-stone-300 border-stone-600"}`}
          >
            {doc.difficulty}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
            {doc.genre}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
            {doc.structure.join("-")}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {totalBars} bars
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(doc.createdAt)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc._id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20 text-stone-500 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PiecesPage() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const deletePiece = useMutation(api.songs.deletePiece);
  const result = useQuery(api.songs.getMyPieces, {
    cursor: cursor ?? undefined,
  });

  const pieces = (result?.pieces ?? []) as PieceDoc[];
  const isDone = result?.isDone ?? true;

  const filtered = pieces.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!search ||
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q)) &&
      (!filterGenre || p.genre === filterGenre) &&
      (!filterDifficulty || p.difficulty === filterDifficulty)
    );
  });

  const allGenres = [...new Set(pieces.map((p) => p.genre))].sort();

  const handleNext = () => {
    if (result?.nextCursor) {
      setCursorStack((s) => [...s, cursor ?? ""]);
      setCursor(result.nextCursor);
    }
  };

  const handlePrev = () => {
    const stack = [...cursorStack];
    setCursorStack(stack);
    setCursor(stack.pop() ?? null);
  };

  const handleDelete = async (id: Id<"pieces">) => {
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    await deletePiece({ id });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <Music2 className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="font-serif text-2xl text-stone-100">My Pieces</h1>
        </div>
        <p className="text-sm text-stone-500 ml-11">
          Your AI-generated compositions
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pieces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-lg border transition-colors ${
            showFilters || filterGenre || filterDifficulty
              ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
              : "border-stone-800 text-stone-400 bg-stone-900 hover:border-stone-600"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {(filterGenre || filterDifficulty) && (
            <span className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-stone-950 text-[9px] font-bold">
              {[filterGenre, filterDifficulty].filter(Boolean).length}
            </span>
          )}
        </button>

        {pieces.length > 0 && (
          <span className="ml-auto text-xs text-stone-600 font-mono">
            {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex gap-4 flex-wrap p-4 bg-stone-900 border border-stone-800 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                  Genre
                </label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="bg-stone-800 border border-stone-700 text-stone-200 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All genres</option>
                  {allGenres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                  Difficulty
                </label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="bg-stone-800 border border-stone-700 text-stone-200 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All levels</option>
                  {["beginner", "intermediate", "advanced"].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {(filterGenre || filterDifficulty) && (
                <button
                  onClick={() => {
                    setFilterGenre("");
                    setFilterDifficulty("");
                  }}
                  className="self-end flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-mono pb-1.5"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {result === undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-52 bg-stone-900 rounded-xl border border-stone-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {result !== undefined && pieces.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="text-7xl opacity-20 select-none">𝄞</div>
          <div className="text-center">
            <p className="font-serif text-lg text-stone-400 mb-1">
              No pieces yet
            </p>
            <p className="text-sm text-stone-600 max-w-xs leading-relaxed">
              Compose your first piece in Generate AI — it will be saved here
              automatically.
            </p>
          </div>
          <a
            href="/generate"
            className="mt-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-semibold transition-colors"
          >
            ♩ Start composing
          </a>
        </motion.div>
      )}

      {/* No search results */}
      {result !== undefined && pieces.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-stone-600">
          <Search className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">No pieces match your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setFilterGenre("");
              setFilterDifficulty("");
            }}
            className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((doc) => (
              <PieceCard key={doc._id} doc={doc} onDelete={handleDelete} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {pieces.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={handlePrev}
            disabled={cursorStack.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded-lg border border-stone-800 text-stone-400 hover:border-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-xs font-mono text-stone-600">
            Page {cursorStack.length + 1}
          </span>
          <button
            onClick={handleNext}
            disabled={isDone}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded-lg border border-stone-800 text-stone-400 hover:border-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
