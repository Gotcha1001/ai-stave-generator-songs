// import type {
//   MusicPiece,
//   Difficulty,
//   Genre,
//   StructureType,
// } from "../../types/music";

// interface GenerateOptions {
//   prompt: string;
//   key: string;
//   timeSig: string;
//   difficulty: Difficulty;
//   genre: Genre;
//   structure: StructureType;
// }

// const SYSTEM_PROMPT = `You are a professional music composer and conservatory-trained music theorist. Your task is to generate complete, musically coherent compositions as structured JSON.

// ABSOLUTE RULES — violating these makes the piece unplayable:
// 1. Notes in each bar MUST sum exactly to the bar's beat count (e.g. 4/4 = 4 beats, 3/4 = 3 beats, 6/8 = 3 half-beats so notes sum to 3.0 using duration 0.5 units).
// 2. Use proper voice leading: avoid large random leaps, prefer stepwise motion, resolve tendency tones.
// 3. End every phrase on a stable tone (tonic, 3rd, or 5th). End the piece on the tonic.
// 4. Chord tones should dominate (70%+ of notes should be chord tones); passing/neighbor tones add colour.
// 5. ALWAYS include quavers (duration 0.5) unless difficulty is beginner. Quavers make music sound alive.
// 6. Repetition is essential: the A section must return recognisably. The B section should contrast.
// 7. Pitch strings must be formatted as NoteName+Octave e.g. "C4", "F#4", "Bb3". No spaces.
// 8. Rest objects must have: { "pitch": "rest", "duration": X, "rest": true }

// DIFFICULTY GUIDE:
// - beginner: Only quarter (1) and half (2) notes. Stepwise or small leaps. One octave range max. Short sections (2-4 bars).
// - intermediate: Include quavers (0.5) for melodic runs. Leaps up to a 6th. 4-bar sections. Mix of note values including occasional dotted quarters (1.5).
// - advanced: Freely use quavers (0.5) and semiquavers (0.25). Syncopation welcome. Wide range. 4-8 bar sections.

// STRUCTURE GUIDE (use these patterns in the "structure" array):
// - ABA: [A, A, B, A] — classic ternary. B section contrasts.
// - AABA: [A, A, B, A] — 32-bar form common in jazz/pop.
// - AB: [A, B] — simple binary.
// - AABB: [A, A, B, B] — both sections repeated.
// - ABACA: [A, B, A, C, A] — rondo. C section adds further contrast.
// - through: [A, B, C] — through-composed, no repeats.

// Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
// {
//   "title": "string",
//   "key": "string",
//   "mode": "major" | "minor",
//   "timeSig": "4/4" | "3/4" | "6/8" | "2/4",
//   "tempo": number,
//   "genre": "string",
//   "difficulty": "string",
//   "chordProgression": ["I","IV","V","I"],
//   "sections": [
//     {
//       "id": "A",
//       "label": "string description",
//       "bars": [
//         {
//           "chord": "I",
//           "chordName": "C major",
//           "notes": [
//             { "pitch": "E4", "duration": 1 },
//             { "pitch": "F4", "duration": 0.5 },
//             { "pitch": "E4", "duration": 0.5 },
//             { "pitch": "D4", "duration": 1 },
//             { "pitch": "C4", "duration": 1 }
//           ]
//         }
//       ]
//     }
//   ],
//   "structure": ["A","A","B","A"],
//   "description": "Performance notes for the player"
// }`;

// export async function generateMusicPiece(
//   opts: GenerateOptions,
// ): Promise<MusicPiece> {
//   const { prompt, key, timeSig, difficulty, genre, structure } = opts;

//   const keyDisplay =
//     key === "auto" ? "choose the most musically fitting key" : key;
//   const timeSigDisplay =
//     timeSig === "auto"
//       ? "choose the most appropriate time signature for the genre"
//       : timeSig;

//   const barsPerSection =
//     difficulty === "beginner" ? "2-4" : difficulty === "advanced" ? "4-8" : "4";

