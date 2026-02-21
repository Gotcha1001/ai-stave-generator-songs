// "use client";

// import { useState, useCallback } from "react";
// import ComposerForm from "../components/Composerform";
// import ScoreRenderer from "../components/Scorerenderer";
// import ScoreInfo from "../components/Scoreinfo";
// import PlaybackBar from "../components/Playbackbar";
// import { usePlayback } from "../../hooks/usePlayback";
// import { generateMusicPiece } from "../../lib/generateMusic";
// import type {
//   MusicPiece,
//   Clef,
//   Difficulty,
//   Genre,
//   MusicalKey,
//   TimeSignature,
//   StructureType,
// } from "../../types/music";
// import jsPDF from "jspdf";

// export default function MusicComposer() {
//   // Form state
//   const [prompt, setPrompt] = useState("");
//   const [musicalKey, setMusicalKey] = useState<MusicalKey>("C");
//   const [timeSig, setTimeSig] = useState<TimeSignature>("4/4");
//   const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
//   const [genre, setGenre] = useState<Genre>("classical");
//   const [structure, setStructure] = useState<StructureType>("ABA");

//   // Score state
//   const [piece, setPiece] = useState<MusicPiece | null>(null);
//   const [clef, setClef] = useState<Clef>("treble");
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const { isPlaying, tempo, setTempo, toggle, stop } = usePlayback(piece);

//   const handleGenerate = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     stop();

//     try {
//       const result = await generateMusicPiece({
//         prompt: prompt || "A pleasant melodic piece",
//         key: musicalKey,
//         timeSig,
//         difficulty,
//         genre,
//         structure,
//       });
//       setPiece(result);
//       setTempo(result.tempo ?? 90);
//     } catch (e) {
//       setError((e as Error).message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [
//     prompt,
//     musicalKey,
//     timeSig,
//     difficulty,
//     genre,
//     structure,
//     stop,
//     setTempo,
//   ]);

//   const handleDownloadPDF = () => {
//     const canvas = document.querySelector("canvas");
//     if (!canvas) return;

//     const imgData = canvas.toDataURL("image/png");

//     const pdf = new jsPDF({
//       orientation: "portrait",
//       unit: "px",
//       format: "a4",
//     });

//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const pageHeight = pdf.internal.pageSize.getHeight();

//     const imgWidth = pageWidth;
//     const imgHeight = (canvas.height * imgWidth) / canvas.width;

//     pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
//     pdf.save(`${piece?.title || "music"}.pdf`);
//   };

//   return (
//     <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col">
//       {/* Header */}
//       <header className="border-b border-stone-800 px-8 py-5 flex items-baseline gap-4">
//         <h1 className="font-serif italic text-2xl text-amber-400">
//           AI Music Composer
//         </h1>
//         <span className="font-mono text-[10px] tracking-widest uppercase text-stone-500">
//           Powered by Claude
//         </span>
//       </header>

//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar */}
//         <aside className="w-80 flex-shrink-0 border-r border-stone-800 bg-stone-900/50 p-6 overflow-y-auto">
//           <ComposerForm
//             prompt={prompt}
//             musicalKey={musicalKey}
//             timeSig={timeSig}
//             difficulty={difficulty}
//             genre={genre}
//             structure={structure}
//             isLoading={isLoading}
//             onPromptChange={setPrompt}
//             onKeyChange={setMusicalKey}
//             onTimeSigChange={setTimeSig}
//             onDifficultyChange={setDifficulty}
//             onGenreChange={setGenre}
//             onStructureChange={setStructure}
//             onGenerate={handleGenerate}
//           />
//         </aside>

//         {/* Main score area */}
//         <main className="flex-1 overflow-y-auto p-8">
//           {isLoading && (
//             <div className="flex items-center gap-3 text-amber-400 font-mono text-sm mb-6">
//               <svg
//                 className="animate-spin w-4 h-4"
//                 viewBox="0 0 24 24"
//                 fill="none"
//               >
//                 <circle
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="3"
//                   strokeDasharray="40"
//                   strokeLinecap="round"
//                 />
//               </svg>
//               Composing your piece…
//             </div>
//           )}

