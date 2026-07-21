#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix duplicate/nested <section class="related-section"> introduced by seo_blog.py.

The bug: seo_blog.py wrapped the injected "相关计算器" block in an outer
<section class="related-section">, nesting the 相关计算器 section AND consuming
the original 相关推荐 section's opening tag (leaving a stray </section>).

Fix (idempotent):
  1. Collapse the outer wrapper: remove the leading <section class="related-section">
     that directly precedes `<!-- 相关计算器 -->` + another <section class="related-section">.
  2. Convert the now-orphaned </section> immediately before <h2>相关推荐</h2>
     into the proper <section class="related-section"> opener for 相关推荐.
"""
import os, re, glob

BLOG = sorted(glob.glob("blog/article*/index.html"))
changed = 0
for f in BLOG:
    txt = open(f, encoding="utf-8").read()
    before = txt

    # 1) remove redundant outer wrapper opening
    pat1 = re.compile(
        r'<section class="related-section">\s*<!-- 相关计算器 -->\s*<section class="related-section">'
    )
    txt, n1 = pat1.subn('<!-- 相关计算器 -->\n<section class="related-section">', txt)

    # 2) restore 相关推荐 section opener (was an orphaned closer)
    pat2 = re.compile(r'</section>\s*<h2 class="section-title">相关推荐</h2>')
    txt, n2 = pat2.subn('<section class="related-section">\n<h2 class="section-title">相关推荐</h2>', txt)

    if txt != before:
        open(f, "w", encoding="utf-8").write(txt)
        changed += 1
        # report counts for sanity
        rs = len(re.findall(r'<section class="related-section">', txt))
        rsc = len(re.findall(r'</section>', txt))
        faq = len(re.findall(r'<section class="faq-block">', txt))
        print(f"{f}: outer-wrap removed={n1}, recommend-opener restored={n2} | related-section open={rs} close={rsc} faq-block={faq}")
    else:
        print(f"{f}: no change (pattern not found)")

print(f"\nFixed {changed}/{len(BLOG)} blog articles.")
