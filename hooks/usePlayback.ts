// "use client";

// import { useRef, useState, useCallback, useEffect } from "react";
// import * as Tone from "tone";
// import { parsePitch } from "@/lib/musicTheory";
// import { MusicPiece } from "@/types/music";

// interface UsePlaybackReturn {
//   isPlaying: boolean;
//   tempo: number;
//   setTempo: (bpm: number) => void;
//   toggle: () => void;
//   stop: () => void;
//   samplerReady: boolean; // expose so UI can show a loading state
// }

// // ─── Salamander Grand Piano sampler (singleton) ────────────────────────────
// // Loaded once on first use and reused across all playback calls.
// // Tone.Sampler pitch-shifts the recorded notes to cover the full 88-key range.
// let samplerInstance: Tone.Sampler | null = null;
// let samplerLoadPromise: Promise<void> | null = null;

// function getSampler(): Promise<void> {
//   if (samplerInstance && samplerLoadPromise) return samplerLoadPromise;

//   samplerInstance = new Tone.Sampler({
//     urls: {
//       // Salamander Grand Piano — real Yamaha C5 recordings, free CDN
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

// // ─── Hook ──────────────────────────────────────────────────────────────────

// export function usePlayback(piece: MusicPiece | null): UsePlaybackReturn {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [tempo, setTempoState] = useState(90);
//   const [samplerReady, setSamplerReady] = useState(false);
//   const partRef = useRef<Tone.Part | null>(null);

//   // Kick off sampler loading as soon as the hook mounts
//   useEffect(() => {
//     getSampler().then(() => setSamplerReady(true));
//   }, []);

//   const stop = useCallback(() => {
//     Tone.getTransport().stop();
//     Tone.getTransport().cancel(); // clear all scheduled events
//     if (partRef.current) {
//       partRef.current.dispose();
//       partRef.current = null;
//     }
//     setIsPlaying(false);
//   }, []);

//   const play = useCallback(
//     async (bpm: number) => {
//       if (!piece) return;
//       stop();

//       // Ensure AudioContext is resumed (browsers require a user gesture)
//       await Tone.start();

//       // Wait for samples if not yet loaded
//       if (!samplerReady) {
//         await getSampler();
//         setSamplerReady(true);
//       }

//       const sampler = samplerInstance!;
//       const secPerBeat = 60 / bpm;

//       // Build a flat list of timed events for both hands
//       type NoteEvent = {
//         time: number;
//         note: string;
//         duration: number;
//         velocity: number;
//       };
//       const events: NoteEvent[] = [];

//       let tRight = 0;
//       let tLeft = 0;

//       for (const secId of piece.structure) {
//         const sec = piece.sections.find((s) => s.id === secId);
//         if (!sec) continue;

//         for (const bar of sec.bars) {
//           // Right hand
//           for (const note of bar.notes) {
//             const durSec = note.duration * secPerBeat;
//             const isRest = note.rest || note.pitch === "rest";
//             if (!isRest) {
//               const parsed = parsePitch(note.pitch);
//               if (parsed) {
//                 events.push({
//                   time: tRight,
//                   note: note.pitch, // e.g. "C4", "F#3"
//                   duration: durSec,
//                   velocity: 0.8,
//                 });
//               }
//             }
//             tRight += durSec;
//           }

//           // Left hand
//           if (bar.leftNotes?.length) {
//             for (const note of bar.leftNotes) {
//               const durSec = note.duration * secPerBeat;
//               const isRest = note.rest || note.pitch === "rest";
//               if (!isRest) {
//                 const parsed = parsePitch(note.pitch);
//                 if (parsed) {
//                   events.push({
//                     time: tLeft,
//                     note: note.pitch,
//                     duration: durSec,
//                     velocity: 0.55, // left hand slightly quieter
//                   });
//                 }
//               }
//               tLeft += durSec;
//             }
//           }
//         }
//       }

//       if (events.length === 0) return;

//       // Set transport tempo
//       Tone.getTransport().bpm.value = bpm;
//       Tone.getTransport().cancel();

//       // Schedule all notes via Tone.Part (time is in seconds from transport start)
//       const part = new Tone.Part<NoteEvent>((time, event) => {
//         sampler.triggerAttackRelease(
//           event.note,
//           event.duration,
//           time,
//           event.velocity,
//         );
//       }, events);

//       part.start(0);
//       partRef.current = part;

//       const totalDuration = Math.max(tRight, tLeft);

//       Tone.getTransport().start();
//       setIsPlaying(true);

//       // Auto-stop when piece finishes
//       Tone.getTransport().scheduleOnce(() => {
//         stop();
//       }, totalDuration + 1.5); // +1.5s for last note's release tail
//     },
//     [piece, stop, samplerReady],
//   );

