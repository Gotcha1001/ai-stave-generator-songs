// "use client";

// import { useState } from "react";
// import { useMutation } from "convex/react";
// import Staff from "../components/Staff";
// import { api } from "@/convex/_generated/api";
// import { generateSimpleSong } from "@/lib/musicGenerator";
// import { NoteType } from "@/types/music";

// export default function StudioPage() {
//   const createSong = useMutation(api.songs.createSong);

//   const [rightNotes, setRightNotes] = useState<NoteType[]>([]);
//   const [leftNotes, setLeftNotes] = useState<NoteType[]>([]);
//   const [bars, setBars] = useState(16);

//   const handleGenerate = async () => {
//     const { right, left, bars: b } = generateSimpleSong({ bars: 16 });

//     setRightNotes(right);
//     setLeftNotes(left);
//     setBars(b);

//     // Strip isRest — schema only expects { pitch, duration }
//     const toSchema = (notes: NoteType[]) =>
//       notes.map(({ pitch, duration }) => ({ pitch, duration }));

//     await createSong({
//       prompt: "Simple melody",
//       key: "C",
//       tempo: 120,
//       rightHand: toSchema(right),
//       leftHand: toSchema(left),
//     });
//   };

//   return (
//     <div className="min-h-screen p-10 space-y-6">
//       <h1 className="text-3xl font-bold">🎼 AI Studio</h1>

//       <button
//         onClick={handleGenerate}
//         className="bg-primary text-white px-6 py-2 rounded-lg"
//       >
//         Generate Piano Piece
//       </button>

//       <div className="bg-card border rounded-2xl p-6 shadow-sm">
//         <Staff right={rightNotes} left={leftNotes} bars={bars} />
//       </div>
//     </div>
//   );
// }

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { generateSimpleSong, NoteType } from "@/lib/musicGenerator";

import * as Tone from "tone";
import { Play, Pause, Square, Download } from "lucide-react";
import jsPDF from "jspdf";
import Staff from "../components/Staff";

// ─── Salamander sampler singleton (same as usePlayback) ────────────────────
let samplerInstance: Tone.Sampler | null = null;
let samplerLoadPromise: Promise<void> | null = null;

function getSampler(): Promise<void> {
  if (samplerInstance && samplerLoadPromise) return samplerLoadPromise;
  samplerInstance = new Tone.Sampler({
    urls: {
      A0: "A0.mp3",
      C1: "C1.mp3",
      "D#1": "Ds1.mp3",
      "F#1": "Fs1.mp3",
      A1: "A1.mp3",
      C2: "C2.mp3",
      "D#2": "Ds2.mp3",
      "F#2": "Fs2.mp3",
      A2: "A2.mp3",
      C3: "C3.mp3",
      "D#3": "Ds3.mp3",
      "F#3": "Fs3.mp3",
      A3: "A3.mp3",
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
      C6: "C6.mp3",
      "D#6": "Ds6.mp3",
      "F#6": "Fs6.mp3",
      A6: "A6.mp3",
      C7: "C7.mp3",
      "D#7": "Ds7.mp3",
      "F#7": "Fs7.mp3",
      A7: "A7.mp3",
      C8: "C8.mp3",
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    release: 1.5,
  }).toDestination();
  samplerLoadPromise = Tone.loaded();
  return samplerLoadPromise;
}

// Map VexFlow duration strings → seconds per beat multiplier
const VEX_DUR_TO_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
};

// Convert VexFlow pitch format "C4", "D#3" → Tone.js note name
function vexPitchToTone(pitch: string): string | null {
  // pitch is like "C4", "D#4", "Bb3" — Tone.js accepts these directly
  if (!pitch || pitch === "rest") return null;
  return pitch;
}