//   const userPrompt = `Compose a ${genre} piece inspired by this description: "${prompt}"

// Parameters:
// - Key: ${keyDisplay}
// - Time signature: ${timeSigDisplay}
// - Difficulty: ${difficulty}
// - Genre: ${genre}
// - Structure: ${structure} — use the structure pattern for the "structure" array
// - Bars per section: ${barsPerSection}

// Requirements:
// - The melody must tell a musical story with a clear beginning, development, and resolution
// - Include genuine melodic repetition: the opening motive should return in the A section
// - The B section should modulate in character (not necessarily key) — contrast in register, rhythm, or mood
// - For ${difficulty} difficulty, note values used: ${
//     difficulty === "beginner"
//       ? "quarters (1) and halves (2) ONLY"
//       : difficulty === "intermediate"
//         ? "halves (2), quarters (1), and quavers (0.5) — include quavers in melodic runs"
//         : "all values including quavers (0.5) and semiquavers (0.25) — use them freely"
//   }
// - Chord progression should follow ${genre} conventions: ${
//     genre === "jazz"
//       ? "ii-V-I progressions, dominant 7ths, extended chords"
//       : genre === "blues"
//         ? "I-IV-V blues progression with blue notes"
//         : genre === "baroque"
//           ? "circle of fifths sequences, suspensions, continuo-style bass"
//           : "classical functional harmony with clear cadences"
//   }
// - End the final bar of the piece with a perfect authentic cadence (V → I)`;

//   const response = await fetch("https://api.anthropic.com/v1/messages", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "claude-sonnet-4-20250514",
//       max_tokens: 6000,
//       system: SYSTEM_PROMPT,
//       messages: [{ role: "user", content: userPrompt }],
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`API error: ${response.status} ${response.statusText}`);
//   }

//   interface AnthropicContentBlock {
//     type: string;
//     text?: string;
//   }

//   const data = (await response.json()) as { content?: AnthropicContentBlock[] };
//   const text: string = data.content?.map((c) => c.text ?? "").join("") ?? "";

//   // Extract JSON — the model sometimes wraps in markdown
//   const jsonMatch = text.match(/\{[\s\S]*\}/);
//   if (!jsonMatch) throw new Error("No JSON found in AI response");

//   let piece: MusicPiece;
//   try {
//     piece = JSON.parse(jsonMatch[0]);
//   } catch (e) {
//     throw new Error("Invalid JSON from AI: " + (e as Error).message);
//   }

//   // Validate basic structure
//   if (!piece.sections || !Array.isArray(piece.sections)) {
//     throw new Error("Piece missing sections array");
//   }
//   if (!piece.structure || !Array.isArray(piece.structure)) {
//     piece.structure = piece.sections.map((s) => s.id);
//   }

//   return piece;
// }

// generateMusic.ts

import type { GenerateOptions, MusicPiece } from "../../types/music";

