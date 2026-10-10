#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
结构化数据（JSON-LD）全站自查 —— 面向百度搜索规范

百度 2026 年明确推荐 JSON-LD 格式，并会重点核查以下三点，
不合规的轻则不给富摘要，重则视为「标记滥用」整站降权：

  1. JSON 语法必须合法（多余逗号 / 引号未转义 / 括号不闭合直接失效）
  2. 标记内容必须与页面正文一致 —— 尤其 FAQ：写进标记的问题与答案
     必须在页面上真实可见，不得只存在于标记里
  3. 只给真正包含该类型内容的页面加标记，避免过度标记

本脚本据此逐页核查并输出报告。

用法:
    python _audit_structured_data.py
    python _audit_structured_data.py --strict   # 有 P0 时退出码 1
"""

import os
import re
import sys
import json
import html as html_mod
from collections import Counter

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SITE_DIR, "_audit_structured_data.txt")
SKIP_FILES = {"404.html", "baidu_verify_codeva-WTMipmucLG.html"}

LD_RE = re.compile(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)

# 各类型的关键字段（百度关注项）
REQUIRED = {
    "Article": ["headline", "description"],
    "BlogPosting": ["headline", "description"],
    "NewsArticle": ["headline", "description"],
    "FAQPage": ["mainEntity"],
    "SoftwareApplication": ["name", "description"],
    "Dataset": ["name", "description"],
    "BreadcrumbList": ["itemListElement"],
    "Organization": ["name", "url"],
    "WebSite": ["name", "url"],
    "ItemList": ["itemListElement"],
}


def visible_text(html):
    s = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.S | re.I)
    s = re.sub(r"<style[^>]*>.*?</style>", "", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html_mod.unescape(s)
    return re.sub(r"\s+", "", s)


def iter_blocks(html):
    for m in LD_RE.finditer(html):
        yield m.group(1)


def walk_types(obj, out):
    """递归收集所有 @type 值。"""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "@type":
                if isinstance(v, str):
                    out.append(v)
                elif isinstance(v, list):
                    out.extend([x for x in v if isinstance(x, str)])
            else:
                walk_types(v, out)
    elif isinstance(obj, list):
        for x in obj:
            walk_types(x, out)


def collect_faq_pairs(obj, out):
    if isinstance(obj, dict):
        if obj.get("@type") == "FAQPage" or "mainEntity" in obj:
            me = obj.get("mainEntity")
            if isinstance(me, list):
                for q in me:
                    if isinstance(q, dict) and q.get("@type") == "Question":
                        name = q.get("name") or ""
                        ans = ""
                        aa = q.get("acceptedAnswer")
                        if isinstance(aa, dict):
                            ans = aa.get("text") or ""
                        elif isinstance(aa, str):
                            ans = aa
                        if name:
                            out.append((name, ans))
            elif isinstance(me, dict):
                pass
        for v in obj.values():
            collect_faq_pairs(v, out)
    elif isinstance(obj, list):
        for x in obj:
            collect_faq_pairs(x, out)


def norm(s):
    return re.sub(r"\s+", "", html_mod.unescape(re.sub(r"<[^>]+>", "", str(s))))


def main():
    pages = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".html") and f not in SKIP_FILES:
                pages.append(os.path.join(root, f))
    pages.sort()

    type_counter = Counter()
    syntax_errors = []       # P0
    faq_mismatch = []        # P0（百度明确视为标记滥用）
    missing_required = []    # P1
    no_ld = []               # P2
    per_page_types = {}

    for p in pages:
        rel = os.path.relpath(p, SITE_DIR).replace(os.sep, "/")
        raw = open(p, "r", encoding="utf-8", errors="replace").read()
        vtext = visible_text(raw)
        blocks = list(iter_blocks(raw))
        if not blocks:
            no_ld.append(rel)
            continue

        types_here = []
        faq_pairs = []
        for i, b in enumerate(blocks):
            txt = b.strip()
            if not txt:
                continue
            try:
                obj = json.loads(txt)
            except Exception as e:
                syntax_errors.append((rel, i + 1, str(e)[:90]))
                continue
            ts = []
            walk_types(obj, ts)
            types_here.extend(ts)
            collect_faq_pairs(obj, faq_pairs)

        for t in types_here:
            type_counter[t] += 1
        per_page_types[rel] = types_here

        # 必填字段
        for i, b in enumerate(blocks):
            try:
                obj = json.loads(b.strip())
            except Exception:
                continue
            t = obj.get("@type") if isinstance(obj, dict) else None
            if isinstance(t, str) and t in REQUIRED:
                miss = [f for f in REQUIRED[t] if not obj.get(f)]
                if miss:
                    missing_required.append((rel, t, ",".join(miss)))

        # FAQ 可见性：问题文本必须能在页面可见正文中找到（取前 12 字做包含判断）
        for q, a in faq_pairs:
            probe = norm(q)[:12]
            if probe and probe not in vtext:
                faq_mismatch.append((rel, q[:40]))
            probe_a = norm(a)[:16]
            if probe_a and probe_a not in vtext:
                faq_mismatch.append((rel, "（答案不可见）" + q[:30]))

    lines = []
    W = lines.append
    W("=" * 78)
    W("aifincalc.com 结构化数据（JSON-LD）自查报告 · 面向百度搜索规范")
    W("=" * 78)
    W("扫描页面数: {}".format(len(pages)))
    W("含结构化数据的页面: {}".format(len(pages) - len(no_ld)))
    W("无结构化数据的页面: {}".format(len(no_ld)))
    W("")
    W("[P0] JSON 语法错误: {}".format(len(syntax_errors)))
    W("[P0] FAQ 标记与正文不符: {}".format(len(faq_mismatch)))
    W("[P1] 类型必填字段缺失: {}".format(len(missing_required)))
    W("")
    W("--- @type 覆盖统计 ---")
    for t, n in type_counter.most_common():
        W("  {:<24}{} 页".format(t, n))
    W("")

    W("--- ① JSON 语法错误（必须修，否则整块标记失效） ---")
    if syntax_errors:
        for rel, idx, err in syntax_errors[:30]:
            W("  {} (第 {} 块): {}".format(rel, idx, err))
    else:
        W("  无 ✅")
    W("")

    W("--- ② FAQ 标记与页面正文一致性（百度视为标记滥用红线） ---")
    if faq_mismatch:
        for rel, q in faq_mismatch[:40]:
            W("  {} -> {}".format(rel, q))
        W("  说明：以上问题/答案文本在页面可见正文中未找到，" \
          "建议改为从页面真实内容生成标记。")
    else:
        W("  全部 FAQ 的问题与答案均可在页面正文中找到 ✅")
    W("")

    W("--- ③ 必填字段缺失 ---")
    if missing_required:
        for rel, t, f in missing_required[:30]:
            W("  {} [{}] 缺: {}".format(rel, t, f))
    else:
        W("  无 ✅")
    W("")

    W("--- ④ 无结构化数据的页面 ---")
    if no_ld:
        for rel in no_ld[:40]:
            W("  {}".format(rel))
        if len(no_ld) > 40:
            W("  ... 共 {} 页".format(len(no_ld)))
    else:
        W("  无 ✅")
    W("")

    W("=" * 78)
    report = "\n".join(lines)
    print(report)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(report + "\n")

    if "--strict" in sys.argv and (syntax_errors or faq_mismatch):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
