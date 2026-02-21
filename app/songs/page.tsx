"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Trash2, Clock, Piano, Search } from "lucide-react";
import { useRouter } from "next/navigation";

type SongDoc = {
  _id: Id<"songs">;
  _creationTime: number;
  prompt: string;
  key: string;
  tempo: number;
  rightHand: { pitch: string; duration: string }[];
  leftHand: { pitch: string; duration: string }[];
  createdAt: number;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SongsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deleteSong = useMutation(api.songs.deleteSong);

  const songs = (useQuery(api.songs.getMySongs) ?? []) as SongDoc[];

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    return (
      !search ||
      s.key.toLowerCase().includes(q) ||
      s.prompt.toLowerCase().includes(q) ||
      String(s.tempo).includes(q)
    );
  });

  const handleDelete = async (e: React.MouseEvent, id: Id<"songs">) => {
    e.stopPropagation();
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    await deleteSong({ id });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <Piano className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="font-serif text-2xl text-stone-100">Studio Pieces</h1>
        </div>
        <p className="text-sm text-stone-500 ml-11">
          Your randomly generated piano pieces
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by key, tempo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        {songs.length > 0 && (
          <span className="ml-auto text-xs text-stone-600 font-mono">
            {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {songs === undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-stone-900 rounded-xl border border-stone-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {songs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="text-7xl opacity-20 select-none">𝄞</div>
          <div className="text-center">
            <p className="font-serif text-lg text-stone-400 mb-1">
              No studio pieces yet
            </p>
            <p className="text-sm text-stone-600 max-w-xs leading-relaxed">
              Generate a random piano piece in the Studio and it will appear
              here.
            </p>
          </div>
          <a
            href="/studio"
            className="mt-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-semibold transition-colors"
          >
            ♩ Go to Studio
          </a>
        </motion.div>
      )}

      {/* No search results */}
      {songs.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-stone-600">
          <Search className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">No pieces match your search</p>
          <button
            onClick={() => setSearch("")}
            className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Clear search
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
            {filtered.map((song, idx) => (
              <motion.div
                key={song._id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => router.push(`/songs/${song._id}`)}
                className="group relative bg-stone-900 border border-stone-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors"
              >
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl mt-0.5 select-none">🎹</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-stone-100 font-semibold text-base leading-tight">
                        Piano Piece #{songs.length - songs.indexOf(song)}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5 font-mono">
                        Key of {song.key} · {song.tempo} BPM
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                      {song.key} major
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                      {song.rightHand.length} notes RH
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                      {song.leftHand.length} notes LH
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-stone-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(song.createdAt)}</span>
                      <span className="text-stone-700">·</span>
                      <span>{formatTime(song.createdAt)}</span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, song._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20 text-stone-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
