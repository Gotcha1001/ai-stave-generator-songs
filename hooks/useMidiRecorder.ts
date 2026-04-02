// "use client";

// import { useState, useRef, useEffect, useCallback } from "react";
// import * as Tone from "tone";
// import { midiToPitch } from "@/lib/musicTheory";
// import { Bar, MusicNote } from "@/types/music";

// const Q = 0.25;

// // ─────────────────────────────────────────────────────────────────────────────
// // ALL MIDI state lives at MODULE level — completely outside React.
// // This means no matter how many times the component mounts/unmounts/StrictMode
// // double-invokes, there is exactly ONE handler and ONE set of active notes.
// // This is how native DAW MIDI engines work: the MIDI thread is a singleton.
// // ─────────────────────────────────────────────────────────────────────────────

// type NoteOnRecord = { ts: number; velocity: number };

// // The single global MIDI access object
// let gAccess: MIDIAccess | null = null;
// // Whether we've called requestMIDIAccess
// let gRequested = false;
// // Currently held notes (noteNumber → record)
// const gActiveNotes = new Map<number, NoteOnRecord>();
// // The callback that React registers — replaced each time the hook mounts
// let gOnNoteOff:
//   | ((
//       note: number,
//       noteOnTs: number,
//       noteOffTs: number,
//       velocity: number,
//     ) => void)
//   | null = null;
// let gOnNoteOn: ((note: number, ts: number, velocity: number) => void) | null =
//   null;
// // Last noteOff timestamp per note — used to dedupe duplicate noteOff messages
// const gLastNoteOff = new Map<number, number>();
// const DEDUP_WINDOW_MS = 30; // ignore a second noteOff within 30ms of first

// function attachGlobalListeners() {
//   if (!gAccess) return;
//   gAccess.inputs.forEach((input) => {
//     // Always reassign — we want exactly one handler and this IS that handler
//     input.onmidimessage = (event) => {
//       if (!event.data || event.data.length < 3) return;
//       const status = event.data[0];
//       const note = event.data[1];
//       const vel = event.data[2];
//       const ts = event.timeStamp;

//       if (status === 144 && vel > 0) {
//         // ── Note on ────────────────────────────────────────────────────
//         gActiveNotes.set(note, { ts, velocity: vel / 127 });
//         gOnNoteOn?.(note, ts, vel / 127);
//       } else if (status === 128 || (status === 144 && vel === 0)) {
//         // ── Note off — deduplicate ─────────────────────────────────────
//         const lastOff = gLastNoteOff.get(note);
//         if (lastOff !== undefined && ts - lastOff < DEDUP_WINDOW_MS) {
//           return; // duplicate — ignore
//         }
//         gLastNoteOff.set(note, ts);

//         const active = gActiveNotes.get(note);
//         if (!active) return; // no matching noteOn — ignore
//         gActiveNotes.delete(note);

//         gOnNoteOff?.(note, active.ts, ts, active.velocity);
//       }
//     };
//   });
// }

// // ── Sampler ───────────────────────────────────────────────────────────────────
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

// // ── Live piano monitoring — raw oscillators ───────────────────────────────────
// const liveNodes = new Map<number, { osc: OscillatorNode; gain: GainNode }>();

// function playLiveNote(ctx: AudioContext, midiNote: number, velocity: number) {
//   stopLiveNote(ctx, midiNote); // prevent double-sound on retrigger
//   const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
//   const gain = ctx.createGain();
//   gain.connect(ctx.destination);
//   gain.gain.setValueAtTime(0, ctx.currentTime);
//   gain.gain.linearRampToValueAtTime(velocity * 0.55, ctx.currentTime + 0.006);
//   gain.gain.exponentialRampToValueAtTime(
//     velocity * 0.28,
//     ctx.currentTime + 0.09,
//   );
//   const osc = ctx.createOscillator();
//   osc.type = "triangle";
//   osc.frequency.value = freq;
//   osc.connect(gain);
//   osc.start(ctx.currentTime);
//   liveNodes.set(midiNote, { osc, gain });
// }

