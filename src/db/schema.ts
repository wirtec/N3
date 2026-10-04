import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export type DescriptionLink = {
  title: { en: string; fa: string };
  url: string;
  resolved_url?: string;
  source?: string;
};

/**
 * Mirror of data/news.json (+ archives) inside PostgreSQL.
 * The JSON files remain the source of truth (they are written by the GitHub
 * Action); this table powers full-text search and stats across months.
 */
export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    titleEn: text("title_en").notNull(),
    titleFa: text("title_fa").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    summaryFa: text("summary_fa").notNull().default(""),
    contentEn: text("content_en").notNull().default(""),
    contentFa: text("content_fa").notNull().default(""),
    sourceName: text("source_name").notNull().default(""),
    domain: text("domain").notNull().default(""),
    author: text("author").notNull().default(""),
    link: text("link").notNull(),
    googleLink: text("google_link").notNull().default(""),
    mainImage: text("main_image"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    descriptionLinks: jsonb("description_links")
      .$type<DescriptionLink[]>()
      .notNull()
      .default([]),
    wordCount: integer("word_count").notNull().default(0),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    published: timestamp("published", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("articles_published_idx").on(t.published),
    index("articles_month_idx").on(t.month),
  ],
);

/** Remembers which snapshot (generated_at) of each file was last synced. */
export const syncState = pgTable("sync_state", {
  file: text("file").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
