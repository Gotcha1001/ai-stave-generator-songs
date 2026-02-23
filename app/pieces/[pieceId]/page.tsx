// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Id } from "@/convex/_generated/dataModel";
// import { useParams, useRouter } from "next/navigation";
// import { motion } from "framer-motion";
// import {
//   ArrowLeft,
//   Printer,
//   Play,
//   Pause,
//   Trash2,
//   BookOpen,
//   Music,
//   Loader2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";

// import { usePlayback } from "@/hooks/usePlayback";
// import type { MusicPiece, Clef } from "@/types/music";
// import jsPDF from "jspdf";
// import ScoreRenderer from "@/app/components/Scorerenderer";

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function docToMusicPiece(
//   doc: NonNullable<ReturnType<typeof useDocQuery>>,
// ): MusicPiece {
//   return {
//     title: doc.title,
//     key: doc.key,
//     mode: doc.mode,
//     timeSig: doc.timeSig,
//     tempo: doc.tempo,
//     genre: doc.genre,
//     difficulty: doc.difficulty,
//     chordProgression: doc.chordProgression,
//     sections: doc.sections as MusicPiece["sections"],
//     structure: doc.structure,
//     description: doc.description,
//   };
// }

// // Inline type helper so TS can infer the doc shape
// function useDocQuery() {
//   const params = useParams();
//   const id = params.pieceId as Id<"pieces">;
//   return useQuery(api.songs.getPieceById, { id });
// }

// const DIFFICULTY_STYLE: Record<string, string> = {
//   beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
//   intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
//   advanced: "bg-red-500/15 text-red-400 border-red-500/30",
// };

// const GENRE_EMOJI: Record<string, string> = {
//   classical: "🎼",
//   romantic: "🌹",
//   baroque: "⚜️",
//   jazz: "🎷",
//   folk: "🪕",
//   waltz: "💃",
//   march: "🥁",
//   blues: "🎸",
//   ragtime: "🎹",
// };

// // ── Page ──────────────────────────────────────────────────────────────────────

// export default function PieceDetailPage() {
//   const router = useRouter();
//   const doc = useDocQuery();
//   const deletePiece = useMutation(api.songs.deletePiece);
//   const [clef, setClef] = useState<Clef>("treble");

//   const piece = doc ? docToMusicPiece(doc) : null;
//   const { isPlaying, tempo, setTempo, toggle, stop } = usePlayback(piece);

//   // Sync tempo from doc on load
//   useEffect(() => {
//     if (doc) setTempo(doc.tempo);
//   }, [doc?._id]); // eslint-disable-line react-hooks/exhaustive-deps

//   const handleDelete = async () => {
//     if (!doc) return;
//     if (!confirm("Delete this piece? This cannot be undone.")) return;
//     stop();
//     await deletePiece({ id: doc._id });
//     router.push("/pieces");
//   };

//   const handlePrint = useCallback(() => {
//     const canvas =
//       document.querySelector<HTMLCanvasElement>("#score-area canvas");
//     if (!canvas) return;
//     const pdf = new jsPDF({
//       orientation: "portrait",
//       unit: "px",
//       format: "a4",
//     });
//     const pw = pdf.internal.pageSize.getWidth();
//     const ph = pdf.internal.pageSize.getHeight();
//     const imgData = canvas.toDataURL("image/png");
//     const imgH = (canvas.height * pw) / canvas.width;

//     if (imgH <= ph) {
//       pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
//     } else {
//       let yOffset = 0;
//       while (yOffset < imgH) {
//         if (yOffset > 0) pdf.addPage();
//         pdf.addImage(imgData, "PNG", 0, -yOffset, pw, imgH);
//         yOffset += ph;
//       }
//     }
//     pdf.save(`${doc?.title ?? "score"}.pdf`);
//   }, [doc?.title]);

//   // ── Loading ──────────────────────────────────────────────────────────────────

//   if (doc === undefined) {
//     return (
//       <div className="min-h-screen bg-stone-950 flex items-center justify-center">
//         <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
//       </div>
//     );
//   }

//   // ── Not found ────────────────────────────────────────────────────────────────

//   if (doc === null) {
//     return (
//       <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
//         <Music className="w-10 h-10 opacity-30" />
//         <p className="font-serif text-lg">Piece not found</p>
//         <button
//           onClick={() => router.push("/pieces")}
//           className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
//         >
//           Back to library
//         </button>
//       </div>
//     );
//   }

//   const totalBars = doc.sections.reduce((s, sec) => s + sec.bars.length, 0);

//   // ── Render ───────────────────────────────────────────────────────────────────

//   return (
//     <div className="min-h-screen bg-stone-950 text-stone-200">
//       {/* Top bar */}
//       <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 py-3 flex items-center justify-between gap-4">
//         <button
//           onClick={() => {
//             stop();
//             router.push("/pieces");
//           }}
//           className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
//         >
//           <ArrowLeft className="w-3.5 h-3.5" />
//           My Pieces
//         </button>

//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setClef((c) => (c === "treble" ? "bass" : "treble"))}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
//           >
//             {clef === "treble" ? "Treble" : "Bass"} Clef
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handlePrint}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
//           >
//             <Printer className="w-3.5 h-3.5 mr-1.5" />
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
//             <span className="text-4xl select-none mt-1">
//               {GENRE_EMOJI[doc.genre] ?? "🎵"}
//             </span>
//             <div className="flex-1">
//               <h1 className="font-serif text-3xl text-stone-100 leading-tight mb-2">
//                 {doc.title}
//               </h1>
//               <div className="flex flex-wrap items-center gap-2 mb-3">
//                 <span className="text-sm font-mono text-stone-400">
//                   {doc.key} {doc.mode} · {doc.timeSig} · {doc.tempo} BPM
//                 </span>
//               </div>
//               <div className="flex flex-wrap gap-2">
//                 <span
//                   className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLE[doc.difficulty] ?? ""}`}
//                 >
//                   {doc.difficulty}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.genre}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.structure.join("-")}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {totalBars} bars
//                 </span>
//               </div>
//             </div>
//           </div>

