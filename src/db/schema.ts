import {
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export type ImageMeta = { url: string; alt: string; type: string };
export type RelatedLink = {
  title: string;
  title_fa: string | null;
  source: string | null;
  url: string;
  google_url: string;
};

export const articles = pgTable(
  "articles",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    titleEn: text("title_en").notNull(),
    titleFa: text("title_fa"),
    summaryEn: text("summary_en"),
    summaryFa: text("summary_fa"),
    contentEn: text("content_en"),
    contentFa: text("content_fa"),
    source: text("source"),
    author: text("author"),
    url: text("url"),
    googleUrl: text("google_url").notNull(),
    image: text("image"),
    images: jsonb("images").$type<ImageMeta[]>().notNull().default([]),
    relatedLinks: jsonb("related_links").$type<RelatedLink[]>().notNull().default([]),
    month: varchar("month", { length: 7 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_published_idx").on(t.publishedAt),
    index("articles_month_idx").on(t.month),
  ],
);

export const syncRuns = pgTable("sync_runs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  sourceFile: text("source_file").notNull(),
  imported: text("imported").notNull(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Article = typeof articles.$inferSelect;
