import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ApiStatusBadgeProps {
  status: "idle" | "testing" | "ok" | "error";
}

export function ApiStatusBadge({ status }: ApiStatusBadgeProps) {
  const isTesting = status === "testing" || status === "idle";
  const isConnected = status === "ok";
  const isFailed = status === "error";

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800">
      {isTesting && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
      {isConnected && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
      {isFailed && <XCircle className="w-3 h-3 text-red-500" />}
      <span className="text-neutral-300 capitalize">
        {isTesting ? "Checking API..." : isConnected ? "API Connected" : "API Error"}
      </span>
    </div>
  );
}
