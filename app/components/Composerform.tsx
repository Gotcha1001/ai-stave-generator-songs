"use client";

import type {
  Difficulty,
  Genre,
  MusicalKey,
  TimeSignature,
  StructureType,
} from "../../types/music";

interface ComposerFormProps {
  prompt: string;
  musicalKey: MusicalKey;
  timeSig: TimeSignature;
  difficulty: Difficulty;
  genre: Genre;
  structure: StructureType;
  isLoading: boolean;
  onPromptChange: (v: string) => void;
  onKeyChange: (v: MusicalKey) => void;
  onTimeSigChange: (v: TimeSignature) => void;
  onDifficultyChange: (v: Difficulty) => void;
  onGenreChange: (v: Genre) => void;
  onStructureChange: (v: StructureType) => void;
  onGenerate: () => void;
}

export default function ComposerForm({
  prompt,
  musicalKey,
  timeSig,
  difficulty,
  genre,
  structure,
  isLoading,
  onPromptChange,
  onKeyChange,
  onTimeSigChange,
  onDifficultyChange,
  onGenreChange,
  onStructureChange,
  onGenerate,
}: ComposerFormProps) {
  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Prompt */}
      <div>
        <Label>Describe your piece</Label>
        <textarea
          className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded px-3 py-2.5
                     text-sm leading-relaxed resize-y min-h-[80px] focus:outline-none
                     focus:border-amber-500 placeholder:text-stone-600 font-sans"
          placeholder="e.g. A gentle waltz with a hopeful mood for beginners…"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
        />
      </div>

      {/* Key + Time Sig */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Key</Label>
          <Select
            value={musicalKey}
            onChange={(e) => onKeyChange(e.target.value as MusicalKey)}
          >
            <option value="auto">Auto (AI)</option>
            <optgroup label="Major">
              <option value="C">C major</option>
              <option value="G">G major</option>
              <option value="D">D major</option>
              <option value="A">A major</option>
              <option value="F">F major</option>
              <option value="Bb">B♭ major</option>
              <option value="Eb">E♭ major</option>
            </optgroup>
            <optgroup label="Minor">
              <option value="Am">A minor</option>
              <option value="Em">E minor</option>
              <option value="Bm">B minor</option>
              <option value="Dm">D minor</option>
              <option value="Gm">G minor</option>
            </optgroup>
          </Select>
        </div>
        <div>
          <Label>Time Sig</Label>
          <Select
            value={timeSig}
            onChange={(e) => onTimeSigChange(e.target.value as TimeSignature)}
          >
            <option value="auto">Auto (AI)</option>
            <option value="4/4">4 / 4</option>
            <option value="3/4">3 / 4</option>
            <option value="6/8">6 / 8</option>
            <option value="2/4">2 / 4</option>
          </Select>
        </div>
      </div>

      {/* Difficulty + Genre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Difficulty</Label>
          <Select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
        <div>
          <Label>Genre</Label>
          <Select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value as Genre)}
          >
            <option value="classical">Classical</option>
            <option value="romantic">Romantic</option>
            <option value="baroque">Baroque</option>
            <option value="jazz">Jazz</option>
            <option value="folk">Folk</option>
            <option value="waltz">Waltz</option>
            <option value="march">March</option>
            <option value="blues">Blues</option>
            <option value="ragtime">Ragtime</option>
            <option value="ragtime">Rock</option>
            <option value="ragtime">Metal</option>
            <option value="ragtime">Country</option>
          </Select>
        </div>
      </div>

      {/* Structure */}
      <div>
        <Label>Structure</Label>
        <Select
          value={structure}
          onChange={(e) => onStructureChange(e.target.value as StructureType)}
        >
          <option value="ABA">ABA — Ternary</option>
          <option value="AABA">AABA — 32-bar form</option>
          <option value="AB">AB — Binary</option>
          <option value="AABB">AABB — Repeated binary</option>
          <option value="ABACA">ABACA — Rondo</option>
          <option value="through">Through-composed</option>
        </Select>
      </div>

      {/* Difficulty hint */}
      <div className="rounded border border-stone-700 bg-stone-900 px-3 py-2.5 text-xs text-stone-400 leading-relaxed">
        {difficulty === "beginner" && (
          <>
            <span className="text-amber-400 font-semibold">Beginner: </span>
            Quarter and half notes only. Simple stepwise melody. Great for young
            learners.
          </>
        )}
        {difficulty === "intermediate" && (
          <>
            <span className="text-amber-400 font-semibold">Intermediate: </span>
            Includes <span className="text-amber-300">quavers (♪)</span> for
            melodic interest. Mix of note values, leaps within an octave.
          </>
        )}
        {difficulty === "advanced" && (
          <>
            <span className="text-amber-400 font-semibold">Advanced: </span>
            Quavers, semiquavers, syncopation, wide range. Complex harmonic
            language.
          </>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="mt-auto w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50
                   disabled:cursor-not-allowed text-stone-950 font-semibold py-3 px-4
                   rounded text-sm tracking-wide transition-colors duration-150
                   font-serif italic text-base"
      >
        {isLoading ? "Composing…" : "♩ Compose"}
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-amber-400 text-[10px] font-mono uppercase tracking-widest mb-1.5">
      {children}
    </div>
  );
}

function Select({
  children,
  value,
  onChange,
}: {
  children: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-stone-900 border border-stone-700 text-stone-200
                 font-mono text-xs rounded px-2.5 py-2 focus:outline-none
                 focus:border-amber-500 cursor-pointer appearance-none"
    >
      {children}
    </select>
  );
}