export async function generateMusicPiece({
  prompt,
  key,
  timeSig,
  difficulty,
  genre,
  structure,
  notation,
}: GenerateOptions): Promise<MusicPiece> {
  const notationInstruction =
    notation === "lead-sheet"
      ? `
NOTATION: Lead Sheet format.
- Generate ONE staff only: treble clef (right hand melody).
- Place chord symbols above each bar.
- Do NOT generate leftNotes — omit that field entirely.
- Each bar must have: chord, chordName, and notes (melody only).
`
      : `
NOTATION: Classical Grand Staff format.
- You MUST generate TWO hands of music. This is NON-NEGOTIABLE.
- "notes" = RIGHT HAND (treble clef) — melody, pitches in octaves 4-6.
- "leftNotes" = LEFT HAND (bass clef) — THIS FIELD IS MANDATORY. NEVER omit it.
- Every single bar object MUST contain BOTH a "notes" array AND a "leftNotes" array.
- A bar missing "leftNotes" is an ERROR. Every bar needs both arrays.
- leftNotes pitches should be in a lower register (octaves 2-4).
- Left hand patterns by genre:
    - Classical/Romantic: Alberti bass (root, fifth, third, fifth e.g. C3,G3,E3,G3)
    - Baroque: Walking bass line with stepwise motion
    - Jazz: Rootless chord voicings, shell voicings in octave 3
    - Rock/Metal: Power chords or root-fifth patterns in octave 2-3
    - Waltz/Folk: Bass note on beat 1, chord on beats 2 and 3
    - Blues: Walking bass line in octave 2-3
    - March: Alternating bass (root on beat 1, fifth on beat 3)
`;

  const systemPrompt = `You are an expert music composer and music theorist with deep knowledge of harmony, voice leading, and idiomatic writing for piano. You compose music that is musically coherent, stylistically appropriate, and correctly structured. You always return valid JSON with no extra text, no markdown fences, no explanation — only the raw JSON object.`;

  const userPrompt = `
Compose a piece with these parameters:
- Key: ${key}
- Time Signature: ${timeSig}
- Difficulty: ${difficulty}
- Genre: ${genre}
- Structure: ${structure}
- Description: ${prompt || "A pleasant melodic piece"}

${notationInstruction}

Requirements:
- Use proper voice leading and harmonic progression.
- The structure field in the JSON must be an array of section IDs matching the sections you generate, e.g. ["A","A","B","A"] for ABA.
- Duration values must be numbers: 4=whole, 2=half, 1=quarter, 0.5=quaver(eighth), 0.25=semiquaver(sixteenth).
- Pitch format: "C4", "F#3", "Bb5" etc. Use "rest" for rests.
- Ensure all bars in a section sum to the correct number of beats for the time signature.
- Generate at least 8 bars total, more for longer structures.
- Include a description field with brief performance notes.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
${notation === "lead-sheet" ? LEAD_SHEET_SCHEMA : CLASSICAL_SCHEMA}
`;

  const PREFILL = '{"title":';

  const response = await fetch("/api/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: PREFILL },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${response.status}`);
  }

  const data = await response.json();
  const raw: string = data.content[0].text;

  const json = (PREFILL + raw)
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  let parsed: MusicPiece;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Debug: log what the AI returned so we can see if leftNotes is present
  if (notation === "classical") {
    const firstBar = parsed.sections?.[0]?.bars?.[0];
    if (!firstBar?.leftNotes) {
      console.error("AI RESPONSE MISSING leftNotes. Raw response:", raw);
      console.error("First bar:", JSON.stringify(firstBar, null, 2));
      throw new Error("AI did not generate left hand notes. Please try again.");
    }
  }

  return parsed;
}

// ─── Schema hints embedded in the prompt ──────────────────────

const LEAD_SHEET_SCHEMA = `
{
  "title": "string",
  "key": "string",
  "mode": "major" | "minor",
  "timeSig": "string",
  "tempo": number,
  "genre": "string",
  "difficulty": "string",
  "chordProgression": ["string"],
  "structure": ["string"],
  "description": "string",
  "sections": [
    {
      "id": "string",
      "label": "string",
      "bars": [
        {
          "chord": "string",
          "chordName": "string",
          "notes": [
            { "pitch": "string", "duration": number, "rest": false }
          ]
        }
      ]
    }
  ]
}`;

const CLASSICAL_SCHEMA = `
{
  "title": "string",
  "key": "string",
  "mode": "major" | "minor",
  "timeSig": "string",
  "tempo": number,
  "genre": "string",
  "difficulty": "string",
  "chordProgression": ["string"],
  "structure": ["string"],
  "description": "string",
  "sections": [
    {
      "id": "string",
      "label": "string",
      "bars": [
        {
          "chord": "string",
          "chordName": "string",
          "notes": [
            { "pitch": "string", "duration": number, "rest": false }
          ],
          "leftNotes": [
            { "pitch": "string", "duration": number, "rest": false }
          ]
        }
      ]
    }
  ]
}

CRITICAL: Every bar MUST have both "notes" AND "leftNotes". A bar without "leftNotes" is INVALID.`;
