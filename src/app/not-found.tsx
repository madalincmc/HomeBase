import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  );
}
