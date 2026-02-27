// "use client";

// import { useRef, useState, useCallback, useEffect } from "react";
// import { useMutation } from "convex/react";

// import { api } from "@/convex/_generated/api";
// import { generateSimpleSong, NoteType } from "@/lib/musicGenerator";

// import * as Tone from "tone";
// import { Play, Square, Download } from "lucide-react";
// import jsPDF from "jspdf";
// import Staff from "../components/Staff";
// import MetronomeDrumTrack from "../components/Metronomedrumtrack";

// // ─── Salamander sampler singleton ──────────────────────────────────────────
// let samplerInstance: Tone.Sampler | null = null;
// let samplerLoadPromise: Promise<void> | null = null;

// function getSampler(): Promise<void> {
//   if (samplerInstance && samplerLoadPromise) return samplerLoadPromise;
//   samplerInstance = new Tone.Sampler({
//     urls: {
//       A0: "A0.mp3",
//       C1: "C1.mp3",
//       "D#1": "Ds1.mp3",
//       "F#1": "Fs1.mp3",
//       A1: "A1.mp3",
//       C2: "C2.mp3",
//       "D#2": "Ds2.mp3",
//       "F#2": "Fs2.mp3",
//       A2: "A2.mp3",
//       C3: "C3.mp3",
//       "D#3": "Ds3.mp3",
//       "F#3": "Fs3.mp3",
//       A3: "A3.mp3",
//       C4: "C4.mp3",
//       "D#4": "Ds4.mp3",
//       "F#4": "Fs4.mp3",
//       A4: "A4.mp3",
//       C5: "C5.mp3",
//       "D#5": "Ds5.mp3",
//       "F#5": "Fs5.mp3",
//       A5: "A5.mp3",
//       C6: "C6.mp3",
//       "D#6": "Ds6.mp3",
//       "F#6": "Fs6.mp3",
//       A6: "A6.mp3",
//       C7: "C7.mp3",
//       "D#7": "Ds7.mp3",
//       "F#7": "Fs7.mp3",
//       A7: "A7.mp3",
//       C8: "C8.mp3",
//     },
//     baseUrl: "https://tonejs.github.io/audio/salamander/",
//     release: 1.5,
//   }).toDestination();
//   samplerLoadPromise = Tone.loaded();
//   return samplerLoadPromise;
// }

// const VEX_DUR_TO_BEATS: Record<string, number> = {
//   w: 4,
//   h: 2,
//   q: 1,
//   "8": 0.5,
//   "16": 0.25,
// };

// function vexPitchToTone(pitch: string): string | null {
//   if (!pitch || pitch === "rest") return null;
//   return pitch;
// }

// export default function StudioPage() {
//   const createSong = useMutation(api.songs.createSong);
//   const staffContainerRef = useRef<HTMLDivElement>(null);

//   const [rightNotes, setRightNotes] = useState<NoteType[]>([]);
//   const [leftNotes, setLeftNotes] = useState<NoteType[]>([]);
//   const [tempo, setTempo] = useState(120);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [samplerReady, setSamplerReady] = useState(false);
//   const [hasGenerated, setHasGenerated] = useState(false);
//   const [currentBeat, setCurrentBeat] = useState(0);

//   const partRef = useRef<Tone.Part | null>(null);
//   const rafRef = useRef<number | null>(null);

//   const tempoRef = useRef(tempo);
//   useEffect(() => {
//     tempoRef.current = tempo;
//   }, [tempo]);

//   useEffect(() => {
//     getSampler().then(() => setSamplerReady(true));
//   }, []);

//   useEffect(() => {
//     return () => {
//       Tone.getTransport().stop();
//       Tone.getTransport().cancel();
//       partRef.current?.dispose();
//     };
//   }, []);

//   const updateClockRef = useRef<() => void>(() => {});
//   useEffect(() => {
//     updateClockRef.current = () => {
//       const seconds = Tone.getTransport().seconds;
//       const beat = (seconds / 60) * tempoRef.current;
//       setCurrentBeat(beat);
//       rafRef.current = requestAnimationFrame(updateClockRef.current);
//     };
//   }, []);

