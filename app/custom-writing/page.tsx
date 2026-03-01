// "use client";

// import React, {
//   useRef,
//   useEffect,
//   useState,
//   useMemo,
//   useCallback,
// } from "react";
// import { useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from "vexflow";
// import * as Tone from "tone";
// import {
//   Play,
//   Square,
//   Trash2,
//   Save,
//   Music,
//   Undo2,
//   Download,
//   Plus,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import {
//   NOTE_TOOLS,
//   TIME_SIGNATURES,
//   KEY_SIGNATURES,
//   type NoteDuration,
//   type TimeSig,
//   type StaveTemplate,
//   durationBeats,
//   beatsPerBar,
//   wouldOverflow,
// } from "@/lib/notationUtils";
// import MetronomeDrumTrack from "@/app/components/Metronomedrumtrack";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Doc, Id } from "@/convex/_generated/dataModel";
// import jsPDF from "jspdf";

// // ── Types ────────────────────────────────────────────────────────────────────

// interface PlacedNote {
//   id: string;
//   pitch: string;
//   duration: string;
//   isRest: boolean;
//   barIndex: number;
//   voice: "treble" | "bass";
// }

// // ── Layout constants ──────────────────────────────────────────────────────────
// const STAVE_WIDTH = 300;
// const STAVE_GAP = 0;
// const STAVE_X_START = 20;
// const TREBLE_Y = 40;
// const BASS_Y = 150;

// const VF_TO_TONE: Record<string, string> = {
//   w: "1n",
//   h: "2n",
//   q: "4n",
//   "8": "8n",
//   "16": "16n",
//   wr: "1n",
//   hr: "2n",
//   qr: "4n",
//   "8r": "8n",
//   "16r": "16n",
// };

// const TREBLE_SLOTS = [
//   { pitch: "f/5", y: 0 },
//   { pitch: "e/5", y: 5 },
//   { pitch: "d/5", y: 10 },
//   { pitch: "c/5", y: 15 },
//   { pitch: "b/4", y: 20 },
//   { pitch: "a/4", y: 25 },
//   { pitch: "g/4", y: 30 },
//   { pitch: "f/4", y: 35 },
//   { pitch: "e/4", y: 40 },
//   { pitch: "d/4", y: 45 },
//   { pitch: "c/4", y: 50 },
// ];

// const BASS_SLOTS = [
//   { pitch: "a/3", y: 0 },
//   { pitch: "g/3", y: 5 },
//   { pitch: "f/3", y: 10 },
//   { pitch: "e/3", y: 15 },
//   { pitch: "d/3", y: 20 },
//   { pitch: "c/3", y: 25 },
//   { pitch: "b/2", y: 30 },
//   { pitch: "a/2", y: 35 },
//   { pitch: "g/2", y: 40 },
//   { pitch: "f/2", y: 45 },
//   { pitch: "e/2", y: 50 },
// ];

// function nearestPitch(relY: number, slots: { pitch: string; y: number }[]) {
//   return slots.reduce((best, s) =>
//     Math.abs(s.y - relY) < Math.abs(best.y - relY) ? s : best,
//   ).pitch;
// }

// interface NoteMetadata {
//   id: string;
//   isRest: boolean;
//   voice: "treble" | "bass";
// }

// const vfNoteMeta = new WeakMap<StaveNote, NoteMetadata>();

// // ── Component ─────────────────────────────────────────────────────────────────

// function CustomWritingPageInner() {
//   const [timeSig, setTimeSig] = useState<TimeSig>(TIME_SIGNATURES[0]);
//   const [keySig, setKeySig] = useState("C");
//   const [template, setTemplate] = useState<StaveTemplate>("lead-sheet");
//   const [selectedTool, setSelectedTool] = useState<NoteDuration>("q");
//   const [activeVoice, setActiveVoice] = useState<"treble" | "bass">("treble");
//   const [notes, setNotes] = useState<PlacedNote[]>([]);
//   const [barCount, setBarCount] = useState(4);
//   const [history, setHistory] = useState<PlacedNote[][]>([[]]);
//   const [historyIdx, setHistoryIdx] = useState(0);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [savedMsg, setSavedMsg] = useState("");
//   const [draggingId, setDraggingId] = useState<string | null>(null);
//   const [tempo, setTempo] = useState(100);
//   const [currentBeat, setCurrentBeat] = useState(0);
//   const [pieceTitle, setPieceTitle] = useState("My Custom Piece");

//   const svgRef = useRef<HTMLDivElement>(null);
//   const overlayRef = useRef<HTMLCanvasElement>(null);
//   // Hidden canvas used only for PDF export
//   const exportCanvasRef = useRef<HTMLCanvasElement>(null);

//   // ── Load draft from URL param (?load=<id>) ───────────────────────────────
//   const searchParams = useSearchParams();
//   const loadId = searchParams.get("load") as Id<"customDrafts"> | null;

//   const draftToLoad = useQuery(
//     api.customDrafts.getMyCustomDrafts,
//     loadId ? undefined : "skip",
//   );

//   // Once the drafts arrive, find the matching one and restore state
//   const loadedRef = useRef(false);
//   useEffect(() => {
//     if (!loadId || loadedRef.current) return;
//     const drafts = draftToLoad as Doc<"customDrafts">[] | undefined;
//     const match = Array.isArray(drafts)
//       ? drafts.find((d) => d._id === loadId)
//       : null;
//     if (!match) return;
//     loadedRef.current = true;
//     const ts =
//       TIME_SIGNATURES.find((t) => t.label === match.timeSig) ??
//       TIME_SIGNATURES[0];
//     setTimeSig(ts);
//     setKeySig(match.keySig ?? "C");
//     setTemplate((match.template as StaveTemplate) ?? "lead-sheet");
//     setBarCount(match.barCount ?? 4);
//     setTempo(match.tempo ?? 100);
//     setPieceTitle(match.title ?? "My Custom Piece");
//     setNotes((match.notes as PlacedNote[]) ?? []);
//     setHistory([(match.notes as PlacedNote[]) ?? []]);
//     setHistoryIdx(0);
//   }, [draftToLoad, loadId]);

//   // ── Salamander Grand Piano sampler ────────────────────────────────────────
//   const samplerRef = useRef<Tone.Sampler | null>(null);
//   const samplerReadyRef = useRef<Promise<void> | null>(null);

//   const getSampler = (): Promise<void> => {
//     if (samplerRef.current && samplerReadyRef.current)
//       return samplerReadyRef.current;
//     samplerRef.current = new Tone.Sampler({
//       urls: {
//         A0: "A0.mp3",
//         C1: "C1.mp3",
//         "D#1": "Ds1.mp3",
//         "F#1": "Fs1.mp3",
//         A1: "A1.mp3",
//         C2: "C2.mp3",
//         "D#2": "Ds2.mp3",
//         "F#2": "Fs2.mp3",
//         A2: "A2.mp3",
//         C3: "C3.mp3",
//         "D#3": "Ds3.mp3",
//         "F#3": "Fs3.mp3",
//         A3: "A3.mp3",
//         C4: "C4.mp3",
//         "D#4": "Ds4.mp3",
//         "F#4": "Fs4.mp3",
//         A4: "A4.mp3",
//         C5: "C5.mp3",
//         "D#5": "Ds5.mp3",
//         "F#5": "Fs5.mp3",
//         A5: "A5.mp3",
//         C6: "C6.mp3",
//         "D#6": "Ds6.mp3",
//         "F#6": "Fs6.mp3",
//         A6: "A6.mp3",
//         C7: "C7.mp3",
//         "D#7": "Ds7.mp3",
//         "F#7": "Fs7.mp3",
//         A7: "A7.mp3",
//         C8: "C8.mp3",
//       },
//       baseUrl: "https://tonejs.github.io/audio/salamander/",
//       release: 1.5,
//     }).toDestination();
//     samplerReadyRef.current = Tone.loaded();
//     return samplerReadyRef.current;
//   };

//   const saveCustomDraft = useMutation(api.customDrafts.saveCustomDraft);

//   // ── Inline stateRef sync ──────────────────────────────────────────────────
//   const stateRef = useRef({
//     notes,
//     timeSig,
//     selectedTool,
//     activeVoice,
//     barCount,
//     history,
//     historyIdx,
//   });
//   stateRef.current = {
//     notes,
//     timeSig,
//     selectedTool,
//     activeVoice,
//     barCount,
//     history,
//     historyIdx,
//   };

//   const isGrand = template === "grand-staff";

//   useEffect(() => {
//     if (!isGrand) setActiveVoice("treble");
//   }, [isGrand]);

//   // ── Derived ───────────────────────────────────────────────────────────────
//   const notesByBar = useMemo(() => {
//     const map: Record<number, PlacedNote[]> = {};
//     for (let i = 0; i < barCount; i++) map[i] = [];
//     for (const n of notes)
//       if (map[n.barIndex] !== undefined) map[n.barIndex].push(n);
//     return map;
//   }, [notes, barCount]);

//   const barBeats = useMemo(() => {
//     const filled: Record<number, number> = {};
//     for (let i = 0; i < barCount; i++) {
//       filled[i] = (notesByBar[i] ?? [])
//         .filter((n) => n.voice === "treble")
//         .reduce((acc, n) => acc + durationBeats(n.duration, timeSig), 0);
//     }
//     return filled;
//   }, [notesByBar, barCount, timeSig]);