//           {doc.prompt && (
//             <p className="mt-4 text-sm text-stone-500 italic pl-14 leading-relaxed">
//               &ldquo;{doc.prompt}&rdquo;
//             </p>
//           )}
//         </motion.div>

//         {/* Playback bar */}
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.05 }}
//           className="flex items-center gap-4 mb-6 p-4 bg-stone-900 border border-stone-800 rounded-xl"
//         >
//           <button
//             onClick={toggle}
//             className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-lg shrink-0"
//           >
//             {isPlaying ? (
//               <Pause className="w-4 h-4" />
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
//               onChange={(e) => setTempo(Number(e.target.value))}
//               className="flex-1 accent-amber-500 h-1 cursor-pointer"
//             />
//             <span className="text-xs font-mono text-stone-500">BPM</span>
//           </div>

//           {/* Chord progression */}
//           <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
//             {doc.chordProgression.slice(0, 8).map((ch, i) => (
//               <span
//                 key={i}
//                 className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700"
//               >
//                 {ch}
//               </span>
//             ))}
//             {doc.chordProgression.length > 8 && (
//               <span className="text-[10px] text-stone-600">
//                 +{doc.chordProgression.length - 8}
//               </span>
//             )}
//           </div>
//         </motion.div>

//         {/* Score */}
//         <motion.div
//           id="score-area"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.1 }}
//           className="overflow-x-auto rounded-xl border border-stone-800 shadow-2xl mb-6"
//         >
//           {piece && <ScoreRenderer piece={piece} clef={clef} />}
//         </motion.div>

//         {/* Performance notes */}
//         {doc.description && (
//           <motion.div
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.15 }}
//             className="p-5 bg-stone-900 border border-stone-800 rounded-xl"
//           >
//             <div className="flex items-start gap-3">
//               <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-amber-500/70" />
//               <div>
//                 <p className="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">
//                   Performance Notes
//                 </p>
//                 <p className="text-sm text-stone-400 leading-relaxed italic">
//                   {doc.description}
//                 </p>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </div>
//     </div>
//   );
// }
// "use client";
// import { useCallback, useEffect, useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Id } from "@/convex/_generated/dataModel";
// import { useParams, useRouter } from "next/navigation";
// import { motion } from "framer-motion";
// import {
//   ArrowLeft,
//   Printer,
//   Play,
//   Pause,
//   Trash2,
//   BookOpen,
//   Music,
//   Loader2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { usePlayback } from "@/hooks/usePlayback";
// import type { MusicPiece, Clef } from "@/types/music";
// import jsPDF from "jspdf";
// import ScoreRenderer from "@/app/components/Scorerenderer";

