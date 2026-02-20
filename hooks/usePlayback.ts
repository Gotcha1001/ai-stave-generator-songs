"use client";

import { useRef, useState, useCallback } from "react";

import { parsePitch, pitchToMidi, midiToFreq } from "@/lib/musicTheory";
import { MusicPiece } from "@/types/music";

interface UsePlaybackReturn {
  isPlaying: boolean;
  tempo: number;
  setTempo: (bpm: number) => void;
  toggle: () => void;
  stop: () => void;
}

export function usePlayback(piece: MusicPiece | null): UsePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempoState] = useState(90);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const play = useCallback(
    (bpm: number) => {
      if (!piece) return;
      stop();

      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioContextClass!();
      audioCtxRef.current = ctx;
      setIsPlaying(true);

      const secPerBeat = 60 / bpm;

      // Collect all notes in playback order
      const allNotes: Array<{
        pitch: string;
        duration: number;
        rest: boolean;
      }> = [];
      for (const secId of piece.structure) {
        const sec = piece.sections.find((s) => s.id === secId);
        if (!sec) continue;
        for (const bar of sec.bars) {
          for (const note of bar.notes) {
            allNotes.push({
              pitch: note.pitch,
              duration: note.duration,
              rest: note.rest ?? note.pitch === "rest",
            });
          }
        }
      }

      let t = ctx.currentTime + 0.05;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
      masterGain.connect(ctx.destination);

      for (const note of allNotes) {
        const durSec = note.duration * secPerBeat;
        if (!note.rest) {
          const parsed = parsePitch(note.pitch);
          if (parsed) {
            const midi = pitchToMidi(parsed.note, parsed.octave);
            const freq = midiToFreq(midi);
            scheduleTone(ctx, masterGain, freq, t, durSec);
          }
        }
        t += durSec;
      }

      const totalTime = (t - ctx.currentTime) * 1000 + 300;
      stopTimeoutRef.current = setTimeout(() => stop(), totalTime);
    },
    [piece, stop],
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
        // Small delay so state updates before replaying
        setTimeout(() => play(bpm), 100);
      }
    },
    [isPlaying, stop, play],
  );

  return { isPlaying, tempo, setTempo, toggle, stop };
}

function scheduleTone(
  ctx: AudioContext,
  destination: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(destination);

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, startTime);

  const attack = 0.015;
  const release = Math.min(0.1, duration * 0.25);
  const sustain = duration - attack - release;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.4, startTime + attack);
  if (sustain > 0) gain.gain.setValueAtTime(0.35, startTime + attack + sustain);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}
