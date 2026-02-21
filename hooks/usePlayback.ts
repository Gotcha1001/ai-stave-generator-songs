// "use client";

// import { useRef, useState, useCallback } from "react";
// import { parsePitch, pitchToMidi, midiToFreq } from "@/lib/musicTheory";
// import { MusicPiece } from "@/types/music";

// interface UsePlaybackReturn {
//   isPlaying: boolean;
//   tempo: number;
//   setTempo: (bpm: number) => void;
//   toggle: () => void;
//   stop: () => void;
// }

// export function usePlayback(piece: MusicPiece | null): UsePlaybackReturn {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [tempo, setTempoState] = useState(90);
//   const audioCtxRef = useRef<AudioContext | null>(null);
//   const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const stop = useCallback(() => {
//     setIsPlaying(false);
//     if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
//     if (audioCtxRef.current) {
//       audioCtxRef.current.close();
//       audioCtxRef.current = null;
//     }
//   }, []);

//   const play = useCallback(
//     (bpm: number) => {
//       if (!piece) return;
//       stop();

//       const AudioContextClass =
//         window.AudioContext ||
//         (window as { webkitAudioContext?: typeof AudioContext })
//           .webkitAudioContext;

//       const ctx = new AudioContextClass!();
//       audioCtxRef.current = ctx;
//       setIsPlaying(true);

//       const secPerBeat = 60 / bpm;

//       // Collect all notes (right hand) in playback order
//       const rightNotes: Array<{
//         pitch: string;
//         duration: number;
//         rest: boolean;
//       }> = [];

//       // Collect all left hand notes in playback order
//       const leftNotes: Array<{
//         pitch: string;
//         duration: number;
//         rest: boolean;
//       }> = [];

//       for (const secId of piece.structure) {
//         const sec = piece.sections.find((s) => s.id === secId);
//         if (!sec) continue;

//         for (const bar of sec.bars) {
//           // Right hand (treble)
//           for (const note of bar.notes) {
//             rightNotes.push({
//               pitch: note.pitch,
//               duration: note.duration,
//               rest: note.rest ?? note.pitch === "rest",
//             });
//           }

//           // Left hand (bass) — only present in classical notation
//           if (bar.leftNotes && bar.leftNotes.length > 0) {
//             for (const note of bar.leftNotes) {
//               leftNotes.push({
//                 pitch: note.pitch,
//                 duration: note.duration,
//                 rest: note.rest ?? note.pitch === "rest",
//               });
//             }
//           }
//         }
//       }

//       const masterGain = ctx.createGain();
//       masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
//       masterGain.connect(ctx.destination);

//       const startTime = ctx.currentTime + 0.05;

//       // Schedule right hand notes
//       let tRight = startTime;
//       for (const note of rightNotes) {
//         const durSec = note.duration * secPerBeat;
//         if (!note.rest) {
//           const parsed = parsePitch(note.pitch);
//           if (parsed) {
//             const midi = pitchToMidi(parsed.note, parsed.octave);
//             const freq = midiToFreq(midi);
//             schedulePianoTone(ctx, masterGain, freq, tRight, durSec, 0.4);
//           }
//         }
//         tRight += durSec;
//       }

//       // Schedule left hand notes (concurrently, starting at same time)
//       let tLeft = startTime;
//       for (const note of leftNotes) {
//         const durSec = note.duration * secPerBeat;
//         if (!note.rest) {
//           const parsed = parsePitch(note.pitch);
//           if (parsed) {
//             const midi = pitchToMidi(parsed.note, parsed.octave);
//             const freq = midiToFreq(midi);
//             // Slightly lower volume for left hand so melody stands out
//             schedulePianoTone(ctx, masterGain, freq, tLeft, durSec, 0.28);
//           }
//         }
//         tLeft += durSec;
//       }

//       // Use the longer of the two hands to know when to stop
//       const totalTime =
//         (Math.max(tRight, tLeft) - ctx.currentTime) * 1000 + 300;
//       stopTimeoutRef.current = setTimeout(() => stop(), totalTime);
//     },
//     [piece, stop],
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

//   return { isPlaying, tempo, setTempo, toggle, stop };
// }

