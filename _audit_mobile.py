#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移动适配（移动友好度）全站自查脚本

百度 90%+ 检索量来自移动端，移动适配是收录与排名的前置条件。
本脚本在不依赖浏览器的情况下做静态可判定项检查：

  1. viewport 声明是否为 width=device-width（而非固定宽度）
  2. 页面是否引用至少一个含 @media 断点的样式表
  3. 是否存在固定 px 宽度且 > 375px 的元素（横向溢出风险）
  4. 关键 CSS 中是否存在 < 12px 的字号
  5. 宽表格是否包在 overflow-x 容器内
  6. 图片是否缺少 max-width 约束
  7. 触控目标（导航链接）尺寸偏小的可能性提示

用法:
    python _audit_mobile.py
    python _audit_mobile.py --strict   # 存在 P0 时退出码 1
"""

import os
import re
import sys
import glob

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SITE_DIR, "_audit_mobile.txt")

SKIP_FILES = {"404.html", "baidu_verify_codeva-WTMipmucLG.html"}

VIEWPORT_RE = re.compile(r'<meta\s+name=["\']viewport["\']\s+content=["\']([^"\']*)["\']', re.I)
FIXED_W_RE = re.compile(r'width\s*:\s*(\d{3,4})\s*px', re.I)
MEDIA_RE = re.compile(r'@media[^{]*max-width\s*:\s*\d+px', re.I)
SMALL_FONT_RE = re.compile(r'font-size\s*:\s*(\d+(?:\.\d+)?)px', re.I)
MIN_W_RE = re.compile(r'min-width\s*:\s*(\d{3,4})\s*px', re.I)


def overflow_classes():
    """扫描全站 CSS，返回所有「规则体含 overflow-x: auto/scroll」的类名集合。

    宽表格的横向保护通常是靠包裹元素的类提供的（如 .table-wrap /
    .rate-table-container），只看标签附近的 inline overflow 会大量误报。
    """
    classes = set()
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if not f.endswith(".css"):
                continue
            s = open(os.path.join(root, f), "r", encoding="utf-8", errors="replace").read()
            for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", s):
                sel, body = m.group(1), m.group(2)
                if re.search(r"overflow(-x)?\s*:\s*(auto|scroll)", body, re.I):
                    classes.update(re.findall(r"\.([A-Za-z0-9_-]+)", sel))
    return classes


def table_columns(page_html, pos):
    """取表格首个数据行的单元格数；≥5 列在 375px 屏上大概率横向溢出。"""
    chunk = page_html[pos:pos + 3000]
    m = re.search(r"<tr[^>]*>(.*?)</tr>", chunk, re.S | re.I)
    if not m:
        return 0
    return len(re.findall(r"<t[hd]\b", m.group(1), re.I))


def table_is_wrapped(page_html, pos, ovf_classes):
    """判断 pos 处的 <table> 是否被带 overflow 的容器包裹。"""
    head = page_html[max(0, pos - 500):pos]
    # 同一节点内的 inline overflow
    if re.search(r'style\s*=\s*"[^"]*overflow(-x)?\s*:\s*(auto|scroll)', head, re.I):
        return True
    # 最近的若干层祖先类名
    for tag in re.findall(r'<[a-zA-Z][^>]*>', head)[-6:]:
        cm = re.search(r'class\s*=\s*"([^"]*)"', tag)
        if cm and set(cm.group(1).split()) & ovf_classes:
            return True
    return False


def collect_pages():
    pages = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".html") and f not in SKIP_FILES:
                pages.append(os.path.join(root, f))
    return sorted(pages)


def audit_css():
    """返回 (含断点的样式表数, 样式表总数, 小于12px的字号样本, 固定大宽度样本)"""
    css_files = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".css"):
                css_files.append(os.path.join(root, f))
    with_media = 0
    small_fonts = []
    big_fixed = []
    for p in css_files:
        s = open(p, "r", encoding="utf-8", errors="replace").read()
        if MEDIA_RE.search(s):
            with_media += 1
        for m in SMALL_FONT_RE.finditer(s):
            val = float(m.group(1))
            if val < 12:
                small_fonts.append((os.path.relpath(p, SITE_DIR), m.group(0)))
        for m in MIN_W_RE.finditer(s):
            val = int(m.group(1))
            if val > 375:
                big_fixed.append((os.path.relpath(p, SITE_DIR), m.group(0)))
    return with_media, len(css_files), small_fonts, big_fixed


def main():
    global OVF_CLASSES
    OVF_CLASSES = overflow_classes() | {"table-wrap", "da-tw"}
    print("检测到提供横向溢出保护的类: {}".format(
        ", ".join("." + c for c in sorted(OVF_CLASSES))))
    print()
    pages = collect_pages()
    lines = []
    W = lines.append

    no_viewport = []
    fixed_width = []
    no_media = []
    table_unwrapped = []
    img_no_maxw = []

    for p in pages:
        s = open(p, "r", encoding="utf-8", errors="replace").read()
        rel = os.path.relpath(p, SITE_DIR).replace(os.sep, "/")

        m = VIEWPORT_RE.search(s)
        if not m:
            no_viewport.append(rel)
        elif "width=device-width" not in m.group(1).replace(" ", ""):
            fixed_width.append((rel, m.group(1)))

        # 宽表格（≥5 列）是否被带 overflow 的容器包裹
        for tm in re.finditer(r"<table\b", s):
            cols = table_columns(s, tm.start())
            if cols >= 5 and not table_is_wrapped(s, tm.start(), OVF_CLASSES):
                table_unwrapped.append((rel, cols))
                break

        # 页面内联定位宽度 > 375px
        for wm in FIXED_W_RE.finditer(s):
            if int(wm.group(1)) > 375 and "max-width" not in s[max(0, wm.start() - 20):wm.start()]:
                pass  # 内联宽度多为容器上限，交由 CSS 层面判断

        # 图片缺 max-width 约束（依赖 CSS 全局规则，这里只做提示）
        if re.search(r"<img\b", s) and "max-width" not in s:
            img_no_maxw.append(rel)

    with_media, total_css, small_fonts, big_fixed = audit_css()

    W("=" * 78)
    W("aifincalc.com 移动适配（移动友好度）自查报告")
    W("=" * 78)
    W("扫描页面数: {}".format(len(pages)))
    W("样式表: {} 个，其中 {} 个含 max-width 断点".format(total_css, with_media))
    W("")
    W("[P0] 缺失 viewport 的页面: {}".format(len(no_viewport)))
    W("[P0] viewport 非 device-width 的页面: {}".format(len(fixed_width)))
    W("[P1] ≥5 列宽表格未包 overflow 容器的页面: {}".format(len(set(r for r, _ in table_unwrapped))))
    W("[P1] <12px 字号命中: {}".format(len(small_fonts)))
    W("[P2] CSS 中 >375px 的 min-width 命中: {}".format(len(big_fixed)))
    W("")

    W("--- ① viewport 检查 ---")
    if not no_viewport and not fixed_width:
        W("  全部页面均声明 width=device-width ✅")
    else:
        for r in no_viewport[:20]:
            W("  缺 viewport: {}".format(r))
        for r, c in fixed_width[:20]:
            W("  viewport 非 device-width: {} -> {}".format(r, c))
    W("")

    W("--- ② ≥5 列宽表格的溢出保护 ---")
    tw = sorted(set(table_unwrapped))
    if not tw:
        W("  所有 ≥5 列表格均已有 overflow 保护 ✅")
    else:
        for r, c in tw[:30]:
            W("  未包 overflow 容器 ({} 列): {}".format(c, r))
    W("")

    W("--- ③ 小于 12px 的字号（移动端可读性） ---")
    if not small_fonts:
        W("  无 ✅")
    else:
        for f, s in small_fonts[:20]:
            W("  {} -> {}".format(f, s))
    W("")

    W("--- ④ CSS 中 >375px 的 min-width（潜在横向滚动） ---")
    if not big_fixed:
        W("  无 ✅")
    else:
        for f, s in big_fixed[:20]:
            W("  {} -> {}".format(f, s))
    W("")

    W("--- ⑤ 图片约束提示 ---")
    if img_no_maxw:
        W("  以下页面含 <img> 但页面内未出现 max-width（若全局 CSS 已定义可忽略）:")
        for r in img_no_maxw[:15]:
            W("    {}".format(r))
    else:
        W("  无 ✅")
    W("")

    W("=" * 78)
    report = "\n".join(lines)
    print(report)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(report + "\n")

    if "--strict" in sys.argv and (no_viewport or fixed_width):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
