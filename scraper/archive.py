#!/usr/bin/env python3
"""
Monthly archive rotation
========================

Moves the current `public/data/news.json` to
`public/data/archive/news-YYYY-MM.json` (YYYY-MM = the month the file belongs
to, i.e. the *previous* month) and starts a fresh, empty `news.json`.

It also (re)builds `public/data/archive/index.json` – a list of every archive
file with its month and item count, which the web app / API uses.

Run automatically by the GitHub Action on the 1st of each month, but it is
idempotent: if `news.json` already belongs to the current month nothing is
moved (unless FORCE=1).

    python scraper/archive.py            # rotate if month changed
    FORCE=1 python scraper/archive.py    # rotate regardless
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "public", "data")
NEWS = os.path.join(DATA_DIR, "news.json")
ARCHIVE_DIR = os.path.join(DATA_DIR, "archive")
INDEX = os.path.join(ARCHIVE_DIR, "index.json")
FORCE = os.environ.get("FORCE", "0") == "1"


def log(*a):
    print("[archive]", *a, file=sys.stderr, flush=True)


def previous_month(now: datetime) -> str:
    y, m = now.year, now.month - 1
    if m == 0:
        y, m = y - 1, 12
    return f"{y:04d}-{m:02d}"


def rebuild_index() -> None:
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    entries = []
    for name in sorted(os.listdir(ARCHIVE_DIR), reverse=True):
        if not (name.startswith("news-") and name.endswith(".json")):
            continue
        path = os.path.join(ARCHIVE_DIR, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            entries.append(
                {
                    "month": name[len("news-"):-len(".json")],
                    "file": f"archive/{name}",
                    "count": data.get("count", len(data.get("items", []))),
                    "generated_at": data.get("generated_at"),
                }
            )
        except Exception as e:
            log("skip broken archive", name, e)
    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump({"archives": entries, "updated_at": datetime.now(timezone.utc).isoformat()}, f, ensure_ascii=False, indent=2)
    log(f"index rebuilt with {len(entries)} archives")


def main() -> int:
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    if not os.path.exists(NEWS):
        log("no news.json yet – nothing to archive")
        rebuild_index()
        return 0

    with open(NEWS, "r", encoding="utf-8") as f:
        data = json.load(f)

    file_month = data.get("month")
    if not file_month:
        gen = data.get("generated_at")
        file_month = gen[:7] if gen else previous_month(now)

    if file_month == current_month and not FORCE:
        log(f"news.json already belongs to {current_month}; skipping rotation")
        rebuild_index()
        return 0

    target_month = file_month if file_month != current_month else previous_month(now)
    target = os.path.join(ARCHIVE_DIR, f"news-{target_month}.json")

    # merge if an archive for that month already exists
    if os.path.exists(target):
        with open(target, "r", encoding="utf-8") as f:
            old = json.load(f)
        merged = {i["id"]: i for i in old.get("items", [])}
        for i in data.get("items", []):
            merged.setdefault(i["id"], i)
        data["items"] = sorted(merged.values(), key=lambda i: i.get("published_at") or "", reverse=True)

    data["count"] = len(data["items"])
    data["archived_at"] = now.isoformat()
    data["month"] = target_month
    with open(target, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"archived {data['count']} items -> {target}")

    fresh = {
        "name": data.get("name", "Nova Tech News"),
        "feed": data.get("feed"),
        "generated_at": now.isoformat(),
        "month": current_month,
        "count": 0,
        "new_this_run": 0,
        "languages": ["en", "fa"],
        "items": [],
    }
    with open(NEWS, "w", encoding="utf-8") as f:
        json.dump(fresh, f, ensure_ascii=False, indent=2)
    log("fresh news.json created")
    rebuild_index()
    return 0


if __name__ == "__main__":
    sys.exit(main())