export default function StudioPage() {
  const createSong = useMutation(api.songs.createSong);
  const staffContainerRef = useRef<HTMLDivElement>(null);

  const [rightNotes, setRightNotes] = useState<NoteType[]>([]);
  const [leftNotes, setLeftNotes] = useState<NoteType[]>([]);
  const [bars, setBars] = useState(16);
  const [tempo, setTempo] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [samplerReady, setSamplerReady] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const partRef = useRef<Tone.Part | null>(null);

  // Load sampler on mount
  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      partRef.current?.dispose();
    };
  }, []);

  const handleGenerate = async () => {
    stopPlayback();
    const { right, left, bars: b } = generateSimpleSong({ bars: 16 });
    setRightNotes(right);
    setLeftNotes(left);
    setBars(b);
    setHasGenerated(true);

    const toSchema = (notes: NoteType[]) =>
      notes.map(({ pitch, duration }) => ({ pitch, duration }));

    await createSong({
      prompt: "Simple melody",
      key: "C",
      tempo,
      rightHand: toSchema(right),
      leftHand: toSchema(left),
    });
  };

  const stopPlayback = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    partRef.current?.dispose();
    partRef.current = null;
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(async () => {
    if (!rightNotes.length && !leftNotes.length) return;
    stopPlayback();

    await Tone.start();
    if (!samplerReady) {
      await getSampler();
      setSamplerReady(true);
    }

    const sampler = samplerInstance!;
    const secPerBeat = 60 / tempo;

    type NoteEvent = {
      time: number;
      note: string;
      duration: number;
      velocity: number;
    };
    const events: NoteEvent[] = [];

    // Schedule right hand
    let t = 0;
    for (const note of rightNotes) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (!note.isRest) {
        const toneNote = vexPitchToTone(note.pitch);
        if (toneNote) {
          events.push({
            time: t,
            note: toneNote,
            duration: durSec,
            velocity: 0.8,
          });
        }
      }
      t += durSec;
    }
    const totalRight = t;

    // Schedule left hand (starts at time 0, concurrent)
    t = 0;
    for (const note of leftNotes) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (!note.isRest) {
        const toneNote = vexPitchToTone(note.pitch);
        if (toneNote) {
          events.push({
            time: t,
            note: toneNote,
            duration: durSec,
            velocity: 0.55,
          });
        }
      }
      t += durSec;
    }
    const totalDuration = Math.max(totalRight, t);

    if (events.length === 0) return;

    Tone.getTransport().bpm.value = tempo;

    const part = new Tone.Part<NoteEvent>((time, event) => {
      sampler.triggerAttackRelease(
        event.note,
        event.duration,
        time,
        event.velocity,
      );
    }, events);

    part.start(0);
    partRef.current = part;

    Tone.getTransport().start();
    setIsPlaying(true);

    // Auto-stop
    Tone.getTransport().scheduleOnce(() => {
      stopPlayback();
    }, totalDuration + 1.5);
  }, [rightNotes, leftNotes, tempo, samplerReady, stopPlayback]);

  const handleToggle = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const handleExportPDF = useCallback(() => {
    const container = staffContainerRef.current;
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Serialise the SVG to a data URL via canvas
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // retina
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: "a4",
      });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;

      if (imgH <= ph) {
        pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
      } else {
        let yOffset = 0;
        while (yOffset < imgH) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yOffset, pw, imgH);
          yOffset += ph;
        }
      }

      pdf.save("piano-piece.pdf");
    };
    img.src = url;
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-10 space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">
        🎼 Random Piece Studio
      </h1>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleGenerate}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Generate Piano Piece
        </button>

        {hasGenerated && (
          <>
            {/* Tempo */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-stone-400 w-8 text-right tabular-nums">
                {tempo}
              </span>
              <input
                type="range"
                min={40}
                max={220}
                value={tempo}
                onChange={(e) => {
                  setTempo(Number(e.target.value));
                  if (isPlaying) stopPlayback();
                }}
                className="w-32 accent-amber-500 h-1 cursor-pointer"
              />
              <span className="text-xs font-mono text-stone-500">BPM</span>
            </div>

            {/* Play/Stop */}
            <button
              onClick={handleToggle}
              disabled={!samplerReady}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 transition-colors shadow-lg"
              title={
                !samplerReady
                  ? "Loading piano samples..."
                  : isPlaying
                    ? "Stop"
                    : "Play"
              }
            >
              {!samplerReady ? (
                <span className="text-xs font-mono">...</span>
              ) : isPlaying ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            {/* PDF export */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 px-4 py-2 rounded-lg text-sm font-mono transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </>
        )}
      </div>

      {/* Staff */}
      {hasGenerated && (
        <div
          ref={staffContainerRef}
          className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto"
        >
          <Staff right={rightNotes} left={leftNotes} bars={bars} />
        </div>
      )}

      {!hasGenerated && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-stone-600 gap-3">
          <div className="text-6xl opacity-20">𝄞</div>
          <p className="text-sm font-mono">
            Click Generate to create a random piano piece
          </p>
        </div>
      )}
    </div>
  );
}
