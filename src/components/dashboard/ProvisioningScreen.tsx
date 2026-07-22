"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Server } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "PENDING"
  | "PROVISIONING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "FAILED"
  | "MANUAL";

/**
 * Shown on the server page while the order is still being provisioned.
 * Polls the order status and refreshes into the live console (which
 * streams the installation output from Wings) the moment the server exists.
 */
export function ProvisioningScreen({
  orderId,
  serverName,
  initialStatus,
  initialError,
}: {
  orderId: string;
  serverName: string;
  initialStatus: OrderStatus;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    if (status === "FAILED") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/servers/${orderId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        setError(data.error ?? null);
        if (data.provisioned) {
          clearInterval(timer);
          router.refresh(); // layout re-renders into the live console
        }
      } catch {
        /* transient network error — keep polling */
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [orderId, status, router]);

  const failed = status === "FAILED";
  const creating = !failed; // PENDING or PROVISIONING

  const steps: { label: string; state: "done" | "active" | "pending" | "failed" }[] = [
    { label: "Payment confirmed", state: "done" },
    {
      label: "Creating your server",
      state: failed ? "failed" : creating ? "active" : "done",
    },
    { label: "Installing game files", state: "pending" },
    { label: "Server online", state: "pending" },
  ];

  return (
    <Card>
      <CardBody className="py-12">
        <div className="mx-auto max-w-md text-center">
          {failed ? (
            <AlertTriangle className="mx-auto h-12 w-12 text-danger" />
          ) : (
            <div className="relative mx-auto h-12 w-12">
              <Server className="h-12 w-12 text-hyper-400" />
              <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-white" />
            </div>
          )}
          <h2 className="mt-5 font-display text-xl font-extrabold italic text-white">
            {failed ? (
              <>Provisioning hit a snag</>
            ) : (
              <>
                Deploying <span className="text-gradient-hyper">{serverName}</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-sm text-steel-dim">
            {failed
              ? "Something went wrong while creating your server. Our team has been notified — you can also open a ticket and we'll sort it out fast."
              : "This usually takes under a minute. As soon as the server exists you'll drop straight into its live console and watch the installation happen."}
          </p>

          <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    s.state === "done" && "bg-success/15 text-success",
                    s.state === "active" && "bg-hyper-500/15 text-hyper-300",
                    s.state === "failed" && "bg-danger/15 text-danger",
                    s.state === "pending" && "bg-white/[0.04] text-steel-faint",
                  )}
                >
                  {s.state === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : s.state === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : s.state === "failed" ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    s.state === "done" && "text-steel",
                    s.state === "active" && "font-semibold text-white",
                    s.state === "failed" && "font-semibold text-danger",
                    s.state === "pending" && "text-steel-faint",
                  )}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ol>

          {failed && (
            <>
              {error && (
                <p className="mx-auto mt-6 max-w-sm rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-left font-mono text-xs text-danger/90">
                  {error}
                </p>
              )}
              <div className="mt-6">
                <ButtonLink href="/dashboard/tickets" variant="secondary" size="sm">
                  Open a support ticket
                </ButtonLink>
              </div>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
