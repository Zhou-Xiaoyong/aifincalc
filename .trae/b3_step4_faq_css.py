#!/usr/bin/env python3
"""Append faq details/summary tokenized styles to the 8 calculator CSS
(and shared/share.css as fallback guarantee). Skip files that already contain
the marker "faq-item > summary" to avoid double-append."""
from pathlib import Path

ROOT = Path('/workspace')
FILES = [
    'tax-calculator/style.css',
    'mortgage-calculator/style.css',
    'social-insurance-calculator/style.css',
    'car-loan-calculator/style.css',
    'provident-fund-calculator/style.css',
    'deposit-calculator/style.css',
    'exchange-rate-calculator/style.css',
    'investment-calculator/style.css',
    'shared/share.css',
]

MARKER = '/* B3 FAQ accordion token styles */'
BLOCK = f'''
{MARKER}
.faq-section details.faq-item {{
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0;
    margin-bottom: 12px;
    overflow: hidden;
}}
.faq-section details.faq-item:last-child {{ margin-bottom: 0; }}
.faq-section details.faq-item > summary {{
    list-style: none;
    cursor: pointer;
    padding: 14px 18px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    user-select: none;
    line-height: 1.6;
}}
.faq-section details.faq-item > summary::-webkit-details-marker {{ display: none; }}
.faq-section details.faq-item > summary::after {{
    content: '+';
    flex-shrink: 0;
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--color-primary);
    transition: transform 0.2s ease;
}}
.faq-section details.faq-item[open] > summary::after {{
    content: '−';
    transform: rotate(180deg);
}}
.faq-section details.faq-item > summary:focus-visible {{
    outline: none;
    box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}}
.faq-section details.faq-item[open] {{ background: var(--color-surface); }}
.faq-section .faq-body {{
    padding: 0 18px 14px;
    font-size: 0.88rem;
    color: var(--color-text-secondary);
    line-height: 1.75;
}}
.faq-section .faq-body p {{ margin: 0; }}
.faq-section .faq-body p + p {{ margin-top: 8px; }}
/* Keep old h4-based faq-question style as fallback for pages not yet converted */
.faq-section .faq-item .faq-question {{
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 6px;
}}
'''

for rel in FILES:
    fp = ROOT / rel
    text = fp.read_text(encoding='utf-8')
    if MARKER in text:
        print(f"[SKP] {rel}: already has marker")
        continue
    # Append before the final closing whitespace.
    new = text.rstrip() + "\n" + BLOCK + "\n"
    fp.write_text(new, encoding='utf-8')
    # brace balance sanity-check
    if new.count('{') != new.count('}'):
        print(f"[ERR] {rel}: BRACE MISMATCH open={new.count('{')} close={new.count('}')}")
    else:
        print(f"[OK ] {rel}: appended accordion block")