// function stopLiveNote(ctx: AudioContext, midiNote: number) {
//   const node = liveNodes.get(midiNote);
//   if (!node) return;

//   const { osc, gain } = node;
//   const t = ctx.currentTime;

//   gain.gain.cancelScheduledValues(t);
//   gain.gain.setValueAtTime(gain.gain.value, t);
//   gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

//   osc.stop(t + 0.07); // scheduled in audio thread

//   liveNodes.delete(midiNote);
// }

// // ── Metronome ─────────────────────────────────────────────────────────────────
// function makeClick(ctx: AudioContext, isDownbeat: boolean) {
//   const osc = ctx.createOscillator(),
//     gain = ctx.createGain();
//   osc.connect(gain);
//   gain.connect(ctx.destination);
//   osc.frequency.value = isDownbeat ? 1000 : 800;
//   gain.gain.setValueAtTime(isDownbeat ? 0.5 : 0.3, ctx.currentTime);
//   gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
//   osc.start(ctx.currentTime);
//   osc.stop(ctx.currentTime + 0.05);
// }

// // ── Music helpers ─────────────────────────────────────────────────────────────
// function snap(beats: number): number {
//   if (beats <= 0) return Q;
//   return Math.max(Q, Math.round(beats / Q) * Q);
// }

// function consolidateRests(beats: number): number[] {
//   const values = [4, 2, 1, 0.5, 0.25];
//   const result: number[] = [];
//   let rem = Math.round(beats / Q) * Q;
//   for (const v of values) {
//     while (rem >= v - 0.001) {
//       result.push(v);
//       rem = Math.round((rem - v) / Q) * Q;
//     }
//   }
//   return result;
// }

// function insertNote(
//   bars: Bar[],
//   pitch: string,
//   duration: number,
//   isRest: boolean,
//   midiNote: number,
//   rightHandOnly: boolean,
//   bpb: number,
// ): Bar[] {
//   let remaining = Math.round(duration / Q) * Q;
//   if (remaining < Q) return bars;
//   const result = bars.map((b) => ({
//     ...b,
//     notes: [...b.notes],
//     leftNotes: b.leftNotes ? [...b.leftNotes] : b.leftNotes,
//   }));
//   while (remaining >= Q) {
//     if (result.length === 0)
//       result.push({
//         chord: "",
//         notes: [],
//         leftNotes: rightHandOnly ? undefined : [],
//       });
//     const last = result[result.length - 1];
//     const isBass = !isRest && midiNote < 60;
//     const target =
//       rightHandOnly || !isBass ? last.notes : (last.leftNotes ??= []);
//     const filled = target.reduce(
//       (s: number, n: MusicNote) => s + n.duration,
//       0,
//     );
//     const space = Math.round((bpb - filled) / Q) * Q;
//     if (space <= 0) {
//       result.push({
//         chord: "",
//         notes: [],
//         leftNotes: rightHandOnly ? undefined : [],
//       });
//       continue;
//     }
//     const chunk = Math.min(remaining, space);
//     target.push({ pitch, duration: chunk, rest: isRest });
//     remaining = Math.round((remaining - chunk) / Q) * Q;
//     if (remaining >= Q)
//       result.push({
//         chord: "",
//         notes: [],
//         leftNotes: rightHandOnly ? undefined : [],
//       });
//   }
//   return result;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HOOK
// // ─────────────────────────────────────────────────────────────────────────────
// export function useMidiRecorder(defaultTempo = 120, defaultTimeSig = "4/4") {
//   const [isRecording, setIsRecording] = useState(false);
//   const [tempo, setTempo] = useState(defaultTempo);
//   const [timeSig, setTimeSig] = useState(defaultTimeSig);
//   const [rightHandOnly, setRightHandOnly] = useState(true);
//   const [currentBars, setCurrentBars] = useState<Bar[]>([]);
//   const [title, setTitle] = useState("New MIDI Recording");
//   const [samplerReady, setSamplerReady] = useState(false);

