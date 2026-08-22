"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
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
import { PushReminderControls } from "./push-reminder-controls";
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
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const data = await getNotificationCenterData();
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) refresh();
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

        <PushReminderControls />

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
