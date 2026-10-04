export type Lang = "en" | "fa";

export const dict = {
  en: {
    dir: "ltr",
    brand: "NOVA",
    brandSub: "TECH NEWS",
    tagline: "Live technology news from Google News — decoded, extracted & translated every hour.",
    latest: "Latest transmissions",
    featured: "Top story",
    search: "Search the galaxy of news…",
    readMore: "Read full story",
    source: "Source",
    original: "Open original article",
    related: "Related coverage",
    gallery: "Images from this story",
    published: "Published",
    scraped: "Indexed",
    by: "By",
    home: "Home",
    archive: "Archive",
    api: "API & Docs",
    noResults: "No signals found. Try another search.",
    updated: "Last update",
    items: "stories",
    lang: "فارسی",
    backHome: "Back to feed",
    showBoth: "Show both languages",
    persianVersion: "Persian version",
    englishVersion: "English version",
    notTranslated: "Translation not available yet.",
    noText: "Full text could not be extracted — read it on the source website.",
    archiveTitle: "Monthly archive",
    archiveSub: "Every month the feed is rotated into its own file: archive/news-YYYY-MM.json",
    currentMonth: "Current month (news.json)",
    noArchives: "No archives yet. The first rotation happens on the 1st of next month.",
    sources: "Sources",
    all: "All",
    poweredBy: "Scraped with Python · Scheduled by GitHub Actions · Served by Next.js + PostgreSQL",
    liveEndpoint: "Live JSON endpoint",
    hourly: "Auto-refresh: every hour",
    imagesCount: "images",
    docsTitle: "API & Guide",
  },
  fa: {
    dir: "rtl",
    brand: "نوا",
    brandSub: "اخبار فناوری",
    tagline: "اخبار زنده‌ی فناوری از گوگل‌نیوز — هر ساعت واکشی، استخراج و ترجمه می‌شود.",
    latest: "آخرین سیگنال‌ها",
    featured: "خبر برگزیده",
    search: "در کهکشان اخبار جستجو کنید…",
    readMore: "خواندن خبر کامل",
    source: "منبع",
    original: "مشاهده‌ی خبر اصلی",
    related: "پوشش‌های مرتبط",
    gallery: "تصاویر این خبر",
    published: "انتشار",
    scraped: "ایندکس",
    by: "نویسنده",
    home: "خانه",
    archive: "آرشیو",
    api: "API و راهنما",
    noResults: "سیگنالی پیدا نشد. عبارت دیگری را امتحان کنید.",
    updated: "آخرین به‌روزرسانی",
    items: "خبر",
    lang: "English",
    backHome: "بازگشت به فید",
    showBoth: "نمایش هر دو زبان",
    persianVersion: "نسخه‌ی فارسی",
    englishVersion: "نسخه‌ی انگلیسی",
    notTranslated: "ترجمه هنوز آماده نیست.",
    noText: "متن کامل استخراج نشد — آن را در سایت منبع بخوانید.",
    archiveTitle: "آرشیو ماهانه",
    archiveSub: "هر ماه فید در فایل جداگانه‌ای ذخیره می‌شود: archive/news-YYYY-MM.json",
    currentMonth: "ماه جاری (news.json)",
    noArchives: "هنوز آرشیوی وجود ندارد. اولین چرخش در اول ماه بعد انجام می‌شود.",
    sources: "منابع",
    all: "همه",
    poweredBy: "واکشی با پایتون · زمان‌بندی با GitHub Actions · نمایش با Next.js و PostgreSQL",
    liveEndpoint: "اندپوینت JSON زنده",
    hourly: "به‌روزرسانی خودکار: هر ساعت",
    imagesCount: "تصویر",
    docsTitle: "API و راهنما",
  },
} as const;

export type Dict = (typeof dict)["en"];

export function t(lang: Lang): Dict {
  return dict[lang] as unknown as Dict;
}

export function pick(lang: Lang, v: { en: string | null; fa: string | null } | undefined | null): string {
  if (!v) return "";
  return (lang === "fa" ? v.fa || v.en : v.en || v.fa) ?? "";
}

export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function timeAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  const rtf = new Intl.RelativeTimeFormat(lang === "fa" ? "fa" : "en", { numeric: "auto" });
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.round(hrs / 24);
  if (days < 30) return rtf.format(-days, "day");
  return rtf.format(-Math.round(days / 30), "month");
}
