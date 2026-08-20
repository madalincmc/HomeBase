"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
// Import straight from the format module, not the @/lib/schedule barrel —
// that barrel also re-exports task-occurrences.ts, which pulls in the `pg`
// driver via src/db. Since this is a Client Component, going through the
// barrel would bundle `pg` (and its Node-only fs/net/tls internals) for the
// browser and fail the build.
import { formatDateOnlyLabel } from "@/lib/schedule/format";
import {
  getNotificationCenterData,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import type { NotificationListItem } from "@/lib/notifications/get-notifications";

const BUCKET_VARIANT = {
  overdue: "destructive",
  dueToday: "secondary",
  upcoming: "outline",
} as const;

const BUCKET_LABEL = {
  overdue: "Overdue",
  dueToday: "Due today",
  upcoming: "Upcoming",
} as const;

// Browser Notification API only — no service worker/push (that's PWA scope,
// MAD-101). Firing only happens while this tab is open; each notification's
// id is remembered in localStorage so a fresh mount/refetch doesn't re-fire
// ones already shown.
const FIRED_STORAGE_KEY = "homebase:fired-notifications";

function readFiredIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FIRED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function rememberFiredIds(ids: Set<string>) {
  try {
    // Cap so this can't grow unbounded over a long-lived browser profile.
    window.localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Storage unavailable (private browsing, quota) — firing just repeats
    // across sessions, which is a minor annoyance, not a functional break.
  }
}

function fireBrowserNotifications(items: NotificationListItem[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const fired = readFiredIds();
  const unfired = items.filter((n) => !n.read && !fired.has(n.id));
  if (unfired.length === 0) return;

  for (const item of unfired) {
    new Notification(item.title, { body: item.body ?? undefined });
    fired.add(item.id);
  }
  rememberFiredIds(fired);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const data = await getNotificationCenterData();
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      fireBrowserNotifications(data.notifications);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) refresh();
  }

  function handleRequestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((result) => setPermission(result));
  }

  function handleItemClick(item: NotificationListItem) {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      startTransition(async () => {
        await markNotificationRead(item.id);
      });
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <PopoverHeader className="gap-0">
            <PopoverTitle>Notifications</PopoverTitle>
          </PopoverHeader>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
              <Check className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {permission === "default" && (
          <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
            <span>Get browser alerts for due items.</span>
            <Button variant="secondary" size="sm" onClick={handleRequestPermission}>
              Enable
            </Button>
          </div>
        )}
        {permission === "denied" && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
            <BellOff className="size-3.5 shrink-0" />
            Browser notifications are blocked. Enable them in your browser&apos;s site settings.
          </div>
        )}

        <Separator className="mt-3" />

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.href ?? "#"}
                onClick={() => handleItemClick(item)}
                className="flex items-start gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 hover:bg-muted"
              >
                {!item.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${item.read ? "pl-3.5 opacity-70" : ""}`}>
                  <span className="truncate font-medium">{item.title}</span>
                  {item.body && <span className="truncate text-xs text-muted-foreground">{item.body}</span>}
                </div>
                {item.bucket && (
                  <Badge variant={BUCKET_VARIANT[item.bucket]} className="shrink-0">
                    {item.dueDate ? formatDateOnlyLabel(item.dueDate) : BUCKET_LABEL[item.bucket]}
                  </Badge>
                )}
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
