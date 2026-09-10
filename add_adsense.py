#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inject the Google AdSense global loader <script> into the <head> of every
built HTML page in this site/ directory.

Idempotent: skips any file that already contains the publisher client id, and
skips error/verification stubs that must not carry ad code.

This is the deploy-time copy (committed to the repo). A mirror lives at the
project root E:/WorkBuddy/aifincalc/add_adsense.py which scans ../site instead.
Keep the injection logic in both copies in sync.

Re-run after any full rebuild or after the weekly blog automation adds a new
page, to guarantee the snippet is present on freshly generated pages.
"""
import os
import glob

# This script lives inside site/, so its own directory IS the site root.
SITE_DIR = os.path.dirname(os.path.abspath(__file__))

# Files that must NOT carry AdSense code.
#  - 404.html is an error page (AdSense policy) and is noindex.
#  - baidu_verify_*.html are search-console verification stubs, not content.
SKIP_BASENAME = {"404.html"}
SKIP_PREFIX = ("baidu_verify",)

CLIENT_ID = "ca-pub-3625422078884598"

ADSENSE_BLOCK = (
    '    <!-- Google AdSense -->\n'
    '    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='
    + CLIENT_ID + '"\n'
    '    crossorigin="anonymous"></script>'
)


def main():
    files = sorted(glob.glob(os.path.join(SITE_DIR, "**", "*.html"), recursive=True))
    done = 0
    skipped = 0
    for f in files:
        base = os.path.basename(f)
        if base in SKIP_BASENAME or base.startswith(SKIP_PREFIX):
            skipped += 1
            continue
        with open(f, "r", encoding="utf-8") as fh:
            content = fh.read()
        rel = os.path.relpath(f, SITE_DIR)
        if CLIENT_ID in content:
            skipped += 1
            continue
        if "</head>" not in content:
            print(f"WARN no </head>: {rel}")
            skipped += 1
            continue
        content = content.replace("</head>", ADSENSE_BLOCK + "\n</head>", 1)
        with open(f, "w", encoding="utf-8") as fh:
            fh.write(content)
        done += 1
        print(f"OK: {rel}")
    print(f"\nDone. injected={done}, skipped={skipped}")


if __name__ == "__main__":
    main()
