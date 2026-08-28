/**
 * Action logs — audit trail for all credential operations.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("actionLogs")
      .order("desc")
      .take(args.limit ?? 50);
    return logs;
  },
});

export const add = mutation({
  args: {
    action: v.string(),
    details: v.string(),
    provider: v.optional(v.string()),
    accountLabel: v.optional(v.string()),
    performedBy: v.optional(v.string()),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("info"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("actionLogs", args);
  },
});
