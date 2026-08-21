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
import { savePushSubscription, deletePushSubscription } from "@/lib/push/actions";
import {
  checkPushSupport,
  getExistingSubscription,
  subscribeToPush,
  serializeSubscription,
} from "@/lib/push/client";
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

// MAD-98 also fired an in-tab `new Notification()` per unread item whenever
// this component refreshed. That was removed in MAD-120: it only ever ran
// with permission granted, which almost nobody did until enabling push
// started requiring it — at which point opening the app would fire a burst
// of individual notifications repeating what the scheduled push had already
// said, while you were literally looking at the app. Push handles delivery
// now; the bell is purely the in-app inbox.

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [isPending, startTransition] = useTransition();
  // Push subscription state is separate from `permission`: the two genuinely
  // diverge — permission can be granted while this browser has no live
  // subscription (row pruned after a 410, or never subscribed at all).
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  function refresh() {
    startTransition(async () => {
      const data = await getNotificationCenterData();
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  }

  useEffect(() => {
    refresh();
    getExistingSubscription()
      .then((subscription) => setPushEnabled(Boolean(subscription)))
      .catch(() => setPushEnabled(false));
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) refresh();
  }

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const support = checkPushSupport();
      if (!support.supported) {
        setPushError(support.reason);
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setPushError("Notifications are blocked for this site.");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setPushError("Push isn't configured on the server.");
        return;
      }

      const subscription = await subscribeToPush(vapidKey);
      const serialized = serializeSubscription(subscription);
      if (!serialized) {
        setPushError("The browser returned an incomplete subscription.");
        return;
      }

      const saved = await savePushSubscription(serialized);
      if (!saved.success) {
        setPushError(saved.error);
        return;
      }
      setPushEnabled(true);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not enable reminders.");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        // Drop the server row first — if unsubscribing locally succeeded but
        // the delete failed, the server would keep pushing to a dead endpoint
        // until the next 410 prune.
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not turn off reminders.");
    } finally {
      setPushBusy(false);
    }
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

        {permission === "denied" ? (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
            <BellOff className="size-3.5 shrink-0" />
            Notifications are blocked. Enable them in your browser&apos;s site settings.
          </div>
        ) : (
          <div className="mx-3 mt-2 flex flex-col gap-1.5 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>
                {pushEnabled
                  ? "Daily reminders are on for this device."
                  : "Get reminders even when HomeBase is closed."}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pushBusy}
                onClick={pushEnabled ? handleDisablePush : handleEnablePush}
              >
                {pushBusy ? "…" : pushEnabled ? "Turn off" : "Enable"}
              </Button>
            </div>
            {pushError && <span className="text-destructive">{pushError}</span>}
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
