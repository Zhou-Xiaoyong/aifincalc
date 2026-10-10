#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FAQ 结构化数据修复器 —— 让 JSON-LD 与页面可见正文严格一致

百度 2026 年结构化数据规范的核心红线：
    写进 FAQPage 标记里的问题与答案，必须在页面上真实可见。
    只存在于标记、页面上看不到 = 「标记滥用」，轻则不给富摘要，重则整站降权。

本脚本的做法（唯一可靠的方向：以页面正文为准，重建标记）：
    1. 从每个页面的「可见 FAQ 区块」DOM 中提取真实问答对
       （支持站内全部 5 种 DOM 变体，见下方 EXTRACT 说明）
    2. 用它覆盖该页原有的 FAQPage JSON-LD
    3. 有可见 FAQ 但完全没有标记的页面 → 补一份与正文一致的标记
    4. 顺带补齐 BlogPosting/Article 缺失的 description（取自页面 meta description）

EXTRACT 说明 —— 站内 FAQ item 的 5 种写法：
    A. <div class="faq-item"><h4>Q</h4><p>A</p></div>                    计算器页
    B. <div class="faq-item"><h4 class="faq-question">Q</h4><p>A</p></div>  首页
    C. <div class="faq-item"><div class="faq-q">Q</div><div class="faq-a">A</div></div>  城市页
    D. <div class="faq-item"><p class="faq-q">Q：…</p><p class="faq-a">A：…</p></div>   博客页
    E. <div class="faq-item"><h4>Q</h4><p>A</p></div>                    联系页（同 A）

    统一规则：块内第一个「问题元素」= Q，其余元素合并 = A；
    带 faq-q/faq-question 类的元素优先认定为 Q，带 faq-a/faq-answer 类的认定为 A。

用法:
    python _fix_faq_jsonld.py            # 预演，不改文件
    python _fix_faq_jsonld.py --apply    # 实际写入