//   // ── Drag-to-repitch ───────────────────────────────────────────────────────
//   useEffect(() => {
//     function handleMove(e: MouseEvent) {
//       if (!draggingId) return;
//       const svg = svgRef.current?.querySelector("svg");
//       if (!svg) return;
//       const rect = svg.getBoundingClientRect();
//       const y = e.clientY - rect.top;
//       setNotes((prev) =>
//         prev.map((n) => {
//           if (n.id !== draggingId || n.isRest) return n;
//           const BARS_PER_ROW_D = 4;
//           const SINGLE_ROW_H_D = isGrand ? 230 : 130;
//           const ROW_GAP_D = 50;
//           const noteRow = Math.floor(n.barIndex / BARS_PER_ROW_D);
//           const rowTop = noteRow * (SINGLE_ROW_H_D + ROW_GAP_D) + 20;
//           const staveTopY = n.voice === "treble" ? rowTop : rowTop + 110;
//           const slots = n.voice === "treble" ? TREBLE_SLOTS : BASS_SLOTS;
//           return { ...n, pitch: nearestPitch(y - staveTopY, slots) };
//         }),
//       );
//     }
//     function handleUp() {
//       if (draggingId) {
//         setNotes((prev) => {
//           const { history: hist, historyIdx: hIdx } = stateRef.current;
//           const newHist = [...hist.slice(0, hIdx + 1), prev];
//           setHistory(newHist);
//           setHistoryIdx(hIdx + 1);
//           return prev;
//         });
//         setDraggingId(null);
//       }
//     }
//     window.addEventListener("mousemove", handleMove);
//     window.addEventListener("mouseup", handleUp);
//     return () => {
//       window.removeEventListener("mousemove", handleMove);
//       window.removeEventListener("mouseup", handleUp);
//     };
//   }, [draggingId]);

//   // ── VexFlow render ────────────────────────────────────────────────────────
//   const BARS_PER_ROW = 4;

//   useEffect(() => {
//     if (!svgRef.current) return;

//     svgRef.current.innerHTML = "";

//     const totalRows = Math.ceil(barCount / BARS_PER_ROW);
//     const SINGLE_ROW_H = isGrand ? 230 : 130;
//     const ROW_GAP = 50;
//     const TITLE_OFFSET = 40; // ← space reserved for title above staves

//     const canvasW = STAVE_WIDTH * BARS_PER_ROW + STAVE_X_START + 20;
//     const canvasH = totalRows * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET; // ← taller

//     const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
//     renderer.resize(canvasW, canvasH);
//     const ctx = renderer.getContext();

//     // ── Draw title above the first row ───────────────────────────────────
//     if (pieceTitle) {
//       ctx.save();
//       ctx.setFont("Arial", 18, "bold");
//       ctx.setFillStyle("#000000");
//       ctx.fillText(pieceTitle, canvasW / 2 - pieceTitle.length * 5, 24);
//       ctx.restore();
//     }
//     const svgEl = svgRef.current.querySelector("svg");
//     if (svgEl) {
//       svgEl.style.width = canvasW + "px";
//       svgEl.style.maxWidth = canvasW + "px";
//     }

//     const buildVfNotes = (existing: PlacedNote[], clef: "treble" | "bass") => {
//       // Only include notes that actually fit within the bar's beat capacity
//       let used = 0;
//       const fitting: PlacedNote[] = [];
//       for (const n of existing) {
//         const beats = durationBeats(n.duration, timeSig);
//         if (used + beats <= beatsPerBar(timeSig) + 0.01) {
//           fitting.push(n);
//           used += beats;
//         }
//       }

//       const vfn = fitting.map((n) => {
//         const note = new StaveNote({
//           clef,
//           keys: [n.isRest ? "b/4" : n.pitch],
//           duration: n.isRest ? `${n.duration}r` : n.duration,
//           autoStem: true, // ← add this
//         });
//         vfNoteMeta.set(note, { id: n.id, isRest: n.isRest, voice: clef });
//         return note;
//       });

//       // Fill remaining space with the smallest rest that fits, not always whole rest
//       const remaining = beatsPerBar(timeSig) - used;
//       if (remaining > 0.01) {
//         // Use whole rest only if the bar is empty, otherwise fill with half/quarter
//         const fillDuration =
//           remaining >= 4 ? "wr" : remaining >= 2 ? "hr" : "qr";
//         vfn.push(
//           new StaveNote({ clef, keys: ["b/4"], duration: fillDuration }),
//         );
//       }

//       return vfn;
//     };

//     const drawVoice = (vfNotes: StaveNote[], stave: Stave) => {
//       try {
//         // Build beams BEFORE drawing so VexFlow suppresses flags automatically
//         const beamableNotes = vfNotes.filter((n) => {
//           const meta = vfNoteMeta.get(n);
//           return meta && !meta.isRest && ["8", "16"].includes(n.getDuration());
//         });

//         const beams: Beam[] = [];
//         for (let i = 0; i < beamableNotes.length - 1; i += 2) {
//           const group = beamableNotes.slice(i, i + 2);
//           if (group.length === 2) {
//             beams.push(new Beam(group));
//           }
//         }

//         const v = new Voice({
//           numBeats: timeSig.beats,
//           beatValue: timeSig.beatValue,
//         }).setStrict(false);
//         v.addTickables(vfNotes);
//         new Formatter().joinVoices([v]).format([v], STAVE_WIDTH - 70);
//         v.draw(ctx, stave);

//         // Draw beams after voice
//         beams.forEach((b) => b.setContext(ctx).draw());

//         vfNotes.forEach((vfNote) => {
//           const meta = vfNoteMeta.get(vfNote);
//           if (!meta || meta.isRest) return;
//           const el = vfNote.getSVGElement?.();
//           if (!el) return;
//           el.style.cursor = "ns-resize";
//           const noteHead =
//             (el.querySelector("path, use, ellipse") as SVGElement | null) ?? el;
//           noteHead.setAttribute("data-note-id", meta.id);
//           el.addEventListener("mousedown", (ev: Event) => {
//             ev.stopPropagation();
//             setDraggingId(meta.id);
//           });
//         });
//       } catch {
//         /* partial bar */
//       }
//     };
//     for (let barIdx = 0; barIdx < barCount; barIdx++) {
//       const row = Math.floor(barIdx / BARS_PER_ROW);
//       const col = barIdx % BARS_PER_ROW;
//       const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET;
//       const trebleY = rowTop;
//       const bassY = rowTop + 110;
//       const x = STAVE_X_START + col * STAVE_WIDTH;
//       const firstInRow = col === 0;

//       const treble = new Stave(x, trebleY, STAVE_WIDTH);
//       if (firstInRow)
//         treble
//           .addClef("treble")
//           .addTimeSignature(timeSig.label)
//           .addKeySignature(keySig);
//       treble.setContext(ctx).draw();

//       let bass: Stave | null = null;
//       if (isGrand) {
//         bass = new Stave(x, bassY, STAVE_WIDTH);
//         if (firstInRow)
//           bass
//             .addClef("bass")
//             .addTimeSignature(timeSig.label)
//             .addKeySignature(keySig);
//         bass.setContext(ctx).draw();
//       }

//       const barNotes = notesByBar[barIdx] ?? [];
//       drawVoice(
//         buildVfNotes(
//           barNotes.filter((n) => n.voice === "treble"),
//           "treble",
//         ),
//         treble,
//       );
//       if (isGrand && bass)
//         drawVoice(
//           buildVfNotes(
//             barNotes.filter((n) => n.voice === "bass"),
//             "bass",
//           ),
//           bass,
//         );
//     }

//     const svg = svgRef.current.querySelector("svg");
//     if (svg) {
//       svg.style.cursor = draggingId ? "ns-resize" : "crosshair";
//       svg.addEventListener("click", handleStaveClick);
//     }
//     return () => {
//       svg?.removeEventListener("click", handleStaveClick);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [notes, timeSig, keySig, template, barCount, draggingId]);

//   // ── Playhead overlay ──────────────────────────────────────────────────────
//   useEffect(() => {
//     const svg = svgRef.current?.querySelector("svg");
//     if (!svg) return;

//     const old = svgRef.current?.querySelector("canvas.playhead-overlay");
//     old?.remove();

//     if (currentBeat <= 0 || !isPlaying) return;

//     const canvas = document.createElement("canvas");
//     canvas.className = "playhead-overlay";
//     canvas.style.position = "absolute";
//     canvas.style.top = "0";
//     canvas.style.left = "0";
//     canvas.style.pointerEvents = "none";
//     canvas.width = svg.clientWidth;
//     canvas.height = svg.clientHeight;
//     canvas.style.width = svg.clientWidth + "px";
//     canvas.style.height = svg.clientHeight + "px";

//     const container = svgRef.current?.parentElement;
//     if (container) container.style.position = "relative";
//     svgRef.current?.appendChild(canvas);

//     const canvasCtx = canvas.getContext("2d");
//     if (!canvasCtx) return;

//     const SINGLE_ROW_H = isGrand ? 230 : 130;
//     const ROW_GAP = 50;
//     const bpb = beatsPerBar(timeSig);
//     const barIdx = Math.floor(currentBeat / bpb);
//     const beatInBar = currentBeat % bpb;
//     const row = Math.floor(barIdx / BARS_PER_ROW);
//     const col = barIdx % BARS_PER_ROW;
//     const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20;
//     const trebleY = rowTop;
//     const bassY = rowTop + 110;

//     const x =
//       STAVE_X_START + col * STAVE_WIDTH + (beatInBar / bpb) * STAVE_WIDTH;

