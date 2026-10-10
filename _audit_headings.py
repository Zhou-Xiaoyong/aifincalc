#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全站标题结构与 SEO 基础项自查脚本（aifincalc.com）

检查项：
  1. <h1> 是否存在 / 是否唯一 / 文本内容
  2. h1/h2/h3 层级数量与顺序合理性（h2 出现前是否有 h1）
  3. <title> 是否存在 / 长度区间
  4. <meta name="description"> 是否存在 / 长度区间
  5. <link rel="canonical"> 是否存在 / 是否等于自身干净 URL
  6. 百度自动推送 JS 是否已部署
  7. viewport（移动适配基础）

用法:
    python _audit_headings.py            # 打印报告 + 写 _audit_headings.txt
    python _audit_headings.py --strict   # 有 P0 问题时退出码 1

退出码: 0 = 无 P0 问题, 1 = 存在 P0 问题
"""

import os
import re
import sys
import html as html_mod

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_HOST = "https://aifincalc.com"
OUT_FILE = os.path.join(SITE_DIR, "_audit_headings.txt")

# 非内容页：不参与 H1 / SEO 检查
SKIP_FILES = {
    "404.html",
    "baidu_verify_codeva-WTMipmucLG.html",
}

PUSH_MARKER = "zz.bdstatic.com/linksubmit/push.js"

TITLE_MIN, TITLE_MAX = 15, 60          # 中文标题建议 30 字符内，放宽到 60 字符（字节无关）
DESC_MIN, DESC_MAX = 60, 160

H1_RE = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.S | re.I)
H1_OPEN_RE = re.compile(r"<h1\b", re.I)
H2_OPEN_RE = re.compile(r"<h2\b", re.I)
H3_OPEN_RE = re.compile(r"<h3\b", re.I)
TITLE_RE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.S | re.I)
DESC_RE = re.compile(
    r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', re.S | re.I
)
DESC_RE_ALT = re.compile(
    r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']', re.S | re.I
)
CANON_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', re.S | re.I
)
VIEWPORT_RE = re.compile(r'<meta\s+name=["\']viewport["\']', re.I)


def strip_tags(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    return html_mod.unescape(s).strip()


def clean_url_for(path: str) -> str:
    """把文件路径转成该页自身的干净 URL。"""
    rel = os.path.relpath(path, SITE_DIR).replace(os.sep, "/")
    if rel == "index.html":
        return SITE_HOST + "/"
    if rel.endswith("/index.html"):
        return SITE_HOST + "/" + rel[: -len("index.html")]
    return SITE_HOST + "/" + rel


def slug_of(path: str) -> str:
    rel = os.path.relpath(path, SITE_DIR).replace(os.sep, "/")
    return rel


def audit_one(path: str):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    rec = {"path": slug_of(path), "issues": [], "p0": [], "p1": []}

    # --- H1 ---
    h1s = [strip_tags(m) for m in H1_RE.findall(content)]
    h1_open = len(H1_OPEN_RE.findall(content))
    rec["h1_count"] = h1_open
    rec["h1_text"] = " | ".join(h1s) if h1s else ""
    if h1_open == 0:
        rec["p0"].append("缺失 <h1>")
    elif h1_open > 1:
        rec["p1"].append(f"存在 {h1_open} 个 <h1>，应唯一")
    if h1_open and not h1s:
        rec["p1"].append("<h1> 为空或含未闭合标签")

    # --- H 层级 ---
    rec["h2_count"] = len(H2_OPEN_RE.findall(content))
    rec["h3_count"] = len(H3_OPEN_RE.findall(content))
    first_h2 = H2_OPEN_RE.search(content)
    first_h1 = H1_OPEN_RE.search(content)
    if first_h2 and (not first_h1 or first_h2.start() < first_h1.start()):
        rec["p1"].append("<h2> 出现在 <h1> 之前，层级倒置")

    # --- title ---
    t = TITLE_RE.search(content)
    title = strip_tags(t.group(1)) if t else ""
    rec["title"] = title
    rec["title_len"] = len(title)
    if not title:
        rec["p0"].append("缺失 <title>")
    elif not (TITLE_MIN <= len(title) <= TITLE_MAX):
        rec["p1"].append(f"<title> 长度 {len(title)} 超出 {TITLE_MIN}-{TITLE_MAX}")

    # --- description ---
    d = DESC_RE.search(content) or DESC_RE_ALT.search(content)
    desc = strip_tags(d.group(1)) if d else ""
    rec["desc_len"] = len(desc)
    if not desc:
        rec["p1"].append("缺失 meta description")
    elif not (DESC_MIN <= len(desc) <= DESC_MAX):
        rec["p1"].append(f"description 长度 {len(desc)} 超出 {DESC_MIN}-{DESC_MAX}")

    # --- canonical ---
    c = CANON_RE.search(content)
    canon = c.group(1).strip() if c else ""
    rec["canonical"] = canon
    want = clean_url_for(path)
    if not canon:
        rec["p0"].append("缺失 canonical")
    elif canon.rstrip("/") != want.rstrip("/"):
        rec["p1"].append(f"canonical 与自身 URL 不一致（期望 {want}）")

    # --- 百度推送 ---
    rec["baidu_push"] = PUSH_MARKER in content
    if not rec["baidu_push"]:
        rec["p1"].append("未部署百度自动推送 JS")

    # --- viewport ---
    rec["viewport"] = bool(VIEWPORT_RE.search(content))
    if not rec["viewport"]:
        rec["p1"].append("缺 viewport（移动适配）")

    return rec


def main():
    files = []
    for root, dirs, fnames in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for fn in fnames:
            if fn.endswith(".html") and fn not in SKIP_FILES:
                files.append(os.path.join(root, fn))
    files.sort()

    recs = [audit_one(p) for p in files]

    p0_list = [r for r in recs if r["p0"]]
    p1_list = [r for r in recs if r["p1"] and not r["p0"]]
    no_h1 = [r for r in recs if r["h1_count"] == 0]
    no_push = [r for r in recs if not r["baidu_push"]]

    lines = []
    W = lines.append
    W("=" * 78)
    W("aifincalc.com 全站标题结构与 SEO 基础项自查报告")
    W("=" * 78)
    W(f"扫描页面数: {len(recs)}")
    W("")
    W(f"[P0] 严重问题页面: {len(p0_list)}")
    W(f"[P1] 次要问题页面: {len(p1_list)}")
    W(f"缺失 <h1> 页面: {len(no_h1)}")
    W(f"未部署百度推送 JS 页面: {len(no_push)}")
    W("")

    # H1 分布
    from collections import Counter
    h1c = Counter(r["h1_count"] for r in recs)
    W("--- <h1> 数量分布 ---")
    for k in sorted(h1c):
        W(f"  {k} 个 <h1>: {h1c[k]} 页")
    W("")

    W("--- 缺失 <h1> 的页面清单 ---")
    if no_h1:
        for r in no_h1:
            W(f"  {r['path']}")
    else:
        W("  （无）")
    W("")

    W("--- 未部署百度推送 JS 的页面清单 ---")
    if no_push:
        for r in no_push:
            W(f"  {r['path']}")
    else:
        W("  （无）")
    W("")

    W("--- P0 问题明细 ---")
    if p0_list:
        for r in p0_list:
            W(f"  {r['path']}")
            for i in r["p0"]:
                W(f"      P0: {i}")
    else:
        W("  （无）")
    W("")

    W("--- P1 问题明细（含 P0 页面一并列出） ---")
    for r in recs:
        if r["p1"]:
            W(f"  {r['path']}")
            for i in r["p1"]:
                W(f"      P1: {i}")
    W("")

    # 每页一行速览
    W("--- 每页速览 (h1 / h2 / title长度 / desc长度 / push / canonical) ---")
    W(f"  {'页面':<52} h1 h2  T  D  P  C")
    for r in recs:
        W(
            f"  {r['path']:<52} {r['h1_count']:>2} {r['h2_count']:>2} "
            f"{r['title_len']:>3} {r['desc_len']:>3} "
            f"{'Y' if r['baidu_push'] else 'N'}  {'Y' if r['canonical'] else 'N'}"
        )
    W("")
    W("=" * 78)

    report = "\n".join(lines)
    print(report)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(report + "\n")

    if "--strict" in sys.argv and (p0_list or no_h1):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
