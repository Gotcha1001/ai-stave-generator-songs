// "use client";

// import { useRef, useState, useCallback, useEffect } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Id } from "@/convex/_generated/dataModel";
// import { useParams, useRouter } from "next/navigation";
// import { motion } from "framer-motion";
// import {
//   ArrowLeft,
//   Play,
//   Square,
//   Download,
//   Trash2,
//   Music,
//   Loader2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";

// import * as Tone from "tone";
// import jsPDF from "jspdf";
// import Staff from "@/app/components/Staff";

// // ─── Salamander sampler singleton ─────────────────────────────────────────
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
// };

// // ─── Page ─────────────────────────────────────────────────────────────────

// export default function SongDetailPage() {
//   const router = useRouter();
//   const params = useParams();
//   const songId = params.songId as Id<"songs">;

//   const doc = useQuery(api.songs.getSongById, { id: songId });
//   const deleteSong = useMutation(api.songs.deleteSong);

//   const staffContainerRef = useRef<HTMLDivElement>(null);
//   const partRef = useRef<Tone.Part | null>(null);

//   const [tempo, setTempo] = useState(() => doc?.tempo ?? 120);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [samplerReady, setSamplerReady] = useState(false);

//   // Load sampler on mount
//   useEffect(() => {
//     getSampler().then(() => setSamplerReady(true));
//   }, []);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       Tone.getTransport().stop();
//       Tone.getTransport().cancel();
//       partRef.current?.dispose();
//     };
//   }, []);

//   const stopPlayback = useCallback(() => {
//     Tone.getTransport().stop();
//     Tone.getTransport().cancel();
//     partRef.current?.dispose();
//     partRef.current = null;
//     setIsPlaying(false);
//   }, []);

//   const startPlayback = useCallback(async () => {
//     if (!doc) return;
//     stopPlayback();

//     await Tone.start();
//     if (!samplerReady) {
//       await getSampler();
//       setSamplerReady(true);
//     }

//     const sampler = samplerInstance!;
//     const secPerBeat = 60 / tempo;

//     type NoteEvent = {
//       time: number;
//       note: string;
//       duration: number;
//       velocity: number;
//     };
//     const events: NoteEvent[] = [];

//     // Right hand
//     let t = 0;
//     for (const note of doc.rightHand) {
//       const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
//       const durSec = beats * secPerBeat;
//       if (note.pitch !== "rest") {
//         events.push({
//           time: t,
//           note: note.pitch,
//           duration: durSec,
//           velocity: 0.8,
//         });
//       }
//       t += durSec;
//     }
//     const totalRight = t;

//     // Left hand (concurrent)
//     t = 0;
//     for (const note of doc.leftHand) {
//       const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
//       const durSec = beats * secPerBeat;
//       if (note.pitch !== "rest") {
//         events.push({
//           time: t,
//           note: note.pitch,
//           duration: durSec,
//           velocity: 0.55,
//         });
//       }
//       t += durSec;
//     }
//     const totalDuration = Math.max(totalRight, t);

//     if (events.length === 0) return;

//     Tone.getTransport().bpm.value = tempo;

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
//     setIsPlaying(true);

//     Tone.getTransport().scheduleOnce(() => {
//       stopPlayback();
//     }, totalDuration + 1.5);
//   }, [doc, tempo, samplerReady, stopPlayback]);

//   const handleToggle = () => {
//     if (isPlaying) stopPlayback();
//     else startPlayback();
//   };

//   const handleDelete = async () => {
//     if (!doc) return;
//     if (!confirm("Delete this piece? This cannot be undone.")) return;
//     stopPlayback();
//     await deleteSong({ id: doc._id });
//     router.push("/songs");
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
//       pdf.save(`piano-piece-${songId}.pdf`);
//     };
//     img.src = url;
//   }, [songId]);

//   // ── Loading ────────────────────────────────────────────────────────────────

//   if (doc === undefined) {
//     return (
//       <div className="min-h-screen bg-stone-950 flex items-center justify-center">
//         <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
//       </div>
//     );
//   }

//   if (doc === null) {
//     return (
//       <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
//         <Music className="w-10 h-10 opacity-30" />
//         <p className="font-serif text-lg">Piece not found</p>
//         <button
//           onClick={() => router.push("/songs")}
//           className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
//         >
//           Back to Studio Pieces
//         </button>
//       </div>
//     );
//   }

//   // Derive note arrays for Staff component
//   type HandNote = { pitch: string; duration: string };
//   const rightNotes = (doc.rightHand as HandNote[]).map((n) => ({
//     pitch: n.pitch,
//     duration: n.duration,
//     isRest: n.pitch === "rest",
//   }));
//   const leftNotes = (doc.leftHand as HandNote[]).map((n) => ({
//     pitch: n.pitch,
//     duration: n.duration,
//     isRest: n.pitch === "rest",
//   }));
//   const barCount = Math.floor(doc.rightHand.length / 4);

