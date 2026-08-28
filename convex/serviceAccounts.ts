/**
 * Service account CRUD — manage API credentials for all providers.
 */
import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";

// ─── Queries ────────────────────────────────────────────────

// List all accounts (tokens masked for UI)
export const list = query({
  args: { provider: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const accounts = args.provider
      ? await ctx.db
          .query("serviceAccounts")
          .withIndex("by_provider", (idx) => idx.eq("provider", args.provider!))
          .collect()
      : await ctx.db.query("serviceAccounts").collect();
    return accounts.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      provider: a.provider,
      label: a.label,
      hasToken: !!a.apiToken,
      tokenPreview: a.apiToken ? `…${a.apiToken.slice(-8)}` : "",
      apiUrl: a.apiUrl,
      username: a.username,
      status: a.status,
      lastVerifiedAt: a.lastVerifiedAt,
      lastError: a.lastError,
      addedBy: a.addedBy,
    }));
  },
});

// Check if any accounts exist for a provider
export const hasAny = query({
  args: { provider: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.provider) {
      const first = await ctx.db
        .query("serviceAccounts")
        .withIndex("by_provider", (idx) => idx.eq("provider", args.provider!))
        .first();
      return first !== null;
    }
    const first = await ctx.db.query("serviceAccounts").first();
    return first !== null;
  },
});

// Internal: get all accounts with full tokens (for HTTP API)
export const listWithTokens = internalQuery({
  args: { provider: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const accounts = args.provider
      ? await ctx.db
          .query("serviceAccounts")
          .withIndex("by_provider", (idx) => idx.eq("provider", args.provider!))
          .collect()
      : await ctx.db.query("serviceAccounts").collect();
    return accounts;
  },
});

// Internal: get a single account with full token
export const getWithToken = internalQuery({
  args: { id: v.id("serviceAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Mutations ──────────────────────────────────────────────

// Internal version of add — used by HTTP endpoints
export const addInternal = internalMutation({
  args: {
    provider: v.string(),
    label: v.string(),
    apiToken: v.string(),
    apiUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    extraConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert by provider+label to avoid duplicates
    const existing = await ctx.db
      .query("serviceAccounts")
      .withIndex("by_provider_label", (q) =>
        q.eq("provider", args.provider).eq("label", args.label)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiToken: args.apiToken,
        apiUrl: args.apiUrl,
        username: args.username,
        extraConfig: args.extraConfig,
        status: "connected",
      });
      return existing._id;
    }

    return await ctx.db.insert("serviceAccounts", {
      provider: args.provider,
      label: args.label,
      apiToken: args.apiToken,
      apiUrl: args.apiUrl,
      username: args.username,
      extraConfig: args.extraConfig,
      status: "connected",
    });
  },
});

export const add = mutation({
  args: {
    provider: v.string(),
    label: v.string(),
    apiToken: v.string(),
    apiUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    extraConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("serviceAccounts", {
      provider: args.provider,
      label: args.label,
      apiToken: args.apiToken,
      apiUrl: args.apiUrl,
      username: args.username,
      extraConfig: args.extraConfig,
      status: "connected",
    });
  },
});

export const updateLabel = mutation({
  args: {
    id: v.id("serviceAccounts"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { label: args.label });
  },
});

export const updateToken = mutation({
  args: {
    id: v.id("serviceAccounts"),
    apiToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      apiToken: args.apiToken,
      status: "connected" as const,
      lastError: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("serviceAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.id);
    if (!account) return;

    // Log the removal
    await ctx.db.insert("actionLogs", {
      action: "remove_account",
      details: `Removed ${account.provider} account "${account.label}"`,
      provider: account.provider,
      accountLabel: account.label,
      status: "info",
    });

    await ctx.db.delete(args.id);
  },
});

export const verify = mutation({
  args: {
    id: v.id("serviceAccounts"),
    status: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("expired"),
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastVerifiedAt: Date.now(),
      lastError: args.lastError,
    });
  },
});

// Internal: update status after verification
export const updateStatus = internalMutation({
  args: {
    id: v.id("serviceAccounts"),
    status: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("expired"),
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastVerifiedAt: Date.now(),
      lastError: args.lastError,
    });
  },
});

// One-time cleanup: remove duplicate accounts by provider+label, keeping the newest
export const deduplicateAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("serviceAccounts").collect();
    const byKey = new Map<string, typeof all>();
    for (const acc of all) {
      const key = `${acc.provider}:${acc.label}`;
      const existing = byKey.get(key) || [];
      existing.push(acc);
      byKey.set(key, existing);
    }
    let removed = 0;
    for (const [, accs] of byKey) {
      if (accs.length <= 1) continue;
      // Sort by creation time desc, keep newest
      accs.sort((a, b) => b._creationTime - a._creationTime);
      for (let i = 1; i < accs.length; i++) {
        await ctx.db.delete(accs[i]._id);
        removed++;
      }
    }
    return removed;
  },
});
