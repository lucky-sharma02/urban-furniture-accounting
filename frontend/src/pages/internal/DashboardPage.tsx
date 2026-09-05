import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type HealthStatus = "checking" | "ok" | "error";

export function DashboardPage() {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    apiFetch<{ status: string }>("/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Backend health check:{" "}
        <span
          className={
            status === "ok" ? "text-green-600" : status === "error" ? "text-destructive" : ""
          }
        >
          {status}
        </span>
      </p>
    </div>
  );
}
