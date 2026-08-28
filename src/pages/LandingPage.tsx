import { useConvexAuth } from "convex/react";
import { Link, Navigate } from "react-router-dom";
import { Server, Key, Shield, Zap } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Hero */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/25">
            <Server className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Centralized API credentials for all your site management
            components. Set it once, use it everywhere.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Key className="size-5 text-blue-500" />
            </div>
            <h3 className="font-semibold">One Place for All Keys</h3>
            <p className="text-sm text-muted-foreground">
              Manage Rocket.net, Cloudways, and other API keys in a single
              dashboard. No more hunting across apps.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="size-5 text-emerald-500" />
            </div>
            <h3 className="font-semibold">Secure by Design</h3>
            <p className="text-sm text-muted-foreground">
              Credentials are encrypted and shared via authenticated internal
              APIs. Only authorized components can access them.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Zap className="size-5 text-amber-500" />
            </div>
            <h3 className="font-semibold">Plug & Play</h3>
            <p className="text-sm text-muted-foreground">
              Add new providers anytime. All connected components
              automatically pick up new credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
