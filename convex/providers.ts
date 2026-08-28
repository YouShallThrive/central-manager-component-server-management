/**
 * Provider definitions — extensible registry of supported API providers.
 */
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// List all providers
export const list = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    return providers.sort((a, b) => a.order - b.order);
  },
});

// Get a specific provider by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Upsert a provider
export const upsert = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    fields: v.string(),
    enabled: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("providers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      await ctx.db.replace(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("providers", args);
  },
});

// Seed default providers
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("providers").collect();
    if (existing.length > 0) return;

    const defaults = [
      {
        slug: "rocket",
        name: "Rocket.net",
        description:
          "Managed WordPress hosting. Used for staging management, security scanning, and site monitoring.",
        icon: "Rocket",
        color: "#FF6B35",
        fields: JSON.stringify([
          {
            key: "apiToken",
            label: "API Token (JWT)",
            type: "password",
            placeholder: "Paste Rocket.net API token",
          },
        ]),
        enabled: true,
        order: 0,
      },
      {
        slug: "cloudways",
        name: "Cloudways",
        description:
          "Cloud hosting platform. Used for server management and application deployment.",
        icon: "Cloud",
        color: "#2C67F2",
        fields: JSON.stringify([
          {
            key: "apiToken",
            label: "API Key",
            type: "password",
            placeholder: "Paste Cloudways API key",
          },
          {
            key: "username",
            label: "Email Address",
            type: "email",
            placeholder: "your@email.com",
          },
        ]),
        enabled: true,
        order: 1,
      },
    ];

    for (const provider of defaults) {
      await ctx.db.insert("providers", provider);
    }
  },
});
