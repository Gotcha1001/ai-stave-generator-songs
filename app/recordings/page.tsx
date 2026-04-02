"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Trash2, Play, Clock, Music, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import ScoreRenderer from "../components/Scorerenderer"; // your existing component
import { usePlayback } from "@/hooks/usePlayback";
import type { Bar, MusicPiece } from "@/types/music";
import Link from "next/link";
import * as Tone from "tone";

type Recording = {
  _id: Id<"midiRecordings">;
  title: string;
  tempo: number;
  timeSig: string;
  rightHandOnly: boolean;
  createdAt: number;
  bars: Bar[]; // Bar[]
};

function toMusicPiece(rec: Recording): MusicPiece {
  return {
    title: rec.title || "Untitled Recording",
    key: "C", // could try to detect later
    mode: "major",
    timeSig: rec.timeSig,
    tempo: rec.tempo,
    genre: rec.rightHandOnly ? "Lead Sheet MIDI" : "Piano MIDI Recording",
    difficulty: "intermediate",
    chordProgression: rec.bars.map((b) => b.chord || b.chordName || "—"),
    sections: [
      {
        id: "Recorded",
        label: "MIDI Recording Session",
        bars: rec.bars.map((bar) => ({
          ...bar,
          // Ensure consistent shape (some old records might miss fields)
          chord: bar.chord || "",
          chordName: bar.chordName || "",
          notes: bar.notes || [],
          leftNotes: bar.leftNotes || (rec.rightHandOnly ? undefined : []),
        })),
      },
    ],
    structure: ["Recorded"],
    // Crucial: match what ScoreRenderer & usePlayback expect
    notation: rec.rightHandOnly ? "lead-sheet" : "classical",
  };
}

// ── Simple Metronome (click on every beat, accent on beat 1) ─────────────────
function Metronome({
  isPlaying,
  tempo,
  timeSig,
}: {
  isPlaying: boolean;
  tempo: number;
  timeSig: string;
}) {
  const synthRef = useRef<Tone.MembraneSynth | null>(null);

  // Create synth once
  useEffect(() => {
    const synth = new Tone.MembraneSynth({
      octaves: 4,
      pitchDecay: 0.02,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
    }).toDestination();

    synthRef.current = synth;

    return () => {
      synth.dispose();
    };
  }, []); // ← empty dependency array = run once on mount

  // Schedule / unschedule the clicks
  useEffect(() => {
    if (!isPlaying || !synthRef.current) return;

    const [n, d] = timeSig.split("/").map(Number);
    const beatsPerBar = (n * 4) / d;

    const interval = 60 / tempo; // seconds per beat

    let beatCounter = 0;

    const scheduleId = Tone.Transport.scheduleRepeat((time) => {
      const isAccent = beatCounter % beatsPerBar === 0;
      synthRef.current!.triggerAttackRelease(
        isAccent ? "C1" : "C2",
        "32n",
        time,
        isAccent ? 1.1 : 0.65,
      );
      beatCounter++;
    }, interval);

    return () => {
      Tone.Transport.clear(scheduleId);
    };
  }, [isPlaying, tempo, timeSig]);

  return null;
}

export default function RecordingsPage() {
  const recordings = useQuery(api.midi.getUserRecordings) ?? [];
  const deleteMut = useMutation(api.midi.deleteRecording);

  const [selected, setSelected] = useState<Recording | null>(null);
  const piece = selected ? toMusicPiece(selected) : null;
  const playback = usePlayback(piece);

  const handleDelete = async (id: Id<"midiRecordings">) => {
    if (!confirm("Delete this recording?")) return;
    await deleteMut({ id });
    if (selected?._id === id) setSelected(null);
    toast.success("Recording deleted");
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Music className="w-9 h-9 text-amber-500" /> My MIDI Recordings
        </h1>
        <Button asChild>
          <Link href="/studio">New Recording →</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LIST */}
        <div className="lg:col-span-5">
          <div className="space-y-3">
            <AnimatePresence>
              {recordings.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  No recordings yet. Go record something!
                </div>
              )}

              {recordings.map((rec: Recording) => (
                <motion.div
                  key={rec._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border bg-card cursor-pointer transition-all hover:border-amber-500 ${
                    selected?._id === rec._id
                      ? "border-amber-500 ring-1 ring-amber-500"
                      : ""
                  }`}
                  onClick={() => setSelected(rec)}
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(rec.createdAt), "dd MMM yyyy • HH:mm")}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-amber-400">
                        {rec.timeSig} • {rec.tempo} BPM
                      </div>
                      <div className="mt-2 inline-block px-3 py-0.5 rounded-full text-xs bg-muted">
                        {rec.rightHandOnly ? "Lead Sheet" : "Grand Staff"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(rec);
                        playback.stop();
                        setTimeout(() => playback.toggle(), 50);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" /> Quick Play
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rec._id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* VIEWER */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!selected ? (
              <div className="h-[600px] flex items-center justify-center border border-dashed rounded-3xl text-muted-foreground">
                Select a recording on the left to view & play
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{selected.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selected.timeSig} • {selected.tempo} BPM •{" "}
                      {selected.rightHandOnly ? "Lead Sheet" : "Grand Staff"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={playback.toggle} disabled={!piece}>
                      {playback.isPlaying ? "⏸ Pause" : "▶ Play"}
                    </Button>
                    <Button variant="outline" onClick={playback.stop}>
                      Stop
                    </Button>
                  </div>
                </div>

                {/* SCORE */}
                <div className="bg-white dark:bg-stone-950 p-8 rounded-2xl border shadow-sm overflow-auto max-h-[620px]">
                  <ScoreRenderer
                    piece={piece!}
                    clef="treble"
                    notation={piece!.notation}
                    currentBeat={playback.currentBeat}
                  />
                </div>

                {/* Metronome runs automatically when playing */}
                <Metronome
                  isPlaying={playback.isPlaying}
                  tempo={playback.tempo}
                  timeSig={selected.timeSig}
                />

                {/* Transport info */}
                <div className="text-xs text-center text-muted-foreground">
                  Beat {Math.floor(playback.currentBeat)} • Tempo{" "}
                  {playback.tempo} BPM
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