//   const stopPlayback = useCallback(() => {
//     if (rafRef.current) cancelAnimationFrame(rafRef.current);
//     rafRef.current = null;
//     setCurrentBeat(0);
//     Tone.getTransport().stop();
//     Tone.getTransport().cancel();
//     partRef.current?.dispose();
//     partRef.current = null;
//     setIsPlaying(false); // ← metronome also stops (isPlaying → false)
//   }, []);

//   const startPlayback = useCallback(async () => {
//     if (!rightNotes.length && !leftNotes.length) return;
//     stopPlayback();

//     await Tone.start();
//     if (!samplerInstance) {
//       await getSampler();
//       setSamplerReady(true);
//     }

//     const sampler = samplerInstance!;
//     const secPerBeat = 60 / tempoRef.current;

//     type NoteEvent = {
//       time: number;
//       note: string;
//       duration: number;
//       velocity: number;
//     };
//     const events: NoteEvent[] = [];

//     let t = 0;
//     for (const note of rightNotes) {
//       const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
//       const durSec = beats * secPerBeat;
//       if (!note.isRest) {
//         const toneNote = vexPitchToTone(note.pitch);
//         if (toneNote)
//           events.push({
//             time: t,
//             note: toneNote,
//             duration: durSec,
//             velocity: 0.8,
//           });
//       }
//       t += durSec;
//     }
//     const totalRight = t;

//     t = 0;
//     for (const note of leftNotes) {
//       const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
//       const durSec = beats * secPerBeat;
//       if (!note.isRest) {
//         const toneNote = vexPitchToTone(note.pitch);
//         if (toneNote)
//           events.push({
//             time: t,
//             note: toneNote,
//             duration: durSec,
//             velocity: 0.55,
//           });
//       }
//       t += durSec;
//     }
//     const totalDuration = Math.max(totalRight, t);

//     if (events.length === 0) return;

//     Tone.getTransport().bpm.value = tempoRef.current;

//     const part = new Tone.Part<NoteEvent>((time, event) => {
//       sampler.triggerAttackRelease(
//         event.note,
//         event.duration,
//         time,
//         event.velocity,
//       );
//     }, events);

//     part.start(0);
//     partRef.current = part;

//     Tone.getTransport().start();
//     setIsPlaying(true); // ← metronome also starts (isPlaying → true)

//     rafRef.current = requestAnimationFrame(updateClockRef.current);

//     Tone.getTransport().scheduleOnce(() => {
//       stopPlayback();
//     }, totalDuration + 1.5);
//   }, [rightNotes, leftNotes, stopPlayback]);

//   const handleToggle = useCallback(() => {
//     if (isPlaying) stopPlayback();
//     else startPlayback();
//   }, [isPlaying, stopPlayback, startPlayback]);

//   const handleGenerate = async () => {
//     stopPlayback();
//     const { right, left } = generateSimpleSong({ bars: 16 });
//     setRightNotes(right);
//     setLeftNotes(left);
//     setHasGenerated(true);

//     const toSchema = (notes: NoteType[]) =>
//       notes.map(({ pitch, duration }) => ({ pitch, duration }));

//     await createSong({
//       prompt: "Simple melody",
//       key: "C",
//       tempo,
//       rightHand: toSchema(right),
//       leftHand: toSchema(left),
//     });
//   };

//   const handleExportPDF = useCallback(() => {
//     const container = staffContainerRef.current;
//     if (!container) return;
//     const svg = container.querySelector("svg");
//     if (!svg) return;

//     const svgData = new XMLSerializer().serializeToString(svg);
//     const svgBlob = new Blob([svgData], {
//       type: "image/svg+xml;charset=utf-8",
//     });
//     const url = URL.createObjectURL(svgBlob);

