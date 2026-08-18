#!/usr/bin/env python3
"""
Batch replace all .html internal links to clean URLs across aifincalc.com site.
- href="X/index.html" -> href="X/"
- href="index.html" -> href="./"
- Preserves external links, CSS/JS/image assets, and the baidu_verify file.
"""

import os
import re
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))

# Skip these files
SKIP_FILES = {
    "baidu_verify_codeva-WTMipmucLG.html",
}

# Single comprehensive pattern: any relative href ending in /index.html
# Negative lookahead excludes external URLs (http://, https://, //, #, mailto:, tel:)
pattern_href_path = re.compile(
    r'href="(?!(?:https?://|//|#|mailto:|tel:))([^"]*?)/index\.html"'
)
# Standalone: href="index.html" (root page linking to itself)
pattern_href_standalone = re.compile(r'href="index\.html"')

stats = {
    "files_processed": 0,
    "files_modified": 0,
    "total_replacements": 0,
    "details": [],
}

def process_file(filepath):
    """Process a single HTML file, replacing .html internal links with clean URLs."""
    filename = os.path.basename(filepath)
    if filename in SKIP_FILES:
        return

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    replacements = 0

    # Replace: href="path/index.html" -> href="path/"
    #          href="../index.html" -> href="../"
    #          href="blog/article1/index.html" -> href="blog/article1/"
    #          (skips external URLs via negative lookahead)
    new_content, n1 = pattern_href_path.subn(r'href="\1/"', content)
    replacements += n1
    content = new_content

    # Replace: href="index.html" -> href="./"
    new_content, n2 = pattern_href_standalone.subn(r'href="./"', content)
    replacements += n2
    content = new_content

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["files_modified"] += 1
        stats["details"].append(f"  {filepath}: {replacements} replacements")
    else:
        stats["details"].append(f"  {filepath}: 0 (no .html links)")

    stats["files_processed"] += 1
    stats["total_replacements"] += replacements


def main():
    print(f"=== Clean URL Batch Replacement for aifincalc.com ===")
    print(f"Site directory: {SITE_DIR}")
    print()

    # Find all HTML files
    html_files = []
    for root, dirs, files in os.walk(SITE_DIR):
        for f in files:
            if f.endswith(".html"):
                html_files.append(os.path.join(root, f))

    print(f"Found {len(html_files)} HTML files")
    print()

    for filepath in sorted(html_files):
        process_file(filepath)

    # Print details
    for detail in stats["details"]:
        print(detail)

    print()
    print(f"=== Summary ===")
    print(f"Files processed: {stats['files_processed']}")
    print(f"Files modified:  {stats['files_modified']}")
    print(f"Total replacements: {stats['total_replacements']}")

    # Verify: check for any remaining .html in href attributes (excluding external links)
    print()
    print("=== Verification: checking for .html residue in href ===")
    remaining = []
    for root, dirs, files in os.walk(SITE_DIR):
        for f in files:
            if f.endswith(".html") and f not in SKIP_FILES:
                fpath = os.path.join(root, f)
                with open(fpath, "r", encoding="utf-8") as fh:
                    content = fh.read()
                # Find all href values
                hrefs = re.findall(r'href="([^"]*)"', content)
                for href in hrefs:
                    # Skip external links, anchors, and asset links
                    if href.startswith(("http://", "https://", "#", "mailto:", "tel:")):
                        continue
                    if ".html" in href:
                        remaining.append(f"  {fpath}: href=\"{href}\"")

    if remaining:
        print(f"WARNING: {len(remaining)} .html links remaining!")
        for r in remaining:
            print(r)
        sys.exit(1)
    else:
        print("PASS: No .html internal links remaining in any href attribute.")
        sys.exit(0)


if __name__ == "__main__":
    main()
