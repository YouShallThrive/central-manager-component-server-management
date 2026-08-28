import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  Server,
  RefreshCcw,
  Globe,
  HardDrive,
  Rocket,
  Cloud,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Loader2,
  CheckCircle2,
  Clock,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  rocket: Rocket,
  cloudways: Cloud,
  default: HardDrive,
};

const PROVIDER_COLORS: Record<string, string> = {
  rocket: "#FF6B35",
  cloudways: "#2C67F2",
};

type ServerRecord = {
  _id: string;
  accountId: string;
  provider: string;
  serverId: string;
  label: string;
  ip?: string;
  status?: string;
  region?: string;
  size?: string;
  cloudProvider?: string;
  appCount?: number;
  details?: string;
  lastSyncedAt?: number;
};

type AppRecord = {
  _id: string;
  accountId: string;
  serverId?: string;
  provider: string;
  appId: string;
  label: string;
  domain?: string;
  appType?: string;
  isStaging: boolean;
  status?: string;
  details?: string;
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "unknown").toLowerCase();
  const isGood = s === "running" || s === "active" || s === "connected";
  const isWarn = s === "stopped" || s === "expired" || s === "pending";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        isGood
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : isWarn
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          isGood ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-red-500"
        }`}
      />
      {status || "Unknown"}
    </span>
  );
}

function AppRow({ app }: { app: AppRecord }) {
  const copyDomain = () => {
    if (app.domain) {
      navigator.clipboard.writeText(app.domain);
      toast.success("Domain copied");
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 hover:bg-muted/50 rounded-md group">
      <MonitorSmartphone className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{app.label}</span>
          {app.isStaging && (
            <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
              Staging
            </span>
          )}
          {app.appType && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {app.appType}
            </span>
          )}
        </div>
        {app.domain && (
          <div className="flex items-center gap-1 mt-0.5">
            <Globe className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {app.domain}
            </span>
            <button
              onClick={copyDomain}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
            <a
              href={`https://${app.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        )}
      </div>
      <StatusBadge status={app.status} />
    </div>
  );
}

function ServerCard({
  server,
  apps,
}: {
  server: ServerRecord;
  apps: AppRecord[];
}) {
  const [expanded, setExpanded] = useState(true);
  const serverApps = apps.filter((a) => a.serverId === server._id);
  const ProviderIcon =
    PROVIDER_ICONS[server.provider] || PROVIDER_ICONS.default;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
        <div
          className="size-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${PROVIDER_COLORS[server.provider] || "#6B7280"}15`,
          }}
        >
          <ProviderIcon
            className="size-5"
            style={{ color: PROVIDER_COLORS[server.provider] || "#6B7280" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{server.label}</h3>
            <StatusBadge status={server.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {server.ip && <span>IP: {server.ip}</span>}
            {server.size && <span>Size: {server.size}</span>}
            {server.region && <span>Region: {server.region}</span>}
            {server.cloudProvider && (
              <span>
                Cloud: {server.cloudProvider.toUpperCase()}
              </span>
            )}
            <span>
              {serverApps.length} app{serverApps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </button>

      {expanded && serverApps.length > 0 && (
        <div className="border-t px-2 py-1.5 space-y-0.5">
          {serverApps.map((app) => (
            <AppRow key={app._id} app={app} />
          ))}
        </div>
      )}

      {expanded && serverApps.length === 0 && (
        <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          No applications on this server
        </div>
      )}
    </div>
  );
}

function AccountServersSection({
  account,
  servers,
  apps,
}: {
  account: any;
  servers: ServerRecord[];
  apps: AppRecord[];
}) {
  const syncAccount = useAction(api.sync.syncAccount);
  const [syncing, setSyncing] = useState(false);
  const accountServers = servers.filter((s) => s.accountId === account._id);
  const accountApps = apps.filter((a) => a.accountId === account._id);
  const ProviderIcon =
    PROVIDER_ICONS[account.provider] || PROVIDER_ICONS.default;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAccount({ accountId: account._id });
      toast.success(`Synced ${account.label}`);
    } catch (e: any) {
      toast.error(`Sync failed: ${e?.message || "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${PROVIDER_COLORS[account.provider] || "#6B7280"}15`,
            }}
          >
            <ProviderIcon
              className="size-5"
              style={{
                color: PROVIDER_COLORS[account.provider] || "#6B7280",
              }}
            />
          </div>
          <div>
            <h2 className="font-semibold">{account.label}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>
                {accountServers.length} server
                {accountServers.length !== 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span>
                {accountApps.length} app
                {accountApps.length !== 1 ? "s" : ""}
              </span>
              {account.lastSyncedAt && (
                <>
                  <span>·</span>
                  <span>
                    Synced{" "}
                    {new Date(account.lastSyncedAt).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleSync}
          size="sm"
          variant="outline"
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCcw className="size-4 mr-1.5" />
          )}
          {syncing ? "Syncing…" : "Sync Now"}
        </Button>
      </div>

      {accountServers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
          <Server className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No servers synced yet
          </p>
          <Button onClick={handleSync} size="sm" variant="outline" disabled={syncing}>
            {syncing ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCcw className="size-4 mr-1.5" />
            )}
            Sync to discover servers
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accountServers.map((server) => (
            <ServerCard key={server._id} server={server} apps={accountApps} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServersPage() {
  const accounts = useQuery(api.serviceAccounts.list, {});
  const servers = useQuery(api.sync.listServers, {});
  const apps = useQuery(api.sync.listApplications, {});

  if (
    accounts === undefined ||
    servers === undefined ||
    apps === undefined
  ) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading…</div>
    );
  }

  const totalServers = servers.length;
  const totalApps = apps.length;
  const stagingApps = apps.filter((a) => a.isStaging).length;
  const productionApps = totalApps - stagingApps;

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Servers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All connected servers and applications across your infrastructure
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <HardDrive className="size-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalServers}</div>
              <div className="text-xs text-muted-foreground">Servers</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <MonitorSmartphone className="size-5 text-indigo-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalApps}</div>
              <div className="text-xs text-muted-foreground">Total Apps</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{productionApps}</div>
              <div className="text-xs text-muted-foreground">Production</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stagingApps}</div>
              <div className="text-xs text-muted-foreground">Staging</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account server sections */}
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
          <Server className="size-10 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold">No accounts connected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add API credentials on the Dashboard to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {accounts.map((account) => (
            <AccountServersSection
              key={account._id}
              account={account}
              servers={servers}
              apps={apps}
            />
          ))}
        </div>
      )}
    </div>
  );
}
