"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizonal, TerminalSquare } from "lucide-react";

/**
 * Live server console. Fetches a one-time websocket token through the
 * HyperNode proxy, then connects the browser directly to Wings.
 * (Requires the panel origin — or "*" — in the node's allowed_origins.)
 */
export function Console({ orderId }: { orderId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [command, setCommand] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closedByUs = useRef(false);
  const sawInstallOutput = useRef(false);
  const announcedReady = useRef(false);

  const append = useCallback((line: string) => {
    setLines((prev) => [...prev.slice(-800), line]);
  }, []);

  useEffect(() => {
    closedByUs.current = false;
    sawInstallOutput.current = false;
    announcedReady.current = false;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    async function connect() {
      setStatus("connecting");
      try {
        const res = await fetch(`/api/servers/${orderId}/ws`);
        if (!res.ok) throw new Error("token");
        const { data } = await res.json();
        ws = new WebSocket(data.socket);
        wsRef.current = ws;

        ws.onopen = () => {
          ws?.send(JSON.stringify({ event: "auth", args: [data.token] }));
        };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            switch (msg.event) {
              case "auth success":
                setStatus("open");
                ws?.send(JSON.stringify({ event: "send logs", args: [null] }));
                break;
              case "console output":
              case "install output":
                if (msg.event === "install output") sawInstallOutput.current = true;
                append(String(msg.args?.[0] ?? ""));
                break;
              case "status": {
                const nextStatus = String(msg.args?.[0] ?? "");
                append(`\x1b[36m[Server] Status: ${nextStatus}\x1b[0m`);
                if (
                  sawInstallOutput.current &&
                  !announcedReady.current &&
                  nextStatus === "offline"
                ) {
                  append(
                    "\x1b[32m[Server] Installation complete. Your server is ready to start.\x1b[0m",
                  );
                  announcedReady.current = true;
                  sawInstallOutput.current = false;
                }
                break;
              }
              case "token expiring": {
                fetch(`/api/servers/${orderId}/ws`)
                  .then((r) => r.json())
                  .then(({ data: d }) =>
                    ws?.send(JSON.stringify({ event: "auth", args: [d.token] })),
                  )
                  .catch(() => {});
                break;
              }
            }
          } catch {
            /* non-JSON frame */
          }
        };
        ws.onclose = () => {
          setStatus("closed");
          if (!closedByUs.current) retryTimer = setTimeout(connect, 4000);
        };
      } catch {
        setStatus("closed");
        retryTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      closedByUs.current = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [orderId, append]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [lines]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "send command", args: [command] }));
    } else {
      fetch(`/api/servers/${orderId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
    }
    append(`\x1b[33m> ${command}\x1b[0m`);
    setCommand("");
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <TerminalSquare className="h-4 w-4 text-hyper-400" /> Console
        </span>
        <span
          className={
            status === "open"
              ? "text-xs font-semibold text-success"
              : status === "connecting"
                ? "text-xs font-semibold text-warning"
                : "text-xs font-semibold text-danger"
          }
        >
          {status === "open" ? "● Live" : status === "connecting" ? "● Connecting…" : "● Disconnected"}
        </span>
      </div>
      <div
        ref={boxRef}
        className="scrollbar-slim h-[420px] overflow-y-auto bg-night px-5 py-4 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-steel-faint">
            {status === "open"
              ? "Waiting for output…"
              : "Connecting to your server's console…"}
          </p>
        ) : (
          lines.map((l, i) => <AnsiLine key={i} text={l} />)
        )}
      </div>
      <form onSubmit={send} className="flex border-t border-white/[0.06]">
        <span className="flex items-center pl-5 font-mono text-sm text-hyper-400">$</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a command…"
          className="flex-1 bg-transparent px-3 py-3.5 font-mono text-sm text-white placeholder:text-steel-faint focus:outline-none"
        />
        <button
          type="submit"
          className="ring-focus px-5 text-steel-dim transition-colors hover:text-hyper-300"
          aria-label="Send command"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// Minimal ANSI SGR color rendering for console output.
const ANSI_COLORS: Record<string, string> = {
  "30": "#5B6577", "31": "#F87171", "32": "#34D399", "33": "#FBBF24",
  "34": "#4A86FF", "35": "#C084FC", "36": "#38BDF8", "37": "#C8D0DC",
  "90": "#5B6577", "91": "#FCA5A5", "92": "#6EE7B7", "93": "#FDE68A",
  "94": "#75A6FF", "95": "#D8B4FE", "96": "#7DD3FC", "97": "#FFFFFF",
};

function AnsiLine({ text }: { text: string }) {
  // eslint-disable-next-line no-control-regex
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let color: string | undefined;
  let bold = false;
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    // eslint-disable-next-line no-control-regex
    const m = part.match(/^\x1b\[([0-9;]*)m$/);
    if (m) {
      for (const code of m[1].split(";")) {
        if (code === "0" || code === "") { color = undefined; bold = false; }
        else if (code === "1") bold = true;
        else if (ANSI_COLORS[code]) color = ANSI_COLORS[code];
      }
    } else if (part) {
      nodes.push(
        <span key={i} style={{ color, fontWeight: bold ? 600 : undefined }}>
          {part}
        </span>,
      );
    }
  });
  return <div className="whitespace-pre-wrap break-all text-steel">{nodes}</div>;
}
