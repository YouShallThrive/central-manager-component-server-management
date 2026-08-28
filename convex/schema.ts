import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Service accounts / API credentials for all providers
  serviceAccounts: defineTable({
    provider: v.string(), // "rocket", "cloudways", etc.
    label: v.string(), // Display name, e.g. "YST Main", "Lucid"
    apiToken: v.string(), // API key / JWT token
    apiUrl: v.optional(v.string()), // Custom API base URL if needed
    username: v.optional(v.string()), // For providers that need username
    extraConfig: v.optional(v.string()), // JSON string for provider-specific config
    status: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("expired"),
    ),
    lastVerifiedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    addedBy: v.optional(v.string()), // email of user who added it
    // Sync summary
    serverCount: v.optional(v.number()),
    appCount: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_provider", ["provider"])
    .index("by_provider_label", ["provider", "label"]),

  // Servers — physical or logical servers under a service account
  servers: defineTable({
    accountId: v.id("serviceAccounts"),
    provider: v.string(), // "rocket", "cloudways"
    serverId: v.string(), // External ID (e.g. Cloudways server_id, "rocket-main")
    label: v.string(),
    ip: v.optional(v.string()),
    status: v.optional(v.string()), // "running", "stopped", etc.
    region: v.optional(v.string()),
    size: v.optional(v.string()), // RAM/plan label
    cloudProvider: v.optional(v.string()), // "do", "aws", etc.
    appCount: v.optional(v.number()),
    details: v.optional(v.string()), // JSON for provider-specific details
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_account", ["accountId"])
    .index("by_provider_server", ["provider", "serverId"]),

  // Applications — individual sites/apps on a server
  applications: defineTable({
    accountId: v.id("serviceAccounts"),
    serverId: v.optional(v.id("servers")),
    provider: v.string(),
    appId: v.string(), // External ID (Rocket.net site_id, Cloudways app_id)
    label: v.string(),
    domain: v.optional(v.string()),
    appType: v.optional(v.string()), // "wordpress", "phpstack", etc.
    isStaging: v.boolean(),
    productionAppId: v.optional(v.string()), // If staging, links to production app
    status: v.optional(v.string()),
    details: v.optional(v.string()), // JSON for provider-specific details
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_account", ["accountId"])
    .index("by_server", ["serverId"])
    .index("by_provider_app", ["provider", "appId"]),

  // Supported provider definitions (extensible)
  providers: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    fields: v.string(), // JSON array of required fields
    enabled: v.boolean(),
    order: v.number(),
  }).index("by_slug", ["slug"]),

  // App settings
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Action log for audit trail
  actionLogs: defineTable({
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
  }),
});

export default schema;