//     const img = new Image();
//     img.onload = () => {
//       const canvas = document.createElement("canvas");
//       const scale = 2;
//       canvas.width = img.width * scale;
//       canvas.height = img.height * scale;
//       const ctx = canvas.getContext("2d")!;
//       ctx.scale(scale, scale);
//       ctx.fillStyle = "#ffffff";
//       ctx.fillRect(0, 0, img.width, img.height);
//       ctx.drawImage(img, 0, 0);
//       URL.revokeObjectURL(url);

//       const imgData = canvas.toDataURL("image/png");
//       const pdf = new jsPDF({
//         orientation: "landscape",
//         unit: "px",
//         format: "a4",
//       });
//       const pw = pdf.internal.pageSize.getWidth();
//       const ph = pdf.internal.pageSize.getHeight();
//       const imgH = (canvas.height * pw) / canvas.width;

//       if (imgH <= ph) {
//         pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
//       } else {
//         let yOffset = 0;
//         while (yOffset < imgH) {
//           if (yOffset > 0) pdf.addPage();
//           pdf.addImage(imgData, "PNG", 0, -yOffset, pw, imgH);
//           yOffset += ph;
//         }
//       }
//       pdf.save("piano-piece.pdf");
//     };
//     img.src = url;
//   }, []);

//   return (
//     <div className="min-h-screen bg-stone-950 text-stone-200 p-10 space-y-6">
//       <h1 className="text-3xl font-bold text-amber-400">
//         🎼 Random Piece Studio
//       </h1>

//       {/* Controls row */}
//       <div className="flex flex-wrap items-center gap-4">
//         <button
//           onClick={handleGenerate}
//           className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-6 py-2 rounded-lg transition-colors"
//         >
//           Generate Piano Piece
//         </button>

//         {hasGenerated && (
//           <>
//             {/* Tempo */}
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-mono text-stone-400 w-8 text-right tabular-nums">
//                 {tempo}
//               </span>
//               <input
//                 type="range"
//                 min={40}
//                 max={220}
//                 value={tempo}
//                 onChange={(e) => {
//                   const bpm = Number(e.target.value);
//                   setTempo(bpm);
//                   if (isPlaying) stopPlayback();
//                 }}
//                 className="w-32 accent-amber-500 h-1 cursor-pointer"
//               />
//               <span className="text-xs font-mono text-stone-500">BPM</span>
//             </div>

//             {/* Play / Stop */}
//             <button
//               onClick={handleToggle}
//               disabled={!samplerReady}
//               className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 transition-colors shadow-lg"
//               title={
//                 !samplerReady
//                   ? "Loading piano samples..."
//                   : isPlaying
//                     ? "Stop"
//                     : "Play"
//               }
//             >
//               {!samplerReady ? (
//                 <span className="text-xs font-mono">...</span>
//               ) : isPlaying ? (
//                 <Square className="w-4 h-4 fill-current" />
//               ) : (
//                 <Play className="w-4 h-4 ml-0.5" />
//               )}
//             </button>

//             {/* PDF export */}
//             <button
//               onClick={handleExportPDF}
//               className="flex items-center gap-2 border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 px-4 py-2 rounded-lg text-sm font-mono transition-colors"
//             >
//               <Download className="w-4 h-4" />
//               Export PDF
//             </button>
//           </>
//         )}
//       </div>

//       {/* ── Metronome / Drum Track ──────────────────────────────────────────────
//            Sits BELOW the controls row, always visible once a piece is generated.
//            isPlaying is the single source of truth — the Play button above
//            drives both the Tone.js sampler AND this widget simultaneously.
//            Off / Click / Drum buttons only SELECT a mode; audio starts with ▶.
//       ───────────────────────────────────────────────────────────────────────── */}
//       {hasGenerated && (
//         <MetronomeDrumTrack tempo={tempo} isPlaying={isPlaying} />
//       )}

//       {/* Staff */}
//       {hasGenerated && (
//         <div
//           ref={staffContainerRef}
//           className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto"
//         >
//           <Staff
//             right={rightNotes}
//             left={leftNotes}
//             currentBeat={currentBeat}
//           />
//         </div>
//       )}

