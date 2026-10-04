import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-bold text-neon-gradient">404</p>
      <p className="mt-4 text-slate-400">Not found · پیدا نشد</p>
      <div className="mt-8 flex gap-3">
        <Link href="/en" className="rounded-lg border border-neon/40 px-4 py-2 text-neon hover:bg-neon/10">
          English
        </Link>
        <Link href="/fa" className="rounded-lg border border-violet/40 px-4 py-2 text-violet hover:bg-violet/10">
          فارسی
        </Link>
      </div>
    </main>
  );
}
