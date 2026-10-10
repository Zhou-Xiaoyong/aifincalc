#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
标题结构 P1 修复 —— 消除「<h2> 出现在 <h1> 之前」与 meta description 长度越界

背景
----
1) 32 个城市页（社保/公积金/个税计算器）顶部由 _gen_calc.py 注入了一个
   「🧮 XX计算器」工具区块，标题写成 <h2>，而页面真正的 <h1>（城市政策指南）
   在其后 —— 标题层级倒置。该区块本质是工具标签，不是文档章节标题，
   因此降级为 <div class="cc-title">（CSS 本来就是类选择器，补 font-weight:700
   后视觉完全一致，零回归）。

2) 7 个页面 <meta name="description"> 长度落在 60-160 字符区间之外。
   Bing 会直接采用 meta description 作为摘要，百度也会参考，过短浪费、
   过长被截断，因此统一修正到区间内。

用法:
    python _fix_heading_order.py            # 预演
    python _fix_heading_order.py --apply    # 写入
"""

import os
import re
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))

CC_OLD_CSS = ".cc-title{font-size:20px;margin:0 0 14px;color:#1f2d4d;}"
CC_NEW_CSS = ".cc-title{font-size:20px;font-weight:700;margin:0 0 14px;color:#1f2d4d;}"

# 新 description（全部控制在 60-160 字符）
DESC = {
    "index.html":
        "AI金融计算器：2026年免费在线金融工具平台，提供个税、社保、房贷月供、房贷贴息、车贷、"
        "公积金贷款额度、租售比、存款利息、实时汇率、投资收益等十大计算器，无需注册下载，打开即用。",
    "mortgage-subsidy-calculator/index.html":
        "2026年10月1日起首套房贷财政贴息：按贷款本金年化1个百分点、最长5年、单户上限100万测算。"
        "本计算器依据财金〔2026〕95号，自动校验五项资格条件，输出年贴息额与5年总贴息，"
        "并与公积金贷款对比。",
    "blog/category/exchange/index.html":
        "换1万美元实际要多少人民币、中间价和银行买卖价差在哪里、钞汇同价怎么省钱，"
        "换汇前先看清银行的四个价，别只盯着中间价算，先算清楚再换汇。",
    "blog/index.html":
        "AI金融计算器博客，分享个人所得税、房贷车贷、公积金、投资理财等实用金融知识，"
        "政策解读、案例分析、省钱技巧一网打尽，持续更新。",
    "contact/index.html":
        "如有任何问题、建议或合作意向，欢迎联系AI金融计算器团队。"
        "我们重视每一位用户的反馈，致力于为您提供更好的服务和产品体验。",
    "data/index.html":
        "AI金融计算器原创数据资产：全国各城市公积金贷款额度、五险一金缴费基数与费率对照表，"
        "数据取自各地官方公告，可自由引用，引用请注明来源。",
    "privacy/index.html":
        "AI金融计算器非常重视用户隐私保护。所有计算均在浏览器本地完成，不向服务器发送任何个人数据，"
        "您的输入与计算结果完全保留在您自己的设备上。",
}


def set_meta_description(html, new_desc):
    """就地替换 meta description 的 content，兼容两种属性顺序。"""
    pat_a = re.compile(r'(<meta[^>]*name=["\']description["\'][^>]*content=["\'])([^"\']*)(["\'])', re.I)
    pat_b = re.compile(r'(<meta[^>]*content=["\'])([^"\']*)(["\'][^>]*name=["\']description["\'])', re.I)
    for pat in (pat_a, pat_b):
        if pat.search(html):
            return pat.sub(lambda m: m.group(1) + new_desc + m.group(3), html, count=1), True
    return html, False


def main():
    apply_changes = "--apply" in sys.argv
    pages = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".html"):
                pages.append(os.path.join(root, f))
    pages.sort()

    n_order = n_desc = 0
    warnings = []
    print("=" * 78)
    print("标题结构 P1 修复 {} · 共 {} 页".format("（写入模式）" if apply_changes else "（预演模式）", len(pages)))
    print("=" * 78)

    for p in pages:
        rel = os.path.relpath(p, SITE_DIR).replace(os.sep, "/")
        original = open(p, "r", encoding="utf-8", errors="replace").read()
        html = original
        notes = []

        # ① 工具区块标题降级
        if CC_NEW_CSS not in html and CC_OLD_CSS in html:
            html = html.replace(CC_OLD_CSS, CC_NEW_CSS, 1)
            notes.append("补 .cc-title font-weight")
        m = re.search(r'<h2 class="cc-title">(.*?)</h2>', html, re.S)
        if m:
            html = html[:m.start()] + '<div class="cc-title">' + m.group(1) + "</div>" + html[m.end():]
            notes.append("h2.cc-title -> div")
            n_order += 1

        # ② description 长度
        if rel in DESC:
            new_desc = DESC[rel]
            if not (60 <= len(new_desc) <= 160):
                warnings.append("{} 新 description 长度 {} 越界，已跳过".format(rel, len(new_desc)))
            else:
                cur = re.search(r'name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', html, re.I)
                if not cur:
                    cur = re.search(r'content=["\']([^"\']*)["\'][^>]*name=["\']description["\']', html, re.I)
                old_len = len(cur.group(1)) if cur else -1
                html, ok = set_meta_description(html, new_desc)
                if ok:
                    notes.append("description {} -> {}".format(old_len, len(new_desc)))
                    n_desc += 1
                else:
                    warnings.append("{} 未找到 meta description，跳过".format(rel))

        if html != original:
            print("✎ {:<52} {}".format(rel, "; ".join(notes)))
            if apply_changes:
                with open(p, "w", encoding="utf-8", newline="") as f:
                    f.write(html)

    print("-" * 78)
    print("  标题层级修复页面: {} 页".format(n_order))
    print("  description 修复页面: {} 页".format(n_desc))
    for w in warnings:
        print("  ⚠ {}".format(w))
    if not apply_changes:
        print("提示：以上为预演结果，加 --apply 才会写入文件。")


if __name__ == "__main__":
    main()