//     const top = trebleY - 10;
//     const bottom = isGrand ? bassY + 50 : trebleY + 55;

//     canvasCtx.strokeStyle = "rgba(245, 158, 11, 0.85)";
//     canvasCtx.lineWidth = 2;
//     canvasCtx.shadowColor = "rgba(245, 158, 11, 0.4)";
//     canvasCtx.shadowBlur = 6;
//     canvasCtx.beginPath();
//     canvasCtx.moveTo(x, top);
//     canvasCtx.lineTo(x, bottom);
//     canvasCtx.stroke();
//   }, [currentBeat, isPlaying, timeSig, isGrand]);

//   // ── Click handler ─────────────────────────────────────────────────────────
//   function handleStaveClick(e: MouseEvent) {
//     if (draggingId) return;
//     const svg = svgRef.current?.querySelector("svg");
//     if (!svg) return;
//     const rect = svg.getBoundingClientRect();
//     const clickX = e.clientX - rect.left;
//     const clickY = e.clientY - rect.top;

//     const {
//       notes: cur,
//       timeSig: ts,
//       selectedTool: tid,
//       activeVoice: voice,
//       barCount: bc,
//       history: hist,
//       historyIdx: hIdx,
//     } = stateRef.current;

//     const SINGLE_ROW_H = isGrand ? 230 : 130;
//     const ROW_GAP = 50;
//     const localX = clickX - STAVE_X_START;
//     if (localX < 0) return;
//     const col = Math.floor(localX / STAVE_WIDTH);
//     if (col < 0 || col >= BARS_PER_ROW) return;
//     const row = Math.floor((clickY - 20) / (SINGLE_ROW_H + ROW_GAP));
//     if (row < 0) return;
//     const barIdx = row * BARS_PER_ROW + col;
//     if (barIdx < 0 || barIdx >= bc) return;

//     const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20;
//     const trebleY = rowTop;
//     const bassY = rowTop + 110;

//     const tool = NOTE_TOOLS.find((t) => t.id === tid)!;
//     const staveTopY = voice === "treble" ? trebleY : bassY;
//     const relY = clickY - staveTopY;
//     const pitch = tool.isRest
//       ? "b/4"
//       : nearestPitch(relY, voice === "treble" ? TREBLE_SLOTS : BASS_SLOTS);

//     const clickedNoteId = (() => {
//       const allNoteEls = svgRef.current?.querySelectorAll("[data-note-id]");
//       if (!allNoteEls) return null;
//       for (const el of Array.from(allNoteEls)) {
//         const bbox = (el as SVGGraphicsElement).getBoundingClientRect?.();
//         if (!bbox) continue;
//         const elLeft = bbox.left - rect.left;
//         const elTop = bbox.top - rect.top;
//         const elRight = bbox.right - rect.left;
//         const elBottom = bbox.bottom - rect.top;
//         if (
//           clickX >= elLeft - 6 &&
//           clickX <= elRight + 6 &&
//           clickY >= elTop - 6 &&
//           clickY <= elBottom + 6
//         ) {
//           return el.getAttribute("data-note-id");
//         }
//       }
//       return null;
//     })();

//     if (clickedNoteId && !tool.isRest) {
//       const target = cur.find((n) => n.id === clickedNoteId);
//       if (
//         target &&
//         target.barIndex === barIdx &&
//         target.voice === voice &&
//         !target.isRest
//       ) {
//         const updated = cur.map((n) =>
//           n.id === clickedNoteId ? { ...n, duration: tool.vfDuration } : n,
//         );
//         const newHist = [...hist.slice(0, hIdx + 1), updated];
//         setHistory(newHist);
//         setHistoryIdx(hIdx + 1);
//         setNotes(updated);
//         return;
//       }
//     }

//     const voiceNotes = cur.filter(
//       (n) => n.barIndex === barIdx && n.voice === voice,
//     );
//     const filledBeats = voiceNotes.reduce(
//       (acc, n) => acc + durationBeats(n.duration, ts),
//       0,
//     );
//     let targetBar = barIdx;
//     if (wouldOverflow(filledBeats, tool.vfDuration, ts)) {
//       targetBar = barIdx + 1;
//       if (targetBar >= bc) return;
//     }

//     const next = [
//       ...cur,
//       {
//         id: `${Date.now()}-${Math.random()}`,
//         pitch,
//         duration: tool.vfDuration,
//         isRest: tool.isRest,
//         barIndex: targetBar,
//         voice,
//       },
//     ];
//     const newHist = [...hist.slice(0, hIdx + 1), next];
//     setHistory(newHist);
//     setHistoryIdx(hIdx + 1);
//     setNotes(next);
//   }

//   // ── Undo ──────────────────────────────────────────────────────────────────
//   const undo = () => {
//     const { historyIdx: hIdx, history: hist } = stateRef.current;
//     if (hIdx <= 0) return;
//     setNotes(hist[hIdx - 1]);
//     setHistoryIdx(hIdx - 1);
//   };

//   // ── Add Bar ───────────────────────────────────────────────────────────────
//   const addBar = () => {
//     setBarCount((prev) => prev + 1);
//   };

//   // ── Playback ──────────────────────────────────────────────────────────────
//   const play = async () => {
//     if (isPlaying) return;
//     setIsPlaying(true);
//     setCurrentBeat(0);
//     await Tone.start();
//     await getSampler();

//     const sampler = samplerRef.current!;
//     const now = Tone.now();
//     const spb = 60 / tempo;
//     let time = 0;

//     const byBar: Record<number, PlacedNote[]> = {};
//     for (let i = 0; i < barCount; i++) byBar[i] = [];
//     for (const n of notes)
//       if (byBar[n.barIndex] !== undefined) byBar[n.barIndex].push(n);

//     const bpb = beatsPerBar(timeSig);

//     for (let b = 0; b < barCount; b++) {
//       const barStart = b * bpb;
//       const barNotes = (byBar[b] ?? []).filter((n) => n.voice === "treble");
//       const bassNotes = isGrand
//         ? (byBar[b] ?? []).filter((n) => n.voice === "bass")
//         : [];

//       let beatOffset = 0;
//       for (const n of barNotes) {
//         const dur = durationBeats(n.duration, timeSig);
//         const noteTime = time + beatOffset * spb;
//         const beatPos = barStart + beatOffset;

//         setTimeout(() => {
//           setCurrentBeat(beatPos);
//         }, noteTime * 1000);

//         if (!n.isRest) {
//           const [letter, octave] = n.pitch.split("/");
//           sampler.triggerAttackRelease(
//             `${letter.toUpperCase()}${octave}`,
//             VF_TO_TONE[n.duration] ?? "4n",
//             now + noteTime,
//           );
//         }
//         beatOffset += dur;
//       }

//       let bassOffset = 0;
//       for (const n of bassNotes) {
//         const dur = durationBeats(n.duration, timeSig);
//         const noteTime = time + bassOffset * spb;
//         if (!n.isRest) {
//           const [letter, octave] = n.pitch.split("/");
//           sampler.triggerAttackRelease(
//             `${letter.toUpperCase()}${octave}`,
//             VF_TO_TONE[n.duration] ?? "4n",
//             now + noteTime,
//           );
//         }
//         bassOffset += dur;
//       }

//       time += bpb * spb;
//     }

//     setTimeout(
//       () => {
//         setIsPlaying(false);
//         setCurrentBeat(0);
//       },
//       time * 1000 + 300,
//     );
//   };

//   const stop = () => {
//     samplerRef.current?.releaseAll();
//     Tone.Transport.stop();
//     setIsPlaying(false);
//     setCurrentBeat(0);
//   };

//   // ── Save ──────────────────────────────────────────────────────────────────
//   const save = async () => {
//     try {
//       await saveCustomDraft({
//         title: pieceTitle,
//         timeSig: timeSig.label,
//         keySig,
//         template,
//         barCount,
//         tempo,
//         notes,
//       });
//       setSavedMsg("Saved ✓");
//     } catch {
//       localStorage.setItem(
//         "custom-notation-draft",
//         JSON.stringify({
//           timeSig,
//           keySig,
//           template,
//           notes,
//           barCount,
//           title: pieceTitle,
//         }),
//       );
//       setSavedMsg("Saved locally ✓");
//     }
//     setTimeout(() => setSavedMsg(""), 2500);
//   };

//   const clear = () => {
//     const { historyIdx: hIdx, history: hist } = stateRef.current;
//     setHistory([...hist.slice(0, hIdx + 1), []]);
//     setHistoryIdx(hIdx + 1);
//     setNotes([]);
//   };

//   // ── PDF export (Canvas-based — works with embedded fonts) ─────────────────
//   const exportPDF = useCallback(() => {
//     const canvas = exportCanvasRef.current;
//     if (!canvas) return;

//     const BARS_PER_ROW_E = 4;
//     const isGrandE = template === "grand-staff";
//     const totalRows = Math.ceil(barCount / BARS_PER_ROW_E);
//     const rowHeight = isGrandE ? 230 : 130;
//     const rowGap = 50;
//     const canvasW = STAVE_WIDTH * BARS_PER_ROW_E + STAVE_X_START + 40;
//     const canvasH = totalRows * (rowHeight + rowGap) + 60;

//     canvas.width = canvasW;
//     canvas.height = canvasH;

//     // ✅ Fill background BEFORE creating VexFlow renderer
//     const raw = canvas.getContext("2d")!;
//     raw.fillStyle = "#ffffff";
//     raw.fillRect(0, 0, canvasW, canvasH);

