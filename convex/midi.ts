// convex/midi.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Optional: keep this local helper if you prefer it over importing from musicTheory
// (but ideally remove it and import the real one)
const midiToPitchLocal = (midi: number): string => {
  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midi / 12) - 1;
  return `${notes[midi % 12]}${octave}`;
};

export const createRecording = mutation({
  args: {
    title: v.string(),
    tempo: v.number(),
    timeSig: v.string(),
    bars: v.array(
      v.object({
        chord: v.optional(v.string()),
        chordName: v.optional(v.string()),
        notes: v.array(v.any()), // client-side validation recommended
        leftNotes: v.optional(v.array(v.any())),
      }),
    ),
    rightHandOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // FIXED: use correct index name + correct field name
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)) // or identity.tokenIdentifier if that's what you store
      .unique();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("midiRecordings", {
      userId: user._id,
      title: args.title,
      tempo: args.tempo,
      timeSig: args.timeSig,
      bars: args.bars,
      rightHandOnly: args.rightHandOnly,
      createdAt: Date.now(),
    });
  },
});

export const getUserRecordings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // FIXED: same changes here
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)) // ← key fix
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("midiRecordings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ── Delete MIDI recording ─────────────────────────────────────────────────────
export const deleteRecording = mutation({
  args: { id: v.id("midiRecordings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const recording = await ctx.db.get(args.id);
    if (!recording) throw new Error("Not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || recording.userId !== user._id) throw new Error("Forbidden");

    await ctx.db.delete(args.id);
  },
});
