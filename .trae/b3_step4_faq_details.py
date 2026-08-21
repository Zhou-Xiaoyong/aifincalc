#!/usr/bin/env python3
"""Batch-convert 8 calculator faq-items from <h4>+<p> div wrappers to
<details class="faq-item"><summary>Q</summary><div class="faq-body">...</div></details>.
First faq-item per file gets open attribute."""
from pathlib import Path
import re

HTML_DIR = Path('/workspace')
FILES = [
    'tax-calculator/index.html',
    'mortgage-calculator/index.html',
    'social-insurance-calculator/index.html',
    'car-loan-calculator/index.html',
    'provident-fund-calculator/index.html',
    'deposit-calculator/index.html',
    'exchange-rate-calculator/index.html',
    'investment-calculator/index.html',
]

# Match <div class="faq-item" ...>...</div> where the first child tag is <h4>.
# Use non-greedy body and expect a closing </div> on its own line.
ITEM_RE = re.compile(
    r'(?P<indent>[^\S\r\n]*)<div class="faq-item">\s*'
    r'<h4>(?P<q>.*?)</h4>\s*'
    r'(?P<body>.*?)'
    r'</div>\s*',
    re.DOTALL,
)

def convert_text(text: str) -> tuple[str, int]:
    idx = 0
    def repl(m):
        nonlocal idx
        indent = m.group('indent')
        q = m.group('q').strip()
        b = m.group('body').rstrip()
        open_attr = ' open' if idx == 0 else ''
        idx += 1
        inner_indent = indent + '    '
        return (
            f'{indent}<details class="faq-item"{open_attr}>\n'
            f'{inner_indent}<summary>{q}</summary>\n'
            f'{inner_indent}<div class="faq-body">\n'
            f'{inner_indent}    {b.strip()}\n'
            f'{inner_indent}</div>\n'
            f'{indent}</details>\n'
        )
    new = ITEM_RE.sub(repl, text)
    count = new.count('<details class="faq-item"')
    return new, count

total = 0
for rel in FILES:
    fp = HTML_DIR / rel
    text = fp.read_text(encoding='utf-8')
    new, count = convert_text(text)
    if new != text:
        fp.write_text(new, encoding='utf-8')
        print(f"[OK ] {rel}: converted {count} faq-item(s)")
        total += count
    else:
        print(f"[SKP] {rel}: 0 matches (already converted?/no h4-faq-item?)")
print(f"\nTotal converted: {total}")
