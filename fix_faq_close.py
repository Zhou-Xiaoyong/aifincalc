#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Close the faq-block <section> that seo_blog.py left unclosed.

After fix_nested_section.py converted the outer wrapper's </section> into the
相关推荐 opener, the faq-block <section class="faq-block"> had no closing tag.
Insert </section> right before the 相关推荐 section opener (which is itself
preceded by the last faq-item's </div>).

Idempotent: only inserts when a faq-block is currently unclosed.
"""
import re, glob, os

pat = re.compile(
    r'(</div>)\s*(<section class="related-section">\s*<h2 class="section-title">相关推荐</h2>)'
)

changed = 0
for f in sorted(glob.glob("blog/article*/index.html")):
    t = open(f, encoding="utf-8").read()
    # only fix if there is an unclosed faq-block (open > close for sections)
    if t.count('<section class="faq-block">') > t.count('</section>') - t.count('<section class="related-section">'):
        # simpler guard: apply pattern only if the unclosed faq-block exists
        pass
    new, n = pat.subn(r'\1</section>\n\2', t)
    if n:
        open(f, "w", encoding="utf-8").write(new)
        changed += 1
        so = new.count('<section')  # all sections
        sc = new.count('</section>')
        print(f"{os.path.basename(os.path.dirname(f))}: faq-block close inserted | section open(all)={new.count('<section')} close={new.count('</section>')}")
    else:
        print(f"{os.path.basename(os.path.dirname(f))}: no change")

print(f"\nFixed {changed}/7 blog articles.")
