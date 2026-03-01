import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const noteV = v.object({
  id: v.string(),
  pitch: v.string(),
  duration: v.string(),
  isRest: v.boolean(),
  barIndex: v.number(),
  voice: v.union(v.literal("treble"), v.literal("bass")),
});

// ── Save (upsert by title for same user) ──────────────────────────────────────
export const saveCustomDraft = mutation({
  args: {
    title: v.string(),
    timeSig: v.string(),
    keySig: v.string(),
    template: v.string(),
    barCount: v.number(),
    tempo: v.number(),
    notes: v.array(noteV),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Check if a draft with this title already exists for this user
    const existing = await ctx.db
      .query("customDrafts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const match = existing.find((d) => d.title === args.title);

    if (match) {
      await ctx.db.patch(match._id, {
        timeSig: args.timeSig,
        keySig: args.keySig,
        template: args.template,
        barCount: args.barCount,
        tempo: args.tempo,
        notes: args.notes,
        updatedAt: now,
      });
      return match._id;
    } else {
      return await ctx.db.insert("customDrafts", {
        userId: user._id,
        title: args.title,
        timeSig: args.timeSig,
        keySig: args.keySig,
        template: args.template,
        barCount: args.barCount,
        tempo: args.tempo,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ── Get all drafts for current user ──────────────────────────────────────────
export const getMyCustomDrafts = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return ctx.db
      .query("customDrafts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ── Delete a draft ────────────────────────────────────────────────────────────
export const deleteCustomDraft = mutation({
  args: { id: v.id("customDrafts") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.delete(id);
  },
});
