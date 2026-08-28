import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const http = httpRouter();

// ─── Auth routes ────────────────────────────────────────────
auth.addHttpRoutes(http);

// ─── Cross-component Credential API ─────────────────────────
// Other components (staging-manager, security-manager, etc.) call this
// endpoint to fetch API credentials. Authenticated with SSO_SHARED_SECRET.

http.route({
  path: "/api/credentials",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Authenticate with shared secret
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET || "66mTA4FYT1TTYfuD6FC7eDHLN15vZC7T3L6DLz3tqbk";
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");

    const accounts = await ctx.runQuery(
      internal.serviceAccounts.listWithTokens,
      { provider: provider ?? undefined },
    );

    // Return credentials (full tokens included — this is a trusted internal API)
    const result = accounts
      .filter((a) => a.status === "connected")
      .map((a) => ({
        id: a._id,
        provider: a.provider,
        label: a.label,
        apiToken: a.apiToken,
        apiUrl: a.apiUrl,
        username: a.username,
        extraConfig: a.extraConfig,
      }));

    return new Response(JSON.stringify({ credentials: result }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

// Preflight CORS for the credentials API
http.route({
  path: "/api/credentials",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// ─── Cross-component Applications API ───────────────────────
// Other components (dns-tracker, etc.) call this to get the list of
// managed sites/domains. Authenticated with SSO_SHARED_SECRET.

http.route({
  path: "/api/applications",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET || "66mTA4FYT1TTYfuD6FC7eDHLN15vZC7T3L6DLz3tqbk";
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    const apps = await ctx.runQuery(internal.sync.listAllApplications, {});

    return new Response(JSON.stringify({ applications: apps }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

http.route({
  path: "/api/applications",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// ─── Seed providers on first load ───────────────────────────
http.route({
  path: "/api/seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET || "66mTA4FYT1TTYfuD6FC7eDHLN15vZC7T3L6DLz3tqbk";
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    await ctx.runMutation(internal.providers.seed);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

// ─── Add service account via HTTP (internal API) ────────────
http.route({
  path: "/api/add-account",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret =
      process.env.SSO_SHARED_SECRET ||
      "66mTA4FYT1TTYfuD6FC7eDHLN15vZC7T3L6DLz3tqbk";
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    const body = (await request.json()) as Record<string, string | undefined>;
    const { provider, label, apiToken, apiUrl, username, extraConfig } = body;

    if (!provider || !label || !apiToken) {
      return new Response(
        JSON.stringify({
          error: "provider, label, and apiToken are required",
        }),
        { status: 400, headers: corsHeaders() },
      );
    }

    const id = await ctx.runMutation(internal.serviceAccounts.addInternal, {
      provider,
      label,
      apiToken,
      apiUrl: apiUrl || undefined,
      username: username || undefined,
      extraConfig: extraConfig || undefined,
    });

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

http.route({
  path: "/api/add-account",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// ─── Admin: Deduplicate Accounts ────────────────────────────
http.route({
  path: "/api/admin/dedup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret =
      process.env.SSO_SHARED_SECRET ||
      "66mTA4FYT1TTYfuD6FC7eDHLN15vZC7T3L6DLz3tqbk";
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    const removed = await ctx.runMutation(
      internal.serviceAccounts.deduplicateAccounts,
      {},
    );
    return new Response(JSON.stringify({ ok: true, removed }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

export default http;
