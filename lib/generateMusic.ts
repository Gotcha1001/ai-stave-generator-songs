import type { MusicPiece, GenerateOptions } from "../types/music";

const SYSTEM_PROMPT = `You are a professional music composer and conservatory-trained music theorist. Your task is to generate complete, musically coherent compositions as structured JSON.

ABSOLUTE RULES — violating these makes the piece unplayable:
1. Notes in each bar MUST sum exactly to the bar's beat count (e.g. 4/4 = 4 beats, 3/4 = 3 beats, 6/8 = 3 half-beats so notes sum to 3.0 using duration 0.5 units).
2. Use proper voice leading: avoid large random leaps, prefer stepwise motion, resolve tendency tones.
3. End every phrase on a stable tone (tonic, 3rd, or 5th). End the piece on the tonic.
4. Chord tones should dominate (70%+ of notes should be chord tones); passing/neighbor tones add colour.
5. ALWAYS include quavers (duration 0.5) unless difficulty is beginner. Quavers make music sound alive.
6. Repetition is essential: the A section must return recognisably. The B section should contrast.
7. Pitch strings must be formatted as NoteName+Octave e.g. "C4", "F#4", "Bb3". No spaces.
8. Rest objects must have: { "pitch": "rest", "duration": X, "rest": true }

DIFFICULTY GUIDE:
- beginner: Only quarter (1) and half (2) notes. Stepwise or small leaps. One octave range max. Short sections (2-4 bars).
- intermediate: Include quavers (0.5) for melodic runs. Leaps up to a 6th. 4-bar sections. Mix of note values including occasional dotted quarters (1.5).
- advanced: Freely use quavers (0.5) and semiquavers (0.25). Syncopation welcome. Wide range. 4-8 bar sections.

STRUCTURE GUIDE (use these patterns in the "structure" array):
- ABA: [A, A, B, A] — classic ternary. B section contrasts.
- AABA: [A, A, B, A] — 32-bar form common in jazz/pop.
- AB: [A, B] — simple binary.
- AABB: [A, A, B, B] — both sections repeated.
- ABACA: [A, B, A, C, A] — rondo. C section adds further contrast.
- through: [A, B, C] — through-composed, no repeats.

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "title": "string",
  "key": "string",
  "mode": "major" | "minor",
  "timeSig": "4/4" | "3/4" | "6/8" | "2/4",
  "tempo": number,
  "genre": "string",
  "difficulty": "string",
  "chordProgression": ["I","IV","V","I"],
  "sections": [
    {
      "id": "A",
      "label": "string description",
      "bars": [
        {
          "chord": "I",
          "chordName": "C major",
          "notes": [
            { "pitch": "E4", "duration": 1 },
            { "pitch": "F4", "duration": 0.5 },
            { "pitch": "E4", "duration": 0.5 },
            { "pitch": "D4", "duration": 1 },
            { "pitch": "C4", "duration": 1 }
          ]
        }
      ]
    }
  ],
  "structure": ["A","A","B","A"],
  "description": "Performance notes for the player"
}`;

export async function generateMusicPiece(
  opts: GenerateOptions,
): Promise<MusicPiece> {
  const { prompt, key, timeSig, difficulty, genre, structure } = opts;

  const keyDisplay =
    key === "auto" ? "choose the most musically fitting key" : key;
  const timeSigDisplay =
    timeSig === "auto"
      ? "choose the most appropriate time signature for the genre"
      : timeSig;

  const barsPerSection =
    difficulty === "beginner" ? "2-4" : difficulty === "advanced" ? "4-8" : "4";

  const userPrompt = `Compose a ${genre} piece inspired by this description: "${prompt}"

Parameters:
- Key: ${keyDisplay}
- Time signature: ${timeSigDisplay}  
- Difficulty: ${difficulty}
- Genre: ${genre}
- Structure: ${structure} — use the structure pattern for the "structure" array
- Bars per section: ${barsPerSection}

Requirements:
- The melody must tell a musical story with a clear beginning, development, and resolution
- Include genuine melodic repetition: the opening motive should return in the A section
- The B section should modulate in character (not necessarily key) — contrast in register, rhythm, or mood
- For ${difficulty} difficulty, note values used: ${
    difficulty === "beginner"
      ? "quarters (1) and halves (2) ONLY"
      : difficulty === "intermediate"
        ? "halves (2), quarters (1), and quavers (0.5) — include quavers in melodic runs"
        : "all values including quavers (0.5) and semiquavers (0.25) — use them freely"
  }
- Chord progression should follow ${genre} conventions: ${
    genre === "jazz"
      ? "ii-V-I progressions, dominant 7ths, extended chords"
      : genre === "blues"
        ? "I-IV-V blues progression with blue notes"
        : genre === "baroque"
          ? "circle of fifths sequences, suspensions, continuo-style bass"
          : "classical functional harmony with clear cadences"
  }
- End the final bar of the piece with a perfect authentic cadence (V → I)`;

  const response = await fetch("/api/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  interface AnthropicContentBlock {
    type: string;
    text?: string;
  }

  const data = (await response.json()) as { content?: AnthropicContentBlock[] };
  const text: string = data.content?.map((c) => c.text ?? "").join("") ?? "";

  // Extract JSON — the model sometimes wraps in markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  let piece: MusicPiece;
  try {
    piece = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("Invalid JSON from AI: " + (e as Error).message);
  }

  // Validate basic structure
  if (!piece.sections || !Array.isArray(piece.sections)) {
    throw new Error("Piece missing sections array");
  }
  if (!piece.structure || !Array.isArray(piece.structure)) {
    piece.structure = piece.sections.map((s) => s.id);
  }

  return piece;
}
