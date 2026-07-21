#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inject BreadcrumbList JSON-LD into the <head> of every HTML page.

The site already has WebSite/SoftwareApplication/BlogPosting/FAQPage schemas,
but is missing BreadcrumbList entirely (0 occurrences). This script adds a
BreadcrumbList @graph to every page except the homepage (single-item crumbs
are pointless) and the baidu verification file.

Safe by design:
  * skips files that already contain BreadcrumbList
  * inserts a separate <script> block right before </head>
  * absolute URLs match the existing canonical style (trailing slash)
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://aifincalc.com"
SKIP = {"baidu_verify_codeva-WTMipmucLG.html"}

CALC_NAMES = {
    "tax-calculator": "个人所得税计算器",
    "social-insurance-calculator": "社保计算器",
    "mortgage-calculator": "房贷计算器",
    "car-loan-calculator": "车贷计算器",
    "provident-fund-calculator": "公积金贷款计算器",
    "deposit-calculator": "存款利息计算器",
    "exchange-rate-calculator": "汇率换算器",
    "investment-calculator": "投资收益计算器",
}

STATIC_NAMES = {
    "about": "关于本站",
    "contact": "联系我们",
    "privacy": "隐私政策",
}

BLOG_SHORT = {
    "article1": "个税专项附加扣除",
    "article2": "等额本息与等额本金",
    "article3": "公积金贷款额度",
    "article4": "基金定投与复利",
    "article5": "年终奖计税",
    "article6": "社保缴费基数",
    "article7": "提前还贷",
}


def city_name_from_title(content, calc_dir):
    m = re.search(r"<title>\s*([\u4e00-\u9fa5]{2,4})(?:个税|公积金)", content)
    if m:
        return m.group(1)
    return None


def build_trail(rel, content):
    """Return list of (name, url) breadcrumb items, excluding the homepage
    single-item case."""
    rel = rel.replace("\\", "/")
    # path without index.html, no leading/trailing slash
    if rel.endswith("index.html"):
        rel = rel[: -len("index.html")]
    rel = rel.strip("/")
    if rel == "":
        return None  # homepage -> skip

    parts = [p for p in rel.split("/") if p]
    items = [("首页", SITE + "/")]

    top = parts[0]
    if top in CALC_NAMES:
        items.append((CALC_NAMES[top], f"{SITE}/{top}/"))
        if len(parts) >= 2:
            city = city_name_from_title(content, top)
            if not city:
                city = parts[1]
            items.append((city, f"{SITE}/{top}/{parts[1]}/"))
    elif top == "blog":
        items.append(("博客", f"{SITE}/blog/"))
        if len(parts) >= 2 and parts[1] in BLOG_SHORT:
            items.append((BLOG_SHORT[parts[1]], f"{SITE}/blog/{parts[1]}/"))
    elif top in STATIC_NAMES:
        items.append((STATIC_NAMES[top], f"{SITE}/{top}/"))
    else:
        return None

    return items


def make_jsonld(items):
    crumbs = []
    for i, (name, url) in enumerate(items, 1):
        crumbs.append(
            "            {\n"
            '                "@type": "ListItem",\n'
            f'                "position": {i},\n'
            f'                "name": "{name}",\n'
            f'                "item": "{url}"\n'
            "            }"
        )
    inner = ",\n".join(crumbs)
    return (
        '    <!-- BreadcrumbList -->\n'
        '    <script type="application/ld+json">\n'
        "    {\n"
        '        "@context": "https://schema.org",\n'
        '        "@type": "BreadcrumbList",\n'
        '        "itemListElement": [\n'
        f"{inner}\n"
        "        ]\n"
        "    }\n"
        "    </script>"
    )


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))
    done = 0
    skipped = 0
    for f in files:
        base = os.path.basename(f)
        if base in SKIP:
            skipped += 1
            continue
        with open(f, "r", encoding="utf-8") as fh:
            content = fh.read()
        if "BreadcrumbList" in content:
            skipped += 1
            continue
        rel = os.path.relpath(f, ROOT)
        items = build_trail(rel, content)
        if not items:
            skipped += 1
            continue
        block = make_jsonld(items)
        if "</head>" not in content:
            print(f"WARN no </head>: {rel}")
            continue
        content = content.replace("</head>", block + "\n</head>", 1)
        with open(f, "w", encoding="utf-8") as fh:
            fh.write(content)
        done += 1
        print(f"OK: {rel}  ({len(items)} crumbs)")
    print(f"\nDone. injected={done}, skipped={skipped}")


if __name__ == "__main__":
    main()
