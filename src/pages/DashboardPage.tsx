import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  Server,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
  Rocket,
  Cloud,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Icon mapping for providers
const PROVIDER_ICONS: Record<string, React.ElementType> = {
  rocket: Rocket,
  cloudways: Cloud,
  default: HardDrive,
};

const PROVIDER_COLORS: Record<string, string> = {
  rocket: "#FF6B35",
  cloudways: "#2C67F2",
};

type ProviderField = {
  key: string;
  label: string;
  type: string;
  placeholder: string;
};

type ServiceAccount = {
  _id: string;
  _creationTime: number;
  provider: string;
  label: string;
  hasToken: boolean;
  tokenPreview: string;
  apiUrl?: string;
  username?: string;
  status: "connected" | "error" | "expired";
  lastVerifiedAt?: number;
  lastError?: string;
  addedBy?: string;
};

type Provider = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: string;
  enabled: boolean;
  order: number;
};

function AddAccountForm({
  provider,
  onDone,
}: {
  provider: Provider;
  onDone: () => void;
}) {
  const addAccount = useMutation(api.serviceAccounts.add);
  const [label, setLabel] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fields: ProviderField[] = JSON.parse(provider.fields);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        provider: provider.slug,
        label: label.trim(),
        apiToken: fieldValues.apiToken || "",
        username: fieldValues.username || undefined,
        apiUrl: fieldValues.apiUrl || undefined,
      });
      toast.success(`${provider.name} account "${label.trim()}" added`);
      onDone();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-5 space-y-4"
    >
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Plus className="size-4" />
        Add {provider.name} Account
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Account Label</Label>
          <Input
            placeholder={`e.g. "YST Main"`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={fieldValues[field.key] || ""}
              onChange={(e) =>
                setFieldValues((prev) => ({
                  ...prev,
                  [field.key]: e.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={saving || !label.trim() || !fieldValues.apiToken?.trim()}
        >
          {saving ? "Adding…" : "Add Account"}
        </Button>
      </div>
    </form>
  );
}

function AccountCard({
  account,
  providerName,
}: {
  account: ServiceAccount;
  providerName: string;
}) {
  const removeAccount = useMutation(api.serviceAccounts.remove);
  const updateLabel = useMutation(api.serviceAccounts.updateLabel);
  const updateToken = useMutation(api.serviceAccounts.updateToken);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(account.label);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveLabel = async () => {
    if (!editLabel.trim()) return;
    try {
      await updateLabel({
        id: account._id as any,
        label: editLabel.trim(),
      });
      toast.success("Label updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update label");
    }
  };

  const handleSaveToken = async () => {
    if (!newToken.trim()) return;
    try {
      await updateToken({
        id: account._id as any,
        apiToken: newToken.trim(),
      });
      toast.success("Token updated");
      setShowTokenInput(false);
      setNewToken("");
    } catch {
      toast.error("Failed to update token");
    }
  };

  const handleDelete = async () => {
    try {
      await removeAccount({ id: account._id as any });
      toast.success(`Account "${account.label}" removed`);
    } catch {
      toast.error("Failed to remove account");
    }
  };

  const ProviderIcon = PROVIDER_ICONS[account.provider] || PROVIDER_ICONS.default;

  const statusIcon =
    account.status === "connected" ? (
      <CheckCircle2 className="size-4 text-emerald-500" />
    ) : account.status === "expired" ? (
      <Clock className="size-4 text-amber-500" />
    ) : (
      <AlertCircle className="size-4 text-red-500" />
    );

  const statusLabel =
    account.status === "connected"
      ? "Connected"
      : account.status === "expired"
        ? "Token Expired"
        : "Error";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="size-10 rounded-lg flex items-center justify-center shrink-0"
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
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 text-sm w-40"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveLabel();
                      if (e.key === "Escape") setEditing(false);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={handleSaveLabel}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setEditing(false)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold truncate">{account.label}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => {
                      setEditLabel(account.label);
                      setEditing(true);
                    }}
                  >
                    <Edit2 className="size-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {statusIcon}
                <span>{statusLabel}</span>
                <span className="text-muted-foreground/50">
                  · {providerName}
                </span>
                {account.hasToken && (
                  <span className="text-muted-foreground/50">
                    · Key: {account.tokenPreview}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {account.lastError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md p-2.5">
            <span className="font-medium">Error:</span> {account.lastError}
          </div>
        )}

        {account.lastVerifiedAt && (
          <div className="text-xs text-muted-foreground">
            Last verified:{" "}
            {new Date(account.lastVerifiedAt).toLocaleString()}
          </div>
        )}

        {showTokenInput ? (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">New API Token</Label>
              <Input
                type="password"
                placeholder="Paste new API token"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              onClick={handleSaveToken}
              disabled={!newToken.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setShowTokenInput(false);
                setNewToken("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowTokenInput(true)}
          >
            <Key className="size-3 mr-1" />
            Update API Token
          </Button>
        )}
      </div>
    </div>
  );
}

function ProviderSection({
  provider,
  accounts,
}: {
  provider: Provider;
  accounts: ServiceAccount[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const ProviderIcon = PROVIDER_ICONS[provider.slug] || PROVIDER_ICONS.default;
  const providerAccounts = accounts.filter(
    (a) => a.provider === provider.slug,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${provider.color || "#6B7280"}15`,
            }}
          >
            <ProviderIcon
              className="size-5"
              style={{ color: provider.color || "#6B7280" }}
            />
          </div>
          <div>
            <h2 className="font-semibold">{provider.name}</h2>
            {provider.description && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
                {provider.description}
              </p>
            )}
          </div>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} size="sm" variant="outline">
            <Plus className="size-4 mr-1.5" />
            Add Account
          </Button>
        )}
      </div>

      {showAddForm && (
        <AddAccountForm
          provider={provider}
          onDone={() => setShowAddForm(false)}
        />
      )}

      {providerAccounts.length === 0 && !showAddForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
          <Key className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No {provider.name} accounts connected yet
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="size-4 mr-1.5" />
            Add Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {providerAccounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              providerName={provider.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const providers = useQuery(api.providers.list);
  const accounts = useQuery(api.serviceAccounts.list, {});

  if (providers === undefined || accounts === undefined) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading…</div>
    );
  }

  const totalAccounts = accounts.length;
  const connectedCount = accounts.filter(
    (a) => a.status === "connected",
  ).length;
  const errorCount = accounts.filter(
    (a) => a.status === "error" || a.status === "expired",
  ).length;

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Server Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centralized API credentials for all site management components
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Server className="size-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <div className="text-xs text-muted-foreground">
                Total Accounts
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="size-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{connectedCount}</div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="size-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-muted-foreground">
                Needs Attention
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider sections */}
      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
          <Server className="size-10 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold">No providers configured</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Providers are being set up…
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {providers
            .filter((p) => p.enabled)
            .map((provider) => (
              <ProviderSection
                key={provider._id}
                provider={provider}
                accounts={accounts}
              />
            ))}
        </div>
      )}
    </div>
  );
}