// function docToMusicPiece(
//   doc: NonNullable<ReturnType<typeof useDocQuery>>,
// ): MusicPiece {
//   return {
//     title: doc.title,
//     key: doc.key,
//     mode: doc.mode,
//     timeSig: doc.timeSig,
//     tempo: doc.tempo,
//     genre: doc.genre,
//     difficulty: doc.difficulty,
//     chordProgression: doc.chordProgression,
//     sections: doc.sections as MusicPiece["sections"],
//     structure: doc.structure,
//     description: doc.description,
//   };
// }

// function useDocQuery() {
//   const params = useParams();
//   const id = params.pieceId as Id<"pieces">;
//   return useQuery(api.songs.getPieceById, { id });
// }

// const DIFFICULTY_STYLE: Record<string, string> = {
//   beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
//   intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
//   advanced: "bg-red-500/15 text-red-400 border-red-500/30",
// };

// const GENRE_EMOJI: Record<string, string> = {
//   classical: "🎼",
//   romantic: "🌹",
//   baroque: "⚜️",
//   jazz: "🎷",
//   folk: "🪕",
//   waltz: "💃",
//   march: "🥁",
//   blues: "🎸",
//   ragtime: "🎹",
// };

// export default function PieceDetailPage() {
//   const router = useRouter();
//   const doc = useDocQuery();
//   const deletePiece = useMutation(api.songs.deletePiece);
//   const [clef, setClef] = useState<Clef>("treble");

//   const piece = doc ? docToMusicPiece(doc) : null;

//   // ← currentBeat now comes from the upgraded hook
//   const { isPlaying, currentBeat, tempo, setTempo, toggle, stop } =
//     usePlayback(piece);

//   useEffect(() => {
//     if (doc) setTempo(doc.tempo);
//   }, [doc?._id]); // eslint-disable-line react-hooks/exhaustive-deps

//   const handleDelete = async () => {
//     if (!doc) return;
//     if (!confirm("Delete this piece? This cannot be undone.")) return;
//     stop();
//     await deletePiece({ id: doc._id });
//     router.push("/pieces");
//   };

//   const handlePrint = useCallback(() => {
//     const canvas =
//       document.querySelector<HTMLCanvasElement>("#score-area canvas");
//     if (!canvas) return;
//     const pdf = new jsPDF({
//       orientation: "portrait",
//       unit: "px",
//       format: "a4",
//     });
//     const pw = pdf.internal.pageSize.getWidth();
//     const ph = pdf.internal.pageSize.getHeight();
//     const imgData = canvas.toDataURL("image/png");
//     const imgH = (canvas.height * pw) / canvas.width;
//     if (imgH <= ph) {
//       pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
//     } else {
//       let yOffset = 0;
//       while (yOffset < imgH) {
//         if (yOffset > 0) pdf.addPage();
//         pdf.addImage(imgData, "PNG", 0, -yOffset, pw, imgH);
//         yOffset += ph;
//       }
//     }
//     pdf.save(`${doc?.title ?? "score"}.pdf`);
//   }, [doc?.title]);

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
//           onClick={() => router.push("/pieces")}
//           className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
//         >
//           Back to library
//         </button>
//       </div>
//     );
//   }

//   const totalBars = doc.sections.reduce((s, sec) => s + sec.bars.length, 0);

