#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移动端宽表格溢出修复

问题：部分页面的 ≥5 列表格直接裸露在正文里，没有横向滚动容器。
在 375px 宽的手机上会撑破布局，产生整页横向滚动 —— 百度移动友好度扣分项。

修复：给裸露的宽表格套一层 overflow-x:auto 的容器。使用 inline style 而非
新增 CSS 类，原因是全站样式表都带 ?v= 版本号缓存（max-age=604800），
新增类需要同步 bump 168 个页面的版本号，改动面远大于收益。

幂等：已被容器包裹的表格不会被重复处理。
用法:
    python _fix_table_overflow.py --dry-run
    python _fix_table_overflow.py
"""

import os
import re
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
SKIP_FILES = {"404.html", "baidu_verify_codeva-WTMipmucLG.html"}

WRAP_OPEN = '<div class="tbody-scroll" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">'
MIN_COLS = 5


def overflow_classes():
    classes = set()
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if not f.endswith(".css"):
                continue
            s = open(os.path.join(root, f), "r", encoding="utf-8", errors="replace").read()
            for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", s):
                if re.search(r"overflow(-x)?\s*:\s*(auto|scroll)", m.group(2), re.I):
                    classes.update(re.findall(r"\.([A-Za-z0-9_-]+)", m.group(1)))
    return classes


def is_wrapped(s, pos, ovf):
    head = s[max(0, pos - 500):pos]
    if re.search(r'style\s*=\s*"[^"]*overflow(-x)?\s*:\s*(auto|scroll)', head, re.I):
        return True
    for tag in re.findall(r"<[a-zA-Z][^>]*>", head)[-6:]:
        cm = re.search(r'class\s*=\s*"([^"]*)"', tag)
        if cm and set(cm.group(1).split()) & ovf:
            return True
    return False


def cols_of(s, pos):
    chunk = s[pos:pos + 3000]
    m = re.search(r"<tr[^>]*>(.*?)</tr>", chunk, re.S | re.I)
    return len(re.findall(r"<t[hd]\b", m.group(1), re.I)) if m else 0


def find_close(s, start):
    """从 <table ...> 的 start 位置找到配对的 </table> 结束下标（含标签）。"""
    i = start
    depth = 0
    for m in re.finditer(r"<table\b[^>]*>|</table\s*>", s[start:], re.I):
        if m.group(0).lower().startswith("</"):
            depth -= 1
            if depth == 0:
                return start + m.end()
        else:
            depth += 1
    return -1


def main():
    dry = "--dry-run" in sys.argv
    ovf = overflow_classes() | {"table-wrap", "da-tw", "tbody-scroll"}

    changed = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for fn in sorted(files):
            if not fn.endswith(".html") or fn in SKIP_FILES:
                continue
            path = os.path.join(root, fn)
            rel = os.path.relpath(path, SITE_DIR).replace(os.sep, "/")
            s = open(path, "r", encoding="utf-8", errors="replace").read()
            orig = s

            targets = []
            for m in re.finditer(r"<table\b", s):
                if cols_of(s, m.start()) >= MIN_COLS and not is_wrapped(s, m.start(), ovf):
                    end = find_close(s, m.start())
                    if end > 0:
                        targets.append((m.start(), end))

            # 从后往前替换，避免位移
            for st, en in reversed(targets):
                s = s[:st] + WRAP_OPEN + s[st:en] + "</div>" + s[en:]

            if s != orig:
                changed.append((rel, len(targets)))
                if not dry:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(s)

    print("=" * 70)
    print("移动端宽表格溢出修复" + ("（预演，不写盘）" if dry else ""))
    print("=" * 70)
    for rel, n in changed:
        print("  {:<46} 包裹 {} 个表格".format(rel, n))
    if not changed:
        print("  无需修复 ✅")
    print("")
    print("合计：{} 个页面，{} 个表格".format(len(changed), sum(n for _, n in changed)))
    print("=" * 70)


if __name__ == "__main__":
    main()