"""

import os
import re
import sys
import json
import html as html_mod
from collections import Counter

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
SKIP_FILES = {"404.html", "baidu_verify_codeva-WTMipmucLG.html"}

LD_RE = re.compile(
    r'(<script[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
    re.S | re.I,
)
FAQ_ITEM_RE = re.compile(r'<div[^>]*\bclass="[^"]*\bfaq-item\b[^"]*"[^>]*>', re.I)
TAG_RE = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*)?)/?>")
VOID_TAGS = {"br", "hr", "img", "input", "meta", "link", "source", "area", "base", "col", "embed", "param", "track", "wbr"}

Q_CLASSES = {"faq-q", "faq-question", "faq-title", "question", "faq-q-text"}
A_CLASSES = {"faq-a", "faq-answer", "answer", "faq-a-text"}

Q_PREFIX = re.compile(r"^\s*(?:Q|问|问题)\s*[:：.、]\s*")
A_PREFIX = re.compile(r"^\s*(?:A|答|答案)\s*[:：.、]\s*")


# ---------------------------------------------------------------- 基础工具

def strip_nonsemantic(html):
    """去掉 script / style / 注释 —— 这些区域里的 faq-item 是 CSS 或 JS 模板，不是可见正文。"""
    s = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    s = re.sub(r"<style[^>]*>.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    return s


def attrs_of(opening_tag):
    m = re.search(r'class="([^"]*)"', opening_tag, re.I)
    if not m:
        return set()
    return {c.strip().lower() for c in m.group(1).split() if c.strip()}


def find_close(s, tag, content_start):
    """从 content_start 开始，找配对的 </tag> 下标（深度计数，容忍同名嵌套）。"""
    depth = 1
    i = content_start
    pat = re.compile(r"<\s*(/?)" + re.escape(tag) + r"\b[^>]*>", re.I)
    while True:
        m = pat.search(s, i)
        if not m:
            return -1
        if m.group(1) == "/":
            depth -= 1
            if depth == 0:
                return m.start()
        else:
            if not re.search(r"/\s*>$", m.group(0)):
                depth += 1
        i = m.end()


def split_top_level(s):
    """把一段 HTML 拆成若干个顶层元素块（含嵌套）。返回 [(opening_tag, full_chunk), ...]。"""
    out = []
    i = 0
    n = len(s)
    while i < n:
        m = TAG_RE.search(s, i)
        if not m:
            break
        tag = m.group(1).lower()
        if tag in VOID_TAGS or m.group(0).endswith("/>"):
            out.append((m.group(0), m.group(0)))
            i = m.end()
            continue
        close = find_close(s, tag, m.end())
        if close < 0:
            out.append((m.group(0), s[m.start():]))
            break
        end = s.index(">", close) + 1
        out.append((m.group(0), s[m.start():end]))
        i = end
    return out


def text_of(chunk):
    """块 → 纯文本（去标签、反转义、压空白）。保留 <br> 为空格。"""
    s = re.sub(r"<\s*br\s*/?\s*>", " ", chunk, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html_mod.unescape(s)
    s = s.replace("\u200b", "").replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


# ---------------------------------------------------------------- FAQ 提取

def extract_answer_from(chunks, start_idx):
    return " ".join(text_of(c) for _, c in chunks[start_idx:] if text_of(c)).strip()


def extract_pairs(html):
    """从页面（完整 HTML）中提取真实可见的 FAQ 问答对。"""
    body = strip_nonsemantic(html)
    pairs = []
    seen = set()
    for m in FAQ_ITEM_RE.finditer(body):
        close = find_close(body, "div", m.end())
        if close < 0:
            continue
        inner = body[m.end():close]
        chunks = split_top_level(inner)
        if not chunks:
            continue

        q = ""
        a_parts = []
        q_picked = False
        for opening, chunk in chunks:
            cls = attrs_of(opening)
            txt = text_of(chunk)
            if not txt:
                continue
            if cls & A_CLASSES:
                a_parts.append(txt)
                continue
            if cls & Q_CLASSES:
                if not q_picked:
                    q = txt
                    q_picked = True
                else:
                    a_parts.append(txt)
                continue
            if not q_picked:
                q = txt
                q_picked = True
            else:
                a_parts.append(txt)

        q = Q_PREFIX.sub("", q).strip()
        a = " ".join(a_parts).strip()
        a = A_PREFIX.sub("", a).strip()
        if len(q) < 4 or len(a) < 8:
            continue
        key = re.sub(r"\s+", "", q)
        if key in seen:
            continue
        seen.add(key)
        pairs.append((q, a))
    return pairs


# ---------------------------------------------------------------- JSON-LD 处理

def build_faqpage(pairs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in pairs
        ],
    }


def dump_block(obj, base_indent):
    """序列化成带基础缩进的 JSON 文本（不含首尾换行）。"""
    raw = json.dumps(obj, ensure_ascii=False, indent=4)
    pad = " " * base_indent
    return "\n".join(pad + ln if ln.strip() else ln for ln in raw.split("\n"))


def detect_base_indent(block_text):
    m = re.match(r"\r?\n([ \t]*)", block_text)
    if m:
        return len(m.group(1).expandtabs(4))
    if block_text.lstrip().startswith("{"):
        return 0
    return 0


def meta_description(html):
    m = re.search(
        r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']',
        html, re.I,
    )
    if not m:
        m = re.search(
            r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']',
            html, re.I,
        )
    return html_mod.unescape(m.group(1)).strip() if m else ""


# ---------------------------------------------------------------- 主流程

def process(path, apply_changes):
    rel = os.path.relpath(path, SITE_DIR).replace(os.sep, "/")
    original = open(path, "r", encoding="utf-8", errors="replace").read()
    html = original

    pairs = extract_pairs(html)
    matches = list(LD_RE.finditer(html))
    faq_span = None
    faq_obj = None
    last_ld_end = 0
    for m in matches:
        last_ld_end = m.end()
        try:
            obj = json.loads(m.group(2).strip())
        except Exception:
            continue
        if isinstance(obj, dict) and obj.get("@type") == "FAQPage":
            faq_span = m
            faq_obj = obj

    actions = []

    # ---- ① FAQ 标记重建 / 新增
    if pairs:
        new_obj = build_faqpage(pairs)
        if faq_span is not None:
            old_pairs = []
            for q in (faq_obj.get("mainEntity") or []):
                if isinstance(q, dict):
                    aa = q.get("acceptedAnswer")
                    ans = aa.get("text", "") if isinstance(aa, dict) else ""
                    old_pairs.append((q.get("name", ""), ans))
            same = old_pairs == pairs
            if same:
                actions.append(("FAQ 标记已一致", len(pairs)))
            else:
                base = detect_base_indent(faq_span.group(2))
                body = dump_block(new_obj, base)
                new_inner = "\n" + body + "\n" + " " * base
                html = html[:faq_span.start(2)] + new_inner + html[faq_span.end(2):]
                actions.append(("FAQ 标记重建 {}->{}".format(len(old_pairs), len(pairs)), len(pairs)))
        else:
            base = 4
            body = dump_block(new_obj, base)
            block = (
                "\n" + " " * base + "<!-- FAQ Schema -->\n"
                + " " * base + '<script type="application/ld+json">\n'
                + body + "\n"
                + " " * base + "</script>"
            )
            html = html[:last_ld_end] + block + html[last_ld_end:]
            actions.append(("FAQ 标记新增", len(pairs)))

    # ---- ② BlogPosting / Article 补 description（重新定位，因 ① 已改动文本）
    for m in list(LD_RE.finditer(html)):
        try:
            obj = json.loads(m.group(2).strip())
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue
        t = obj.get("@type")
        if t in ("BlogPosting", "Article", "NewsArticle") and not obj.get("description"):
            desc = meta_description(html)
            if not desc:
                continue
            base = detect_base_indent(m.group(2))
            obj["description"] = desc
            body = dump_block(obj, base)
            html = html[:m.start(2)] + "\n" + body + "\n" + " " * base + html[m.end(2):]
            actions.append(("补 {} description".format(t), 1))
            break  # 一页通常只有一个主文章对象

    changed = html != original
    if changed and apply_changes:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(html)
    return rel, actions, changed


def main():
    apply_changes = "--apply" in sys.argv
    pages = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".html") and f not in SKIP_FILES:
                pages.append(os.path.join(root, f))
    pages.sort()

    stats = Counter()
    print("=" * 78)
    print("FAQ 结构化数据修复 {} · 共 {} 页".format("（写入模式）" if apply_changes else "（预演模式）", len(pages)))
    print("=" * 78)
    for p in pages:
        rel, actions, changed = process(p, apply_changes)
        if not actions:
            continue
        tag = "✎" if changed else "="
        print("{} {:<52} {}".format(tag, rel, "; ".join("{}×{}".format(a, n) for a, n in actions)))
        for a, n in actions:
            stats[a.split(" ")[0]] += 1
    print("-" * 78)
    for k, v in stats.most_common():
        print("  {:<16}{} 页".format(k, v))
    if not apply_changes:
        print("提示：以上为预演结果，加 --apply 才会写入文件。")


if __name__ == "__main__":
    main()