//   return (
//     <div className="min-h-screen bg-stone-950 text-stone-200">
//       {/* Top bar */}
//       <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 py-3 flex items-center justify-between gap-4">
//         <button
//           onClick={() => {
//             stop();
//             router.push("/pieces");
//           }}
//           className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
//         >
//           <ArrowLeft className="w-3.5 h-3.5" />
//           My Pieces
//         </button>
//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setClef((c) => (c === "treble" ? "bass" : "treble"))}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
//           >
//             {clef === "treble" ? "Treble" : "Bass"} Clef
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handlePrint}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
//           >
//             <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleDelete}
//             className="text-xs font-mono border-stone-700 text-stone-400 hover:border-red-500 hover:text-red-400 bg-transparent"
//           >
//             <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
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
//             <span className="text-4xl select-none mt-1">
//               {GENRE_EMOJI[doc.genre] ?? "🎵"}
//             </span>
//             <div className="flex-1">
//               <h1 className="font-serif text-3xl text-stone-100 leading-tight mb-2">
//                 {doc.title}
//               </h1>
//               <div className="flex flex-wrap items-center gap-2 mb-3">
//                 <span className="text-sm font-mono text-stone-400">
//                   {doc.key} {doc.mode} · {doc.timeSig} · {doc.tempo} BPM
//                 </span>
//               </div>
//               <div className="flex flex-wrap gap-2">
//                 <span
//                   className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLE[doc.difficulty] ?? ""}`}
//                 >
//                   {doc.difficulty}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.genre}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {doc.structure.join("-")}
//                 </span>
//                 <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
//                   {totalBars} bars
//                 </span>
//               </div>
//             </div>
//           </div>
//           {doc.prompt && (
//             <p className="mt-4 text-sm text-stone-500 italic pl-14 leading-relaxed">
//               &ldquo;{doc.prompt}&rdquo;
//             </p>
//           )}
//         </motion.div>

//         {/* Playback bar */}
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.05 }}
//           className="flex items-center gap-4 mb-6 p-4 bg-stone-900 border border-stone-800 rounded-xl"
//         >
//           <button
//             onClick={toggle}
//             className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-lg shrink-0"
//           >
//             {isPlaying ? (
//               <Pause className="w-4 h-4" />
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
//               onChange={(e) => setTempo(Number(e.target.value))}
//               className="flex-1 accent-amber-500 h-1 cursor-pointer"
//             />
//             <span className="text-xs font-mono text-stone-500">BPM</span>
//           </div>
//           <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
//             {doc.chordProgression.slice(0, 8).map((ch, i) => (
//               <span
//                 key={i}
//                 className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700"
//               >
//                 {ch}
//               </span>
//             ))}
//             {doc.chordProgression.length > 8 && (
//               <span className="text-[10px] text-stone-600">
//                 +{doc.chordProgression.length - 8}
//               </span>
//             )}
//           </div>
//         </motion.div>

//         {/* Score — currentBeat passed down so ScoreRenderer can draw the playhead */}
//         <motion.div
//           id="score-area"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.1 }}
//           className="overflow-x-auto rounded-xl border border-stone-800 shadow-2xl mb-6"
//         >
//           {piece && (
//             <ScoreRenderer
//               piece={piece}
//               clef={clef}
//               currentBeat={currentBeat}
//             />
//           )}
//         </motion.div>

//         {/* Performance notes */}
//         {doc.description && (
//           <motion.div
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.15 }}
//             className="p-5 bg-stone-900 border border-stone-800 rounded-xl"
//           >
//             <div className="flex items-start gap-3">
//               <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-amber-500/70" />
//               <div>
//                 <p className="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">
//                   Performance Notes
//                 </p>
//                 <p className="text-sm text-stone-400 leading-relaxed italic">
//                   {doc.description}
//                 </p>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </div>
//     </div>
//   );
// }
"use client";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Printer,
  Play,
  Square,
  Trash2,
  BookOpen,
  Music,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayback } from "@/hooks/usePlayback";
import type { MusicPiece, Clef } from "@/types/music";
import jsPDF from "jspdf";
import ScoreRenderer from "@/app/components/Scorerenderer";
import MetronomeDrumTrack from "@/app/components/Metronomedrumtrack"; // ← ADD

function docToMusicPiece(
  doc: NonNullable<ReturnType<typeof useDocQuery>>,
): MusicPiece {
  return {
    title: doc.title,
    key: doc.key,
    mode: doc.mode,
    timeSig: doc.timeSig,
    tempo: doc.tempo,
    genre: doc.genre,
    difficulty: doc.difficulty,
    chordProgression: doc.chordProgression,
    sections: doc.sections as MusicPiece["sections"],
    structure: doc.structure,
    description: doc.description,
  };
}

function useDocQuery() {
  const params = useParams();
  const id = params.pieceId as Id<"pieces">;
  return useQuery(api.songs.getPieceById, { id });
}

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