//   const audioCtxRef = useRef<AudioContext | null>(null);
//   const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const beatCountRef = useRef(0);
//   const committedBeatsRef = useRef(0);
//   const recordingStartTsRef = useRef(0);

//   const tempoRef = useRef(tempo);
//   const timeSigRef = useRef(timeSig);
//   const rightHandOnlyRef = useRef(rightHandOnly);
//   const isRecordingRef = useRef(isRecording);

//   useEffect(() => {
//     tempoRef.current = tempo;
//   }, [tempo]);
//   useEffect(() => {
//     timeSigRef.current = timeSig;
//   }, [timeSig]);
//   useEffect(() => {
//     rightHandOnlyRef.current = rightHandOnly;
//   }, [rightHandOnly]);
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // ── Boot ──────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     getSampler().then(() => setSamplerReady(true));
//     audioCtxRef.current = new AudioContext();

//     // Request MIDI access once globally
//     if (!gRequested && "requestMIDIAccess" in navigator) {
//       gRequested = true;
//       navigator
//         .requestMIDIAccess({ sysex: false })
//         .then((access) => {
//           gAccess = access;
//           attachGlobalListeners();
//           access.onstatechange = () => attachGlobalListeners();
//         })
//         .catch((e) => console.error("MIDI access denied", e));
//     }
//   }, []);

//   // ── Stable commitNote (empty deps, reads only refs) ───────────────────────
//   const commitNote = useCallback(
//     (pitch: string, duration: number, isRest: boolean, midiNote: number) => {
//       setCurrentBars((prev) => {
//         const [num, den] = timeSigRef.current.split("/").map(Number);
//         return insertNote(
//           prev,
//           pitch,
//           duration,
//           isRest,
//           midiNote,
//           rightHandOnlyRef.current,
//           (num * 4) / den,
//         );
//       });
//     },
//     [],
//   );

//   // ── Register global callbacks — replaced on each render so they always
//   //    close over the latest commitNote, but the MIDI handler itself never
//   //    re-registers (it just calls whatever gOnNoteOn/gOnNoteOff point to).
//   useEffect(() => {
//     gOnNoteOn = (note, _ts, velocity) => {
//       if (!samplerInstance) return;

//       const pitch = midiToPitch(note);

//       samplerInstance.triggerAttack(pitch, undefined, velocity);
//     };

//     gOnNoteOff = (note, noteOnTs, noteOffTs, _velocity) => {
//       if (!isRecordingRef.current) return;

//       const ctx = audioCtxRef.current;
//       if (ctx) stopLiveNote(ctx, note);

//       const msPerBeat = 60000 / tempoRef.current;
//       const noteDurBeats = snap((noteOffTs - noteOnTs) / msPerBeat);
//       const onsetBeats = (noteOnTs - recordingStartTsRef.current) / msPerBeat;
//       const silenceBeats = onsetBeats - committedBeatsRef.current;
//       const snappedSilence = snap(silenceBeats);

//       // Write rests only when all simultaneously-held notes have been released
//       if (snappedSilence >= Q && gActiveNotes.size === 0) {
//         for (const dur of consolidateRests(snappedSilence)) {
//           commitNote("rest", dur, true, 60);
//         }
//         committedBeatsRef.current += snappedSilence;
//       }

//       commitNote(midiToPitch(note), noteDurBeats, false, note);
//       committedBeatsRef.current += noteDurBeats;
//     };

//     return () => {
//       // On unmount, clear callbacks so stale closures don't fire
//       gOnNoteOn = null;
//       gOnNoteOff = null;
//     };
//   }, [commitNote]);

