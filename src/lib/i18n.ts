import type { Lang } from "./news";

export const dict = {
  en: {
    dir: "ltr",
    siteName: "TechPulse",
    tagline: "Live technology headlines · bilingual · auto-updated hourly",
    nav: { home: "Latest", archive: "Archive", api: "API & Docs", sources: "Sources" },
    switchLang: "فارسی",
    breaking: "LIVE",
    featured: "Top story",
    latest: "Latest headlines",
    moreStories: "More stories",
    readMore: "Read full story",
    readTime: (m: number) => `${m} min read`,
    photos: (n: number) => `${n} photos`,
    images: "Photo gallery",
    coverage: "Related coverage",
    coverageHint: "Other outlets covering this story (from the Google News feed)",
    originalSource: "Open original article",
    googleNews: "Google News link",
    translated: "Machine-translated to Persian",
    original: "Original text",
    by: "By",
    published: "Published",
    updated: "Updated",
    noContent: "Full text could not be extracted for this article. Use the original link below.",
    search: "Search headlines…",
    searchResults: (n: number, q: string) => `${n} results for “${q}”`,
    empty: "No news yet. Run the scraper (python scraper/main.py) to populate data/news.json.",
    archiveTitle: "Monthly archive",
    archiveIntro: "Each month the GitHub Action rotates news.json into a dated archive file.",
    currentMonth: "Current month",
    items: (n: number) => `${n} articles`,
    backHome: "← Back to latest",
    apiTitle: "API & Documentation",
    footer: "Data: Google News RSS (Technology). Content belongs to the respective publishers. Persian text is machine translated.",
    sourcesTitle: "Top sources",
    stats: { articles: "Articles", sources: "Sources", images: "Images", month: "Month" },
    filterAll: "All",
    page: "Page",
    prev: "Newer",
    next: "Older",
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    ago: {
      now: "just now",
      m: (n: number) => `${n}m ago`,
      h: (n: number) => `${n}h ago`,
      d: (n: number) => `${n}d ago`,
    },
  },
  fa: {
    dir: "rtl",
    siteName: "تک‌پالس",
    tagline: "تیترهای زنده فناوری · دوزبانه · به‌روزرسانی خودکار هر ساعت",
    nav: { home: "تازه‌ها", archive: "آرشیو", api: "API و راهنما", sources: "منابع" },
    switchLang: "English",
    breaking: "زنده",
    featured: "خبر برگزیده",
    latest: "آخرین تیترها",
    moreStories: "خبرهای بیشتر",
    readMore: "خواندن کامل خبر",
    readTime: (m: number) => `${m} دقیقه مطالعه`,
    photos: (n: number) => `${n} تصویر`,
    images: "گالری تصاویر",
    coverage: "پوشش‌های مرتبط",
    coverageHint: "رسانه‌های دیگری که این خبر را پوشش داده‌اند (از فید گوگل‌نیوز)",
    originalSource: "مشاهده خبر اصلی",
    googleNews: "لینک گوگل‌نیوز",
    translated: "ترجمه ماشینی به فارسی",
    original: "متن اصلی",
    by: "نویسنده:",
    published: "انتشار",
    updated: "به‌روزرسانی",
    noContent: "متن کامل این خبر قابل استخراج نبود. از لینک اصلی در پایین استفاده کنید.",
    search: "جست‌وجو در تیترها…",
    searchResults: (n: number, q: string) => `${n} نتیجه برای «${q}»`,
    empty: "هنوز خبری وجود ندارد. اسکریپت را اجرا کنید (python scraper/main.py) تا data/news.json ساخته شود.",
    archiveTitle: "آرشیو ماهانه",
    archiveIntro: "هر ماه، گیت‌هاب اکشن فایل news.json را به یک فایل آرشیو با تاریخ ماه منتقل می‌کند.",
    currentMonth: "ماه جاری",
    items: (n: number) => `${n} خبر`,
    backHome: "→ بازگشت به تازه‌ها",
    apiTitle: "API و مستندات",
    footer: "منبع داده: فید RSS گوگل‌نیوز (فناوری). محتوا متعلق به ناشران اصلی است. متن فارسی ترجمه ماشینی است.",
    sourcesTitle: "منابع برتر",
    stats: { articles: "خبر", sources: "منبع", images: "تصویر", month: "ماه" },
    filterAll: "همه",
    page: "صفحه",
    prev: "جدیدتر",
    next: "قدیمی‌تر",
    monthNames: ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"],
    ago: {
      now: "همین حالا",
      m: (n: number) => `${n} دقیقه پیش`,
      h: (n: number) => `${n} ساعت پیش`,
      d: (n: number) => `${n} روز پیش`,
    },
  },
} as const;

export type Dict = (typeof dict)[Lang];
export const t = (lang: Lang): Dict => dict[lang];

export function formatDate(iso: string, lang: Lang, withTime = true) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "medium",
      ...(withTime ? { timeStyle: "short" } : {}),
      timeZone: lang === "fa" ? "Asia/Tehran" : "UTC",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function timeAgo(iso: string, lang: Lang) {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  const a = dict[lang].ago;
  if (m < 1) return a.now;
  if (m < 60) return a.m(m);
  const h = Math.floor(m / 60);
  if (h < 24) return a.h(h);
  return a.d(Math.floor(h / 24));
}

export function monthLabel(month: string, lang: Lang) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const name = dict[lang].monthNames[m - 1] ?? month;
  return lang === "fa" ? `${name} ${y}` : `${name} ${y}`;
}