//       {!hasGenerated && (
//         <div className="flex flex-col items-center justify-center min-h-[300px] text-stone-600 gap-3">
//           <div className="text-6xl opacity-20">𝄞</div>
//           <p className="text-sm font-mono">
//             Click Generate to create a random piano piece
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  generateSimpleSong,
  NoteType,
  Genre,
  TimeSig,
} from "@/lib/musicGenerator";
import * as Tone from "tone";
import { Play, Square, Download, Music2, Shuffle } from "lucide-react";
import jsPDF from "jspdf";
import Staff from "../components/Staff";
import MetronomeDrumTrack from "../components/Metronomedrumtrack";

// ─── Sampler singleton ────────────────────────────────────────────────
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

const VEX_DUR_TO_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
  "16": 0.25,
};

function vexPitchToTone(pitch: string): string | null {
  if (!pitch || pitch === "rest") return null;
  return pitch;
}

// ─── UI building blocks ───────────────────────────────────────────────
const GENRES = [
  {
    value: "classical" as const,
    label: "Classical",
    emoji: "🎹",
    desc: "Alberti bass, lyrical",
  },
  {
    value: "rock" as const,
    label: "Rock",
    emoji: "🎸",
    desc: "Power chords, riffs",
  },
  {
    value: "folk" as const,
    label: "Folk",
    emoji: "🪕",
    desc: "Oom-pah, waltz feel",
  },
  {
    value: "nursery" as const,
    label: "Nursery",
    emoji: "🧸",
    desc: "Simple & bouncy",
  },
  {
    value: "jazz" as const,
    label: "Jazz",
    emoji: "🎷",
    desc: "Swing, stride bass",
  },
] satisfies { value: Genre; label: string; emoji: string; desc: string }[];

const KEYS_MAJOR = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
];
const KEYS_MINOR = [
  "Am",
  "Em",
  "Bm",
  "F#m",
  "C#m",
  "G#m",
  "Dm",
  "Gm",
  "Cm",
  "Fm",
  "Bbm",
  "Ebm",
];

const TIME_SIGS = [
  { value: "4/4" as const, label: "4/4" },
  { value: "3/4" as const, label: "3/4" },
  { value: "6/8" as const, label: "6/8" },
  { value: "2/4" as const, label: "2/4" },
] satisfies { value: TimeSig; label: string }[];

const BAR_OPTIONS = [8, 12, 16, 24, 32];