//   // ── Metronome ─────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isRecording) {
//       if (metronomeRef.current) {
//         clearInterval(metronomeRef.current);
//         metronomeRef.current = null;
//       }
//       beatCountRef.current = 0;
//       return;
//     }
//     const ctx = audioCtxRef.current!;
//     if (ctx.state === "suspended") ctx.resume();
//     makeClick(ctx, true);
//     beatCountRef.current = 1;
//     const msPerBeat = (60 / tempoRef.current) * 1000;
//     metronomeRef.current = setInterval(() => {
//       const c = audioCtxRef.current;
//       if (!c) return;
//       const [num] = timeSigRef.current.split("/").map(Number);
//       makeClick(c, beatCountRef.current % num === 0);
//       beatCountRef.current++;
//     }, msPerBeat);
//     return () => {
//       if (metronomeRef.current) {
//         clearInterval(metronomeRef.current);
//         metronomeRef.current = null;
//       }
//       beatCountRef.current = 0;
//     };
//   }, [isRecording]);

//   // ── Transport ─────────────────────────────────────────────────────────────
//   const start = useCallback(() => {
//     gActiveNotes.clear();
//     gLastNoteOff.clear();
//     committedBeatsRef.current = 0;
//     recordingStartTsRef.current = performance.now();
//     setCurrentBars([
//       {
//         chord: "",
//         notes: [],
//         leftNotes: rightHandOnlyRef.current ? undefined : [],
//       },
//     ]);
//     setIsRecording(true);
//   }, []);

//   const stop = useCallback(() => setIsRecording(false), []);

//   return {
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
//     samplerReady,
//   };
// }
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";
import { midiToPitch } from "@/lib/musicTheory";
import { Bar, MusicNote } from "@/types/music";

// ─────────────────────────────────────────────────────────────────────────────
// ALL MIDI state lives at MODULE level — completely outside React.
// This means no matter how many times the component mounts/unmounts/StrictMode
// double-invokes, there is exactly ONE handler and ONE set of active notes.
// This is how native DAW MIDI engines work: the MIDI thread is a singleton.
// ─────────────────────────────────────────────────────────────────────────────

type NoteOnRecord = { ts: number; velocity: number };

type PendingChordNote = { pitch: string; duration: number; midi: number };
type PendingChord = {
  startBeat: number;
  notes: PendingChordNote[];
};

let gAccess: MIDIAccess | null = null;
let gRequested = false;
const gActiveNotes = new Map<number, NoteOnRecord>();
let gOnChordCommit: ((chord: PendingChord) => void) | null = null;
let gOnNoteOn: ((note: number, ts: number, velocity: number) => void) | null =
  null;
const gLastNoteOff = new Map<number, number>();
const DEDUP_WINDOW_MS = 30;

let gPendingChord: PendingChord | null = null;

let gSustainPedal = false;
const gSustainBuffer = new Map<
  number,
  { noteOnTs: number; noteOffTs: number; velocity: number }
>();

// ── Quantization ──────────────────────────────────────────────────────────────
//
// Musical quantization grid — ordered coarsest to finest.
// Includes dotted values so natural phrasing snaps correctly instead of
// breaking dotted quarters/eighths into ugly tied fragments.
//
// Whole  = 4 beats
// Half   = 2
// Dotted quarter = 1.5
// Quarter = 1
// Dotted eighth = 0.75
// Eighth = 0.5
// Dotted sixteenth = 0.375
// Sixteenth = 0.25
//
// We deliberately omit 32nd notes (0.125) — they are virtually never
// played on a MIDI keyboard and cause over-quantization at slow tempos.
//
const QUANTIZE_GRID = [4, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25] as const;
type GridValue = (typeof QUANTIZE_GRID)[number];

// The minimum representable duration — sixteenth note.
const FINEST: GridValue = 0.25;

// ── Adaptive quantization strength ────────────────────────────────────────────
//
// At fast tempos (>140 bpm) players rush more; widen the snap window.
// At slow tempos (<70 bpm) players are more expressive; tighten the window
// so accidentals (tiny grace-note touches) are not over-quantized.
//
// strength ∈ [0.25 … 0.45] — fraction of the grid interval to snap within.
//
function quantizeStrength(): number {
  const bpm = gGetMsPerBeat ? 60000 / gGetMsPerBeat() : 120;
  if (bpm >= 160) return 0.45;
  if (bpm >= 120) return 0.38;
  if (bpm >= 80) return 0.32;
  return 0.26;
}