export default function PieceDetailPage() {
  const router = useRouter();
  const doc = useDocQuery();
  const deletePiece = useMutation(api.songs.deletePiece);

  const [clef, setClef] = useState<Clef>("treble");

  const piece = doc ? docToMusicPiece(doc) : null;
  const {
    isPlaying,
    currentBeat,
    tempo: localTempo,
    setTempo,
    toggle,
    stop,
  } = usePlayback(piece);

  const handleTempoChange = (bpm: number) => {
    setTempo(bpm);
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    stop();
    await deletePiece({ id: doc._id });
    router.push("/pieces");
  };

  const handlePrint = useCallback(() => {
    const canvas =
      document.querySelector<HTMLCanvasElement>("#score-area canvas");
    if (!canvas) return;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL("image/png");
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
    pdf.save(`${doc?.title ?? "score"}.pdf`);
  }, [doc?.title]);

  if (doc === undefined) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (doc === null) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
        <Music className="w-10 h-10 opacity-30" />
        <p className="font-serif text-lg">Piece not found</p>
        <button
          onClick={() => router.push("/pieces")}
          className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
        >
          Back to library
        </button>
      </div>
    );
  }

  const totalBars = doc.sections.reduce((s, sec) => s + sec.bars.length, 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => {
            stop();
            router.push("/pieces");
          }}
          className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> My Pieces
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClef((c) => (c === "treble" ? "bass" : "treble"))}
            className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
          >
            {clef === "treble" ? "Treble" : "Bass"} Clef
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-mono border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 bg-transparent"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
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
            <span className="text-4xl select-none mt-1">
              {GENRE_EMOJI[doc.genre] ?? "🎵"}
            </span>
            <div className="flex-1">
              <h1 className="font-serif text-3xl text-stone-100 leading-tight mb-2">
                {doc.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-sm font-mono text-stone-400">
                  {doc.key} {doc.mode} · {doc.timeSig} · {localTempo} BPM
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLE[doc.difficulty] ?? ""}`}
                >
                  {doc.difficulty}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                  {doc.genre}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                  {doc.structure.join("-")}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                  {totalBars} bars
                </span>
              </div>
            </div>
          </div>
          {doc.prompt && (
            <p className="mt-4 text-sm text-stone-500 italic pl-14 leading-relaxed">
              &ldquo;{doc.prompt}&rdquo;
            </p>
          )}
        </motion.div>

        {/* Playback bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 mb-4 p-4 bg-stone-900 border border-stone-800 rounded-xl"
        >
          {/* Play / Stop */}
          <button
            onClick={toggle}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-lg shrink-0"
            title={isPlaying ? "Stop" : "Play"}
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          {/* Tempo slider */}
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-mono text-stone-400 w-8 text-right tabular-nums">
              {localTempo}
            </span>
            <input
              type="range"
              min={40}
              max={220}
              value={localTempo}
              onChange={(e) => handleTempoChange(Number(e.target.value))}
              className="flex-1 accent-amber-500 h-1 cursor-pointer"
            />
            <span className="text-xs font-mono text-stone-500">BPM</span>
          </div>

          {/* Chord progression pills */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
            {doc.chordProgression.slice(0, 8).map((ch, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700"
              >
                {ch}
              </span>
            ))}
            {doc.chordProgression.length > 8 && (
              <span className="text-[10px] text-stone-600">
                +{doc.chordProgression.length - 8}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Metronome / Drum Track ───────────────────────────────────────────
             Sits below the playback bar.
             tempo = localTempo (from usePlayback hook, driven by the slider above)
             isPlaying = isPlaying (from usePlayback hook, driven by the Play button)
             Off / Click / Drum just selects mode — audio only starts with ▶
        ────────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6"
        >
          <MetronomeDrumTrack
            tempo={localTempo}
            isPlaying={isPlaying}
            timeSig={doc.timeSig}
          />
        </motion.div>

        {/* Score with playhead */}
        <motion.div
          id="score-area"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto rounded-xl border border-stone-800 shadow-2xl mb-6"
        >
          {piece && (
            <ScoreRenderer
              piece={piece}
              clef={clef}
              currentBeat={currentBeat}
            />
          )}
        </motion.div>

        {/* Performance notes */}
        {doc.description && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-stone-900 border border-stone-800 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-amber-500/70" />
              <div>
                <p className="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">
                  Performance Notes
                </p>
                <p className="text-sm text-stone-400 leading-relaxed italic">
                  {doc.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
