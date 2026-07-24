import type { PterodactylError } from "@/lib/pterodactyl";

function tryParseJsonDetail(detail: string) {
  try {
    return JSON.parse(detail) as { code?: string; detail?: string };
  } catch {
    return null;
  }
}

export function normalizePterodactylMessage(detail: string, fallback?: string) {
  const parsed = tryParseJsonDetail(detail);
  const message = parsed?.detail || detail || fallback || "Pterodactyl request failed";
  const code = parsed?.code || detail;

  if (
    /ServerStateConflictException/i.test(code) ||
    /has not yet completed its installation process/i.test(message)
  ) {
    return "This server is still finishing an install or reinstall in Pterodactyl. Wait for that task to complete, then try again.";
  }

  return message;
}

export function formatPterodactylError(err: PterodactylError) {
  return normalizePterodactylMessage(err.detail, err.message);
}