// snap() — find the nearest musical duration for a raw beat count.
//
// Unlike a naive "round to 16th" approach, this:
//   1. Tries every value in QUANTIZE_GRID (including dotted notes).
//   2. Only accepts a snap if the raw value is within `strength` × interval.
//   3. Falls back to the nearest free multiple of FINEST for long notes.
//
function snap(beats: number): GridValue {
  if (beats <= 0) return FINEST;

  const strength = quantizeStrength();

  let best: GridValue = FINEST;
  let bestScore = Infinity;

  for (const grid of QUANTIZE_GRID) {
    const dist = Math.abs(beats - grid);
    // Weighted score: closer is better, but prefer coarser values slightly
    // so e.g. a sloppy quarter is not over-quantized to dotted-eighth.
    const score = dist / grid;
    if (dist <= grid * strength && score < bestScore) {
      bestScore = score;
      best = grid;
    }
  }

  if (bestScore < Infinity) return best;

  // Fallback: round to nearest multiple of FINEST (handles long held notes)
  const rounded = Math.max(
    FINEST,
    Math.round(beats / FINEST) * FINEST,
  ) as GridValue;
  return rounded;
}

// ── Module-level timing ───────────────────────────────────────────────────────
let gGetMsPerBeat: () => number = () => 500;
let gRecordingStartTs = 0;

// ── MIDI message handler ──────────────────────────────────────────────────────
function midiHandler(event: MIDIMessageEvent) {
  if (!event.data || event.data.length < 3) return;
  const status = event.data[0];
  const data1 = event.data[1];
  const data2 = event.data[2];
  const ts = performance.now();
  const command = status & 0xf0;

  // Sustain pedal (CC64)
  if (command === 0xb0 && data1 === 64) {
    gSustainPedal = data2 >= 64;
    if (!gSustainPedal) {
      const sorted = [...gSustainBuffer.entries()].sort(([a], [b]) => a - b);
      for (const [note, { noteOnTs, noteOffTs, velocity }] of sorted) {
        flushNoteOff(note, noteOnTs, noteOffTs, velocity);
      }
      gSustainBuffer.clear();
    }
    return;
  }

  if (command === 0x90 && data2 > 0) {
    gActiveNotes.set(data1, { ts, velocity: data2 / 127 });
    gOnNoteOn?.(data1, ts, data2 / 127);
  } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    const lastOff = gLastNoteOff.get(data1);
    if (lastOff !== undefined && ts - lastOff < DEDUP_WINDOW_MS) return;
    gLastNoteOff.set(data1, ts);

    const active = gActiveNotes.get(data1);
    if (!active) return;
    gActiveNotes.delete(data1);

    if (gSustainPedal) {
      gSustainBuffer.set(data1, {
        noteOnTs: active.ts,
        noteOffTs: ts,
        velocity: active.velocity,
      });
    } else {
      flushNoteOff(data1, active.ts, ts, active.velocity);
    }
  }
}

function flushNoteOff(
  note: number,
  noteOnTs: number,
  noteOffTs: number,
  _velocity: number,
) {
  const msPerBeat = gGetMsPerBeat();
  const rawDur = (noteOffTs - noteOnTs) / msPerBeat;
  const noteDurBeats = snap(rawDur);
  const onsetBeats = (noteOnTs - gRecordingStartTs) / msPerBeat;

  if (!gPendingChord) {
    gPendingChord = { startBeat: onsetBeats, notes: [] };
  }

  gPendingChord.notes.push({
    pitch: midiToPitch(note),
    duration: noteDurBeats,
    midi: note,
  });

  if (gActiveNotes.size === 0 && gSustainBuffer.size === 0) {
    gOnChordCommit?.(gPendingChord);
    gPendingChord = null;
  }
}

