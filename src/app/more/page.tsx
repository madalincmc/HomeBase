import Link from "next/link";
import { Wrench, Package, FolderOpen, History, Settings, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

const moreLinks = [
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" description="Everything else, on smaller screens." />
      <nav className="flex flex-col divide-y border-b">
        {moreLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted md:px-6"
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>
    </>
  );
}
