import type { MusicPiece, GenerateOptions } from "../types/music";

const SYSTEM_PROMPT = `You are a professional music composer and conservatory-trained music theorist. Your task is to generate complete, musically coherent compositions as structured JSON.

ABSOLUTE RULES — violating these makes the piece unplayable:
1. Notes in each bar MUST sum exactly to the bar's beat count (e.g. 4/4 = 4 beats, 3/4 = 3 beats, 6/8 = 3 half-beats so notes sum to 3.0 using duration 0.5 units).
2. Use proper voice leading: avoid large random leaps, prefer stepwise motion, resolve tendency tones.
3. End every phrase on a stable tone (tonic, 3rd, or 5th). End the piece on the tonic.
4. Chord tones should dominate (70%+ of notes should be chord tones); passing/neighbor tones add colour.
5. ALWAYS include quavers (duration 0.5) unless difficulty is beginner.
6. Repetition is essential: the A section must return recognisably. The B section should contrast.
7. Pitch strings must be formatted as NoteName+Octave e.g. "C4", "F#4", "Bb3". No spaces.
8. Rest objects must have: { "pitch": "rest", "duration": X, "rest": true }

DIFFICULTY GUIDE:
- beginner: Only quarter (1) and half (2) notes. Stepwise motion. One octave range max. 2–4 bars per section.
- intermediate: Include quavers (0.5). Leaps up to a 6th. 4 bars per section.
- advanced: Freely use quavers (0.5) and semiquavers (0.25). Syncopation welcome. 4–8 bars per section.

STRUCTURE GUIDE:
- ABA
- AABA
- AB
- AABB
- ABACA
- through

NOTATION RULES:

If notation is "classical":
- You are writing for TWO-STAVE PIANO (treble + bass).
- EVERY bar MUST include a "leftNotes" array.
- leftNotes MUST sum exactly to the bar duration.
- leftNotes MUST contain at least one note.
- leftNotes must outline the chord (root, 5th, broken chord, alberti bass, or waltz pattern).
- Bass range must stay between C2 and C4.
- Both staves must contain playable notes in EVERY bar.

If notation is "lead-sheet":
- Do NOT include "leftNotes" in any bar.
- Only generate melody in "notes".

Return ONLY valid JSON (no markdown, no explanation) matching this schema:

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
      "label": "string",
      "bars": [
        {
          "chord": "I",
          "chordName": "C major",
          "notes": [
            { "pitch": "E4", "duration": 1 }
          ],
          "leftNotes": [
            { "pitch": "C3", "duration": 2 }
          ]
        }
      ]
    }
  ],
  "structure": ["A","A","B","A"],
  "description": "Performance notes"
}
`;

export async function generateMusicPiece(
  opts: GenerateOptions,
): Promise<MusicPiece> {
  const { prompt, key, timeSig, difficulty, genre, structure, notation } = opts;

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
- Structure: ${structure}
- Bars per section: ${barsPerSection}
- Notation: ${notation}

Requirements:
- Clear musical narrative: beginning, development, resolution
- Motivic repetition in A section
- Contrasting B section
- End with a perfect authentic cadence (V → I)
`;

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

  const data = (await response.json()) as {
    content?: AnthropicContentBlock[];
  };

  const text = data.content?.map((c) => c.text ?? "").join("") ?? "";

  // ✅ Safer JSON extraction
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON found in AI response");
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);

  let piece: MusicPiece;

  try {
    piece = JSON.parse(jsonString);

    console.log("🎼 Generated piece:", JSON.stringify(piece, null, 2));
    console.log(
      "🎼 First bar leftNotes:",
      piece.sections?.[0]?.bars?.[0]?.leftNotes,
    );

    // 🔍 Extra validation for classical mode
    if (notation === "classical") {
      const firstBar = piece.sections?.[0]?.bars?.[0];
      if (!firstBar?.leftNotes || firstBar.leftNotes.length === 0) {
        console.warn(
          "⚠️ Classical notation requested but leftNotes missing or empty.",
        );
      }
    }
  } catch (e) {
    throw new Error("Invalid JSON from AI: " + (e as Error).message);
  }

  if (!piece.sections || !Array.isArray(piece.sections)) {
    throw new Error("Piece missing sections array");
  }

  if (!piece.structure || !Array.isArray(piece.structure)) {
    piece.structure = piece.sections.map((s) => s.id);
  }

  return piece;
}
