#!/usr/bin/env python3
"""
TechPulse News Scraper
======================
Fetches the Google News "Technology" RSS topic feed, resolves every article
link, extracts the main article text + images, translates everything to
Persian (fa) and writes a bilingual `data/news.json`.

Features
--------
* Parses <title>, <pubDate>, <link> and the HTML <description> of every item
  (the description contains a list of related links + their titles + source).
* Decodes Google News redirect URLs to the real publisher URL.
* Extracts the article body with trafilatura (fallback: BeautifulSoup).
* Collects the main image (og:image / twitter:image) and every content image.
* Translates title / description links / summary / full text to Persian.
* Incremental: already-processed items (same id) are kept and not re-fetched.
* Monthly rotation: when the month changes, the current news.json is moved to
  data/archive/news-YYYY-MM.json and a fresh news.json is started.

Usage
-----
    python scraper/main.py                 # normal hourly run
    python scraper/main.py --limit 5       # only process 5 new items (debug)
    python scraper/main.py --archive       # force archive of current month
    python scraper/main.py --no-translate  # skip Persian translation

Environment variables
---------------------
    FEED_URL            override the RSS feed url
    MAX_ITEMS           max new items to process per run (default 40)
    MAX_TRANSLATE_CHARS max characters of body text to translate (default 6000)
    MAX_IMAGES          max images kept per article (default 12)
    REQUEST_TIMEOUT     seconds (default 20)
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

try:
    import trafilatura
except Exception:  # pragma: no cover
    trafilatura = None

try:
    from googlenewsdecoder import gnewsdecoder
except Exception:  # pragma: no cover
    gnewsdecoder = None

try:
    from deep_translator import GoogleTranslator
except Exception:  # pragma: no cover
    GoogleTranslator = None


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
ARCHIVE_DIR = DATA_DIR / "archive"
NEWS_FILE = DATA_DIR / "news.json"

DEFAULT_FEED = (
    "https://news.google.com/rss/topics/"
    "CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JXVnVMVlZUR2dKVlV5Z0FQAQ"
    "?hl=en-US&gl=US&ceid=US:en"
)
FEED_URL = os.environ.get("FEED_URL", DEFAULT_FEED)
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "40"))
MAX_TRANSLATE_CHARS = int(os.environ.get("MAX_TRANSLATE_CHARS", "6000"))
MAX_IMAGES = int(os.environ.get("MAX_IMAGES", "12"))
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "20"))

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

BAD_IMAGE_PATTERNS = re.compile(
    r"(logo|icon|avatar|sprite|pixel|tracking|1x1|blank|spacer|badge|button|"
    r"emoji|gravatar|favicon|\.svg($|\?)|\.gif($|\?)|data:image)",
    re.I,
)

session = requests.Session()
session.headers.update(HEADERS)


def log(msg: str) -> None:
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {msg}", flush=True)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def make_id(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def parse_date(value: str | None) -> str:
    if not value:
        return now_iso()
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).replace(microsecond=0).isoformat()
    except Exception:
        return now_iso()


def clean_text(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()


def split_source(title: str) -> tuple[str, str]:
    """Google News titles look like 'Headline - Publisher'."""
    if " - " in title:
        head, _, src = title.rpartition(" - ")
        if head and len(src) < 60:
            return head.strip(), src.strip()
    return title.strip(), ""


# --------------------------------------------------------------------------- #
# Translation
# --------------------------------------------------------------------------- #
class Translator:
    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled and GoogleTranslator is not None
        self._t = GoogleTranslator(source="auto", target="fa") if self.enabled else None
        self.cache: dict[str, str] = {}

    def translate(self, text: str, limit: int | None = None) -> str:
        text = (text or "").strip()
        if not text or not self.enabled:
            return ""
        if limit and len(text) > limit:
            text = text[:limit].rsplit(" ", 1)[0] + " …"
        if text in self.cache:
            return self.cache[text]
        out_parts: list[str] = []
        for chunk in self._chunks(text, 4500):
            for attempt in range(3):
                try:
                    out_parts.append(self._t.translate(chunk) or "")
                    break
                except Exception as exc:  # network / rate limit
                    if attempt == 2:
                        log(f"  ! translate failed: {exc}")
                        out_parts.append("")
                    time.sleep(1.5 * (attempt + 1))
        result = "\n".join(p for p in out_parts if p).strip()
        self.cache[text] = result
        return result

    @staticmethod
    def _chunks(text: str, size: int) -> list[str]:
        if len(text) <= size:
            return [text]
        chunks, buf = [], ""
        for para in text.split("\n"):
            if len(buf) + len(para) + 1 > size:
                if buf:
                    chunks.append(buf)
                buf = para
                while len(buf) > size:
                    chunks.append(buf[:size])
                    buf = buf[size:]
            else:
                buf = f"{buf}\n{para}" if buf else para
        if buf:
            chunks.append(buf)
        return chunks


# --------------------------------------------------------------------------- #
# Google News link resolution
# --------------------------------------------------------------------------- #
def resolve_google_link(url: str) -> str:
    if "news.google.com" not in url:
        return url
    if gnewsdecoder is not None:
        for attempt in range(2):
            try:
                res = gnewsdecoder(url, interval=1)
                if res.get("status") and res.get("decoded_url"):
                    return res["decoded_url"]
            except Exception as exc:
                log(f"  ! decoder error ({attempt + 1}): {exc}")
                time.sleep(1)
    # Fallback: follow redirects
    try:
        r = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        if "news.google.com" not in r.url:
            return r.url
        # Google sometimes embeds the URL in a <a> tag
        soup = BeautifulSoup(r.text, "lxml")
        a = soup.find("a", href=re.compile(r"^https?://(?!news\.google)"))
        if a:
            return a["href"]
    except Exception as exc:
        log(f"  ! redirect fallback failed: {exc}")
    return url


# --------------------------------------------------------------------------- #
# Article extraction
# --------------------------------------------------------------------------- #
def absolutize(base: str, src: str | None) -> str | None:
    if not src:
        return None
    src = src.strip()
    if src.startswith("//"):
        src = "https:" + src
    if not src.startswith("http"):
        src = urljoin(base, src)
    return src


def pick_srcset(srcset: str) -> str | None:
    best, best_w = None, -1
    for part in srcset.split(","):
        bits = part.strip().split()
        if not bits:
            continue
        url = bits[0]
        w = 0
        if len(bits) > 1 and bits[1].endswith("w"):
            try:
                w = int(bits[1][:-1])
            except ValueError:
                w = 0
        if w > best_w:
            best, best_w = url, w
    return best


def extract_images(soup: BeautifulSoup, base_url: str) -> tuple[str | None, list[str]]:
    images: list[str] = []
    seen: set[str] = set()

    def add(src: str | None) -> None:
        src = absolutize(base_url, src)
        if not src or src in seen:
            return
        if BAD_IMAGE_PATTERNS.search(src):
            return
        seen.add(src)
        images.append(src)

    main_image = None
    for sel in (
        ("meta", {"property": "og:image"}),
        ("meta", {"property": "og:image:secure_url"}),
        ("meta", {"name": "twitter:image"}),
        ("meta", {"name": "twitter:image:src"}),
    ):
        tag = soup.find(*sel)
        if tag and tag.get("content"):
            main_image = absolutize(base_url, tag["content"])
            if main_image:
                break
    if main_image:
        add(main_image)

    # Prefer images inside the article body
    containers = soup.select("article, main, [role=main], .article-body, .post-content, .entry-content, .story-body")
    scopes = containers if containers else [soup]
    for scope in scopes:
        for img in scope.find_all("img"):
            # Skip tiny images
            try:
                w = int(str(img.get("width", "0")).replace("px", "") or 0)
                h = int(str(img.get("height", "0")).replace("px", "") or 0)
                if (w and w < 120) or (h and h < 120):
                    continue
            except ValueError:
                pass
            src = (
                img.get("data-src")
                or img.get("data-lazy-src")
                or img.get("data-original")
                or img.get("src")
            )
            srcset = img.get("data-srcset") or img.get("srcset")
            if srcset:
                best = pick_srcset(srcset)
                if best:
                    src = best
            add(src)
            if len(images) >= MAX_IMAGES:
                break
        if len(images) >= MAX_IMAGES:
            break
    return main_image, images[:MAX_IMAGES]


def extract_article(url: str) -> dict[str, Any]:
    result: dict[str, Any] = {
        "text": "",
        "main_image": None,
        "images": [],
        "site_name": "",
        "author": "",
        "description": "",
        "final_url": url,
    }
    try:
        r = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        r.raise_for_status()
        html_doc = r.text
        result["final_url"] = r.url
    except Exception as exc:
        log(f"  ! fetch failed: {exc}")
        return result

    soup = BeautifulSoup(html_doc, "lxml")

    # Meta info
    def meta(*names: str) -> str:
        for n in names:
            tag = soup.find("meta", attrs={"property": n}) or soup.find("meta", attrs={"name": n})
            if tag and tag.get("content"):
                return tag["content"].strip()
        return ""

    result["site_name"] = meta("og:site_name", "application-name") or urlparse(r.url).netloc.replace("www.", "")
    result["author"] = meta("author", "article:author", "parsely-author")
    result["description"] = meta("og:description", "description", "twitter:description")

    # Main text
    text = ""
    if trafilatura is not None:
        try:
            text = trafilatura.extract(
                html_doc,
                url=r.url,
                include_comments=False,
                include_tables=False,
                favor_recall=True,
            ) or ""
        except Exception as exc:
            log(f"  ! trafilatura failed: {exc}")
    if not text:
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "noscript"]):
            tag.decompose()
        container = soup.find("article") or soup.find("main") or soup.body
        if container:
            paras = [p.get_text(" ", strip=True) for p in container.find_all("p")]
            text = "\n\n".join(p for p in paras if len(p) > 40)
    result["text"] = clean_text(text)

    main_image, images = extract_images(soup, r.url)
    result["main_image"] = main_image
    result["images"] = images
    return result


# --------------------------------------------------------------------------- #
# Feed parsing
# --------------------------------------------------------------------------- #
def parse_description(desc_html: str) -> list[dict[str, str]]:
    """Google News description = <ol><li><a href>Title</a> <font>Source</font></li>…"""
    links: list[dict[str, str]] = []
    if not desc_html:
        return links
    soup = BeautifulSoup(desc_html, "lxml")
    for li in soup.find_all("li"):
        a = li.find("a")
        if not a or not a.get("href"):
            continue
        font = li.find("font")
        links.append(
            {
                "title": clean_text(a.get_text()),
                "url": a["href"],
                "source": clean_text(font.get_text()) if font else "",
            }
        )
    if not links:  # single-link descriptions
        for a in soup.find_all("a", href=True):
            links.append({"title": clean_text(a.get_text()), "url": a["href"], "source": ""})
    return links


def fetch_feed(url: str) -> list[dict[str, Any]]:
    log(f"Fetching feed: {url}")
    r = session.get(url, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    parsed = feedparser.parse(r.content)
    items = []
    for e in parsed.entries:
        raw_title = clean_text(e.get("title", ""))
        title, source = split_source(raw_title)
        items.append(
            {
                "guid": e.get("id") or e.get("guid") or e.get("link"),
                "title": title,
                "source": source or (e.get("source", {}) or {}).get("title", ""),
                "google_link": e.get("link", ""),
                "published": parse_date(e.get("published")),
                "description_html": e.get("summary", "") or e.get("description", ""),
            }
        )
    log(f"Feed contains {len(items)} items")
    return items


# --------------------------------------------------------------------------- #
# Storage / archive
# --------------------------------------------------------------------------- #
def load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def empty_store() -> dict[str, Any]:
    return {
        "source": FEED_URL,
        "feed_title": "Technology - Latest - Google News",
        "month": current_month(),
        "generated_at": now_iso(),
        "count": 0,
        "items": [],
    }


def archive_if_needed(store: dict[str, Any], force: bool = False) -> dict[str, Any]:
    month = store.get("month")
    if not month:
        store["month"] = current_month()
        return store
    if force or month != current_month():
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        target = ARCHIVE_DIR / f"news-{month}.json"
        if store.get("items"):
            store["archived_at"] = now_iso()
            if target.exists():  # merge with existing archive
                old = load_json(target) or {"items": []}
                known = {i["id"] for i in store["items"]}
                for it in old.get("items", []):
                    if it["id"] not in known:
                        store["items"].append(it)
                store["items"].sort(key=lambda x: x.get("published", ""), reverse=True)
                store["count"] = len(store["items"])
            target.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
            log(f"Archived {store['count']} items -> {target.relative_to(ROOT)}")
        write_archive_index()
        return empty_store()
    return store


def write_archive_index() -> None:
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    months = []
    for f in sorted(ARCHIVE_DIR.glob("news-*.json"), reverse=True):
        data = load_json(f) or {}
        months.append(
            {
                "month": f.stem.replace("news-", ""),
                "file": f"archive/{f.name}",
                "count": data.get("count", len(data.get("items", []))),
                "archived_at": data.get("archived_at"),
            }
        )
    (ARCHIVE_DIR / "index.json").write_text(
        json.dumps({"generated_at": now_iso(), "months": months}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# --------------------------------------------------------------------------- #
# Main pipeline
# --------------------------------------------------------------------------- #
def build_item(entry: dict[str, Any], tr: Translator) -> dict[str, Any]:
    item_id = make_id(entry["guid"] or entry["google_link"])
    log(f"→ {entry['title'][:80]}")

    real_url = resolve_google_link(entry["google_link"])
    log(f"  url: {real_url}")
    art = extract_article(real_url) if real_url and "news.google.com" not in real_url else {
        "text": "", "main_image": None, "images": [], "site_name": "", "author": "", "description": "", "final_url": real_url,
    }

    desc_links = parse_description(entry["description_html"])
    for dl in desc_links:
        dl["resolved_url"] = resolve_google_link(dl["url"]) if dl["url"] != entry["google_link"] else real_url
        dl["title"] = {"en": dl["title"], "fa": tr.translate(dl["title"])}

    text_en = art["text"]
    summary_en = art["description"] or (text_en[:300].rsplit(" ", 1)[0] + "…" if len(text_en) > 300 else text_en)
    title_fa = tr.translate(entry["title"])
    summary_fa = tr.translate(summary_en)
    text_fa = tr.translate(text_en, limit=MAX_TRANSLATE_CHARS) if text_en else ""

    words = len(text_en.split())
    return {
        "id": item_id,
        "title": {"en": entry["title"], "fa": title_fa},
        "summary": {"en": summary_en, "fa": summary_fa},
        "content": {"en": text_en, "fa": text_fa},
        "published": entry["published"],
        "fetched_at": now_iso(),
        "source_name": art.get("site_name") or entry["source"],
        "author": art.get("author", ""),
        "google_link": entry["google_link"],
        "link": art.get("final_url") or real_url,
        "domain": urlparse(art.get("final_url") or real_url).netloc.replace("www.", ""),
        "main_image": art.get("main_image"),
        "images": art.get("images", []),
        "description_links": desc_links,
        "word_count": words,
        "reading_minutes": max(1, round(words / 200)) if words else 1,
    }


def run(limit: int | None, force_archive: bool, translate: bool) -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    store = load_json(NEWS_FILE) or empty_store()
    store = archive_if_needed(store, force=force_archive)

    tr = Translator(enabled=translate)
    entries = fetch_feed(FEED_URL)

    known = {i["id"] for i in store["items"]}
    new_entries = [e for e in entries if make_id(e["guid"] or e["google_link"]) not in known]
    cap = limit if limit is not None else MAX_ITEMS
    new_entries = new_entries[:cap]
    log(f"{len(new_entries)} new items to process (known: {len(known)})")

    added = 0
    for entry in new_entries:
        try:
            item = build_item(entry, tr)
            store["items"].append(item)
            added += 1
            # Persist progressively so a crash keeps partial progress
            store["items"].sort(key=lambda x: x.get("published", ""), reverse=True)
            store["count"] = len(store["items"])
            store["generated_at"] = now_iso()
            NEWS_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as exc:
            log(f"  ! failed item: {exc}")
        time.sleep(0.5)

    store["items"].sort(key=lambda x: x.get("published", ""), reverse=True)
    store["count"] = len(store["items"])
    store["generated_at"] = now_iso()
    store["source"] = FEED_URL
    NEWS_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    write_archive_index()
    log(f"Done. {added} added, {store['count']} total -> {NEWS_FILE.relative_to(ROOT)}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Google News technology scraper")
    ap.add_argument("--limit", type=int, default=None, help="max new items to process")
    ap.add_argument("--archive", action="store_true", help="force archiving of the current news.json")
    ap.add_argument("--no-translate", action="store_true", help="skip Persian translation")
    args = ap.parse_args()
    return run(args.limit, args.archive, not args.no_translate)


if __name__ == "__main__":
    sys.exit(main())
