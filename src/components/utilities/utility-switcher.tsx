import Link from "next/link";
import { Zap, Flame, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_BY_TYPE = { electricity: Zap, gas: Flame, water: Droplet } as const;

export function UtilitySwitcher({
  utilities,
  currentId,
}: {
  utilities: { id: string; type: "electricity" | "gas" | "water"; provider: string | null }[];
  currentId: string;
}) {
  // Nothing to switch to with only one utility — no point showing a
  // one-option switcher.
  if (utilities.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {utilities.map((utility) => {
        const Icon = ICON_BY_TYPE[utility.type];
        const active = utility.id === currentId;
        return (
          <Link
            key={utility.id}
            href={`/utilities/${utility.id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
              active
                ? "border-foreground/20 bg-secondary font-medium text-secondary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {utility.type}
          </Link>
        );
      })}
    </div>
  );
}