// /**
//  * Schedules a piano-like tone using additive synthesis.
//  *
//  * A real piano tone has:
//  *  - A very fast attack (percussive strike)
//  *  - Multiple harmonics that decay at different rates
//  *  - A long, natural decay with no sustain plateau
//  *  - A subtle detuning between harmonics for warmth
//  */
// function schedulePianoTone(
//   ctx: AudioContext,
//   destination: AudioNode,
//   freq: number,
//   startTime: number,
//   duration: number,
//   peakGain: number,
// ) {
//   // Piano harmonic series: [frequency multiplier, relative amplitude, decay factor]
//   // Higher harmonics decay faster (characteristic of a struck string)
//   const harmonics: [number, number, number][] = [
//     [1.0, 1.0, 1.0], // fundamental
//     [2.0, 0.5, 1.8], // 2nd harmonic
//     [3.0, 0.25, 2.5], // 3rd harmonic
//     [4.0, 0.12, 3.5], // 4th harmonic
//     [5.0, 0.06, 5.0], // 5th harmonic
//     [6.0, 0.03, 7.0], // 6th harmonic
//   ];

//   const attack = 0.005; // very fast attack — percussive key strike
//   const maxDuration = Math.min(duration, 4.0); // cap note length for realism

//   for (const [mult, amp, decayFactor] of harmonics) {
//     const osc = ctx.createOscillator();
//     const gainNode = ctx.createGain();

//     osc.connect(gainNode);
//     gainNode.connect(destination);

//     // Use sine waves for clean harmonics (piano-like, not buzzy)
//     osc.type = "sine";

//     // Slight detune per harmonic for a warm, natural timbre
//     const detuneCents = (mult - 1) * 1.5; // small stretch tuning like real piano strings
//     osc.frequency.setValueAtTime(freq * mult, startTime);
//     osc.detune.setValueAtTime(detuneCents, startTime);

//     const thisPeak = peakGain * amp;
//     // Each harmonic decays at a different rate
//     const decayTime = maxDuration / decayFactor;

//     gainNode.gain.setValueAtTime(0, startTime);
//     gainNode.gain.linearRampToValueAtTime(thisPeak, startTime + attack);
//     // Exponential decay to near-silence (piano-style release)
//     gainNode.gain.exponentialRampToValueAtTime(
//       0.0001,
//       startTime + attack + decayTime,
//     );
//     gainNode.gain.setValueAtTime(0, startTime + attack + decayTime + 0.01);

//     osc.start(startTime);
//     osc.stop(startTime + attack + decayTime + 0.05);
//   }
// }

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import * as Tone from "tone";
import { parsePitch } from "@/lib/musicTheory";
import { MusicPiece } from "@/types/music";

interface UsePlaybackReturn {
  isPlaying: boolean;
  tempo: number;
  setTempo: (bpm: number) => void;
  toggle: () => void;
  stop: () => void;
  samplerReady: boolean; // expose so UI can show a loading state
}

// ─── Salamander Grand Piano sampler (singleton) ────────────────────────────
// Loaded once on first use and reused across all playback calls.
// Tone.Sampler pitch-shifts the recorded notes to cover the full 88-key range.
let samplerInstance: Tone.Sampler | null = null;
let samplerLoadPromise: Promise<void> | null = null;

function getSampler(): Promise<void> {
  if (samplerInstance && samplerLoadPromise) return samplerLoadPromise;

  samplerInstance = new Tone.Sampler({
    urls: {
      // Salamander Grand Piano — real Yamaha C5 recordings, free CDN
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
  const [tempo, setTempoState] = useState(90);
  const [samplerReady, setSamplerReady] = useState(false);
  const partRef = useRef<Tone.Part | null>(null);

  // Kick off sampler loading as soon as the hook mounts
  useEffect(() => {
    getSampler().then(() => setSamplerReady(true));
  }, []);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel(); // clear all scheduled events
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

      // Ensure AudioContext is resumed (browsers require a user gesture)
      await Tone.start();

      // Wait for samples if not yet loaded
      if (!samplerReady) {
        await getSampler();
        setSamplerReady(true);
      }

      const sampler = samplerInstance!;
      const secPerBeat = 60 / bpm;

      // Build a flat list of timed events for both hands
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
                  note: note.pitch, // e.g. "C4", "F#3"
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
                    velocity: 0.55, // left hand slightly quieter
                  });
                }
              }
              tLeft += durSec;
            }
          }
        }
      }

      if (events.length === 0) return;

      // Set transport tempo
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().cancel();

      // Schedule all notes via Tone.Part (time is in seconds from transport start)
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

      // Auto-stop when piece finishes
      Tone.getTransport().scheduleOnce(() => {
        stop();
      }, totalDuration + 1.5); // +1.5s for last note's release tail
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

  return { isPlaying, tempo, setTempo, toggle, stop, samplerReady };
}