//           {error && !isLoading && (
//             <div className="bg-red-950/50 border border-red-800 text-red-300 rounded px-4 py-3 text-sm mb-6 font-mono">
//               ⚠ {error}
//               <button
//                 onClick={handleGenerate}
//                 className="ml-4 underline text-red-200 hover:text-white"
//               >
//                 Try again
//               </button>
//             </div>
//           )}

//           {!piece && !isLoading && !error && (
//             <div className="flex flex-col items-center justify-center min-h-[420px] gap-4 text-stone-600">
//               <div className="text-6xl opacity-30">𝄞</div>
//               <p className="font-mono text-xs tracking-wide text-center max-w-xs leading-relaxed">
//                 Configure your piece in the sidebar and click Compose. The AI
//                 will generate a musically coherent piece with proper chord
//                 progressions, repetition, and resolution.
//               </p>
//             </div>
//           )}

//           {piece && !isLoading && (
//             <>
//               {/* Score header */}
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <h2 className="font-serif text-xl text-stone-100">
//                     {piece.title}
//                   </h2>
//                   <p className="text-xs font-mono text-stone-500 mt-1">
//                     {piece.key} {piece.mode} · {piece.timeSig} · {piece.genre} ·{" "}
//                     {piece.difficulty}
//                   </p>
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() =>
//                       setClef((c) => (c === "treble" ? "bass" : "treble"))
//                     }
//                     className="text-xs font-mono border border-stone-700 text-stone-400
//                                hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
//                   >
//                     {clef === "treble" ? "Treble Clef" : "Bass Clef"}
//                   </button>
//                   <button
//                     onClick={handleGenerate}
//                     className="text-xs font-mono border border-stone-700 text-stone-400
//                                hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
//                   >
//                     ↻ Regenerate
//                   </button>
//                   <button
//                     onClick={handleDownloadPDF}
//                     className="text-xs font-mono border border-stone-700 text-stone-400
//              hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
//                   >
//                     ⬇ Download PDF
//                   </button>
//                 </div>
//               </div>

//               {/* Score canvas */}
//               <div className="overflow-x-auto rounded-lg shadow-2xl">
//                 <ScoreRenderer piece={piece} clef={clef} />
//               </div>

//               {/* Info panel */}
//               <ScoreInfo piece={piece} />

//               {/* Playback */}
//               <PlaybackBar
//                 isPlaying={isPlaying}
//                 tempo={tempo}
//                 onToggle={toggle}
//                 onTempoChange={setTempo}
//               />
//             </>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import ScoreRenderer from "../components/Scorerenderer";
import ScoreInfo from "../components/Scoreinfo";
import PlaybackBar from "../components/Playbackbar";
import { usePlayback } from "../../hooks/usePlayback";
import { generateMusicPiece } from "../../lib/generateMusic";
import type {
  MusicPiece,
  Clef,
  Difficulty,
  Genre,
  MusicalKey,
  TimeSignature,
  StructureType,
} from "../../types/music";
import jsPDF from "jspdf";
import { CheckCircle, Loader2 } from "lucide-react";
import ComposerForm, { type NotationStyle } from "./Composerform";

