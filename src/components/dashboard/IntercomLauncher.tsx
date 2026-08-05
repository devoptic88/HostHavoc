"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    Intercom?: ((command: string, ...args: unknown[]) => void) & { booted?: boolean };
    intercomSettings?: Record<string, unknown>;
  }
}

/**
 * Loads the Intercom messenger for signed-in customers. Renders nothing until
 * an Intercom workspace id is configured in Admin → Settings, so the panel
 * works normally before live chat is set up.
 */
export function IntercomLauncher({
  appId,
  user,
}: {
  appId: string;
  user: { id: string; name: string; email: string };
}) {
  useEffect(() => {
    if (!appId) return;
    window.intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: appId,
      user_id: user.id,
      name: user.name,
      email: user.email,
    };
    window.Intercom?.("update", window.intercomSettings);
  }, [appId, user.id, user.name, user.email]);

  if (!appId) return null;

  return (
    <Script
      id="intercom-messenger"
      strategy="afterInteractive"
      src={`https://widget.intercom.io/widget/${appId}`}
      onLoad={() => {
        window.Intercom?.("boot", window.intercomSettings);
      }}
    />
  );
}

/** Opens the messenger, or returns false when live chat isn't configured. */
export function openIntercom() {
  if (typeof window === "undefined" || !window.Intercom) return false;
  window.Intercom("show");
  return true;
}
