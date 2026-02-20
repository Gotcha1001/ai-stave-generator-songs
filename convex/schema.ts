// import { defineSchema, defineTable } from "convex/server";
// import { v } from "convex/values";

// export default defineSchema({
//   users: defineTable({
//     clerkId: v.string(),
//     email: v.string(),
//     name: v.string(),
//     imageUrl: v.optional(v.string()),
//     role: v.union(v.literal("admin"), v.literal("user")),
//     createdAt: v.number(),
//   }).index("by_clerk_id", ["clerkId"]),

//   songs: defineTable({
//     userId: v.id("users"),
//     prompt: v.string(),
//     key: v.string(),
//     tempo: v.number(),
//     rightHand: v.array(
//       v.object({
//         pitch: v.string(),
//         duration: v.string(),
//       }),
//     ),
//     leftHand: v.array(
//       v.object({
//         pitch: v.string(),
//         duration: v.string(),
//       }),
//     ),
//     createdAt: v.number(),
//   }).index("by_user", ["userId"]),
// });

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
    sections: v.array(sectionValidator),
    structure: v.array(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Legacy VexFlow simple songs
  songs: defineTable({
    userId: v.id("users"),
    prompt: v.string(),
    key: v.string(),
    tempo: v.number(),
    rightHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
    leftHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