//   // ── Render ─────────────────────────────────────────────────────────────────

//   return (
//     <div className="min-h-screen bg-stone-950 text-stone-200">
//       {/* Top bar */}
//       <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 py-3 flex items-center justify-between gap-4">
//         <button
//           onClick={() => {
//             stopPlayback();
//             router.push("/songs");
//           }}
//           className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
//         >
//           <ArrowLeft className="w-3.5 h-3.5" />
//           Studio Pieces
//         </button>

//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleExportPDF}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
//           >
//             <Download className="w-3.5 h-3.5 mr-1.5" />
//             PDF
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleDelete}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-red-500 hover:text-red-400 bg-transparent"
//           >
//             <Trash2 className="w-3.5 h-3.5 mr-1.5" />
//             Delete
//           </Button>
//         </div>
//       </div>

//       <div className="max-w-5xl mx-auto px-6 py-8">
//         {/* Title block */}
//         <motion.div
//           initial={{ opacity: 0, y: 12 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mb-8"
//         >
//           <div className="flex items-start gap-4">
//             <span className="text-4xl select-none mt-1">🎹</span>
//             <div className="flex-1">
//               <h1 className="font-serif text-3xl text-stone-100 leading-tight mb-2">
//                 Studio Piano Piece
//               </h1>
//               <div className="flex flex-wrap items-center gap-2 mb-3">
//                 <span className="text-sm font-mono text-stone-400">
//                   Key of {doc.key} · {doc.tempo} BPM
//                 </span>
//               </div>
//               <div className="flex flex-wrap gap-2">
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
//                   {doc.key} major
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.rightHand.length} notes RH
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.leftHand.length} notes LH
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   Random Generation
//                 </span>
//               </div>
//             </div>
//           </div>
//         </motion.div>

//         {/* Playback bar */}
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.05 }}
//           className="flex items-center gap-4 mb-6 p-4 bg-stone-900 border border-stone-800 rounded-xl"
//         >
//           <button
//             onClick={handleToggle}
//             disabled={!samplerReady}
//             className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 transition-colors shadow-lg shrink-0"
//             title={
//               !samplerReady
//                 ? "Loading piano samples..."
//                 : isPlaying
//                   ? "Stop"
//                   : "Play"
//             }
//           >
//             {!samplerReady ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : isPlaying ? (
//               <Square className="w-4 h-4 fill-current" />
//             ) : (
//               <Play className="w-4 h-4 ml-0.5" />
//             )}
//           </button>

//           <div className="flex items-center gap-3 flex-1">
//             <span className="text-xs font-mono text-stone-500 w-8 text-right tabular-nums">
//               {tempo}
//             </span>
//             <input
//               type="range"
//               min={40}
//               max={220}
//               value={tempo}
//               onChange={(e) => {
//                 setTempo(Number(e.target.value));
//                 if (isPlaying) stopPlayback();
//               }}
//               className="flex-1 accent-amber-500 h-1 cursor-pointer"
//             />
//             <span className="text-xs font-mono text-stone-500">BPM</span>
//           </div>

//           {!samplerReady && (
//             <span className="text-xs font-mono text-stone-500">
//               Loading piano...
//             </span>
//           )}
//         </motion.div>

//         {/* Score */}
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.1 }}
//           className="overflow-x-auto rounded-xl border border-stone-800 shadow-2xl mb-6"
//         >
//           <div ref={staffContainerRef} className="bg-white p-6">
//             <Staff right={rightNotes} left={leftNotes} bars={barCount} />
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Square,
  Download,
  Trash2,
  Music,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Staff from "@/app/components/Staff";
import MetronomeDrumTrack from "@/app/components/Metronomedrumtrack"; // ← ADD
import * as Tone from "tone";
import jsPDF from "jspdf";

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

const VEX_DUR_TO_BEATS: Record<string, number> = { w: 4, h: 2, q: 1, "8": 0.5 };

