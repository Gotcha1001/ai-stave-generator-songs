// // app/studio/midi-record/page.tsx
// "use client";

// import { useMidiRecorder } from "@/hooks/useMidiRecorder";
// import Staff from "@/app/components/Staff"; // your VexFlow component – adapt props if needed
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { useState } from "react";
// import { musicNoteToVexNote } from "@/lib/musicTheory";
// import { NoteType } from "@/lib/musicGenerator";

// export default function MidiRecordPage() {
//   const {
//     isRecording,
//     start,
//     stop,
//     currentBars,
//     tempo,
//     setTempo,
//     timeSig,
//     setTimeSig,
//     rightHandOnly,
//     setRightHandOnly,
//     title,
//     setTitle,
//   } = useMidiRecorder();

//   const createRecording = useMutation(api.midi.createRecording);
//   const [saving, setSaving] = useState(false);

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       await createRecording({
//         title,
//         tempo,
//         timeSig,
//         bars: currentBars,
//         rightHandOnly,
//       });
//       alert("Recording saved!");
//     } catch (err) {
//       console.error(err);
//       alert("Failed to save");
//     }
//     setSaving(false);
//   };

//   // Flatten bars into right/left for Staff.tsx (adapt as needed)
//   // Flatten bars into right/left for Staff.tsx
//   const allRight: NoteType[] = currentBars.flatMap((b) =>
//     (b.notes || []).map(musicNoteToVexNote),
//   );

//   const allLeft: NoteType[] = currentBars.flatMap((b) =>
//     (b.leftNotes || []).map(musicNoteToVexNote),
//   );

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-3xl font-bold mb-6">MIDI Keyboard Recorder</h1>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//         <div>
//           <Label>Title</Label>
//           <Input value={title} onChange={(e) => setTitle(e.target.value)} />
//         </div>

//         <div>
//           <Label>Tempo (BPM)</Label>
//           <Input
//             type="number"
//             value={tempo}
//             onChange={(e) => setTempo(Number(e.target.value))}
//             min={40}
//             max={240}
//           />
//         </div>

//         <div>
//           <Label>Time Signature</Label>
//           <Select value={timeSig} onValueChange={setTimeSig}>
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="4/4">4/4</SelectItem>
//               <SelectItem value="3/4">3/4</SelectItem>
//               <SelectItem value="6/8">6/8</SelectItem>
//               <SelectItem value="2/4">2/4</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="col-span-3">
//           <Label>Notation Mode</Label>
//           <Select
//             value={rightHandOnly ? "lead" : "grand"}
//             onValueChange={(v) => setRightHandOnly(v === "lead")}
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="lead">Lead Sheet (melody + chords)</SelectItem>
//               <SelectItem value="grand">
//                 Grand Staff (left + right hand)
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div className="flex gap-4 mb-8">
//         <Button onClick={start} disabled={isRecording}>
//           Start Recording
//         </Button>
//         <Button variant="destructive" onClick={stop} disabled={!isRecording}>
//           Stop
//         </Button>
//         <Button
//           onClick={handleSave}
//           disabled={saving || currentBars.length === 0 || isRecording}
//         >
//           {saving ? "Saving..." : "Save Recording"}
//         </Button>
//       </div>

//       <div className="border rounded p-4 bg-muted/30 min-h-[400px]">
//         {currentBars.length > 0 ? (
//           <Staff
//             right={allRight} // adapt your Staff props
//             left={allLeft}
//             currentBeat={0}
//             timeSig={timeSig}
//           />
//         ) : (
//           <div className="flex items-center justify-center h-64 text-muted-foreground">
//             Play your MIDI keyboard after pressing Start
//           </div>
//         )}
//       </div>

//       <p className="text-sm text-muted-foreground mt-4">
//         Best in Chrome or Edge. Safari does not support Web MIDI yet.
//       </p>
//     </div>
//   );
// }

// app/studio/midi-record/page.tsx
// "use client";

// import { useMidiRecorder } from "@/hooks/useMidiRecorder";
// import Staff from "@/app/components/Staff";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { useState, useEffect, useRef } from "react";
// import { musicNoteToVexNote } from "@/lib/musicTheory";
// import { NoteType } from "@/lib/musicGenerator";

// interface MidiDevice {
//   id: string;
//   name: string;
//   manufacturer: string;
//   state: "connected" | "disconnected";
// }

// // ── FIX 1: `supported` computed via lazy useState initializer, never set
// //    synchronously inside an effect body ──────────────────────────────────────
// function useMidiDevices() {
//   const [supported] = useState<boolean>(
//     () => typeof navigator !== "undefined" && "requestMIDIAccess" in navigator,
//   );
//   const [devices, setDevices] = useState<MidiDevice[]>([]);
//   const [permission, setPermission] = useState<
//     "pending" | "granted" | "denied"
//   >(
//     // If not supported, start as "denied" so no effect fires
//     () =>
//       typeof navigator !== "undefined" && "requestMIDIAccess" in navigator
//         ? "pending"
//         : "denied",
//   );

//   useEffect(() => {
//     if (!supported) return; // nothing to do — permission already "denied"

//     const refresh = (access: MIDIAccess) => {
//       const list: MidiDevice[] = [];
//       access.inputs.forEach((input) => {
//         list.push({
//           id: input.id,
//           name: input.name ?? "Unknown Device",
//           manufacturer: input.manufacturer ?? "",
//           state: input.state as "connected" | "disconnected",
//         });
//       });
//       setDevices(list); // ✅ async callback — fine
//     };

//     navigator
//       .requestMIDIAccess({ sysex: false })
//       .then((access) => {
//         setPermission("granted"); // ✅ inside .then()
//         refresh(access);
//         access.onstatechange = () => refresh(access);
//       })
//       .catch(() => setPermission("denied")); // ✅ inside .catch()
//   }, [supported]);

//   return { devices, supported, permission };
// }

// function DevicePill({ device }: { device: MidiDevice }) {
//   const connected = device.state === "connected";
//   const isFocusrite =
//     device.name.toLowerCase().includes("focusrite") ||
//     device.manufacturer.toLowerCase().includes("focusrite");

//   return (
//     <div
//       className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
//         connected
//           ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
//           : "bg-zinc-900 border-zinc-700 text-zinc-500"
//       }`}
//     >
//       <span
//         className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
//       />
//       <span className="truncate max-w-[200px]">
//         {isFocusrite ? "🎛 " : "🎹 "}
//         {device.name}
//       </span>
//       {device.manufacturer && (
//         <span className="opacity-50 hidden sm:inline">
//           · {device.manufacturer}
//         </span>
//       )}
//     </div>
//   );
// }

// // ── FIX 2: `setBeat(false)` moved to cleanup return — never called
// //    synchronously in the effect body ─────────────────────────────────────────
// function MetronomeLight({
//   isRecording,
//   tempo,
// }: {
//   isRecording: boolean;
//   tempo: number;
// }) {
//   const [beat, setBeat] = useState(false);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   useEffect(() => {
//     if (!isRecording) {
//       // Only clear the timer here — DO NOT call setBeat synchronously
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//       return;
//     }

//     const ms = (60 / tempo) * 1000;
//     intervalRef.current = setInterval(() => setBeat((b) => !b), ms); // ✅ async

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//       setBeat(false); // ✅ cleanup function — allowed
//     };
//   }, [isRecording, tempo]);

//   return (
//     <span
//       className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
//         beat && isRecording
//           ? "bg-red-400 shadow-md shadow-red-500/60 scale-125"
//           : "bg-zinc-600"
//       }`}
//     />
//   );
// }

// function SavedRecordings() {
//   const recordings = useQuery(api.midi.getUserRecordings);
//   const [expanded, setExpanded] = useState(false);
//   if (!recordings?.length) return null;
//   const shown = expanded ? recordings : recordings.slice(0, 4);

//   return (
//     <section className="mt-10">
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
//           Saved Recordings
//         </h2>
//         <span className="text-xs text-zinc-600">{recordings.length} total</span>
//       </div>
//       <div className="space-y-2">
//         {shown.map((rec) => (
//           <div
//             key={rec._id}
//             className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
//           >
//             <div className="flex items-center gap-3">
//               <span className="text-base">🎵</span>
//               <div>
//                 <p className="text-sm font-medium text-zinc-200">{rec.title}</p>
//                 <p className="text-xs text-zinc-500">
//                   {rec.timeSig} · {rec.tempo} BPM · {rec.bars.length} bar
//                   {rec.bars.length !== 1 ? "s" : ""} ·{" "}
//                   {new Date(rec.createdAt).toLocaleDateString()}
//                 </p>
//               </div>
//             </div>
//             <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
//               {rec.rightHandOnly ? "Lead" : "Grand"}
//             </span>
//           </div>
//         ))}
//       </div>
//       {recordings.length > 4 && (
//         <button
//           onClick={() => setExpanded((v) => !v)}
//           className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
//         >
//           {expanded ? "Show less ↑" : `Show ${recordings.length - 4} more ↓`}
//         </button>
//       )}
//     </section>
//   );
// }

// export default function MidiRecordPage() {
//   const {
//     isRecording,
//     start,
//     stop,
//     currentBars,
//     tempo,
//     setTempo,
//     timeSig,
//     setTimeSig,
//     rightHandOnly,
//     setRightHandOnly,
//     title,
//     setTitle,
//   } = useMidiRecorder();

//   const { devices, supported, permission } = useMidiDevices();
//   const createRecording = useMutation(api.midi.createRecording);
//   const [saving, setSaving] = useState(false);
//   const [saveSuccess, setSaveSuccess] = useState(false);

//   const connectedDevices = devices.filter((d) => d.state === "connected");
//   const hasDevice = connectedDevices.length > 0;

//   const handleSave = async () => {
//     if (!currentBars.length) return;
//     setSaving(true);
//     try {
//       await createRecording({
//         title,
//         tempo,
//         timeSig,
//         bars: currentBars,
//         rightHandOnly,
//       });
//       setSaveSuccess(true);
//       setTimeout(() => setSaveSuccess(false), 3000);
//     } catch (err) {
//       console.error(err);
//       alert("Failed to save recording.");
//     }
//     setSaving(false);
//   };

//   const allRight: NoteType[] = currentBars.flatMap((b) =>
//     (b.notes || []).map(musicNoteToVexNote),
//   );
//   const allLeft: NoteType[] = currentBars.flatMap((b) =>
//     (b.leftNotes || []).map(musicNoteToVexNote),
//   );
//   const noteCount = allRight.length + allLeft.length;

//   return (
//     <div className="min-h-screen bg-zinc-950 text-zinc-100">
//       <div className="max-w-5xl mx-auto px-6 py-10">
//         <div className="mb-8">
//           <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
//             MIDI Recorder
//           </h1>
//           <p className="text-sm text-zinc-500">
//             Connect a MIDI keyboard or audio interface and play — notation
//             appears in real time.
//           </p>
//         </div>

//         {!supported && (
//           <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-sm">
//             <span className="text-lg">⚠️</span>
//             <div>
//               <p className="font-semibold">Web MIDI not supported</p>
//               <p className="text-amber-400/70 text-xs mt-0.5">
//                 Use Chrome or Edge — Safari doesn&apos;t support Web MIDI.
//               </p>
//             </div>
//           </div>
//         )}
//         {supported && permission === "denied" && (
//           <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
//             <span className="text-lg">🔒</span>
//             <div>
//               <p className="font-semibold">MIDI access denied</p>
//               <p className="text-red-400/70 text-xs mt-0.5">
//                 Allow MIDI in browser settings, then reload.
//               </p>
//             </div>
//           </div>
//         )}
//         {supported && permission === "granted" && !hasDevice && (
//           <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm">
//             <span className="text-lg">🔌</span>
//             <div>
//               <p className="font-semibold text-zinc-300">
//                 No MIDI device detected
//               </p>
//               <p className="text-xs mt-0.5">
//                 Plug in your keyboard or Focusrite interface — it will appear
//                 here automatically.
//               </p>
//             </div>
//           </div>
//         )}

//         {hasDevice && (
//           <div className="mb-6">
//             <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">
//               Connected Devices
//             </p>
//             <div className="flex flex-wrap gap-2">
//               {connectedDevices.map((d) => (
//                 <DevicePill key={d.id} device={d} />
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           <div className="lg:col-span-2">
//             <Label className="text-xs text-zinc-400 mb-1.5 block">Title</Label>
//             <Input
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               placeholder="My recording…"
//               className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500"
//             />
//           </div>
//           <div>
//             <Label className="text-xs text-zinc-400 mb-1.5 block">
//               Tempo (BPM)
//             </Label>
//             <Input
//               type="number"
//               value={tempo}
//               onChange={(e) => setTempo(Number(e.target.value))}
//               min={40}
//               max={240}
//               className="bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-violet-500"
//             />
//           </div>
//           <div>
//             <Label className="text-xs text-zinc-400 mb-1.5 block">
//               Time Signature
//             </Label>
//             <Select
//               value={timeSig}
//               onValueChange={setTimeSig}
//               disabled={isRecording}
//             >
//               <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent className="bg-zinc-900 border-zinc-700">
//                 {["4/4", "3/4", "6/8", "2/4"].map((s) => (
//                   <SelectItem
//                     key={s}
//                     value={s}
//                     className="text-zinc-200 focus:bg-zinc-800"
//                   >
//                     {s}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//           <div className="sm:col-span-2 lg:col-span-4">
//             <Label className="text-xs text-zinc-400 mb-1.5 block">
//               Notation Mode
//             </Label>
//             <Select
//               value={rightHandOnly ? "lead" : "grand"}
//               onValueChange={(v) => setRightHandOnly(v === "lead")}
//               disabled={isRecording}
//             >
//               <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent className="bg-zinc-900 border-zinc-700">
//                 <SelectItem
//                   value="lead"
//                   className="text-zinc-200 focus:bg-zinc-800"
//                 >
//                   🎼 Lead Sheet — single treble staff (melody only)
//                 </SelectItem>
//                 <SelectItem
//                   value="grand"
//                   className="text-zinc-200 focus:bg-zinc-800"
//                 >
//                   🎹 Grand Staff — treble + bass (split at middle C)
//                 </SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         <div className="flex items-center gap-3 mb-8 flex-wrap">
//           <button
//             onClick={isRecording ? stop : start}
//             disabled={!supported || permission === "denied"}
//             className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
//               isRecording
//                 ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40"
//                 : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
//             }`}
//           >
//             <MetronomeLight isRecording={isRecording} tempo={tempo} />
//             {isRecording ? "Stop Recording" : "Start Recording"}
//           </button>
//           <Button
//             onClick={handleSave}
//             disabled={saving || !currentBars.length || isRecording}
//             variant="outline"
//             className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
//           >
//             {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "Save"}
//           </Button>
//           {currentBars.length > 0 && !isRecording && (
//             <Button
//               onClick={() => window.location.reload()}
//               variant="ghost"
//               className="text-zinc-600 hover:text-zinc-400 text-sm"
//             >
//               Clear
//             </Button>
//           )}
//           {noteCount > 0 && (
//             <span className="ml-auto text-xs text-zinc-600">
//               {currentBars.length} bar{currentBars.length !== 1 ? "s" : ""} ·{" "}
//               {noteCount} note{noteCount !== 1 ? "s" : ""}
//             </span>
//           )}
//         </div>

//         <div
//           className={`rounded-2xl border overflow-hidden transition-colors ${
//             isRecording
//               ? "border-red-800/50 bg-zinc-900/80 shadow-inner shadow-red-950/20"
//               : "border-zinc-800 bg-zinc-900/50"
//           }`}
//         >
//           <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
//             <span className="text-xs text-zinc-500 font-medium">Notation</span>
//             {isRecording && (
//               <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
//                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
//                 Recording
//               </span>
//             )}
//           </div>
//           <div className="p-4 overflow-x-auto min-h-[340px]">
//             {currentBars.length > 0 ? (
//               <Staff
//                 right={allRight}
//                 left={allLeft}
//                 currentBeat={0}
//                 timeSig={timeSig}
//               />
//             ) : (
//               <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600 select-none">
//                 <span className="text-5xl">🎹</span>
//                 <p className="text-sm">
//                   {permission === "granted"
//                     ? hasDevice
//                       ? "Press Start Recording, then play"
//                       : "Connect a MIDI device to begin"
//                     : "Grant MIDI access to get started"}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//         <details className="mt-4 group">
//           <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors select-none list-none flex items-center gap-1.5">
//             <span className="group-open:rotate-90 transition-transform inline-block text-[10px]">
//               ▶
//             </span>
//             Using a Focusrite or other audio interface?
//           </summary>
//           <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-2 leading-relaxed">
//             <p>
//               <strong className="text-zinc-300">
//                 Focusrite Scarlett / Solo / 2i2 —
//               </strong>{" "}
//               connect your keyboard via MIDI DIN-5 cable or USB. Appears as a
//               MIDI input in Chrome automatically — no driver needed.
//             </p>
//             <p>
//               <strong className="text-zinc-300">USB keyboards</strong> (Roland,
//               Arturia, Akai…) — connect directly via USB. Appears in the device
//               list within seconds.
//             </p>
//             <p>
//               <strong className="text-zinc-300">Browser requirement —</strong>{" "}
//               Web MIDI only works in <strong>Chrome</strong> or{" "}
//               <strong>Edge</strong>. Safari and Firefox are not supported.
//             </p>
//           </div>
//         </details>

//         <SavedRecordings />
//       </div>
//     </div>
//   );
// }

"use client";

import { useMidiRecorder } from "@/hooks/useMidiRecorder";
import Staff from "@/app/components/Staff";
import MetronomeDrumTrack from "@/app/components/Metronomedrumtrack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { musicNoteToVexNote } from "@/lib/musicTheory";
import { NoteType } from "@/lib/musicGenerator";

interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: "connected" | "disconnected";
}

function useMidiDevices() {
  const [supported] = useState<boolean>(
    () => typeof navigator !== "undefined" && "requestMIDIAccess" in navigator,
  );
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [permission, setPermission] = useState<
    "pending" | "granted" | "denied"
  >(() =>
    typeof navigator !== "undefined" && "requestMIDIAccess" in navigator
      ? "pending"
      : "denied",
  );

  useEffect(() => {
    if (!supported) return;
    const refresh = (access: MIDIAccess) => {
      const list: MidiDevice[] = [];
      access.inputs.forEach((input) => {
        list.push({
          id: input.id,
          name: input.name ?? "Unknown Device",
          manufacturer: input.manufacturer ?? "",
          state: input.state as "connected" | "disconnected",
        });
      });
      setDevices(list);
    };
    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        setPermission("granted");
        refresh(access);
        access.onstatechange = () => refresh(access);
      })
      .catch(() => setPermission("denied"));
  }, [supported]);

  return { devices, supported, permission };
}

