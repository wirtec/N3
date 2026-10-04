import Link from "next/link";

export default function NotFound() {
  return (
    <div className="glass mx-auto max-w-lg rounded-3xl p-12 text-center">
      <p className="text-5xl">🛸</p>
      <h1 className="font-display neon-text mt-4 text-3xl font-black">404 · LOST IN SPACE</h1>
      <p className="mt-3 text-slate-300">این خبر پیدا نشد / This story could not be found.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-2 font-bold text-[#04050f]">
        ← Home / خانه
      </Link>
    </div>
  );
}