function attachGlobalListeners() {
  if (!gAccess) return;
  for (const input of gAccess.inputs.values()) {
    if (!input.onmidimessage) {
      input.onmidimessage = midiHandler;
    }
  }
}

// ── Sampler ───────────────────────────────────────────────────────────────────
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

// ── Metronome ─────────────────────────────────────────────────────────────────
function makeClick(ctx: AudioContext, isDownbeat: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = isDownbeat ? 1000 : 800;
  gain.gain.setValueAtTime(isDownbeat ? 0.5 : 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

// ── Rest decomposition ────────────────────────────────────────────────────────
//
// Break a gap of `beats` into the fewest rests possible, using musical values
// including dotted notes. E.g. 1.5 beats → dotted quarter (not quarter + eighth).
//
function consolidateRests(beats: number): number[] {
  // All note values including dotted, coarsest first
  const values = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25];
  const result: number[] = [];
  let rem = Math.round(beats / FINEST) * FINEST;
  for (const v of values) {
    while (rem >= v - 0.001) {
      result.push(v);
      rem = Math.round((rem - v) / FINEST) * FINEST;
    }
  }
  return result;
}

// ── Note insertion ────────────────────────────────────────────────────────────
function insertNote(
  bars: Bar[],
  pitch: string,
  duration: number,
  isRest: boolean,
  midiNote: number,
  rightHandOnly: boolean,
  bpb: number,
): Bar[] {
  let remaining = Math.round(duration / FINEST) * FINEST;
  if (remaining < FINEST) return bars;
  const result = bars.map((b) => ({
    ...b,
    notes: [...b.notes],
    leftNotes: b.leftNotes ? [...b.leftNotes] : b.leftNotes,
  }));
  while (remaining >= FINEST) {
    if (result.length === 0)
      result.push({
        chord: "",
        notes: [],
        leftNotes: rightHandOnly ? undefined : [],
      });

    const last = result[result.length - 1];
    const isBass = !isRest && midiNote < 60;
    const target =
      rightHandOnly || !isBass ? last.notes : (last.leftNotes ??= []);
    const filled = target.reduce(
      (s: number, n: MusicNote) => s + n.duration,
      0,
    );
    const space = Math.round((bpb - filled) / FINEST) * FINEST;

    if (space <= 0) {
      result.push({
        chord: "",
        notes: [],
        leftNotes: rightHandOnly ? undefined : [],
      });
      continue;
    }

    const chunk = Math.min(remaining, space);

    // If chunk doesn't match a clean musical value, try to use a tie instead
    // of producing a weird fractional note. Only tie when crossing bar lines.
    target.push({ pitch, duration: chunk, rest: isRest });
    remaining = Math.round((remaining - chunk) / FINEST) * FINEST;
    if (remaining >= FINEST)
      result.push({
        chord: "",
        notes: [],
        leftNotes: rightHandOnly ? undefined : [],
      });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useMidiRecorder(defaultTempo = 120, defaultTimeSig = "4/4") {
  const [isRecording, setIsRecording] = useState(false);
  const [tempo, setTempo] = useState(defaultTempo);
  const [timeSig, setTimeSig] = useState(defaultTimeSig);
  const [rightHandOnly, setRightHandOnly] = useState(true);
  const [currentBars, setCurrentBars] = useState<Bar[]>([]);
  const [title, setTitle] = useState("New MIDI Recording");
  const [samplerReady, setSamplerReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatCountRef = useRef(0);
  const committedBeatsRef = useRef(0);

  const tempoRef = useRef(tempo);
  const timeSigRef = useRef(timeSig);
  const rightHandOnlyRef = useRef(rightHandOnly);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);
  useEffect(() => {
    timeSigRef.current = timeSig;
  }, [timeSig]);
  useEffect(() => {
    rightHandOnlyRef.current = rightHandOnly;
  }, [rightHandOnly]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
    audioCtxRef.current = new AudioContext();

    if (!gRequested && "requestMIDIAccess" in navigator) {
      gRequested = true;
      navigator
        .requestMIDIAccess({ sysex: false })
        .then((access) => {
          gAccess = access;
          attachGlobalListeners();
          access.onstatechange = () => attachGlobalListeners();
        })
        .catch((e) => console.error("MIDI access denied", e));
    }
  }, []);

  // ── commitChord ───────────────────────────────────────────────────────────
  const commitChord = useCallback((chord: PendingChord) => {
    if (!isRecordingRef.current) return;

    setCurrentBars((prev) => {
      const [num, den] = timeSigRef.current.split("/").map(Number);
      const bpb = (num * 4) / den;

      // Gap handling — insert rests for silence before this chord
      const silenceBeats = chord.startBeat - committedBeatsRef.current;
      let bars = prev;
      if (silenceBeats >= FINEST) {
        const snapped = snap(silenceBeats);
        for (const dur of consolidateRests(snapped)) {
          bars = insertNote(
            bars,
            "rest",
            dur,
            true,
            60,
            rightHandOnlyRef.current,
            bpb,
          );
        }
        committedBeatsRef.current += snapped;
      }

      // ── Chord duration ────────────────────────────────────────────────────
      // Use the LONGEST note in the chord, not the shortest.
      // When playing chords, fingers lift at slightly different times —
      // the musical intent is the note that rings the longest.
      // Sibelius / Dorico both default to longest-held for chord input.
      const chordDuration = Math.max(...chord.notes.map((n) => n.duration));

      // Sort treble notes descending, bass ascending — matches grand-staff layout
      const sorted = [...chord.notes].sort((a, b) => b.midi - a.midi);

      for (const n of sorted) {
        bars = insertNote(
          bars,
          n.pitch,
          chordDuration,
          false,
          n.midi,
          rightHandOnlyRef.current,
          bpb,
        );
      }

      committedBeatsRef.current += chordDuration;
      return bars;
    });
  }, []);

  // ── Register global callbacks ─────────────────────────────────────────────
  useEffect(() => {
    gGetMsPerBeat = () => 60000 / tempoRef.current;

    gOnNoteOn = (note, _ts, velocity) => {
      if (!samplerInstance) return;
      samplerInstance.triggerAttack(midiToPitch(note), undefined, velocity);
    };

    gOnChordCommit = (chord) => {
      if (samplerInstance) {
        for (const n of chord.notes) {
          samplerInstance.triggerRelease(n.pitch);
        }
      }
      commitChord(chord);
    };

    return () => {
      gOnNoteOn = null;
      gOnChordCommit = null;
    };
  }, [commitChord]);

  // ── Metronome ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      if (metronomeRef.current) {
        clearInterval(metronomeRef.current);
        metronomeRef.current = null;
      }
      beatCountRef.current = 0;
      return;
    }
    const ctx = audioCtxRef.current!;
    if (ctx.state === "suspended") ctx.resume();
    makeClick(ctx, true);
    beatCountRef.current = 1;
    const msPerBeat = (60 / tempoRef.current) * 1000;
    metronomeRef.current = setInterval(() => {
      const c = audioCtxRef.current;
      if (!c) return;
      const [num] = timeSigRef.current.split("/").map(Number);
      makeClick(c, beatCountRef.current % num === 0);
      beatCountRef.current++;
    }, msPerBeat);
    return () => {
      if (metronomeRef.current) {
        clearInterval(metronomeRef.current);
        metronomeRef.current = null;
      }
      beatCountRef.current = 0;
    };
  }, [isRecording]);

  // ── Transport ─────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    gActiveNotes.clear();
    gLastNoteOff.clear();
    gSustainBuffer.clear();
    gSustainPedal = false;
    gPendingChord = null;
    committedBeatsRef.current = 0;
    gRecordingStartTs = performance.now();
    setCurrentBars([
      {
        chord: "",
        notes: [],
        leftNotes: rightHandOnlyRef.current ? undefined : [],
      },
    ]);
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => setIsRecording(false), []);

  return {
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
    samplerReady,
  };
}
