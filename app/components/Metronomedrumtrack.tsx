"use client";

/**
 * MetronomeDrumTrack.tsx  (v4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Time-signature aware metronome / drum track.
 * Reads timeSig prop and adjusts beat count + drum pattern automatically.
 *
 * Supported: 2/4  3/4  4/4  6/8  5/4  7/8  (defaults to 4/4 for unknowns)
 *
 * Off / Click / Drum = mode selectors only — audio starts with isPlaying.
 * tempo is fully controlled by the parent slider — no internal BPM controls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type DrumMode = "off" | "click" | "drum";

interface Props {
  tempo: number; // driven by parent slider
  isPlaying: boolean; // driven by Play button
  timeSig?: string; // e.g. "4/4", "3/4", "6/8" — from the piece
  onModeChange?: (mode: DrumMode) => void;
  className?: string;
}

// ── Time signature configs ────────────────────────────────────────────────────
// Each entry defines:
//   beats      — how many beats to show as indicator dots
//   subdivisions — 16th-note steps per bar (beats × subdivision per beat)
//   noteValue  — duration of one step in beats (e.g. 0.25 = 16th note, 0.5 = 8th)
//   kick / snare / hihat — boolean arrays of length `subdivisions`

interface TimeSigConfig {
  beats: number;
  subdivisions: number;
  noteValue: number; // fraction of a beat per step
  kick: readonly number[];
  snare: readonly number[];
  hihat: readonly number[];
}

const TIME_SIG_CONFIGS: Record<string, TimeSigConfig> = {
  "4/4": {
    beats: 4,
    subdivisions: 16,
    noteValue: 0.25,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
  "3/4": {
    beats: 3,
    subdivisions: 12,
    noteValue: 0.25,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
  "2/4": {
    beats: 2,
    subdivisions: 8,
    noteValue: 0.25,
    kick: [1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0],
  },
  "6/8": {
    // 6 eighth-note beats grouped 3+3 — steps are 8th notes
    beats: 6,
    subdivisions: 6,
    noteValue: 0.5,
    kick: [1, 0, 0, 1, 0, 0],
    snare: [0, 0, 1, 0, 0, 1],
    hihat: [1, 1, 1, 1, 1, 1],
  },
  "5/4": {
    beats: 5,
    subdivisions: 20,
    noteValue: 0.25,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
  "7/8": {
    // 7 eighth-note beats grouped 2+2+3 — steps are 8th notes
    beats: 7,
    subdivisions: 7,
    noteValue: 0.5,
    kick: [1, 0, 1, 0, 1, 0, 0],
    snare: [0, 1, 0, 1, 0, 0, 1],
    hihat: [1, 1, 1, 1, 1, 1, 1],
  },
};

// Fallback to 4/4 for any unrecognised signature
function getConfig(timeSig: string): TimeSigConfig {
  return TIME_SIG_CONFIGS[timeSig] ?? TIME_SIG_CONFIGS["4/4"];
}

// ── Web Audio synth helpers ───────────────────────────────────────────────────
function scheduleClick(ctx: AudioContext, t: number, isDown: boolean) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.frequency.value = isDown ? 1000 : 800;
  g.gain.setValueAtTime(isDown ? 0.6 : 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.start(t);
  o.stop(t + 0.07);
}

function scheduleKick(ctx: AudioContext, t: number) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.start(t);
  o.stop(t + 0.19);
}

function scheduleSnare(ctx: AudioContext, t: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const g = ctx.createGain(),
    f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1800;
  s.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  s.start(t);
  s.stop(t + 0.13);
}

function scheduleHiHat(ctx: AudioContext, t: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const g = ctx.createGain(),
    f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 8000;
  s.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  s.start(t);
  s.stop(t + 0.06);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MetronomeDrumTrack({
  tempo,
  isPlaying,
  timeSig = "4/4",
  onModeChange,
  className = "",
}: Props) {
  const [mode, setMode] = useState<DrumMode>("off");
  const [beat, setBeat] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimeRef = useRef(0);
  const stepRef = useRef(0);

  // Always-fresh refs — scheduler reads these, never stale closures
  const bpmRef = useRef(tempo);
  const modeRef = useRef(mode);
  const configRef = useRef(getConfig(timeSig));

  useEffect(() => {
    bpmRef.current = tempo;
  }, [tempo]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    configRef.current = getConfig(timeSig);
  }, [timeSig]);

  const handleModeSelect = (m: DrumMode) => {
    setMode(m);
    onModeChange?.(m);
  };

  // ── Scheduler — all live values via refs, tempo + timeSig changes are instant
  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      const cfg = configRef.current;
      const step = stepRef.current;
      const t = nextTimeRef.current;
      // noteValue is fraction-of-a-beat per step; convert to seconds
      const stepSec = (60 / bpmRef.current) * cfg.noteValue;

      if (modeRef.current === "click") {
        // Click on every beat (step 0) and downbeat (step 0 of bar)
        const stepsPerBeat = Math.round(1 / cfg.noteValue);
        if (step % stepsPerBeat === 0) {
          scheduleClick(ctx, t, step === 0);
        }
      } else if (modeRef.current === "drum") {
        if (cfg.kick[step]) scheduleKick(ctx, t);
        if (cfg.snare[step]) scheduleSnare(ctx, t);
        if (cfg.hihat[step]) scheduleHiHat(ctx, t);
      }

      // Beat indicator — fire on each beat step
      const stepsPerBeat = Math.round(1 / cfg.noteValue);
      if (step % stepsPerBeat === 0) {
        const b = Math.floor(step / stepsPerBeat);
        setTimeout(() => setBeat(b), Math.max(0, (t - ctx.currentTime) * 1000));
      }

      nextTimeRef.current += stepSec;
      stepRef.current = (step + 1) % cfg.subdivisions;
    }

    timerRef.current = setTimeout(schedule, 25);
  }, []);

  // ── Start / stop — reacts to isPlaying + mode only ───────────────────────
  useEffect(() => {
    const stop = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setBeat(-1);
    };

    if (!isPlaying || mode === "off") {
      stop();
      return;
    }

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    } else if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }

    stepRef.current = 0;
    nextTimeRef.current = ctxRef.current.currentTime + 0.05;
    schedule();

    return stop;
    // tempo + timeSig intentionally excluded — configRef/bpmRef keep them live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, mode]);

  // Cleanup
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ctxRef.current?.close();
    },
    [],
  );

  const isActive = isPlaying && mode !== "off";
  const cfg = getConfig(timeSig);
  const beatDots = Array.from({ length: cfg.beats }, (_, i) => i);

  return (
    <div
      className={`
        flex flex-col gap-3 rounded-2xl border border-stone-800
        bg-stone-900 p-4 shadow-sm max-w-sm
        ${className}
      `}
    >
      {/* Header: title + tempo + time sig readout */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-stone-200">
          <span
            className={`
              inline-block h-2.5 w-2.5 rounded-full transition-colors duration-100
              ${
                isActive
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  : "bg-stone-600"
              }
            `}
            style={{
              animation: isActive
                ? "pulse 0.5s ease-in-out infinite alternate"
                : "none",
            }}
          />
          Metronome / Drum Track
        </span>
        {/* Live readout — mirrors parent, no controls here */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-stone-500 border border-stone-700 rounded px-1.5 py-0.5">
            {timeSig}
          </span>
          <span className="text-xs font-mono font-bold tabular-nums text-amber-400">
            {tempo} BPM
          </span>
        </div>
      </div>

      {/* Beat indicators — count adjusts to time signature */}
      <div className="flex justify-center gap-1.5 h-3">
        {beatDots.map((b) => (
          <div
            key={b}
            className={`
              rounded-full transition-all duration-75
              ${beatDots.length <= 4 ? "h-3 w-3" : "h-3 w-2"}
              ${
                isActive && beat === b
                  ? b === 0
                    ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)] scale-125"
                    : "bg-amber-300 scale-110"
                  : "bg-stone-700"
              }
            `}
          />
        ))}
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["off", "click", "drum"] as DrumMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeSelect(m)}
            className={`
              flex-1 rounded-xl py-2 text-xs font-semibold
              transition-all duration-150
              ${
                mode === m
                  ? m === "off"
                    ? "bg-stone-700 text-stone-300 ring-1 ring-stone-600"
                    : "bg-amber-400 text-stone-950 shadow-md"
                  : "border border-stone-700 hover:border-stone-500 text-stone-500 hover:text-stone-300"
              }
            `}
          >
            {m === "off" ? "⏹ Off" : m === "click" ? "🎯 Click" : "🥁 Drum"}
          </button>
        ))}
      </div>

      {/* Status */}
      <p className="text-center text-[10px] text-stone-500">
        {mode === "off"
          ? "Select Click or Drum, then press ▶ Play"
          : isActive
            ? mode === "click"
              ? `● Metronome · ${timeSig} · ${tempo} BPM`
              : `● Drum loop · ${timeSig} · ${tempo} BPM`
            : `${mode === "click" ? "Click" : "Drum"} ready · ${timeSig} · press ▶ Play`}
      </p>
    </div>
  );
}
