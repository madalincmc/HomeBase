"use client";

import { useEffect, useState } from "react";
import { BellOff, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatActivityTimestamp } from "@/lib/activities/format";
import {
  deletePushSubscription,
  getSubscriptionStatus,
  savePushSubscription,
} from "@/lib/push/actions";
import {
  checkPushSupport,
  getExistingSubscription,
  serializeSubscription,
  subscribeToPush,
} from "@/lib/push/client";

// Whether this browser holds a PushSubscription and whether the server has a
// row for it are two independent facts. Treating the first as proof of the
// second is what previously let the bell claim "reminders are on" for a
// device the server had never heard of — so every state below that implies
// delivery works has been confirmed against the server, not just the browser.
type PushState =
  | { kind: "checking" }
  // Push cannot work here at all (wrong browser, or iOS outside the Home Screen).
  | { kind: "unsupported"; reason: string }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on"; lastNotifiedAt: Date | null }
  // Subscribed locally, unknown to the server, and re-registering it failed.
  | { kind: "stale" };

export function PushReminderControls() {
  const [state, setState] = useState<PushState>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveState(): Promise<PushState> {
      const support = checkPushSupport();
      if (!support.supported) return { kind: "unsupported", reason: support.reason };
      if (Notification.permission === "denied") return { kind: "denied" };

      const subscription = await getExistingSubscription();
      if (!subscription) return { kind: "off" };

      const status = await getSubscriptionStatus(subscription.endpoint);
      if (status.registered) return { kind: "on", lastNotifiedAt: status.lastNotifiedAt };

      // The browser is subscribed but the server is not: pruned after a 410,
      // a save that failed, or a reset database. None of that needs the
      // user's involvement — the full subscription is already in hand, so
      // re-register it rather than making them notice and fix it by hand.
      const serialized = serializeSubscription(subscription);
      if (serialized) {
        const saved = await savePushSubscription(serialized);
        if (saved.success) return { kind: "on", lastNotifiedAt: null };
      }
      return { kind: "stale" };
    }

    resolveState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "off" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const support = checkPushSupport();
      if (!support.supported) {
        setState({ kind: "unsupported", reason: support.reason });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({ kind: "denied" });
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Push isn't configured on the server.");
        return;
      }

      const subscription = await subscribeToPush(vapidKey);
      const serialized = serializeSubscription(subscription);
      if (!serialized) {
        setError("The browser returned an incomplete subscription.");
        return;
      }

      const saved = await savePushSubscription(serialized);
      if (!saved.success) {
        setError(saved.error);
        return;
      }
      setState({ kind: "on", lastNotifiedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable reminders.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        // Drop the server row first — if unsubscribing locally succeeded but
        // the delete failed, the server would keep pushing to a dead endpoint
        // until the next 410 prune.
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState({ kind: "off" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not turn off reminders.");
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "checking") return null;

  if (state.kind === "denied") {
    return (
      <Note>
        <BellOff className="mt-px size-3.5 shrink-0" />
        <span>Notifications are blocked. Enable them in your browser&apos;s site settings.</span>
      </Note>
    );
  }

  if (state.kind === "unsupported") {
    return (
      <Note>
        <BellOff className="mt-px size-3.5 shrink-0" />
        <span>{state.reason}</span>
      </Note>
    );
  }

  return (
    <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-start gap-1.5">
          {state.kind === "stale" && (
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-destructive" />
          )}
          {state.kind === "on" && "Daily reminders are on for this device."}
          {state.kind === "off" && "Get reminders even when HomeBase is closed."}
          {state.kind === "stale" && "Reminders stopped working on this device."}
        </span>
        {/* The only delivery evidence the UI offers now that there's no test
            button — worth keeping, since it's the difference between "this is
            set up" and "this has actually reached the phone". */}
        {state.kind === "on" && state.lastNotifiedAt && (
          <span className="opacity-70">
            Last delivered {formatActivityTimestamp(state.lastNotifiedAt)}
          </span>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
      <Button
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={state.kind === "on" ? handleDisable : handleEnable}
      >
        {busy ? "…" : state.kind === "on" ? "Turn off" : state.kind === "stale" ? "Fix" : "Enable"}
      </Button>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 mt-2 flex items-start gap-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
