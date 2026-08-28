/**
 * Sync action — fetches servers and applications from connected providers.
 *
 * Rocket.net: Flat list of sites (no server hierarchy)
 * Cloudways: Servers → nested apps, requires OAuth token exchange
 */
import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Queries ────────────────────────────────────────────────

export const listServers = query({
  args: { accountId: v.optional(v.id("serviceAccounts")) },
  handler: async (ctx, args) => {
    const servers = args.accountId
      ? await ctx.db
          .query("servers")
          .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
          .collect()
      : await ctx.db.query("servers").collect();
    return servers;
  },
});

export const listApplications = query({
  args: {
    accountId: v.optional(v.id("serviceAccounts")),
    serverId: v.optional(v.id("servers")),
    isStaging: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let apps;
    if (args.serverId) {
      apps = await ctx.db
        .query("applications")
        .withIndex("by_server", (q) => q.eq("serverId", args.serverId!))
        .collect();
    } else if (args.accountId) {
      apps = await ctx.db
        .query("applications")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!))
        .collect();
    } else {
      apps = await ctx.db.query("applications").collect();
    }
    if (args.isStaging !== undefined) {
      apps = apps.filter((a) => a.isStaging === args.isStaging);
    }
    return apps;
  },
});

// Internal query for cross-component API (used by /api/applications HTTP endpoint)
export const listAllApplications = internalQuery({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("applications").collect();
    return apps.map((a) => ({
      provider: a.provider,
      appId: a.appId,
      label: a.label,
      domain: a.domain,
      appType: a.appType,
      isStaging: a.isStaging,
      status: a.status,
    }));
  },
});

// ─── Sync Action ────────────────────────────────────────────

export const syncAccount = action({
  args: { accountId: v.id("serviceAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(
      internal.serviceAccounts.getWithToken,
      { id: args.accountId },
    );
    if (!account) throw new Error("Account not found");

    try {
      if (account.provider === "rocket") {
        await syncRocketNet(ctx, account);
      } else if (account.provider === "cloudways") {
        await syncCloudways(ctx, account);
      }

      // Update account sync timestamp
      await ctx.runMutation(internal.sync.updateAccountSync, {
        accountId: args.accountId,
        status: "connected",
      });

      // Log success
      await ctx.runMutation(internal.sync.addLog, {
        action: "sync_complete",
        details: `Synced ${account.provider} account "${account.label}"`,
        provider: account.provider,
        accountLabel: account.label,
        status: "success",
      });
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      await ctx.runMutation(internal.sync.updateAccountSync, {
        accountId: args.accountId,
        status: errorMsg.includes("401") || errorMsg.includes("403")
          ? "expired"
          : "error",
        lastError: errorMsg.slice(0, 500),
      });

      await ctx.runMutation(internal.sync.addLog, {
        action: "sync_failed",
        details: `Failed to sync ${account.provider} "${account.label}": ${errorMsg.slice(0, 200)}`,
        provider: account.provider,
        accountLabel: account.label,
        status: "error",
      });

      throw e;
    }
  },
});

// ─── Rocket.net Sync ────────────────────────────────────────