function DevicePill({ device }: { device: MidiDevice }) {
  const connected = device.state === "connected";
  const isFocusrite =
    device.name.toLowerCase().includes("focusrite") ||
    device.manufacturer.toLowerCase().includes("focusrite");

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        connected
          ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
          : "bg-zinc-900 border-zinc-700 text-zinc-500"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
      />
      <span className="truncate max-w-[200px]">
        {isFocusrite ? "🎛 " : "🎹 "}
        {device.name}
      </span>
      {device.manufacturer && (
        <span className="opacity-50 hidden sm:inline">
          · {device.manufacturer}
        </span>
      )}
    </div>
  );
}

// Visual beat light on the record button — purely cosmetic
function MetronomeLight({
  isRecording,
  tempo,
}: {
  isRecording: boolean;
  tempo: number;
}) {
  const [beat, setBeat] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRecording) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const ms = (60 / tempo) * 1000;
    intervalRef.current = setInterval(() => setBeat((b) => !b), ms);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBeat(false);
    };
  }, [isRecording, tempo]);

  return (
    <span
      className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
        beat && isRecording
          ? "bg-red-400 shadow-md shadow-red-500/60 scale-125"
          : "bg-zinc-600"
      }`}
    />
  );
}

function SavedRecordings() {
  const recordings = useQuery(api.midi.getUserRecordings);
  const [expanded, setExpanded] = useState(false);
  if (!recordings?.length) return null;
  const shown = expanded ? recordings : recordings.slice(0, 4);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Saved Recordings
        </h2>
        <span className="text-xs text-zinc-600">{recordings.length} total</span>
      </div>
      <div className="space-y-2">
        {shown.map((rec) => (
          <div
            key={rec._id}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🎵</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{rec.title}</p>
                <p className="text-xs text-zinc-500">
                  {rec.timeSig} · {rec.tempo} BPM · {rec.bars.length} bar
                  {rec.bars.length !== 1 ? "s" : ""} ·{" "}
                  {new Date(rec.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
              {rec.rightHandOnly ? "Lead" : "Grand"}
            </span>
          </div>
        ))}
      </div>
      {recordings.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? "Show less ↑" : `Show ${recordings.length - 4} more ↓`}
        </button>
      )}
    </section>
  );
}

export default function MidiRecordPage() {
  const {
    isRecording,
    start,
    stop,
    currentBars,
    tempo,
    setTempo,
    timeSig,
    setTimeSig,
    rightHandOnly,
    setRightHandOnly,
    title,
    setTitle,
    samplerReady, // ← from updated useMidiRecorder
  } = useMidiRecorder();

  const { devices, supported, permission } = useMidiDevices();
  const createRecording = useMutation(api.midi.createRecording);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const connectedDevices = devices.filter((d) => d.state === "connected");
  const hasDevice = connectedDevices.length > 0;

  const handleSave = async () => {
    if (!currentBars.length) return;
    setSaving(true);
    try {
      await createRecording({
        title,
        tempo,
        timeSig,
        bars: currentBars,
        rightHandOnly,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save recording.");
    }
    setSaving(false);
  };

  const allRight: NoteType[] = currentBars.flatMap((b) =>
    (b.notes || []).map(musicNoteToVexNote),
  );
  const allLeft: NoteType[] = currentBars.flatMap((b) =>
    (b.leftNotes || []).map(musicNoteToVexNote),
  );
  const noteCount = allRight.length + allLeft.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            MIDI Recorder
          </h1>
          <p className="text-sm text-zinc-500">
            Connect a MIDI keyboard or audio interface and play — notation
            appears in real time.
          </p>
        </div>

        {/* ── Browser / permission banners ────────────────────────────────── */}
        {!supported && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-sm">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Web MIDI not supported</p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Use Chrome or Edge — Safari doesn&apos;t support Web MIDI.
              </p>
            </div>
          </div>
        )}
        {supported && permission === "denied" && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            <span className="text-lg">🔒</span>
            <div>
              <p className="font-semibold">MIDI access denied</p>
              <p className="text-red-400/70 text-xs mt-0.5">
                Allow MIDI in browser settings, then reload.
              </p>
            </div>
          </div>
        )}
        {supported && permission === "granted" && !hasDevice && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm">
            <span className="text-lg">🔌</span>
            <div>
              <p className="font-semibold text-zinc-300">
                No MIDI device detected
              </p>
              <p className="text-xs mt-0.5">
                Plug in your keyboard or Focusrite interface — it will appear
                here automatically.
              </p>
            </div>
          </div>
        )}

        {/* ── Sampler loading indicator ────────────────────────────────────── */}
        {!samplerReady && (
          <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
            Loading piano samples…
          </div>
        )}

        {/* ── Connected devices ────────────────────────────────────────────── */}
        {hasDevice && (
          <div className="mb-6">
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">
              Connected Devices
            </p>
            <div className="flex flex-wrap gap-2">
              {connectedDevices.map((d) => (
                <DevicePill key={d.id} device={d} />
              ))}
            </div>
          </div>
        )}

        {/* ── Settings grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-2">
            <Label className="text-xs text-zinc-400 mb-1.5 block">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My recording…"
              className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">
              Tempo (BPM)
            </Label>
            <Input
              type="number"
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
              min={40}
              max={240}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-violet-500"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">
              Time Signature
            </Label>
            <Select
              value={timeSig}
              onValueChange={setTimeSig}
              disabled={isRecording}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {["4/4", "3/4", "6/8", "2/4"].map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-zinc-200 focus:bg-zinc-800"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Label className="text-xs text-zinc-400 mb-1.5 block">
              Notation Mode
            </Label>
            <Select
              value={rightHandOnly ? "lead" : "grand"}
              onValueChange={(v) => setRightHandOnly(v === "lead")}
              disabled={isRecording}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem
                  value="lead"
                  className="text-zinc-200 focus:bg-zinc-800"
                >
                  🎼 Lead Sheet — single treble staff (melody only)
                </SelectItem>
                <SelectItem
                  value="grand"
                  className="text-zinc-200 focus:bg-zinc-800"
                >
                  🎹 Grand Staff — treble + bass (split at middle C)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Transport + Metronome row ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-start gap-4 mb-8">
          {/* Left: record / save / clear buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={isRecording ? stop : start}
              disabled={!supported || permission === "denied"}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40"
                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <MetronomeLight isRecording={isRecording} tempo={tempo} />
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>

            <Button
              onClick={handleSave}
              disabled={saving || !currentBars.length || isRecording}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
            >
              {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "Save"}
            </Button>

            {currentBars.length > 0 && !isRecording && (
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                className="text-zinc-600 hover:text-zinc-400 text-sm"
              >
                Clear
              </Button>
            )}

            {noteCount > 0 && (
              <span className="text-xs text-zinc-600">
                {currentBars.length} bar{currentBars.length !== 1 ? "s" : ""} ·{" "}
                {noteCount} note{noteCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Right: Metronome / Drum Track panel — same component as other pages */}
          <div className="ml-auto">
            <MetronomeDrumTrack
              tempo={tempo}
              isPlaying={isRecording} // ← drives the metronome while recording
              timeSig={timeSig}
            />
          </div>
        </div>

        {/* ── Notation canvas ───────────────────────────────────────────────── */}
        <div
          className={`rounded-2xl border overflow-hidden transition-colors ${
            isRecording
              ? "border-red-800/50 bg-zinc-900/80 shadow-inner shadow-red-950/20"
              : "border-zinc-800 bg-zinc-900/50"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
            <span className="text-xs text-zinc-500 font-medium">Notation</span>
            {isRecording && (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Recording
              </span>
            )}
          </div>
          <div className="p-4 overflow-x-auto min-h-[340px]">
            {currentBars.length > 0 ? (
              <Staff
                right={allRight}
                left={allLeft}
                currentBeat={0}
                timeSig={timeSig}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600 select-none">
                <span className="text-5xl">🎹</span>
                <p className="text-sm">
                  {permission === "granted"
                    ? hasDevice
                      ? "Press Start Recording, then play"
                      : "Connect a MIDI device to begin"
                    : "Grant MIDI access to get started"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Focusrite help ────────────────────────────────────────────────── */}
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors select-none list-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform inline-block text-[10px]">
              ▶
            </span>
            Using a Focusrite or other audio interface?
          </summary>
          <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-2 leading-relaxed">
            <p>
              <strong className="text-zinc-300">
                Focusrite Scarlett / Solo / 2i2 —
              </strong>{" "}
              connect your keyboard via MIDI DIN-5 cable or USB. Appears as a
              MIDI input in Chrome automatically — no driver needed.
            </p>
            <p>
              <strong className="text-zinc-300">USB keyboards</strong> (Roland,
              Arturia, Akai…) — connect directly via USB. Appears in the device
              list within seconds.
            </p>
            <p>
              <strong className="text-zinc-300">Browser requirement —</strong>{" "}
              Web MIDI only works in <strong>Chrome</strong> or{" "}
              <strong>Edge</strong>. Safari and Firefox are not supported.
            </p>
          </div>
        </details>

        <SavedRecordings />
      </div>
    </div>
  );
}