//     // ✅ Create renderer AFTER background fill
//     const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
//     renderer.resize(canvasW, canvasH);
//     const ctx = renderer.getContext();
//     // ... rest stays the same

//     const notesByBarE: Record<number, PlacedNote[]> = {};
//     for (let i = 0; i < barCount; i++) notesByBarE[i] = [];
//     notes.forEach((n) => {
//       if (notesByBarE[n.barIndex] !== undefined)
//         notesByBarE[n.barIndex].push(n);
//     });

//     for (let barIdx = 0; barIdx < barCount; barIdx++) {
//       const row = Math.floor(barIdx / BARS_PER_ROW_E);
//       const col = barIdx % BARS_PER_ROW_E;
//       const x = STAVE_X_START + col * STAVE_WIDTH;
//       const y = row * (rowHeight + rowGap) + 30;

//       const treble = new Stave(x, y, STAVE_WIDTH);
//       if (col === 0)
//         treble
//           .addClef("treble")
//           .addTimeSignature(timeSig.label)
//           .addKeySignature(keySig);
//       treble.setContext(ctx).draw();

//       let bass: Stave | null = null;
//       if (isGrandE) {
//         bass = new Stave(x, y + 110, STAVE_WIDTH);
//         if (col === 0)
//           bass
//             .addClef("bass")
//             .addTimeSignature(timeSig.label)
//             .addKeySignature(keySig);
//         bass.setContext(ctx).draw();
//       }

//       const barNotes = notesByBarE[barIdx] ?? [];

//       const renderVoice = (
//         voiceNotes: PlacedNote[],
//         clef: "treble" | "bass",
//         stave: Stave,
//       ) => {
//         const used = voiceNotes.reduce(
//           (acc, n) => acc + durationBeats(n.duration, timeSig),
//           0,
//         );
//         const vfNotes = voiceNotes.map(
//           (n) =>
//             new StaveNote({
//               clef,
//               keys: [n.isRest ? (clef === "bass" ? "d/3" : "b/4") : n.pitch],
//               duration: n.isRest ? `${n.duration}r` : n.duration,
//               autoStem: true, // ← add this
//             }),
//         );
//         if (beatsPerBar(timeSig) - used > 0.01)
//           vfNotes.push(new StaveNote({ clef, keys: ["b/4"], duration: "wr" }));
//         try {
//           const v = new Voice({
//             numBeats: timeSig.beats,
//             beatValue: timeSig.beatValue,
//           })
//             .setStrict(false)
//             .addTickables(vfNotes);
//           new Formatter().joinVoices([v]).format([v], STAVE_WIDTH - 70);
//           v.draw(ctx, stave);

//           const beamable = vfNotes.filter(
//             (n) => !n.isRest && ["8", "16"].includes(n.getDuration()),
//           );
//           for (let i = 0; i < beamable.length - 1; i += 2) {
//             const group = beamable.slice(i, i + 2);
//             if (group.length === 2) {
//               new Beam(group).setContext(ctx).draw();
//             }
//           }
//         } catch {
//           /* partial bar */
//         }
//       };

//       renderVoice(
//         barNotes.filter((n) => n.voice === "treble"),
//         "treble",
//         treble,
//       );
//       if (isGrandE && bass)
//         renderVoice(
//           barNotes.filter((n) => n.voice === "bass"),
//           "bass",
//           bass,
//         );
//     }

//     // Export canvas to PDF
//     const imgData = canvas.toDataURL("image/png");
//     const pdf = new jsPDF({
//       orientation: "landscape",
//       unit: "px",
//       format: "a4",
//     });
//     const pw = pdf.internal.pageSize.getWidth();
//     const ph = pdf.internal.pageSize.getHeight();
//     const imgH = (canvasH * pw) / canvasW;

//     if (imgH <= ph) {
//       pdf.addImage(imgData, "PNG", 0, 0, pw, imgH);
//     } else {
//       let y = 0;
//       while (y < imgH) {
//         if (y > 0) pdf.addPage();
//         pdf.addImage(imgData, "PNG", 0, -y, pw, imgH);
//         y += ph;
//       }
//     }

//     pdf.save(`${pieceTitle.replace(/\s+/g, "-")}.pdf`);
//   }, [notes, barCount, template, timeSig, keySig, pieceTitle]);

//   // ── Toolbar ───────────────────────────────────────────────────────────────
//   const toolBtn = (tool: (typeof NOTE_TOOLS)[0]) => (
//     <Tooltip key={tool.id}>
//       <TooltipTrigger asChild>
//         <button
//           onClick={() => {
//             setSelectedTool(tool.id);
//             stateRef.current.selectedTool = tool.id;
//           }}
//           className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-all shrink-0
//             ${
//               selectedTool === tool.id
//                 ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
//                 : "border-border hover:border-amber-400/50 hover:bg-muted/50"
//             }`}
//         >
//           <span className="text-xl leading-none">{tool.symbol}</span>
//           <span className="text-[9px] text-muted-foreground mt-0.5">
//             {tool.label.split(" ")[0]}
//           </span>
//         </button>
//       </TooltipTrigger>
//       <TooltipContent>{tool.label}</TooltipContent>
//     </Tooltip>
//   );

//   const noteTools = NOTE_TOOLS.filter((t) => !t.isRest);
//   const restTools = NOTE_TOOLS.filter((t) => t.isRest);

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <TooltipProvider delayDuration={200}>
//       <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
//         {/* Hidden canvas for PDF export */}
//         <canvas ref={exportCanvasRef} style={{ display: "none" }} />

//         {/* ══ ROW 1: Settings + Actions ════════════════════════════════════ */}
//         <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30 min-h-[52px] flex-wrap">
//           <Music className="h-5 w-5 text-amber-400 shrink-0" />
//           <span className="font-semibold text-sm shrink-0">
//             Custom Notation
//           </span>

//           <Separator orientation="vertical" className="h-5 shrink-0" />

//           <input
//             type="text"
//             value={pieceTitle}
//             onChange={(e) => setPieceTitle(e.target.value)}
//             className="h-7 px-2 rounded border border-border bg-background text-xs w-36 shrink-0"
//             placeholder="Piece title..."
//           />

//           <Separator orientation="vertical" className="h-5 shrink-0" />

//           <div className="flex items-center gap-1 shrink-0">
//             <span className="text-xs text-muted-foreground">Time</span>
//             <Select
//               value={timeSig.label}
//               onValueChange={(v) => {
//                 setTimeSig(TIME_SIGNATURES.find((t) => t.label === v)!);
//                 setNotes([]);
//               }}
//             >
//               <SelectTrigger className="h-7 w-[70px] text-xs">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 {TIME_SIGNATURES.map((ts) => (
//                   <SelectItem key={ts.label} value={ts.label}>
//                     {ts.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <span className="text-xs text-muted-foreground">Key</span>
//             <Select value={keySig} onValueChange={setKeySig}>
//               <SelectTrigger className="h-7 w-[64px] text-xs">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 {KEY_SIGNATURES.map((k) => (
//                   <SelectItem key={k} value={k}>
//                     {k}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <span className="text-xs text-muted-foreground">Template</span>
//             <Select
//               value={template}
//               onValueChange={(v) => {
//                 setTemplate(v as StaveTemplate);
//                 setNotes([]);
//               }}
//             >
//               <SelectTrigger className="h-7 w-[108px] text-xs">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="lead-sheet">Lead Sheet</SelectItem>
//                 <SelectItem value="grand-staff">Grand Staff</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <span className="text-xs text-muted-foreground">BPM</span>
//             <input
//               type="number"
//               min={40}
//               max={240}
//               value={tempo}
//               onChange={(e) => setTempo(Number(e.target.value))}
//               className="h-7 w-14 px-2 rounded border border-border bg-background text-xs"
//             />
//           </div>

//           {isGrand && (
//             <>
//               <Separator orientation="vertical" className="h-5 shrink-0" />
//               <div className="flex items-center gap-1.5 shrink-0">
//                 <span className="text-xs text-muted-foreground">Drawing:</span>
//                 <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
//                   <button
//                     onClick={() => setActiveVoice("treble")}
//                     className={`px-2.5 py-1.5 flex items-center gap-1 transition-all
//                       ${activeVoice === "treble" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
//                   >
//                     <span className="text-base leading-none">𝄞</span> Right Hand
//                   </button>
//                   <button
//                     onClick={() => setActiveVoice("bass")}
//                     className={`px-2.5 py-1.5 flex items-center gap-1 border-l border-border transition-all
//                       ${activeVoice === "bass" ? "bg-purple-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
//                   >
//                     <span className="text-base leading-none">𝄢</span> Left Hand
//                   </button>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>

//         {/* ══ ROW 2: Note/Rest toolbar ══════════════════════════════════════ */}
//         <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/10 overflow-x-auto">
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
//             Notes
//           </span>
//           {noteTools.map(toolBtn)}
//           <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
//             Rests
//           </span>
//           {restTools.map(toolBtn)}

//           <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 className="h-9 px-3 text-xs gap-1.5 shrink-0"
//                 onClick={addBar}
//               >
//                 <Plus className="h-3 w-3" />
//                 Add Bar
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>Add one more bar to the piece</TooltipContent>
//           </Tooltip>

