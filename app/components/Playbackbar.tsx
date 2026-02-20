"use client";

interface PlaybackBarProps {
  isPlaying: boolean;
  tempo: number;
  onToggle: () => void;
  onTempoChange: (bpm: number) => void;
}

export default function PlaybackBar({
  isPlaying,
  tempo,
  onToggle,
  onTempoChange,
}: PlaybackBarProps) {
  return (
    <div className="flex items-center gap-4 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 mt-5">
      <button
        onClick={onToggle}
        className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950
                   flex items-center justify-center text-sm transition-colors flex-shrink-0"
        aria-label={isPlaying ? "Stop" : "Play"}
      >
        {isPlaying ? "■" : "▶"}
      </button>

      <div className="flex items-center gap-3 flex-1">
        <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase whitespace-nowrap">
          Tempo
        </span>
        <input
          type="range"
          min={40}
          max={220}
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          className="flex-1 accent-amber-500"
        />
        <span className="text-xs font-mono text-stone-300 w-16 text-right">
          {tempo} BPM
        </span>
      </div>

      <div className="text-[10px] font-mono text-stone-600 whitespace-nowrap">
        {tempoLabel(tempo)}
      </div>
    </div>
  );
}

function tempoLabel(bpm: number): string {
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 132) return "Moderato";
  if (bpm < 168) return "Allegro";
  return "Presto";
}
