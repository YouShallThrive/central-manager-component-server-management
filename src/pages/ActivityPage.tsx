import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";

export default function ActivityPage() {
  const logs = useQuery(api.actionLogs.list, { limit: 100 });

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit trail of all credential operations
        </p>
      </div>

      {logs === undefined ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
          <Clock className="size-10 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold">No activity yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Actions will appear here as you manage credentials.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const StatusIcon =
              log.status === "success"
                ? CheckCircle2
                : log.status === "error"
                  ? AlertCircle
                  : Info;
            const statusColor =
              log.status === "success"
                ? "text-emerald-500"
                : log.status === "error"
                  ? "text-red-500"
                  : "text-blue-500";

            return (
              <div
                key={log._id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3.5"
              >
                <StatusIcon className={`size-4 mt-0.5 shrink-0 ${statusColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{log.action}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log._creationTime).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.details}
                  </p>
                  {log.provider && (
                    <span className="inline-block mt-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {log.provider}
                      {log.accountLabel ? ` · ${log.accountLabel}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
