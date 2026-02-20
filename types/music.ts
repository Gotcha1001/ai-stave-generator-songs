// ============================================================
// SHARED TYPES
// ============================================================

export interface MusicNote {
  pitch: string; // e.g. "C4", "F#5", or "rest"
  duration: number; // 4=whole, 2=half, 1=quarter, 0.5=quaver, 0.25=semiquaver
  rest?: boolean;
  tied?: boolean; // tied to next note
}

export interface Bar {
  chord: string; // Roman numeral e.g. "I", "IV", "V7"
  chordName?: string; // actual chord name e.g. "C major"
  notes: MusicNote[];
}

export interface Section {
  id: string; // "A", "B", "C"
  label: string; // "Main Theme", "Contrasting Section"
  bars: Bar[];
}

export interface MusicPiece {
  title: string;
  key: string; // e.g. "C", "Am", "Bb"
  mode: "major" | "minor";
  timeSig: string; // "4/4", "3/4", "6/8"
  tempo: number; // BPM
  genre: string;
  difficulty: string;
  chordProgression: string[]; // e.g. ["I","IV","V","I"]
  sections: Section[];
  structure: string[]; // e.g. ["A","A","B","A"]
  description?: string; // AI-generated performance notes
}

export type Clef = "treble" | "bass";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Genre =
  | "classical"
  | "romantic"
  | "jazz"
  | "folk"
  | "waltz"
  | "march"
  | "blues"
  | "ragtime"
  | "baroque";

export type TimeSignature = "4/4" | "3/4" | "6/8" | "2/4" | "auto";

export type MusicalKey =
  | "C"
  | "G"
  | "D"
  | "A"
  | "F"
  | "Bb"
  | "Eb"
  | "Am"
  | "Em"
  | "Bm"
  | "Dm"
  | "Gm"
  | "auto";

export type StructureType =
  | "ABA"
  | "AABA"
  | "AB"
  | "AABB"
  | "ABACA"
  | "through";

export interface GenerateOptions {
  prompt: string;
  key: MusicalKey;
  timeSig: TimeSignature;
  difficulty: Difficulty;
  genre: Genre;
  structure: StructureType;
}
