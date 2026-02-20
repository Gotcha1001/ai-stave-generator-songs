// import { mutation, query } from "./_generated/server";
// import { v } from "convex/values";

// const noteValidator = v.object({
//   pitch: v.string(),
//   duration: v.string(),
// });

// export const createSong = mutation({
//   args: {
//     prompt: v.string(),
//     key: v.string(),
//     tempo: v.number(),
//     rightHand: v.array(noteValidator),
//     leftHand: v.array(noteValidator),
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Unauthorized");

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user) throw new Error("User not found");

//     return await ctx.db.insert("songs", {
//       userId: user._id,
//       prompt: args.prompt,
//       key: args.key,
//       tempo: args.tempo,
//       rightHand: args.rightHand,
//       leftHand: args.leftHand,
//       createdAt: Date.now(),
//     });
//   },
// });

// export const getMySongs = query({
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return [];

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
//       .first();

//     if (!user) return [];

//     return await ctx.db
//       .query("songs")
//       .withIndex("by_user", (q) => q.eq("userId", user._id))
//       .collect();
//   },
// });
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Validators ────────────────────────────────────────────────────────────────

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

// ── Mutations ─────────────────────────────────────────────────────────────────

export const savePiece = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("pieces", {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const deletePiece = mutation({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const piece = await ctx.db.get(args.id);
    if (!piece) throw new Error("Not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || piece.userId !== user._id) throw new Error("Forbidden");

    await ctx.db.delete(args.id);
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const getMyPieces = query({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pieces: [], nextCursor: null, isDone: true };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return { pieces: [], nextCursor: null, isDone: true };

    const result = await ctx.db
      .query("pieces")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate({ numItems: 12, cursor: args.cursor ?? null });

    return {
      pieces: result.page,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getPieceById = query({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const piece = await ctx.db.get(args.id);
    if (!piece) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || piece.userId !== user._id) return null;

    return piece;
  },
});

// ── Legacy ────────────────────────────────────────────────────────────────────

export const createSong = mutation({
  args: {
    prompt: v.string(),
    key: v.string(),
    tempo: v.number(),
    rightHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
    leftHand: v.array(v.object({ pitch: v.string(), duration: v.string() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    return await ctx.db.insert("songs", {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getMySongs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("songs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
