"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// TEMPORARY diagnostic for the notification-delivery investigation — not a
// product feature. Reports what the browser actually supports and what
// happens when a notification is attempted, rendered on-screen rather than
// to the console so it's readable on a phone with no devtools.
// Remove once the notification approach is decided.

type LogLine = { kind: "info" | "ok" | "fail"; text: string };

export function NotificationTest() {
  const [lines, setLines] = useState<LogLine[] | null>(null);
  const [running, setRunning] = useState(false);

  async function runTest() {
    setRunning(true);
    const out: LogLine[] = [];
    // Flush to state on every line rather than once at the end: the
    // permission prompt can sit unanswered indefinitely, and a phone with no
    // devtools would otherwise show a blank panel and a stuck button.
    const add = (kind: LogLine["kind"], text: string) => {
      out.push({ kind, text });
      setLines([...out]);
    };

    // iOS exposes standalone mode via a non-standard navigator flag; every
    // other browser uses the display-mode media query.
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      nav.standalone === true;

    add("info", `Secure context (HTTPS): ${window.isSecureContext}`);
    add("info", `Launched from home screen (standalone): ${standalone}`);
    add("info", `Notification API present: ${"Notification" in window}`);
    add("info", `serviceWorker API present: ${"serviceWorker" in navigator}`);
    add("info", `PushManager API present: ${"PushManager" in window}`);
    add("info", `UA: ${navigator.userAgent.slice(0, 100)}`);

    if (!("Notification" in window)) {
      add(
        "fail",
        "Notification API does not exist in this browser context — nothing can fire here. On iOS this is expected unless the app was opened from the Home Screen."
      );
      setRunning(false);
      return;
    }

    add("info", `Permission before request: ${Notification.permission}`);

    if (Notification.permission === "default") {
      add("info", "Requesting permission — answer the browser prompt to continue…");
      try {
        const result = await Notification.requestPermission();
        add("info", `Permission after request: ${result}`);
      } catch (err) {
        add("fail", `requestPermission() threw: ${errorText(err)}`);
      }
    }

    if (Notification.permission !== "granted") {
      add("fail", `Permission is "${Notification.permission}" — cannot display a notification.`);
      setRunning(false);
      return;
    }

    // Path 1: the direct constructor, which is what the notification bell
    // currently uses. Known to throw on Android Chrome.
    try {
      new Notification("HomeBase test", {
        body: "Direct constructor path fired successfully.",
        tag: "homebase-test",
      });
      add("ok", "new Notification() did not throw — check whether one actually appeared.");
    } catch (err) {
      add("fail", `new Notification() threw: ${errorText(err)}`);
    }

    // Path 2: the service-worker path, which is what Android requires and
    // what real Web Push would use. No service worker is registered yet, so
    // this is expected to report "none" — that absence is the finding.
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          add("info", "No service worker registered — the SW notification path is unavailable.");
        } else {
          await registration.showNotification("HomeBase test (SW)", {
            body: "Service worker path fired successfully.",
            tag: "homebase-test-sw",
          });
          add("ok", "registration.showNotification() succeeded.");
        }
      } catch (err) {
        add("fail", `Service worker path failed: ${errorText(err)}`);
      }
    }

    setRunning(false);
  }

  return (
    <section className="mx-4 rounded-lg border border-dashed p-4 md:mx-6">
      <h2 className="text-sm font-semibold">Notification test</h2>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">
        Temporary diagnostic. Fires a test notification and reports what this browser supports.
      </p>
      <Button onClick={runTest} disabled={running}>
        {running ? "Testing…" : "Fire test notification"}
      </Button>

      {lines && (
        <ul className="mt-3 flex flex-col gap-1 font-mono text-xs">
          {lines.map((line, index) => (
            <li
              key={index}
              className={
                line.kind === "fail"
                  ? "text-destructive"
                  : line.kind === "ok"
                    ? "font-medium"
                    : "text-muted-foreground"
              }
            >
              {line.kind === "ok" ? "✓ " : line.kind === "fail" ? "✗ " : "· "}
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function errorText(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}
