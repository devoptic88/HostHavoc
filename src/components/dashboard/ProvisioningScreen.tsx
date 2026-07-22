"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Server,
  Sparkles,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "PENDING"
  | "PROVISIONING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "FAILED"
  | "MANUAL";

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
          router.refresh();
        }
      } catch {
        // transient network error - keep polling
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [orderId, status, router]);

  const failed = status === "FAILED";
  const creating = !failed;
  const steps: { label: string; state: "done" | "active" | "pending" | "failed" }[] = [
    { label: "Payment confirmed", state: "done" },
    {
      label: "Allocating hardware profile",
      state: failed ? "failed" : creating ? "active" : "done",
    },
    {
      label: "Installing game files and startup profile",
      state: status === "PROVISIONING" ? "active" : "pending",
    },
    { label: "Publishing overview and live console", state: "pending" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardBody className="py-12">
        <div className="mx-auto max-w-xl text-center">
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
              ? "Something went wrong while creating your server. Our team has been notified and you can open a ticket with this server already attached."
              : "This usually takes a few minutes. We will land you in the operational overview first, then straight into the live console once the instance is available."}
          </p>

          {!failed ? (
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              <StageInfo
                icon={Sparkles}
                title="What we stage"
                body="Allocation, startup profile, backups, and panel wiring are prepared automatically."
              />
              <StageInfo
                icon={TerminalSquare}
                title="What happens next"
                body="Once provisioning completes, you land in the overview with console, files, and support context ready."
              />
            </div>
          ) : null}

          <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    step.state === "done" && "bg-success/15 text-success",
                    step.state === "active" && "bg-hyper-500/15 text-hyper-300",
                    step.state === "failed" && "bg-danger/15 text-danger",
                    step.state === "pending" && "bg-white/[0.04] text-steel-faint",
                  )}
                >
                  {step.state === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : step.state === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : step.state === "failed" ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    step.state === "done" && "text-steel",
                    step.state === "active" && "font-semibold text-white",
                    step.state === "failed" && "font-semibold text-danger",
                    step.state === "pending" && "text-steel-faint",
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          {failed ? (
            <>
              {error ? (
                <p className="mx-auto mt-6 max-w-sm rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-left font-mono text-xs text-danger/90">
                  {error}
                </p>
              ) : null}
              <div className="mt-6">
                <ButtonLink href={`/dashboard/tickets?server=${orderId}&topic=provisioning`} variant="secondary" size="sm">
                  Open a support ticket
                </ButtonLink>
              </div>
            </>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function StageInfo({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-steel-faint">
        <Icon className="h-4 w-4 text-hyper-300" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]">{title}</p>
      </div>
      <p className="mt-2 text-sm text-steel">{body}</p>
    </div>
  );
}