export default function MusicComposer() {
  const [prompt, setPrompt] = useState("");
  const [musicalKey, setMusicalKey] = useState<MusicalKey>("C");
  const [timeSig, setTimeSig] = useState<TimeSignature>("4/4");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [genre, setGenre] = useState<Genre>("classical");
  const [structure, setStructure] = useState<StructureType>("ABA");
  const [notation, setNotation] = useState<NotationStyle>("classical");

  const [piece, setPiece] = useState<MusicPiece | null>(null);
  const [clef, setClef] = useState<Clef>("treble");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const { isPlaying, tempo, setTempo, toggle, stop } = usePlayback(piece);
  const savePiece = useMutation(api.songs.savePiece);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveState("idle");
    stop();
    try {
      const result = await generateMusicPiece({
        prompt: prompt || "A pleasant melodic piece",
        key: musicalKey,
        timeSig,
        difficulty,
        genre,
        structure,
        notation,
      });
      setPiece(result);
      setTempo(result.tempo ?? 90);

      setSaveState("saving");
      try {
        await savePiece({
          title: result.title,
          key: result.key,
          mode: result.mode,
          timeSig: result.timeSig,
          tempo: result.tempo,
          genre: result.genre,
          difficulty: result.difficulty,
          prompt: prompt || "A pleasant melodic piece",
          chordProgression: result.chordProgression,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sections: result.sections as any,
          structure: result.structure,
          description: result.description,
          notation,
        });
        setSaveState("saved");
      } catch (saveErr) {
        console.warn("Could not save piece:", saveErr);
        setSaveState("idle");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [
    prompt,
    musicalKey,
    timeSig,
    difficulty,
    genre,
    structure,
    notation,
    stop,
    setTempo,
    savePiece,
  ]);

  const handleDownloadPDF = () => {
    const canvas = document.querySelector("canvas");
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
    pdf.save(`${piece?.title ?? "music"}.pdf`);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col">
      <header className="border-b border-stone-800 px-8 py-5 flex items-baseline gap-4">
        <h1 className="font-serif italic text-2xl text-amber-400">
          AI Music Composer
        </h1>
        <span className="font-mono text-[10px] tracking-widest uppercase text-stone-500">
          Powered by Claude
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-stone-800 bg-stone-900/50 p-6 overflow-y-auto">
          <ComposerForm
            prompt={prompt}
            musicalKey={musicalKey}
            timeSig={timeSig}
            difficulty={difficulty}
            genre={genre}
            structure={structure}
            notation={notation}
            isLoading={isLoading}
            onPromptChange={setPrompt}
            onKeyChange={setMusicalKey}
            onTimeSigChange={setTimeSig}
            onDifficultyChange={setDifficulty}
            onGenreChange={setGenre}
            onStructureChange={setStructure}
            onNotationChange={setNotation}
            onGenerate={handleGenerate}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {isLoading && (
            <div className="flex items-center gap-3 text-amber-400 font-mono text-sm mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Composing your piece...
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 rounded px-4 py-3 text-sm mb-6 font-mono">
              ⚠ {error}
              <button
                onClick={handleGenerate}
                className="ml-4 underline text-red-200 hover:text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!piece && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center min-h-[420px] gap-4 text-stone-600">
              <div className="text-6xl opacity-30">𝄞</div>
              <p className="font-mono text-xs tracking-wide text-center max-w-xs leading-relaxed">
                Configure your piece in the sidebar and click Compose. The AI
                will generate a musically coherent piece with proper chord
                progressions, repetition, and resolution.
              </p>
            </div>
          )}

          {piece && !isLoading && (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl text-stone-100">
                    {piece.title}
                  </h2>
                  <p className="text-xs font-mono text-stone-500 mt-1">
                    {piece.key} {piece.mode} · {piece.timeSig} · {piece.genre} ·{" "}
                    {piece.difficulty}
                  </p>
                </div>

                <div className="flex gap-2 items-center flex-wrap justify-end">
                  {saveState === "saving" && (
                    <span className="text-xs font-mono text-stone-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                    </span>
                  )}
                  {saveState === "saved" && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Saved to library
                    </span>
                  )}
                  {/* Hide clef toggle in grand staff mode — both clefs always shown */}
                  {notation !== "classical" && (
                    <button
                      onClick={() =>
                        setClef((c) => (c === "treble" ? "bass" : "treble"))
                      }
                      className="text-xs font-mono border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
                    >
                      {clef === "treble" ? "Treble Clef" : "Bass Clef"}
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPDF}
                    className="text-xs font-mono border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
                  >
                    ↓ PDF
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="text-xs font-mono border border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 rounded px-3 py-1.5 transition-colors"
                  >
                    ↻ Regenerate
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg shadow-2xl">
                <ScoreRenderer piece={piece} clef={clef} notation={notation} />{" "}
                {/* 👈 notation passed */}
              </div>

              <ScoreInfo piece={piece} />

              <PlaybackBar
                isPlaying={isPlaying}
                tempo={tempo}
                onToggle={toggle}
                onTempoChange={setTempo}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