export default function SongDetailPage() {
  const router = useRouter();
  const params = useParams();
  const songId = params.songId as Id<"songs">;
  const doc = useQuery(api.songs.getSongById, { id: songId });
  const deleteSong = useMutation(api.songs.deleteSong);
  const staffContainerRef = useRef<HTMLDivElement>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const rafRef = useRef<number | null>(null);

  const [tempo, setTempo] = useState(() => doc?.tempo ?? 120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [samplerReady, setSamplerReady] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const tempoRef = useRef(tempo);
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      partRef.current?.dispose();
    };
  }, []);

  const updateClockRef = useRef<() => void>(() => {});
  useEffect(() => {
    updateClockRef.current = () => {
      const seconds = Tone.getTransport().seconds;
      const beat = (seconds / 60) * tempoRef.current;
      setCurrentBeat(beat);
      rafRef.current = requestAnimationFrame(updateClockRef.current);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setCurrentBeat(0);
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    partRef.current?.dispose();
    partRef.current = null;
    setIsPlaying(false); // ← metronome stops
  }, []);

  const startPlayback = useCallback(async () => {
    if (!doc) return;
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
    for (const note of doc.rightHand) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (note.pitch !== "rest")
        events.push({
          time: t,
          note: note.pitch,
          duration: durSec,
          velocity: 0.8,
        });
      t += durSec;
    }
    const totalRight = t;

    t = 0;
    for (const note of doc.leftHand) {
      const beats = VEX_DUR_TO_BEATS[note.duration] ?? 1;
      const durSec = beats * secPerBeat;
      if (note.pitch !== "rest")
        events.push({
          time: t,
          note: note.pitch,
          duration: durSec,
          velocity: 0.55,
        });
      t += durSec;
    }
    const totalDuration = Math.max(totalRight, t);

    if (events.length === 0) return;

    Tone.getTransport().bpm.value = tempoRef.current;
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
    setIsPlaying(true); // ← metronome starts

    rafRef.current = requestAnimationFrame(updateClockRef.current);

    Tone.getTransport().scheduleOnce(() => {
      stopPlayback();
    }, totalDuration + 1.5);
  }, [doc, stopPlayback]);

  const handleToggle = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    stopPlayback();
    await deleteSong({ id: doc._id });
    router.push("/songs");
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
      const pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      if (imgH <= ph) {
        pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
      } else {
        let y = 0;
        while (y < imgH) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -y, pw, imgH);
          y += ph;
        }
      }
      pdf.save(`piano-piece-${songId}.pdf`);
    };
    img.src = url;
  }, [songId]);

  if (doc === undefined)
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );

  if (doc === null)
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
        <Music className="w-10 h-10 opacity-30" />
        <p className="font-serif text-lg">Piece not found</p>
        <button
          onClick={() => router.push("/songs")}
          className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
        >
          Back to Studio Pieces
        </button>
      </div>
    );

  type HandNote = { pitch: string; duration: string };
  const rightNotes = (doc.rightHand as HandNote[]).map((n) => ({
    pitch: n.pitch,
    duration: n.duration,
    isRest: n.pitch === "rest",
  }));
  const leftNotes = (doc.leftHand as HandNote[]).map((n) => ({
    pitch: n.pitch,
    duration: n.duration,
    isRest: n.pitch === "rest",
  }));
  const barCount = Math.floor(doc.rightHand.length / 4);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => {
            stopPlayback();
            router.push("/songs");
          }}
          className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Studio Pieces
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-xs font-mono border-stone-700 text-stone-400 hover:border-red-500 hover:text-red-400 bg-transparent"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none mt-1">🎹</span>
            <div className="flex-1">
              <h1 className="font-serif text-3xl text-stone-100 leading-tight mb-2">
                Studio Piano Piece
              </h1>
              <span className="text-sm font-mono text-stone-400">
                Key of {doc.key} · {tempo} BPM
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  `${doc.key} major`,
                  `${doc.rightHand.length} notes RH`,
                  `${doc.leftHand.length} notes LH`,
                  "Random Generation",
                ].map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Playback bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 mb-4 p-4 bg-stone-900 border border-stone-800 rounded-xl"
        >
          <button
            onClick={handleToggle}
            disabled={!samplerReady}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 transition-colors shadow-lg shrink-0"
          >
            {!samplerReady ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-mono text-stone-500 w-8 text-right tabular-nums">
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
              className="flex-1 accent-amber-500 h-1 cursor-pointer"
            />
            <span className="text-xs font-mono text-stone-500">BPM</span>
          </div>
        </motion.div>

        {/* ── Metronome / Drum Track ─────────────────────────────────────────
             tempo    = local tempo state, driven by the slider above
             isPlaying = local isPlaying state, driven by the Play button above
        ────────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6"
        >
          <MetronomeDrumTrack
            tempo={tempo}
            isPlaying={isPlaying}
            timeSig={doc.timeSig ?? "4/4"}
          />
        </motion.div>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto rounded-xl border border-stone-800 shadow-2xl mb-6"
        >
          <div ref={staffContainerRef} className="bg-white p-6">
            <Staff
              right={rightNotes}
              left={leftNotes}
              bars={barCount}
              currentBeat={currentBeat}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
