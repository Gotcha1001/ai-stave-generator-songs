"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import type { NoteType } from "@/lib/musicGenerator";

// Reuse the sampler singleton from your studio page
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

type Props = {
  rightNotes: NoteType[]; // ← renamed from `notes` — pass BOTH hands
  leftNotes: NoteType[];
  tempo: number;
  onBeatUpdate: (beat: number) => void;
};

export default function MidiPlayer({
  rightNotes,
  leftNotes,
  tempo,
  onBeatUpdate,
}: Props) {
  const rafRef = useRef<number | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSampler().then(() => setReady(true));
  }, []);

  function tick() {
    const seconds = Tone.getTransport().seconds;
    onBeatUpdate((seconds / 60) * tempo);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start() {
    stop(); // clean slate
    await Tone.start();
    if (!ready) {
      await getSampler();
      setReady(true);
    }

    const sampler = samplerInstance!;
    const secPerBeat = 60 / tempo;

    type Ev = {
      time: number;
      note: string;
      duration: number;
      velocity: number;
    };
    const events: Ev[] = [];

    // Schedule right hand
    let t = 0;
    for (const n of rightNotes) {
      const dur = (VEX_DUR_TO_BEATS[n.duration] ?? 1) * secPerBeat;
      if (!n.isRest && n.pitch && n.pitch !== "rest") {
        events.push({ time: t, note: n.pitch, duration: dur, velocity: 0.8 });
      }
      t += dur;
    }
    const totalRight = t;

    // Schedule left hand (concurrent from time 0)
    t = 0;
    for (const n of leftNotes) {
      const dur = (VEX_DUR_TO_BEATS[n.duration] ?? 1) * secPerBeat;
      if (!n.isRest && n.pitch && n.pitch !== "rest") {
        events.push({ time: t, note: n.pitch, duration: dur, velocity: 0.55 });
      }
      t += dur;
    }
    const totalDuration = Math.max(totalRight, t);

    if (events.length === 0) return;

    Tone.getTransport().bpm.value = tempo;
    Tone.getTransport().cancel();

    const part = new Tone.Part<Ev>((time, ev) => {
      sampler.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, events);
    part.start(0);
    partRef.current = part;

    Tone.getTransport().start();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);

    // Auto-stop
    Tone.getTransport().scheduleOnce(() => stop(), totalDuration + 1.5);
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    partRef.current?.dispose();
    partRef.current = null;
    onBeatUpdate(0);
    setIsPlaying(false);
  }

  useEffect(() => () => stop(), []); // cleanup on unmount

  return (
    <div className="flex gap-3">
      <button onClick={start} disabled={isPlaying || !ready}>
        {ready ? "Play" : "Loading..."}
      </button>
      <button onClick={stop} disabled={!isPlaying}>
        Stop
      </button>
    </div>
  );
}
