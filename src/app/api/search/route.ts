import { NextRequest } from "next/server";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { isLang } from "@/lib/news";
import { ensureSynced } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=apple&lang=fa&limit=20
 * Database-backed search across the current month AND all archives.
 */
export async function GET(req: NextRequest) {
  await ensureSynced();
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const langParam = sp.get("lang") ?? "";
  const lang = isLang(langParam) ? langParam : "en";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20) || 20));
  if (!q) return Response.json({ ok: false, error: "missing_q" }, { status: 400 });

  try {
    const pattern = `%${q}%`;
    const rows = await db
      .select({
        id: articles.id,
        month: articles.month,
        title_en: articles.titleEn,
        title_fa: articles.titleFa,
        summary_en: articles.summaryEn,
        summary_fa: articles.summaryFa,
        source_name: articles.sourceName,
        domain: articles.domain,
        link: articles.link,
        main_image: articles.mainImage,
        images: articles.images,
        published: articles.published,
        reading_minutes: articles.readingMinutes,
      })
      .from(articles)
      .where(
        or(
          ilike(articles.titleEn, pattern),
          ilike(articles.titleFa, pattern),
          ilike(articles.summaryEn, pattern),
          ilike(articles.summaryFa, pattern),
          ilike(articles.sourceName, pattern),
          sql`${articles.contentEn} ILIKE ${pattern}`,
          sql`${articles.contentFa} ILIKE ${pattern}`,
        ),
      )
      .orderBy(desc(articles.published))
      .limit(limit);

    return Response.json({
      ok: true,
      q,
      lang,
      total: rows.length,
      items: rows.map((r) => ({
        id: r.id,
        month: r.month,
        title: lang === "fa" ? r.title_fa || r.title_en : r.title_en,
        summary: lang === "fa" ? r.summary_fa || r.summary_en : r.summary_en,
        source_name: r.source_name,
        domain: r.domain,
        link: r.link,
        main_image: r.main_image,
        images: r.images,
        published: r.published,
        reading_minutes: r.reading_minutes,
        api: `/api/news/${r.id}?lang=${lang}`,
      })),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
