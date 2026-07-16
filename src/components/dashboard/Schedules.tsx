"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

interface Schedule {
  id: number;
  name: string;
  is_active: boolean;
  next_run_at: string | null;
  cron: { minute: string; hour: string; day_of_month: string; month: string; day_of_week: string };
}

export function Schedules({ orderId }: { orderId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${orderId}/schedules`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSchedules(data.data.map((d: { attributes: Schedule }) => d.attributes));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/servers/${orderId}/create-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        minute: form.get("minute") || "0",
        hour: form.get("hour") || "4",
        day_of_month: "*",
        month: "*",
        day_of_week: "*",
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to create schedule");
      return;
    }
    setCreating(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this schedule?")) return;
    await fetch(`/api/servers/${orderId}/delete-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarClock className="h-4 w-4 text-hyper-400" /> Schedules
        </span>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> New schedule
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="grid gap-4 border-b border-white/[0.06] px-5 py-5 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" name="name" required placeholder="e.g. Nightly restart" />
          </div>
          <div>
            <Label htmlFor="s-hour">Hour (cron)</Label>
            <Input id="s-hour" name="hour" defaultValue="4" />
          </div>
          <div>
            <Label htmlFor="s-minute">Minute (cron)</Label>
            <Input id="s-minute" name="minute" defaultValue="0" />
          </div>
          <div className="sm:col-span-4">
            <Button size="sm" type="submit">Create daily schedule</Button>
            <p className="mt-2 text-xs text-steel-faint">
              Creates a daily schedule at the given server time. Add tasks
              (restart, backup, command) to it from the panel or ask support.
            </p>
          </div>
        </form>
      )}

      {error && <p className="px-5 py-3 text-sm text-danger">{error}</p>}
      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading…</p>
      ) : schedules.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">
          No schedules. Automate restarts and backups by creating one.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {schedules.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{s.name}</p>
                <p className="font-mono text-xs text-steel-faint">
                  {s.cron.minute} {s.cron.hour} {s.cron.day_of_month} {s.cron.month} {s.cron.day_of_week}
                  {s.next_run_at && ` · next run ${formatDate(s.next_run_at)}`}
                </p>
              </div>
              {s.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="steel">Paused</Badge>}
              <Button size="sm" variant="ghost" title="Delete" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
