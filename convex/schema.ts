import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const noteValidator = v.object({
  pitch: v.string(),
  duration: v.union(v.string(), v.number()),
  rest: v.optional(v.boolean()),
  tied: v.optional(v.boolean()),
});

const barValidator = v.object({
  chord: v.string(),
  chordName: v.optional(v.string()),
  notes: v.array(noteValidator),
  leftNotes: v.optional(v.array(noteValidator)),
});

const sectionValidator = v.object({
  id: v.string(),
  label: v.string(),
  bars: v.array(barValidator),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Rich AI-generated pieces (full MusicPiece structure)
  pieces: defineTable({
    userId: v.id("users"),
    title: v.string(),
    key: v.string(),
    mode: v.union(v.literal("major"), v.literal("minor")),
    timeSig: v.string(),
    tempo: v.number(),
    genre: v.string(),
    difficulty: v.string(),
    prompt: v.string(),
    chordProgression: v.array(v.string()),
    structure: v.array(v.string()),
    description: v.optional(v.string()),
    notation: v.optional(
      v.union(v.literal("lead-sheet"), v.literal("classical")),
    ),
    sections: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        bars: v.array(
          v.object({
            chord: v.string(),
            chordName: v.optional(v.string()),
            notes: v.array(
              v.object({
                pitch: v.string(),
                duration: v.union(v.string(), v.number()),
                rest: v.optional(v.boolean()),
                tied: v.optional(v.boolean()),
              }),
            ),
            leftNotes: v.optional(
              v.array(
                v.object({
                  pitch: v.string(),
                  duration: v.union(v.string(), v.number()),
                  rest: v.optional(v.boolean()),
                  tied: v.optional(v.boolean()),
                }),
              ),
            ),
          }),
        ),
      }),
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Legacy VexFlow simple songs
  songs: defineTable({
    userId: v.id("users"),
    prompt: v.string(),
    key: v.string(),
    tempo: v.number(),
    timeSig: v.optional(v.string()),
    rightHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
    leftHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  customDrafts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    timeSig: v.string(),
    keySig: v.string(),
    template: v.string(),
    barCount: v.number(),
    tempo: v.number(),
    notes: v.array(
      v.object({
        id: v.string(),
        pitch: v.string(),
        duration: v.string(),
        isRest: v.boolean(),
        barIndex: v.number(),
        voice: v.union(v.literal("treble"), v.literal("bass")),
      }),
    ),
    // ── Optional chord map: keys are bar indices (as strings), values are
    //    chord labels e.g. { "0": "Cmaj7", "2": "Am" }. Optional so that
    //    existing drafts saved before this field was added remain valid.
    // chord map: string bar index → { beat1?, beat2? }
    chords: v.optional(
      v.record(
        v.string(),
        v.object({
          beat1: v.optional(v.string()),
          beat2: v.optional(v.string()),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