function GenreCard({
  g,
  selected,
  onClick,
}: {
  g: (typeof GENRES)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border-2 text-center transition-all ${
        selected
          ? "border-amber-400 bg-amber-500/10 text-amber-300"
          : "border-stone-700 bg-stone-800/50 hover:border-stone-500"
      }`}
    >
      <div className="text-3xl mb-1">{g.emoji}</div>
      <div className="font-semibold">{g.label}</div>
      <div className="text-xs opacity-70">{g.desc}</div>
    </button>
  );
}

export default function StudioPage() {
  const createSong = useMutation(api.songs.createSong);
  const staffContainerRef = useRef<HTMLDivElement>(null);

  const [rightNotes, setRightNotes] = useState<NoteType[]>([]);
  const [leftNotes, setLeftNotes] = useState<NoteType[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [samplerReady, setSamplerReady] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Form controls
  const [genre, setGenre] = useState<Genre>("classical");
  const [keyRoot, setKeyRoot] = useState("C");
  const [keyMode, setKeyMode] = useState<"major" | "minor">("major");
  const [bars, setBars] = useState(16);
  const [useRandomKey, setUseRandomKey] = useState(false);

  const [lastGeneratedInfo, setLastGeneratedInfo] = useState<{
    key: string;
    mode: string;
    genre: Genre;
    timeSig: TimeSig;
  } | null>(null);

  // ── Auto-suggest tempo & timeSig when genre changes ────────────────────────
  const { suggestedTempo, suggestedTimeSig } = useMemo((): {
    suggestedTempo: number;
    suggestedTimeSig: TimeSig;
  } => {
    const suggestions: Record<Genre, { tempo: number; timeSig: TimeSig }> = {
      classical: { tempo: 120, timeSig: "4/4" as TimeSig },
      rock: { tempo: 140, timeSig: "4/4" as TimeSig },
      folk: { tempo: 108, timeSig: "3/4" as TimeSig },
      nursery: { tempo: 100, timeSig: "4/4" as TimeSig },
      jazz: { tempo: 130, timeSig: "4/4" as TimeSig },
    };
    const suggestion = suggestions[genre] ?? {
      tempo: 120,
      timeSig: "4/4" as TimeSig,
    };
    return {
      suggestedTempo: suggestion.tempo,
      suggestedTimeSig: suggestion.timeSig,
    };
  }, [genre]);

  const [tempo, setTempo] = useState(suggestedTempo);
  const [timeSig, setTimeSig] = useState<TimeSig>(suggestedTimeSig);

  const partRef = useRef<Tone.Part | null>(null);
  const rafRef = useRef<number | null>(null);
  const tempoRef = useRef(tempo);
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
  }, []);

  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      partRef.current?.dispose();
    };
  }, []);

  const updateClockRef = useRef<() => void>(() => {});
  useEffect(() => {
    updateClockRef.current = () => {
      const seconds = Tone.getTransport().seconds;
      setCurrentBeat((seconds / 60) * tempoRef.current);
      rafRef.current = requestAnimationFrame(updateClockRef.current);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setCurrentBeat(0);
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(async () => {
    if (!rightNotes.length && !leftNotes.length) return;
    stopPlayback();

    await Tone.start();
    if (!samplerInstance) {
      await getSampler();
      setSamplerReady(true);
    }

    const sampler = samplerInstance!;
    const secPerBeat = 60 / tempoRef.current;

    type NoteEvent = {
      time: number;
      note: string;
      duration: number;
      velocity: number;
    };
    const events: NoteEvent[] = [];

    let t = 0;
    for (const note of rightNotes) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (!note.isRest && note.pitch) {
        const toneNote = vexPitchToTone(note.pitch);
        if (toneNote)
          events.push({
            time: t,
            note: toneNote,
            duration: durSec,
            velocity: 0.8,
          });
      }
      t += durSec;
    }
    const totalRight = t;

    t = 0;
    for (const note of leftNotes) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (!note.isRest && note.pitch) {
        const toneNote = vexPitchToTone(note.pitch);
        if (toneNote)
          events.push({
            time: t,
            note: toneNote,
            duration: durSec,
            velocity: 0.55,
          });
      }
      t += durSec;
    }

    const totalDuration = Math.max(totalRight, t);
    if (events.length === 0) return;

    Tone.getTransport().bpm.value = tempoRef.current;

    const part = new Tone.Part<NoteEvent>((time, ev) => {
      sampler.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, events);

    part.start(0);
    partRef.current = part;

    Tone.getTransport().start();
    setIsPlaying(true);

    rafRef.current = requestAnimationFrame(updateClockRef.current);

    Tone.getTransport().scheduleOnce(stopPlayback, totalDuration + 1.5);
  }, [rightNotes, leftNotes, stopPlayback]);

  const handleToggle = useCallback(() => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }, [isPlaying, stopPlayback, startPlayback]);

  const handleGenerate = async () => {
    stopPlayback();

    const resolvedKey = useRandomKey
      ? undefined
      : keyMode === "minor"
        ? `${keyRoot}m`
        : keyRoot;

    const song = generateSimpleSong({
      bars,
      key: resolvedKey,
      genre,
      timeSig,
      tempo,
    });

    setRightNotes(song.right);
    setLeftNotes(song.left);
    setHasGenerated(true);
    setLastGeneratedInfo({
      key: song.key,
      mode: song.mode,
      genre: song.genre,
      timeSig: song.timeSig,
    });

    const toSchema = (notes: NoteType[]) =>
      notes.map(({ pitch, duration }) => ({ pitch, duration }));

    await createSong({
      prompt: `${genre} piece in ${song.key} ${song.mode}`,
      key: song.key,
      tempo: song.tempo,
      rightHand: toSchema(song.right),
      leftHand: toSchema(song.left),
    });
  };

  const handleExportPDF = useCallback(() => {
    const container = staffContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
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
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6 md:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Music2 className="w-8 h-8 text-amber-400" />
        <h1 className="text-4xl font-bold text-amber-400">AI Music Studio</h1>
        {lastGeneratedInfo && (
          <div className="ml-4 px-4 py-1.5 bg-stone-800 rounded-full text-sm text-stone-300">
            {lastGeneratedInfo.genre} · {lastGeneratedInfo.key}{" "}
            {lastGeneratedInfo.mode} · {lastGeneratedInfo.timeSig}
          </div>
        )}
      </div>

      {/* Generator Form */}
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-amber-300">Choose Style</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {GENRES.map((g) => (
            <GenreCard
              key={g.value}
              g={g}
              selected={genre === g.value}
              onClick={() => setGenre(g.value)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
              Key Root
            </label>
            <select
              value={keyRoot}
              onChange={(e) => setKeyRoot(e.target.value)}
              disabled={useRandomKey}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {[...KEYS_MAJOR, ...KEYS_MINOR].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
              Mode
            </label>
            <div className="flex rounded-lg overflow-hidden border border-stone-600">
              <button
                onClick={() => setKeyMode("major")}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  keyMode === "major"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                } disabled:opacity-50`}
                disabled={useRandomKey}
              >
                Major
              </button>
              <button
                onClick={() => setKeyMode("minor")}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  keyMode === "minor"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                } disabled:opacity-50`}
                disabled={useRandomKey}
              >
                Minor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
              Time Signature
            </label>
            <select
              value={timeSig}
              onChange={(e) => setTimeSig(e.target.value as TimeSig)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {TIME_SIGS.map((ts) => (
                <option key={ts.value} value={ts.value}>
                  {ts.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
              Length
            </label>
            <select
              value={bars}
              onChange={(e) => setBars(Number(e.target.value))}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {BAR_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b} bars
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useRandomKey}
              onChange={() => setUseRandomKey(!useRandomKey)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
          <span className="text-sm text-stone-300">Random key each time</span>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full md:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <Shuffle size={18} />
          Generate Piece
        </button>
      </div>

      {hasGenerated && (
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={handleToggle}
            disabled={!samplerReady}
            className={`min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              isPlaying
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <Square size={18} /> : <Play size={18} />}
            {isPlaying ? "Stop" : "Play"}
          </button>

          <div className="flex items-center gap-3 bg-stone-900 border border-stone-700 rounded-xl px-5 py-3">
            <span className="text-xs uppercase tracking-wider text-stone-400">
              BPM
            </span>
            <input
              type="range"
              min={40}
              max={220}
              step={1}
              value={tempo}
              onChange={(e) => {
                const newTempo = Number(e.target.value);
                setTempo(newTempo);
                if (isPlaying) {
                  stopPlayback();
                  setTimeout(startPlayback, 80);
                }
              }}
              className="w-32 accent-amber-400"
            />
            <span className="font-mono text-amber-300 w-10 text-right">
              {tempo}
            </span>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-3 border border-stone-600 hover:border-amber-500 text-stone-300 hover:text-amber-300 rounded-xl transition"
          >
            <Download size={18} />
            Export PDF
          </button>

          <MetronomeDrumTrack
            tempo={tempo}
            isPlaying={isPlaying}
            timeSig={timeSig}
          />
        </div>
      )}

      {hasGenerated && (
        <div
          ref={staffContainerRef}
          className="bg-white rounded-2xl p-5 shadow-xl overflow-x-auto border border-stone-700"
        >
          <Staff
            right={rightNotes}
            left={leftNotes}
            currentBeat={currentBeat}
            timeSig={timeSig}
          />
        </div>
      )}

      {!hasGenerated && (
        <div className="flex flex-col items-center justify-center py-20 text-stone-500">
          <Music2 className="w-20 h-20 opacity-30 mb-4" />
          <p className="text-lg">Select a style and generate your piece</p>
        </div>
      )}
    </div>
  );
}