async function syncRocketNet(ctx: any, account: any) {
  const res = await fetch("https://api.developer.rocket.net/sites", {
    headers: { Authorization: `Bearer ${account.apiToken}` },
  });
  if (!res.ok) {
    throw new Error(`Rocket.net API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const sites = data.data || [];

  // Rocket.net is flat (no server hierarchy), but we create one virtual "server" per account
  const serverRecord = await ctx.runMutation(internal.sync.upsertServer, {
    accountId: account._id,
    provider: "rocket",
    serverId: `rocket-${account._id}`,
    label: `${account.label} — Rocket.net`,
    status: "running",
    appCount: sites.length,
    details: JSON.stringify({ totalSites: sites.length }),
  });

  // Sync all sites as applications
  const now = Date.now();
  for (const site of sites) {
    const isStaging = !!(
      site.is_staging ||
      site.staging_parent_id ||
      (site.name || "").toLowerCase().includes("staging") ||
      (site.primary_domain || "").includes("-staging.")
    );

    await ctx.runMutation(internal.sync.upsertApplication, {
      accountId: account._id,
      serverId: serverRecord,
      provider: "rocket",
      appId: String(site.id),
      label: site.name || site.primary_domain || `Site ${site.id}`,
      domain: site.primary_domain || undefined,
      appType: "wordpress",
      isStaging,
      productionAppId: site.staging_parent_id
        ? String(site.staging_parent_id)
        : undefined,
      status: site.status || "active",
      // NOTE: Rocket.net's /sites list does not return php_version or wp_version
      // (verified 2026-08-28) — PHP version comes from GET /sites/{id}/settings
      // -> current_php_version, which the manager apps sync separately.
      details: JSON.stringify({
        datacenter: site.datacenter,
        ip: site.ip_address,
      }),
      lastSyncedAt: now,
    });
  }

  // Clean up apps that no longer exist
  await ctx.runMutation(internal.sync.removeStaleApps, {
    accountId: account._id,
    currentAppIds: sites.map((s: any) => String(s.id)),
  });
}

// ─── Cloudways Sync ─────────────────────────────────────────

async function syncCloudways(ctx: any, account: any) {
  // Step 1: OAuth token exchange
  const tokenRes = await fetch(
    "https://api.cloudways.com/api/v1/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: account.username || "",
        api_key: account.apiToken,
      }),
    },
  );
  if (!tokenRes.ok) {
    throw new Error(
      `Cloudways OAuth ${tokenRes.status}: ${await tokenRes.text()}`,
    );
  }
  const tokenData = await tokenRes.json();
  const bearer = tokenData.access_token;
  if (!bearer) throw new Error("Cloudways OAuth: no access_token returned");

  // Step 2: Fetch all servers (includes nested apps)
  const serverRes = await fetch("https://api.cloudways.com/api/v1/server", {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!serverRes.ok) {
    throw new Error(
      `Cloudways API ${serverRes.status}: ${await serverRes.text()}`,
    );
  }
  const serverData = await serverRes.json();
  const servers = serverData.servers || [];

  const now = Date.now();
  const allAppIds: string[] = [];

  for (const srv of servers) {
    const apps = srv.apps || [];
    const serverRecord = await ctx.runMutation(internal.sync.upsertServer, {
      accountId: account._id,
      provider: "cloudways",
      serverId: String(srv.id),
      label: srv.label || `Server ${srv.id}`,
      ip: srv.public_ip || undefined,
      status: srv.status || "running",
      region: srv.region || undefined,
      size: srv.server_size || undefined,
      cloudProvider: srv.cloud || undefined,
      appCount: apps.length,
      details: JSON.stringify({
        os: srv.os,
        dbVersion: srv.mysql_version,
        created: srv.created_at,
        platform: srv.platform,
      }),
    });

    for (const app of apps) {
      allAppIds.push(String(app.id));
      // Detect staging: Cloudways staging apps have is_staging flag or label pattern
      const isStaging = !!(
        app.is_staging ||
        app.staging_parent_id ||
        (app.label || "").toLowerCase().includes("staging")
      );

      await ctx.runMutation(internal.sync.upsertApplication, {
        accountId: account._id,
        serverId: serverRecord,
        provider: "cloudways",
        appId: String(app.id),
        label: app.label || `App ${app.id}`,
        domain: app.cname || undefined,
        appType: app.application || undefined,
        isStaging,
        productionAppId: app.staging_parent_id
          ? String(app.staging_parent_id)
          : undefined,
        status: app.app_status || "active",
        details: JSON.stringify({
          sysUser: app.sys_user,
          serverIp: srv.public_ip,
          serverId: srv.id,
          serverLabel: srv.label,
          project: app.project_name,
        }),
        lastSyncedAt: now,
      });
    }
  }

  // Clean up stale apps
  await ctx.runMutation(internal.sync.removeStaleApps, {
    accountId: account._id,
    currentAppIds: allAppIds,
  });
}

// ─── Internal Mutations for upserts ─────────────────────────

export const upsertServer = internalMutation({
  args: {
    accountId: v.id("serviceAccounts"),
    provider: v.string(),
    serverId: v.string(),
    label: v.string(),
    ip: v.optional(v.string()),
    status: v.optional(v.string()),
    region: v.optional(v.string()),
    size: v.optional(v.string()),
    cloudProvider: v.optional(v.string()),
    appCount: v.optional(v.number()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("servers")
      .withIndex("by_provider_server", (q) =>
        q.eq("provider", args.provider).eq("serverId", args.serverId),
      )
      .first();

    const data = { ...args, lastSyncedAt: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("servers", data);
  },
});

export const upsertApplication = internalMutation({
  args: {
    accountId: v.id("serviceAccounts"),
    serverId: v.optional(v.id("servers")),
    provider: v.string(),
    appId: v.string(),
    label: v.string(),
    domain: v.optional(v.string()),
    appType: v.optional(v.string()),
    isStaging: v.boolean(),
    productionAppId: v.optional(v.string()),
    status: v.optional(v.string()),
    details: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_provider_app", (q) =>
        q.eq("provider", args.provider).eq("appId", args.appId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("applications", args);
  },
});

export const removeStaleApps = internalMutation({
  args: {
    accountId: v.id("serviceAccounts"),
    currentAppIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const allApps = await ctx.db
      .query("applications")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
    for (const app of allApps) {
      if (!args.currentAppIds.includes(app.appId)) {
        await ctx.db.delete(app._id);
      }
    }
  },
});

export const updateAccountSync = internalMutation({
  args: {
    accountId: v.id("serviceAccounts"),
    status: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("expired"),
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Count servers/apps
    const servers = await ctx.db
      .query("servers")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    await ctx.db.patch(args.accountId, {
      status: args.status,
      lastError: args.lastError,
      lastVerifiedAt: Date.now(),
      lastSyncedAt: Date.now(),
      serverCount: servers.length,
      appCount: apps.length,
    });
  },
});

export const addLog = internalMutation({
  args: {
    action: v.string(),
    details: v.string(),
    provider: v.optional(v.string()),
    accountLabel: v.optional(v.string()),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("info"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("actionLogs", args);
  },
});
