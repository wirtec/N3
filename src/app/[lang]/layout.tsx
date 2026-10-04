import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isLang, LANGS } from "@/lib/news";
import { t } from "@/lib/i18n";
import { Footer } from "@/components/Header";
import "../globals.css";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = t(lang);
  return {
    title: { default: `${d.siteName} — ${lang === "fa" ? "اخبار فناوری دوزبانه" : "Bilingual Tech News"}`, template: `%s · ${d.siteName}` },
    description: d.tagline,
    alternates: { languages: { en: "/en", fa: "/fa" } },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  // Invalid languages fall back to English chrome; the page itself calls notFound().
  const lang = isLang(raw) ? raw : "en";
  const d = t(lang);
  return (
    <html lang={lang} dir={d.dir}>
      <body className="min-h-screen antialiased">
        <div className="grid-bg pointer-events-none fixed inset-0 -z-10" />
        {children}
        <Footer lang={lang} />
      </body>
    </html>
  );
}