//           <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-9 w-9 shrink-0"
//                 onClick={undo}
//                 disabled={historyIdx <= 0}
//               >
//                 <Undo2 className="h-4 w-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>Undo</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-9 w-9 text-red-500 shrink-0"
//                 onClick={clear}
//               >
//                 <Trash2 className="h-4 w-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>Clear all</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 className="h-9 px-3 text-xs gap-1.5 shrink-0"
//                 onClick={exportPDF}
//               >
//                 <Download className="h-3 w-3" />
//                 PDF
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>Export current page as PDF</TooltipContent>
//           </Tooltip>

//           <Button
//             variant="outline"
//             size="sm"
//             className="h-9 px-3 text-xs gap-1.5 shrink-0"
//             onClick={isPlaying ? stop : play}
//           >
//             {isPlaying ? (
//               <>
//                 <Square className="h-3 w-3" />
//                 Stop
//               </>
//             ) : (
//               <>
//                 <Play className="h-3 w-3" />
//                 Play
//               </>
//             )}
//           </Button>

//           <Button
//             size="sm"
//             className="h-9 px-3 text-xs gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold shrink-0"
//             onClick={save}
//           >
//             <Save className="h-3 w-3" />
//             {savedMsg || "Save"}
//           </Button>

//           <div className="ml-auto flex items-center gap-2 shrink-0 pl-2">
//             {isGrand && (
//               <div
//                 className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
//                 ${activeVoice === "treble" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-purple-500/10 text-purple-400 border-purple-500/30"}`}
//               >
//                 <span>{activeVoice === "treble" ? "𝄞" : "𝄢"}</span>
//                 {activeVoice === "treble" ? "Right" : "Left"}
//               </div>
//             )}
//             <Badge variant="outline" className="text-[10px]">
//               {NOTE_TOOLS.find((t) => t.id === selectedTool)?.label}
//             </Badge>
//             {draggingId && (
//               <Badge variant="secondary" className="text-[10px] animate-pulse">
//                 Drag to repitch ↕
//               </Badge>
//             )}
//           </div>
//         </div>

//         {/* ══ ROW 3: Canvas + Metronome ════════════════════════════════════ */}
//         <div className="flex flex-1 overflow-hidden">
//           <div className="flex-1 overflow-auto p-6">
//             <div
//               className="bg-white dark:bg-zinc-900 rounded-xl shadow-inner border border-border p-4 overflow-x-auto select-none relative"
//               style={{ minHeight: 200 }}
//             >
//               <div ref={svgRef} style={{ display: "inline-block" }} />
//               {notes.length === 0 && (
//                 <p className="text-center text-sm text-muted-foreground mt-2 pointer-events-none">
//                   {isGrand
//                     ? `${activeVoice === "treble" ? "𝄞 Right Hand" : "𝄢 Left Hand"} active — click stave to add notes, drag notes up/down to repitch.`
//                     : "Select a note then click the stave. Drag placed notes up/down to change pitch."}
//                 </p>
//               )}
//             </div>

//             {notes.length > 0 && (
//               <p className="text-[10px] text-muted-foreground mt-1 ml-1">
//                 💡 Drag any note up/down to repitch · Click a note at its
//                 current pitch to change duration · Quavers auto-beam
//               </p>
//             )}

//             <div className="flex gap-2 mt-3 flex-wrap">
//               {Array.from({ length: barCount }, (_, i) => {
//                 const pct = Math.min(
//                   ((barBeats[i] ?? 0) / beatsPerBar(timeSig)) * 100,
//                   100,
//                 );
//                 return (
//                   <div key={i} className="flex flex-col items-center">
//                     <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
//                       <div
//                         className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-amber-400"}`}
//                         style={{ width: `${pct}%` }}
//                       />
//                     </div>
//                     <span className="text-[9px] text-muted-foreground mt-0.5">
//                       Bar {i + 1}
//                     </span>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="w-64 border-l p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
//             <MetronomeDrumTrack
//               tempo={tempo}
//               isPlaying={isPlaying}
//               timeSig={timeSig.label}
//             />
//           </div>
//         </div>
//       </div>
//     </TooltipProvider>
//   );
// }

// export default function CustomWritingPage() {
//   return (
//     <Suspense fallback={null}>
//       <CustomWritingPageInner />
//     </Suspense>
//   );
// }

"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from "vexflow";
import * as Tone from "tone";
import {
  Play,
  Square,
  Trash2,
  Save,
  Music,
  Undo2,
  Download,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NOTE_TOOLS,
  TIME_SIGNATURES,
  KEY_SIGNATURES,
  type NoteDuration,
  type TimeSig,
  type StaveTemplate,
  durationBeats,
  beatsPerBar,
  wouldOverflow,
} from "@/lib/notationUtils";
import MetronomeDrumTrack from "@/app/components/Metronomedrumtrack";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import jsPDF from "jspdf";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlacedNote {
  id: string;
  pitch: string;
  duration: string;
  isRest: boolean;
  barIndex: number;
  voice: "treble" | "bass";
}

// ── Layout constants ──────────────────────────────────────────────────────────
const STAVE_WIDTH = 300;
const STAVE_GAP = 0;
const STAVE_X_START = 20;
const TREBLE_Y = 40;
const BASS_Y = 150;
const TITLE_OFFSET = 40; // Space above first stave for the piece title

const VF_TO_TONE: Record<string, string> = {
  w: "1n",
  h: "2n",
  q: "4n",
  "8": "8n",
  "16": "16n",
  wr: "1n",
  hr: "2n",
  qr: "4n",
  "8r": "8n",
  "16r": "16n",
};

const TREBLE_SLOTS = [
  { pitch: "f/5", y: 0 },
  { pitch: "e/5", y: 5 },
  { pitch: "d/5", y: 10 },
  { pitch: "c/5", y: 15 },
  { pitch: "b/4", y: 20 },
  { pitch: "a/4", y: 25 },
  { pitch: "g/4", y: 30 },
  { pitch: "f/4", y: 35 },
  { pitch: "e/4", y: 40 },
  { pitch: "d/4", y: 45 },
  { pitch: "c/4", y: 50 },
];

const BASS_SLOTS = [
  { pitch: "a/3", y: 0 },
  { pitch: "g/3", y: 5 },
  { pitch: "f/3", y: 10 },
  { pitch: "e/3", y: 15 },
  { pitch: "d/3", y: 20 },
  { pitch: "c/3", y: 25 },
  { pitch: "b/2", y: 30 },
  { pitch: "a/2", y: 35 },
  { pitch: "g/2", y: 40 },
  { pitch: "f/2", y: 45 },
  { pitch: "e/2", y: 50 },
];

function nearestPitch(relY: number, slots: { pitch: string; y: number }[]) {
  return slots.reduce((best, s) =>
    Math.abs(s.y - relY) < Math.abs(best.y - relY) ? s : best,
  ).pitch;
}

interface NoteMetadata {
  id: string;
  isRest: boolean;
  voice: "treble" | "bass";
}

const vfNoteMeta = new WeakMap<StaveNote, NoteMetadata>();

// ── Component ─────────────────────────────────────────────────────────────────

