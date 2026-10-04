#!/usr/bin/env python3
"""
Nova Tech News – Google News RSS scraper
=========================================

Pipeline
--------
1. Download the Google News RSS feed (Technology topic by default).
2. For every <item>: title, pubDate, link, source + every <a> link inside the
   <description> together with its anchor text ("related links").
3. Decode the Google News redirect link (news.google.com/rss/articles/…) into the
   real publisher URL.
4. Open the publisher page and extract: canonical URL, main article text,
   summary, author, all meaningful images (og:image + in-article images).
5. Translate title / summary / body to Persian (fa) → bilingual output.
6. Merge with the previous `news.json` (already-scraped items are reused,
   so every hourly run only processes new items) and write the file.

Usage
-----
    python scraper/fetch_news.py                       # default feed
    FEED_URL="https://news.google.com/rss/..." python scraper/fetch_news.py
    MAX_ITEMS=30 TRANSLATE=0 python scraper/fetch_news.py

Environment variables
---------------------
    FEED_URL             RSS url (default: Google News – Technology, en-US)
    OUTPUT               output json path (default: public/data/news.json)
    MAX_ITEMS            max items kept in news.json (default 120)
    MAX_NEW_PER_RUN      max *new* articles scraped per run (default 40)
    TRANSLATE            "1" (default) / "0" – translate to Persian
    MAX_TRANSLATE_CHARS  body characters translated (default 6000)
    REQUEST_TIMEOUT      seconds (default 20)
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse, parse_qs

import feedparser
import requests
from bs4 import BeautifulSoup

try:
    import trafilatura  # type: ignore
except Exception:  # pragma: no cover
    trafilatura = None

try:
    from deep_translator import GoogleTranslator  # type: ignore
except Exception:  # pragma: no cover
    GoogleTranslator = None

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
DEFAULT_FEED = (
    "https://news.google.com/rss/topics/"
    "CAAqKggKIiRDQkFTRlFvSUwyMHZNRGRqTVhZU0JXVnVMVlZUR2dKVlV5Z0FQAQ"
    "?hl=en-US&gl=US&ceid=US:en"
)
FEED_URL = os.environ.get("FEED_URL", DEFAULT_FEED)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.environ.get("OUTPUT", os.path.join(ROOT, "public", "data", "news.json"))
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "120"))
MAX_NEW_PER_RUN = int(os.environ.get("MAX_NEW_PER_RUN", "40"))
TRANSLATE = os.environ.get("TRANSLATE", "1") == "1"
MAX_TRANSLATE_CHARS = int(os.environ.get("MAX_TRANSLATE_CHARS", "6000"))
TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "20"))

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
)

BAD_IMG_PATTERNS = re.compile(
    r"(logo|icon|avatar|sprite|pixel|tracking|badge|button|spacer|blank|"
    r"1x1|favicon|emoji|gravatar|(?:^|[/_.-])ads?[/_.-]|doubleclick|google-analytics|"
    r"zdbb\.net|/share[/_.-]|arrow|placeholder|/collect\?)",
    re.I,
)


def log(*a: Any) -> None:
    print("[nova]", *a, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def make_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def to_iso(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return None


def clean_url(url: str) -> str:
    """Strip tracking params (utm_*, fbclid…)."""
    try:
        p = urlparse(url)
        qs = parse_qs(p.query, keep_blank_values=False)
        keep = {
            k: v
            for k, v in qs.items()
            if not k.lower().startswith(("utm_", "fbclid", "gclid", "mc_", "ref", "ocid"))
        }
        query = "&".join(f"{k}={v[0]}" for k, v in keep.items())
        return urlunparse((p.scheme, p.netloc, p.path, p.params, query, ""))
    except Exception:
        return url


def domain_of(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


# --------------------------------------------------------------------------- #
# Google News link decoder (batchexecute method)
# --------------------------------------------------------------------------- #
def _gn_article_id(url: str) -> str | None:
    m = re.search(r"/(?:rss/)?articles/([^/?#]+)", url)
    if m:
        return m.group(1)
    m = re.search(r"/read/([^/?#]+)", url)
    return m.group(1) if m else None


def _gn_base64_fast_path(art_id: str) -> str | None:
    """Old-style ids embed the url in base64 (still true for some links)."""
    import base64

    try:
        padded = art_id + "=" * (-len(art_id) % 4)
        raw = base64.urlsafe_b64decode(padded)
        # strip prefix bytes / suffix bytes
        for prefix in (b"\x08\x13\x22", b"\x08\x13"):
            if raw.startswith(prefix):
                raw = raw[len(prefix):]
                break
        if raw.endswith(b"\xd2\x01\x00"):
            raw = raw[:-3]
        if raw and raw[0] in (0x22, 0x21) and len(raw) > 2:
            raw = raw[2:] if raw[1] < 0x80 else raw[3:]
        text = raw.decode("utf-8", errors="ignore")
        m = re.search(r"https?://[^\s\"'<>]+", text)
        if m:
            cand = m.group(0)
            if "AU_yqL" not in art_id and len(cand) > 12:
                return cand
    except Exception:
        pass
    return None


def decode_google_news_url(url: str) -> str | None:
    """Return the publisher URL behind a news.google.com redirect link."""
    if "news.google." not in url:
        return url
    art_id = _gn_article_id(url)
    if not art_id:
        return None

    fast = _gn_base64_fast_path(art_id)
    if fast:
        return fast

    try:
        page = SESSION.get(
            f"https://news.google.com/rss/articles/{art_id}", timeout=TIMEOUT
        )
        soup = BeautifulSoup(page.text, "lxml")
        div = soup.select_one("c-wiz > div[jscontroller]") or soup.select_one(
            "div[data-n-a-sg]"
        )
        if not div:
            return None
        sig = div.get("data-n-a-sg")
        ts = div.get("data-n-a-ts")
        if not sig or not ts:
            return None
        inner = json.dumps(
            [
                "garturlreq",
                [
                    ["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
                     None, None, None, None, None, 0, 1],
                    "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0,
                ],
                art_id,
                int(ts),
                sig,
            ]
        )
        payload = {"f.req": json.dumps([[["Fbv4je", inner, None, "generic"]]])}
        res = SESSION.post(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
            timeout=TIMEOUT,
        )
        body = res.text.split("\n\n", 1)[-1]
        body = body.lstrip(")]}'\n")
        data = json.loads(body)
        for chunk in data:
            if isinstance(chunk, list) and len(chunk) > 2 and isinstance(chunk[2], str):
                try:
                    decoded = json.loads(chunk[2])
                    if isinstance(decoded, list) and len(decoded) > 1 and str(
                        decoded[1]
                    ).startswith("http"):
                        return decoded[1]
                except Exception:
                    continue
    except Exception as e:
        log("decode failed:", e)
    return None


# --------------------------------------------------------------------------- #
# Article extraction
# --------------------------------------------------------------------------- #
def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for n in names:
        tag = soup.find("meta", attrs={"property": n}) or soup.find(
            "meta", attrs={"name": n}
        )
        if tag and tag.get("content"):
            return tag["content"].strip()
    return None


def _img_src(img) -> str | None:
    for attr in ("data-src", "data-lazy-src", "data-original", "src"):
        v = img.get(attr)
        if v and not v.startswith("data:"):
            return v
    srcset = img.get("data-srcset") or img.get("srcset")
    if srcset:
        first = srcset.split(",")[0].strip().split(" ")[0]
        if first and not first.startswith("data:"):
            return first
    return None


def extract_images(soup: BeautifulSoup, base_url: str, limit: int = 12) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []

    def push(src: str | None, alt: str = "", kind: str = "content"):
        if not src:
            return
        src = urljoin(base_url, src.strip())
        if not src.startswith("http"):
            return
        key = src.split("?")[0]
        if key in seen or BAD_IMG_PATTERNS.search(key):
            return
        if key.lower().endswith((".svg", ".gif", ".ico")):
            return
        seen.add(key)
        out.append({"url": src, "alt": (alt or "").strip()[:300], "type": kind})

    push(_meta(soup, "og:image", "og:image:secure_url", "twitter:image"), "", "hero")

    # ld+json images
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or "")
        except Exception:
            continue
        stack = [data]
        while stack:
            cur = stack.pop()
            if isinstance(cur, dict):
                img = cur.get("image")
                if isinstance(img, str):
                    push(img, "", "hero")
                elif isinstance(img, dict):
                    push(img.get("url") or img.get("contentUrl"), "", "hero")
                elif isinstance(img, list):
                    for i in img:
                        if isinstance(i, str):
                            push(i, "", "hero")
                        elif isinstance(i, dict):
                            push(i.get("url") or i.get("contentUrl"), "", "hero")
                stack.extend(v for v in cur.values() if isinstance(v, (dict, list)))
            elif isinstance(cur, list):
                stack.extend(cur)

    container = (
        soup.find("article")
        or soup.find(attrs={"itemprop": "articleBody"})
        or soup.find("main")
        or soup.body
        or soup
    )
    for img in container.find_all("img"):
        try:
            w = int(str(img.get("width", "999")).rstrip("px") or 999)
            h = int(str(img.get("height", "999")).rstrip("px") or 999)
            if w < 120 or h < 120:
                continue
        except Exception:
            pass
        push(_img_src(img), img.get("alt", ""), "content")
        if len(out) >= limit:
            break
    return out[:limit]


def extract_article(url: str) -> dict:
    """Return dict(title, text, summary, author, canonical, images, site)."""
    result: dict[str, Any] = {
        "canonical_url": url,
        "site_name": domain_of(url),
        "author": None,
        "text": "",
        "summary": None,
        "images": [],
        "page_title": None,
        "published": None,
    }
    try:
        res = SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)
        res.raise_for_status()
        final_url = clean_url(res.url)
        result["canonical_url"] = final_url
        html_text = res.text
    except Exception as e:
        result["error"] = f"fetch failed: {e}"
        return result

    soup = BeautifulSoup(html_text, "lxml")
    canon = soup.find("link", rel="canonical")
    if canon and canon.get("href", "").startswith("http"):
        result["canonical_url"] = clean_url(canon["href"])
    result["site_name"] = _meta(soup, "og:site_name") or domain_of(result["canonical_url"])
    result["page_title"] = _meta(soup, "og:title") or (soup.title.string.strip() if soup.title and soup.title.string else None)
    result["summary"] = _meta(soup, "description", "og:description", "twitter:description")
    result["author"] = _meta(soup, "author", "article:author", "parsely-author")
    result["published"] = _meta(soup, "article:published_time", "datePublished", "parsely-pub-date")
    result["images"] = extract_images(soup, result["canonical_url"])

    text = ""
    if trafilatura is not None:
        try:
            text = trafilatura.extract(
                html_text,
                url=result["canonical_url"],
                include_comments=False,
                include_tables=False,
                favor_recall=True,
            ) or ""
        except Exception:
            text = ""
    if not text:
        container = soup.find("article") or soup.find("main") or soup.body
        if container:
            paras = [p.get_text(" ", strip=True) for p in container.find_all("p")]
            text = "\n\n".join(p for p in paras if len(p) > 40)
    result["text"] = text.strip()
    return result


# --------------------------------------------------------------------------- #
# Translation
# --------------------------------------------------------------------------- #
_translator = None


def translate_fa(text: str | None, limit: int | None = None) -> str | None:
    global _translator
    if not TRANSLATE or not text or GoogleTranslator is None:
        return None
    if limit:
        text = text[:limit]
    if _translator is None:
        _translator = GoogleTranslator(source="auto", target="fa")
    chunks: list[str] = []
    buf = ""
    for para in text.split("\n"):
        if len(buf) + len(para) + 1 > 4500:
            chunks.append(buf)
            buf = para
        else:
            buf = f"{buf}\n{para}" if buf else para
    if buf:
        chunks.append(buf)
    out: list[str] = []
    for c in chunks:
        if not c.strip():
            out.append(c)
            continue
        for attempt in range(3):
            try:
                out.append(_translator.translate(c) or "")
                break
            except Exception as e:
                log(f"translate retry {attempt+1}: {e}")
                time.sleep(1.5 * (attempt + 1))
        else:
            out.append("")
        time.sleep(0.3)
    joined = "\n".join(out).strip()
    return joined or None


# --------------------------------------------------------------------------- #
# RSS parsing
# --------------------------------------------------------------------------- #
def parse_description_links(desc_html: str) -> list[dict]:
    links: list[dict] = []
    if not desc_html:
        return links
    soup = BeautifulSoup(html.unescape(desc_html), "lxml")
    for a in soup.find_all("a", href=True):
        title = a.get_text(" ", strip=True)
        href = a["href"]
        # try to pick up the publisher name in the following <font> tag
        source = None
        nxt = a.find_next("font")
        if nxt:
            source = nxt.get_text(" ", strip=True) or None
        if href.startswith("http"):
            links.append({"title": title, "google_url": href, "source": source})
    return links


def fetch_feed(url: str) -> list[dict]:
    log("fetching feed:", url)
    res = SESSION.get(url, timeout=TIMEOUT)
    res.raise_for_status()
    parsed = feedparser.parse(res.content)
    items: list[dict] = []
    for e in parsed.entries:
        link = e.get("link")
        if not link:
            continue
        desc = e.get("summary", "") or e.get("description", "")
        source = None
        if "source" in e and isinstance(e["source"], dict):
            source = e["source"].get("title")
        items.append(
            {
                "id": make_id(link),
                "title": html.unescape(e.get("title", "")).strip(),
                "google_url": link,
                "published_at": to_iso(e.get("published")) or datetime.now(timezone.utc).isoformat(),
                "source": source,
                "description_links": parse_description_links(desc),
            }
        )
    log(f"feed items: {len(items)}")
    return items


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def load_existing(path: str) -> dict:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"items": []}


def strip_source_suffix(title: str, source: str | None) -> str:
    if source and title.endswith(f" - {source}"):
        return title[: -(len(source) + 3)].strip()
    return re.sub(r"\s+-\s+[^-]{2,40}$", "", title).strip() or title


def build_item(entry: dict) -> dict:
    title_en = strip_source_suffix(entry["title"], entry.get("source"))
    real_url = decode_google_news_url(entry["google_url"])
    article: dict[str, Any] = {}
    if real_url:
        log("  ->", real_url[:100])
        article = extract_article(real_url)
    else:
        log("  !! could not decode url")

    # resolve related links (decode only, no scraping – keep the run fast)
    related: list[dict] = []
    for rl in entry.get("description_links", [])[:8]:
        decoded = decode_google_news_url(rl["google_url"])
        related.append(
            {
                "title": strip_source_suffix(rl["title"], rl.get("source")),
                "title_fa": translate_fa(strip_source_suffix(rl["title"], rl.get("source"))),
                "source": rl.get("source"),
                "url": decoded or rl["google_url"],
                "google_url": rl["google_url"],
            }
        )

    text_en = article.get("text", "") or ""
    summary_en = article.get("summary") or (text_en[:280] + "…" if len(text_en) > 280 else text_en) or None

    return {
        "id": entry["id"],
        "title": {"en": title_en, "fa": translate_fa(title_en)},
        "summary": {"en": summary_en, "fa": translate_fa(summary_en)},
        "content": {
            "en": text_en,
            "fa": translate_fa(text_en, MAX_TRANSLATE_CHARS),
        },
        "published_at": article.get("published") or entry["published_at"],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": entry.get("source") or article.get("site_name"),
        "author": article.get("author"),
        "url": article.get("canonical_url") or real_url,
        "google_url": entry["google_url"],
        "images": article.get("images", []),
        "image": (article.get("images") or [{}])[0].get("url") if article.get("images") else None,
        "related_links": related,
        "error": article.get("error"),
    }


def main() -> int:
    started = time.time()
    existing = load_existing(OUTPUT)
    existing_items = {i["id"]: i for i in existing.get("items", []) if "id" in i}
    feed_items = fetch_feed(FEED_URL)

    new_entries = [e for e in feed_items if e["id"] not in existing_items]
    log(f"new items to scrape: {len(new_entries)} (limit {MAX_NEW_PER_RUN})")

    built: list[dict] = []
    for idx, entry in enumerate(new_entries[:MAX_NEW_PER_RUN], 1):
        log(f"[{idx}/{min(len(new_entries), MAX_NEW_PER_RUN)}] {entry['title'][:80]}")
        try:
            built.append(build_item(entry))
        except Exception:
            traceback.print_exc()
        time.sleep(0.5)

    # merge: newly scraped + everything already known, sorted by date
    merged: dict[str, dict] = {i["id"]: i for i in built}
    for i in existing_items.values():
        merged.setdefault(i["id"], i)
    feed_ids = [e["id"] for e in feed_items]
    items = sorted(
        merged.values(),
        key=lambda i: (i["id"] in feed_ids, i.get("published_at") or ""),
        reverse=True,
    )[:MAX_ITEMS]

    now = datetime.now(timezone.utc)
    payload = {
        "name": "Nova Tech News",
        "feed": FEED_URL,
        "generated_at": now.isoformat(),
        "month": now.strftime("%Y-%m"),
        "count": len(items),
        "new_this_run": len(built),
        "languages": ["en", "fa"],
        "items": items,
    }
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    log(f"wrote {OUTPUT} ({len(items)} items) in {time.time() - started:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