//   const toggle = useCallback(() => {
//     if (isPlaying) {
//       stop();
//     } else {
//       play(tempo);
//     }
//   }, [isPlaying, stop, play, tempo]);

//   const setTempo = useCallback(
//     (bpm: number) => {
//       setTempoState(bpm);
//       if (isPlaying) {
//         stop();
//         setTimeout(() => play(bpm), 100);
//       }
//     },
//     [isPlaying, stop, play],
//   );

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       stop();
//     };
//   }, [stop]);

//   return { isPlaying, tempo, setTempo, toggle, stop, samplerReady };
// }
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import * as Tone from "tone";
import { parsePitch } from "@/lib/musicTheory";
import { MusicPiece } from "@/types/music";

interface UsePlaybackReturn {
  isPlaying: boolean;
  currentBeat: number; // ← NEW: live beat position for the playhead
  tempo: number;
  setTempo: (bpm: number) => void;
  toggle: () => void;
  stop: () => void;
  samplerReady: boolean;
}

// ─── Salamander Grand Piano sampler (singleton) ────────────────────────────
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

// ─── Hook ──────────────────────────────────────────────────────────────────
export function usePlayback(piece: MusicPiece | null): UsePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0); // ← NEW
  const [tempo, setTempoState] = useState(90);
  const [samplerReady, setSamplerReady] = useState(false);

  const partRef = useRef<Tone.Part | null>(null);
  const rafRef = useRef<number | null>(null); // ← NEW
  const tempoRef = useRef(tempo); // ← NEW: stale-closure fix
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  // Load sampler on mount
  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
  }, []);

  // ── RAF clock — assigned in useEffect so it never mutates a ref during render
  const updateClockRef = useRef<() => void>(() => {});
  useEffect(() => {
    updateClockRef.current = () => {
      const seconds = Tone.getTransport().seconds;
      const beat = (seconds / 60) * tempoRef.current;
      setCurrentBeat(beat);
      rafRef.current = requestAnimationFrame(updateClockRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    // Cancel RAF first
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setCurrentBeat(0); // ← reset playhead to start

    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (bpm: number) => {
      if (!piece) return;
      stop();

      await Tone.start();
      if (!samplerReady) {
        await getSampler();
        setSamplerReady(true);
      }

      const sampler = samplerInstance!;
      const secPerBeat = 60 / bpm;

      type NoteEvent = {
        time: number;
        note: string;
        duration: number;
        velocity: number;
      };
      const events: NoteEvent[] = [];
      let tRight = 0;
      let tLeft = 0;

      for (const secId of piece.structure) {
        const sec = piece.sections.find((s) => s.id === secId);
        if (!sec) continue;

        for (const bar of sec.bars) {
          // Right hand
          for (const note of bar.notes) {
            const durSec = note.duration * secPerBeat;
            const isRest = note.rest || note.pitch === "rest";
            if (!isRest) {
              const parsed = parsePitch(note.pitch);
              if (parsed) {
                events.push({
                  time: tRight,
                  note: note.pitch,
                  duration: durSec,
                  velocity: 0.8,
                });
              }
            }
            tRight += durSec;
          }

          // Left hand
          if (bar.leftNotes?.length) {
            for (const note of bar.leftNotes) {
              const durSec = note.duration * secPerBeat;
              const isRest = note.rest || note.pitch === "rest";
              if (!isRest) {
                const parsed = parsePitch(note.pitch);
                if (parsed) {
                  events.push({
                    time: tLeft,
                    note: note.pitch,
                    duration: durSec,
                    velocity: 0.55,
                  });
                }
              }
              tLeft += durSec;
            }
          }
        }
      }

      if (events.length === 0) return;

      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().cancel();

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

      const totalDuration = Math.max(tRight, tLeft);
      Tone.getTransport().start();
      setIsPlaying(true);

      // Start the RAF beat clock ← NEW
      rafRef.current = requestAnimationFrame(updateClockRef.current);

      // Auto-stop when piece finishes
      Tone.getTransport().scheduleOnce(() => {
        stop();
      }, totalDuration + 1.5);
    },
    [piece, stop, samplerReady],
  );

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play(tempo);
    }
  }, [isPlaying, stop, play, tempo]);

  const setTempo = useCallback(
    (bpm: number) => {
      setTempoState(bpm);
      tempoRef.current = bpm;
      if (isPlaying) {
        stop();
        setTimeout(() => play(bpm), 100);
      }
    },
    [isPlaying, stop, play],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    currentBeat,
    tempo,
    setTempo,
    toggle,
    stop,
    samplerReady,
  };
}