function CustomWritingPageInner() {
  const [timeSig, setTimeSig] = useState<TimeSig>(TIME_SIGNATURES[0]);
  const [keySig, setKeySig] = useState("C");
  const [template, setTemplate] = useState<StaveTemplate>("lead-sheet");
  const [selectedTool, setSelectedTool] = useState<NoteDuration>("q");
  const [activeVoice, setActiveVoice] = useState<"treble" | "bass">("treble");
  const [notes, setNotes] = useState<PlacedNote[]>([]);
  const [barCount, setBarCount] = useState(4);
  const [history, setHistory] = useState<PlacedNote[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [tempo, setTempo] = useState(100);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [pieceTitle, setPieceTitle] = useState("My Custom Piece");

  const svgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  // Hidden canvas used only for PDF export
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Load draft from URL param (?load=<id>) ───────────────────────────────
  const searchParams = useSearchParams();
  const loadId = searchParams.get("load") as Id<"customDrafts"> | null;

  const draftToLoad = useQuery(
    api.customDrafts.getMyCustomDrafts,
    loadId ? undefined : "skip",
  );

  // Once the drafts arrive, find the matching one and restore state
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadId || loadedRef.current) return;
    const drafts = draftToLoad as Doc<"customDrafts">[] | undefined;
    const match = Array.isArray(drafts)
      ? drafts.find((d) => d._id === loadId)
      : null;
    if (!match) return;
    loadedRef.current = true;
    const ts =
      TIME_SIGNATURES.find((t) => t.label === match.timeSig) ??
      TIME_SIGNATURES[0];
    setTimeSig(ts);
    setKeySig(match.keySig ?? "C");
    setTemplate((match.template as StaveTemplate) ?? "lead-sheet");
    setBarCount(match.barCount ?? 4);
    setTempo(match.tempo ?? 100);
    setPieceTitle(match.title ?? "My Custom Piece");
    setNotes((match.notes as PlacedNote[]) ?? []);
    setHistory([(match.notes as PlacedNote[]) ?? []]);
    setHistoryIdx(0);
  }, [draftToLoad, loadId]);

  // ── Salamander Grand Piano sampler ────────────────────────────────────────
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const samplerReadyRef = useRef<Promise<void> | null>(null);

  const getSampler = (): Promise<void> => {
    if (samplerRef.current && samplerReadyRef.current)
      return samplerReadyRef.current;
    samplerRef.current = new Tone.Sampler({
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
    samplerReadyRef.current = Tone.loaded();
    return samplerReadyRef.current;
  };

  const saveCustomDraft = useMutation(api.customDrafts.saveCustomDraft);

  // ── Inline stateRef sync ──────────────────────────────────────────────────
  const stateRef = useRef({
    notes,
    timeSig,
    selectedTool,
    activeVoice,
    barCount,
    history,
    historyIdx,
  });
  stateRef.current = {
    notes,
    timeSig,
    selectedTool,
    activeVoice,
    barCount,
    history,
    historyIdx,
  };

  const isGrand = template === "grand-staff";

  useEffect(() => {
    if (!isGrand) setActiveVoice("treble");
  }, [isGrand]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const notesByBar = useMemo(() => {
    const map: Record<number, PlacedNote[]> = {};
    for (let i = 0; i < barCount; i++) map[i] = [];
    for (const n of notes)
      if (map[n.barIndex] !== undefined) map[n.barIndex].push(n);
    return map;
  }, [notes, barCount]);

  const barBeats = useMemo(() => {
    const filled: Record<number, number> = {};
    for (let i = 0; i < barCount; i++) {
      filled[i] = (notesByBar[i] ?? [])
        .filter((n) => n.voice === "treble")
        .reduce((acc, n) => acc + durationBeats(n.duration, timeSig), 0);
    }
    return filled;
  }, [notesByBar, barCount, timeSig]);

  // ── Drag-to-repitch ───────────────────────────────────────────────────────
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!draggingId) return;
      const svg = svgRef.current?.querySelector("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const y = e.clientY - rect.top;
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== draggingId || n.isRest) return n;
          const BARS_PER_ROW_D = 4;
          const SINGLE_ROW_H_D = isGrand ? 230 : 130;
          const ROW_GAP_D = 50;
          const noteRow = Math.floor(n.barIndex / BARS_PER_ROW_D);
          // ── Account for TITLE_OFFSET so drag snaps to correct pitch ──
          const rowTop =
            noteRow * (SINGLE_ROW_H_D + ROW_GAP_D) + 20 + TITLE_OFFSET;
          const staveTopY = n.voice === "treble" ? rowTop : rowTop + 110;
          const slots = n.voice === "treble" ? TREBLE_SLOTS : BASS_SLOTS;
          return { ...n, pitch: nearestPitch(y - staveTopY, slots) };
        }),
      );
    }
    function handleUp() {
      if (draggingId) {
        setNotes((prev) => {
          const { history: hist, historyIdx: hIdx } = stateRef.current;
          const newHist = [...hist.slice(0, hIdx + 1), prev];
          setHistory(newHist);
          setHistoryIdx(hIdx + 1);
          return prev;
        });
        setDraggingId(null);
      }
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingId]);

  // ── VexFlow render ────────────────────────────────────────────────────────
  const BARS_PER_ROW = 4;

  useEffect(() => {
    if (!svgRef.current) return;

    svgRef.current.innerHTML = "";

    const totalRows = Math.ceil(barCount / BARS_PER_ROW);
    const SINGLE_ROW_H = isGrand ? 230 : 130;
    const ROW_GAP = 50;

    const canvasW = STAVE_WIDTH * BARS_PER_ROW + STAVE_X_START + 20;
    // ── Extra height at top for the title ────────────────────────────────
    const canvasH = totalRows * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET;

    const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();

    const svgEl = svgRef.current.querySelector("svg");
    if (svgEl) {
      svgEl.style.width = canvasW + "px";
      svgEl.style.maxWidth = canvasW + "px";
    }

    // ── Draw piece title centred above the first stave row ────────────────
    if (pieceTitle) {
      // VexFlow's SVG context exposes setAttribute on the underlying element;
      // the easiest approach is to inject a <text> node directly into the SVG.
      const svgNode = svgRef.current.querySelector("svg");
      if (svgNode) {
        const titleEl = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        titleEl.setAttribute("x", String(canvasW / 2));
        titleEl.setAttribute("y", "26");
        titleEl.setAttribute("text-anchor", "middle");
        titleEl.setAttribute("font-family", "Arial, sans-serif");
        titleEl.setAttribute("font-size", "18");
        titleEl.setAttribute("font-weight", "bold");
        titleEl.setAttribute("fill", "#000000");
        titleEl.textContent = pieceTitle;
        svgNode.appendChild(titleEl);
      }
    }

    const buildVfNotes = (existing: PlacedNote[], clef: "treble" | "bass") => {
      // Only include notes that actually fit within the bar's beat capacity
      let used = 0;
      const fitting: PlacedNote[] = [];
      for (const n of existing) {
        const beats = durationBeats(n.duration, timeSig);
        if (used + beats <= beatsPerBar(timeSig) + 0.01) {
          fitting.push(n);
          used += beats;
        }
      }

      const vfn = fitting.map((n) => {
        const note = new StaveNote({
          clef,
          keys: [n.isRest ? "b/4" : n.pitch],
          duration: n.isRest ? `${n.duration}r` : n.duration,
          autoStem: true,
        });
        vfNoteMeta.set(note, { id: n.id, isRest: n.isRest, voice: clef });
        return note;
      });

      const remaining = beatsPerBar(timeSig) - used;
      if (remaining > 0.01) {
        const fillDuration =
          remaining >= 4 ? "wr" : remaining >= 2 ? "hr" : "qr";
        vfn.push(
          new StaveNote({ clef, keys: ["b/4"], duration: fillDuration }),
        );
      }

      return vfn;
    };

    const drawVoice = (vfNotes: StaveNote[], stave: Stave) => {
      try {
        const beamableNotes = vfNotes.filter((n) => {
          const meta = vfNoteMeta.get(n);
          return meta && !meta.isRest && ["8", "16"].includes(n.getDuration());
        });

        const beams: Beam[] = [];
        for (let i = 0; i < beamableNotes.length - 1; i += 2) {
          const group = beamableNotes.slice(i, i + 2);
          if (group.length === 2) {
            beams.push(new Beam(group));
          }
        }

        const v = new Voice({
          numBeats: timeSig.beats,
          beatValue: timeSig.beatValue,
        }).setStrict(false);
        v.addTickables(vfNotes);
        new Formatter().joinVoices([v]).format([v], STAVE_WIDTH - 70);
        v.draw(ctx, stave);

        beams.forEach((b) => b.setContext(ctx).draw());

        vfNotes.forEach((vfNote) => {
          const meta = vfNoteMeta.get(vfNote);
          if (!meta || meta.isRest) return;
          const el = vfNote.getSVGElement?.();
          if (!el) return;
          el.style.cursor = "ns-resize";
          const noteHead =
            (el.querySelector("path, use, ellipse") as SVGElement | null) ?? el;
          noteHead.setAttribute("data-note-id", meta.id);
          el.addEventListener("mousedown", (ev: Event) => {
            ev.stopPropagation();
            setDraggingId(meta.id);
          });
        });
      } catch {
        /* partial bar */
      }
    };

    for (let barIdx = 0; barIdx < barCount; barIdx++) {
      const row = Math.floor(barIdx / BARS_PER_ROW);
      const col = barIdx % BARS_PER_ROW;
      // ── All rows shifted down by TITLE_OFFSET ─────────────────────────
      const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET;
      const trebleY = rowTop;
      const bassY = rowTop + 110;
      const x = STAVE_X_START + col * STAVE_WIDTH;
      const firstInRow = col === 0;

      const treble = new Stave(x, trebleY, STAVE_WIDTH);
      if (firstInRow)
        treble
          .addClef("treble")
          .addTimeSignature(timeSig.label)
          .addKeySignature(keySig);
      treble.setContext(ctx).draw();

      let bass: Stave | null = null;
      if (isGrand) {
        bass = new Stave(x, bassY, STAVE_WIDTH);
        if (firstInRow)
          bass
            .addClef("bass")
            .addTimeSignature(timeSig.label)
            .addKeySignature(keySig);
        bass.setContext(ctx).draw();
      }

      const barNotes = notesByBar[barIdx] ?? [];
      drawVoice(
        buildVfNotes(
          barNotes.filter((n) => n.voice === "treble"),
          "treble",
        ),
        treble,
      );
      if (isGrand && bass)
        drawVoice(
          buildVfNotes(
            barNotes.filter((n) => n.voice === "bass"),
            "bass",
          ),
          bass,
        );
    }

    const svg = svgRef.current.querySelector("svg");
    if (svg) {
      svg.style.cursor = draggingId ? "ns-resize" : "crosshair";
      svg.addEventListener("click", handleStaveClick);
    }
    return () => {
      svg?.removeEventListener("click", handleStaveClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, timeSig, keySig, template, barCount, draggingId, pieceTitle]);

  // ── Playhead overlay ──────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;

    const old = svgRef.current?.querySelector("canvas.playhead-overlay");
    old?.remove();

    if (currentBeat <= 0 || !isPlaying) return;

    const canvas = document.createElement("canvas");
    canvas.className = "playhead-overlay";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;
    canvas.style.width = svg.clientWidth + "px";
    canvas.style.height = svg.clientHeight + "px";

    const container = svgRef.current?.parentElement;
    if (container) container.style.position = "relative";
    svgRef.current?.appendChild(canvas);

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const SINGLE_ROW_H = isGrand ? 230 : 130;
    const ROW_GAP = 50;
    const bpb = beatsPerBar(timeSig);
    const barIdx = Math.floor(currentBeat / bpb);
    const beatInBar = currentBeat % bpb;
    const row = Math.floor(barIdx / BARS_PER_ROW);
    const col = barIdx % BARS_PER_ROW;
    // ── Account for TITLE_OFFSET in playhead position ─────────────────
    const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET;
    const trebleY = rowTop;
    const bassY = rowTop + 110;

    const x =
      STAVE_X_START + col * STAVE_WIDTH + (beatInBar / bpb) * STAVE_WIDTH;

    const top = trebleY - 10;
    const bottom = isGrand ? bassY + 50 : trebleY + 55;

    canvasCtx.strokeStyle = "rgba(245, 158, 11, 0.85)";
    canvasCtx.lineWidth = 2;
    canvasCtx.shadowColor = "rgba(245, 158, 11, 0.4)";
    canvasCtx.shadowBlur = 6;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, top);
    canvasCtx.lineTo(x, bottom);
    canvasCtx.stroke();
  }, [currentBeat, isPlaying, timeSig, isGrand]);

  // ── Click handler ─────────────────────────────────────────────────────────
  function handleStaveClick(e: MouseEvent) {
    if (draggingId) return;
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const {
      notes: cur,
      timeSig: ts,
      selectedTool: tid,
      activeVoice: voice,
      barCount: bc,
      history: hist,
      historyIdx: hIdx,
    } = stateRef.current;

    const SINGLE_ROW_H = isGrand ? 230 : 130;
    const ROW_GAP = 50;
    const localX = clickX - STAVE_X_START;
    if (localX < 0) return;
    const col = Math.floor(localX / STAVE_WIDTH);
    if (col < 0 || col >= BARS_PER_ROW) return;
    // ── Subtract TITLE_OFFSET before computing which row was clicked ──
    const row = Math.floor(
      (clickY - 20 - TITLE_OFFSET) / (SINGLE_ROW_H + ROW_GAP),
    );
    if (row < 0) return;
    const barIdx = row * BARS_PER_ROW + col;
    if (barIdx < 0 || barIdx >= bc) return;

    // ── rowTop must also include TITLE_OFFSET ─────────────────────────
    const rowTop = row * (SINGLE_ROW_H + ROW_GAP) + 20 + TITLE_OFFSET;
    const trebleY = rowTop;
    const bassY = rowTop + 110;

    const tool = NOTE_TOOLS.find((t) => t.id === tid)!;
    const staveTopY = voice === "treble" ? trebleY : bassY;
    const relY = clickY - staveTopY;
    const pitch = tool.isRest
      ? "b/4"
      : nearestPitch(relY, voice === "treble" ? TREBLE_SLOTS : BASS_SLOTS);

    const clickedNoteId = (() => {
      const allNoteEls = svgRef.current?.querySelectorAll("[data-note-id]");
      if (!allNoteEls) return null;
      for (const el of Array.from(allNoteEls)) {
        const bbox = (el as SVGGraphicsElement).getBoundingClientRect?.();
        if (!bbox) continue;
        const elLeft = bbox.left - rect.left;
        const elTop = bbox.top - rect.top;
        const elRight = bbox.right - rect.left;
        const elBottom = bbox.bottom - rect.top;
        if (
          clickX >= elLeft - 6 &&
          clickX <= elRight + 6 &&
          clickY >= elTop - 6 &&
          clickY <= elBottom + 6
        ) {
          return el.getAttribute("data-note-id");
        }
      }
      return null;
    })();

    if (clickedNoteId && !tool.isRest) {
      const target = cur.find((n) => n.id === clickedNoteId);
      if (
        target &&
        target.barIndex === barIdx &&
        target.voice === voice &&
        !target.isRest
      ) {
        const updated = cur.map((n) =>
          n.id === clickedNoteId ? { ...n, duration: tool.vfDuration } : n,
        );
        const newHist = [...hist.slice(0, hIdx + 1), updated];
        setHistory(newHist);
        setHistoryIdx(hIdx + 1);
        setNotes(updated);
        return;
      }
    }

    const voiceNotes = cur.filter(
      (n) => n.barIndex === barIdx && n.voice === voice,
    );
    const filledBeats = voiceNotes.reduce(
      (acc, n) => acc + durationBeats(n.duration, ts),
      0,
    );
    let targetBar = barIdx;
    if (wouldOverflow(filledBeats, tool.vfDuration, ts)) {
      targetBar = barIdx + 1;
      if (targetBar >= bc) return;
    }

    const next = [
      ...cur,
      {
        id: `${Date.now()}-${Math.random()}`,
        pitch,
        duration: tool.vfDuration,
        isRest: tool.isRest,
        barIndex: targetBar,
        voice,
      },
    ];
    const newHist = [...hist.slice(0, hIdx + 1), next];
    setHistory(newHist);
    setHistoryIdx(hIdx + 1);
    setNotes(next);
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  const undo = () => {
    const { historyIdx: hIdx, history: hist } = stateRef.current;
    if (hIdx <= 0) return;
    setNotes(hist[hIdx - 1]);
    setHistoryIdx(hIdx - 1);
  };

  // ── Add Bar ───────────────────────────────────────────────────────────────
  const addBar = () => {
    setBarCount((prev) => prev + 1);
  };

  // ── Playback ──────────────────────────────────────────────────────────────
  const play = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCurrentBeat(0);
    await Tone.start();
    await getSampler();

    const sampler = samplerRef.current!;
    const now = Tone.now();
    const spb = 60 / tempo;
    let time = 0;

    const byBar: Record<number, PlacedNote[]> = {};
    for (let i = 0; i < barCount; i++) byBar[i] = [];
    for (const n of notes)
      if (byBar[n.barIndex] !== undefined) byBar[n.barIndex].push(n);

    const bpb = beatsPerBar(timeSig);

    for (let b = 0; b < barCount; b++) {
      const barStart = b * bpb;
      const barNotes = (byBar[b] ?? []).filter((n) => n.voice === "treble");
      const bassNotes = isGrand
        ? (byBar[b] ?? []).filter((n) => n.voice === "bass")
        : [];

      let beatOffset = 0;
      for (const n of barNotes) {
        const dur = durationBeats(n.duration, timeSig);
        const noteTime = time + beatOffset * spb;
        const beatPos = barStart + beatOffset;

        setTimeout(() => {
          setCurrentBeat(beatPos);
        }, noteTime * 1000);

        if (!n.isRest) {
          const [letter, octave] = n.pitch.split("/");
          sampler.triggerAttackRelease(
            `${letter.toUpperCase()}${octave}`,
            VF_TO_TONE[n.duration] ?? "4n",
            now + noteTime,
          );
        }
        beatOffset += dur;
      }

      let bassOffset = 0;
      for (const n of bassNotes) {
        const dur = durationBeats(n.duration, timeSig);
        const noteTime = time + bassOffset * spb;
        if (!n.isRest) {
          const [letter, octave] = n.pitch.split("/");
          sampler.triggerAttackRelease(
            `${letter.toUpperCase()}${octave}`,
            VF_TO_TONE[n.duration] ?? "4n",
            now + noteTime,
          );
        }
        bassOffset += dur;
      }

      time += bpb * spb;
    }

    setTimeout(
      () => {
        setIsPlaying(false);
        setCurrentBeat(0);
      },
      time * 1000 + 300,
    );
  };

  const stop = () => {
    samplerRef.current?.releaseAll();
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    try {
      await saveCustomDraft({
        title: pieceTitle,
        timeSig: timeSig.label,
        keySig,
        template,
        barCount,
        tempo,
        notes,
      });
      setSavedMsg("Saved ✓");
    } catch {
      localStorage.setItem(
        "custom-notation-draft",
        JSON.stringify({
          timeSig,
          keySig,
          template,
          notes,
          barCount,
          title: pieceTitle,
        }),
      );
      setSavedMsg("Saved locally ✓");
    }
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const clear = () => {
    const { historyIdx: hIdx, history: hist } = stateRef.current;
    setHistory([...hist.slice(0, hIdx + 1), []]);
    setHistoryIdx(hIdx + 1);
    setNotes([]);
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;

    const BARS_PER_ROW_E = 4;
    const isGrandE = template === "grand-staff";
    const totalRows = Math.ceil(barCount / BARS_PER_ROW_E);
    const rowHeight = isGrandE ? 230 : 130;
    const rowGap = 50;
    const PDF_TITLE_OFFSET = 50; // extra space at top of PDF canvas for title

    const canvasW = STAVE_WIDTH * BARS_PER_ROW_E + STAVE_X_START + 40;
    // ── Taller canvas to fit the title ────────────────────────────────
    const canvasH = totalRows * (rowHeight + rowGap) + 60 + PDF_TITLE_OFFSET;

    canvas.width = canvasW;
    canvas.height = canvasH;

    // ✅ Fill background BEFORE creating VexFlow renderer
    const raw = canvas.getContext("2d")!;
    raw.fillStyle = "#ffffff";
    raw.fillRect(0, 0, canvasW, canvasH);

    // ✅ Create VexFlow renderer — NOTE: do NOT draw title here because
    //    renderer.resize() calls clearRect internally and will wipe it.
    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(canvasW, canvasH);
    const ctx = renderer.getContext();

    const notesByBarE: Record<number, PlacedNote[]> = {};
    for (let i = 0; i < barCount; i++) notesByBarE[i] = [];
    notes.forEach((n) => {
      if (notesByBarE[n.barIndex] !== undefined)
        notesByBarE[n.barIndex].push(n);
    });

    for (let barIdx = 0; barIdx < barCount; barIdx++) {
      const row = Math.floor(barIdx / BARS_PER_ROW_E);
      const col = barIdx % BARS_PER_ROW_E;
      const x = STAVE_X_START + col * STAVE_WIDTH;
      // ── All stave rows shifted down by PDF_TITLE_OFFSET ───────────
      const y = row * (rowHeight + rowGap) + 30 + PDF_TITLE_OFFSET;

      const treble = new Stave(x, y, STAVE_WIDTH);
      if (col === 0)
        treble
          .addClef("treble")
          .addTimeSignature(timeSig.label)
          .addKeySignature(keySig);
      treble.setContext(ctx).draw();

      let bass: Stave | null = null;
      if (isGrandE) {
        bass = new Stave(x, y + 110, STAVE_WIDTH);
        if (col === 0)
          bass
            .addClef("bass")
            .addTimeSignature(timeSig.label)
            .addKeySignature(keySig);
        bass.setContext(ctx).draw();
      }

      const barNotes = notesByBarE[barIdx] ?? [];

      const renderVoice = (
        voiceNotes: PlacedNote[],
        clef: "treble" | "bass",
        stave: Stave,
      ) => {
        const used = voiceNotes.reduce(
          (acc, n) => acc + durationBeats(n.duration, timeSig),
          0,
        );
        const vfNotes = voiceNotes.map(
          (n) =>
            new StaveNote({
              clef,
              keys: [n.isRest ? (clef === "bass" ? "d/3" : "b/4") : n.pitch],
              duration: n.isRest ? `${n.duration}r` : n.duration,
              autoStem: true,
            }),
        );
        if (beatsPerBar(timeSig) - used > 0.01)
          vfNotes.push(new StaveNote({ clef, keys: ["b/4"], duration: "wr" }));
        try {
          const v = new Voice({
            numBeats: timeSig.beats,
            beatValue: timeSig.beatValue,
          })
            .setStrict(false)
            .addTickables(vfNotes);
          new Formatter().joinVoices([v]).format([v], STAVE_WIDTH - 70);
          v.draw(ctx, stave);

          const beamable = vfNotes.filter(
            (n) => !n.isRest && ["8", "16"].includes(n.getDuration()),
          );
          for (let i = 0; i < beamable.length - 1; i += 2) {
            const group = beamable.slice(i, i + 2);
            if (group.length === 2) {
              new Beam(group).setContext(ctx).draw();
            }
          }
        } catch {
          /* partial bar */
        }
      };

      renderVoice(
        barNotes.filter((n) => n.voice === "treble"),
        "treble",
        treble,
      );
      if (isGrandE && bass)
        renderVoice(
          barNotes.filter((n) => n.voice === "bass"),
          "bass",
          bass,
        );
    }

    // ── Draw piece title AFTER all VexFlow rendering ─────────────────────
    // renderer.resize() calls clearRect internally — drawing the title last
    // guarantees it is never wiped before the canvas snapshot is taken.
    if (pieceTitle) {
      raw.font = "bold 20px Arial, sans-serif";
      raw.fillStyle = "#000000";
      raw.textAlign = "center";
      raw.fillText(pieceTitle, canvasW / 2, PDF_TITLE_OFFSET - 14);
      raw.textAlign = "left";
    }

    // Export canvas to PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4",
    });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgH = (canvasH * pw) / canvasW;

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

    pdf.save(`${pieceTitle.replace(/\s+/g, "-")}.pdf`);
  }, [notes, barCount, template, timeSig, keySig, pieceTitle]);

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const toolBtn = (tool: (typeof NOTE_TOOLS)[0]) => (
    <Tooltip key={tool.id}>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            setSelectedTool(tool.id);
            stateRef.current.selectedTool = tool.id;
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-all shrink-0
            ${
              selectedTool === tool.id
                ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                : "border-border hover:border-amber-400/50 hover:bg-muted/50"
            }`}
        >
          <span className="text-xl leading-none">{tool.symbol}</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">
            {tool.label.split(" ")[0]}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tool.label}</TooltipContent>
    </Tooltip>
  );

  const noteTools = NOTE_TOOLS.filter((t) => !t.isRest);
  const restTools = NOTE_TOOLS.filter((t) => t.isRest);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
        {/* Hidden canvas for PDF export */}
        <canvas ref={exportCanvasRef} style={{ display: "none" }} />

        {/* ══ ROW 1: Settings + Actions ════════════════════════════════════ */}
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30 min-h-[52px] flex-wrap">
          <Music className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="font-semibold text-sm shrink-0">
            Custom Notation
          </span>

          <Separator orientation="vertical" className="h-5 shrink-0" />

          <input
            type="text"
            value={pieceTitle}
            onChange={(e) => setPieceTitle(e.target.value)}
            className="h-7 px-2 rounded border border-border bg-background text-xs w-36 shrink-0"
            placeholder="Piece title..."
          />

          <Separator orientation="vertical" className="h-5 shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">Time</span>
            <Select
              value={timeSig.label}
              onValueChange={(v) => {
                setTimeSig(TIME_SIGNATURES.find((t) => t.label === v)!);
                setNotes([]);
              }}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SIGNATURES.map((ts) => (
                  <SelectItem key={ts.label} value={ts.label}>
                    {ts.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">Key</span>
            <Select value={keySig} onValueChange={setKeySig}>
              <SelectTrigger className="h-7 w-[64px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEY_SIGNATURES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">Template</span>
            <Select
              value={template}
              onValueChange={(v) => {
                setTemplate(v as StaveTemplate);
                setNotes([]);
              }}
            >
              <SelectTrigger className="h-7 w-[108px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead-sheet">Lead Sheet</SelectItem>
                <SelectItem value="grand-staff">Grand Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">BPM</span>
            <input
              type="number"
              min={40}
              max={240}
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
              className="h-7 w-14 px-2 rounded border border-border bg-background text-xs"
            />
          </div>

          {isGrand && (
            <>
              <Separator orientation="vertical" className="h-5 shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Drawing:</span>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                  <button
                    onClick={() => setActiveVoice("treble")}
                    className={`px-2.5 py-1.5 flex items-center gap-1 transition-all
                      ${activeVoice === "treble" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
                  >
                    <span className="text-base leading-none">𝄞</span> Right Hand
                  </button>
                  <button
                    onClick={() => setActiveVoice("bass")}
                    className={`px-2.5 py-1.5 flex items-center gap-1 border-l border-border transition-all
                      ${activeVoice === "bass" ? "bg-purple-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
                  >
                    <span className="text-base leading-none">𝄢</span> Left Hand
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ══ ROW 2: Note/Rest toolbar ══════════════════════════════════════ */}
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/10 overflow-x-auto">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
            Notes
          </span>
          {noteTools.map(toolBtn)}
          <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
            Rests
          </span>
          {restTools.map(toolBtn)}

          <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs gap-1.5 shrink-0"
                onClick={addBar}
              >
                <Plus className="h-3 w-3" />
                Add Bar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add one more bar to the piece</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={undo}
                disabled={historyIdx <= 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-red-500 shrink-0"
                onClick={clear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs gap-1.5 shrink-0"
                onClick={exportPDF}
              >
                <Download className="h-3 w-3" />
                PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export current page as PDF</TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs gap-1.5 shrink-0"
            onClick={isPlaying ? stop : play}
          >
            {isPlaying ? (
              <>
                <Square className="h-3 w-3" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Play
              </>
            )}
          </Button>

          <Button
            size="sm"
            className="h-9 px-3 text-xs gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold shrink-0"
            onClick={save}
          >
            <Save className="h-3 w-3" />
            {savedMsg || "Save"}
          </Button>

          <div className="ml-auto flex items-center gap-2 shrink-0 pl-2">
            {isGrand && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                ${activeVoice === "treble" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-purple-500/10 text-purple-400 border-purple-500/30"}`}
              >
                <span>{activeVoice === "treble" ? "𝄞" : "𝄢"}</span>
                {activeVoice === "treble" ? "Right" : "Left"}
              </div>
            )}
            <Badge variant="outline" className="text-[10px]">
              {NOTE_TOOLS.find((t) => t.id === selectedTool)?.label}
            </Badge>
            {draggingId && (
              <Badge variant="secondary" className="text-[10px] animate-pulse">
                Drag to repitch ↕
              </Badge>
            )}
          </div>
        </div>

        {/* ══ ROW 3: Canvas + Metronome ════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            <div
              className="bg-white dark:bg-zinc-900 rounded-xl shadow-inner border border-border p-4 overflow-x-auto select-none relative"
              style={{ minHeight: 200 }}
            >
              <div ref={svgRef} style={{ display: "inline-block" }} />
              {notes.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2 pointer-events-none">
                  {isGrand
                    ? `${activeVoice === "treble" ? "𝄞 Right Hand" : "𝄢 Left Hand"} active — click stave to add notes, drag notes up/down to repitch.`
                    : "Select a note then click the stave. Drag placed notes up/down to change pitch."}
                </p>
              )}
            </div>

            {notes.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                💡 Drag any note up/down to repitch · Click a note at its
                current pitch to change duration · Quavers auto-beam
              </p>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {Array.from({ length: barCount }, (_, i) => {
                const pct = Math.min(
                  ((barBeats[i] ?? 0) / beatsPerBar(timeSig)) * 100,
                  100,
                );
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      Bar {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-64 border-l p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            <MetronomeDrumTrack
              tempo={tempo}
              isPlaying={isPlaying}
              timeSig={timeSig.label}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function CustomWritingPage() {
  return (
    <Suspense fallback={null}>
      <CustomWritingPageInner />
    </Suspense>
  );
}
