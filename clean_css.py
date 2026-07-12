#!/usr/bin/env python3
"""Remove old header/nav/brand CSS blocks from all style.css files."""
import re
import os

# All CSS files to clean
CSS_FILES = [
    '/workspace/style.css',
    '/workspace/tax-calculator/style.css',
    '/workspace/social-insurance-calculator/style.css',
    '/workspace/mortgage-calculator/style.css',
    '/workspace/car-loan-calculator/style.css',
    '/workspace/provident-fund-calculator/style.css',
    '/workspace/deposit-calculator/style.css',
    '/workspace/exchange-rate-calculator/style.css',
    '/workspace/investment-calculator/style.css',
    '/workspace/blog/style.css',
]

# Selectors whose entire rule block should be removed.
# Each entry is a regex pattern matching the selector part (before the {).
# Leading whitespace and trailing whitespace before { are handled by the wrapper.
SELECTOR_PATTERNS = [
    r'header\s*\{',
    r'header\s+h1\s*\{',
    r'header\s+p\s*\{',
    r'\.brand-link\s*\{',
    r'\.brand-link:hover\s*\{',
    r'\.brand-logo\s*\{',
    r'\.brand-name\s*\{',
    r'\.tool-nav\s*\{',
    r'\.nav-item\s*\{',
    r'\.nav-item:hover\s*\{',
    r'\.nav-item\.active\s*\{',
    r'\.nav-icon\s*\{',
    r'\.sub-header\s*\{',
    r'\.sub-header\s+\.brand-link\s*\{',
    r'\.sub-header\s+\.brand-logo\s*\{',
    r'\.sub-header\s+\.brand-name\s*\{',
    r'\.sub-header\s+h1\s*\{',
    r'\.sub-header\s+\.tagline\s*\{',
    # Combined selector: .nav-item:hover,\n    .nav-item.active {
    r'\.nav-item:hover\s*,\s*\n\s*\.nav-item\.active\s*\{',
]

def clean_css(content):
    """Remove all target CSS rule blocks from content."""
    for sel_pattern in SELECTOR_PATTERNS:
        # Match: optional leading whitespace (incl newlines for indented blocks in media queries),
        # the selector, then { ... } (no nested braces in these simple rules), then trailing whitespace/newlines
        full_pattern = r'[ \t]*' + sel_pattern + r'[^{}]*\}\s*\n*'
        content = re.sub(full_pattern, '', content, flags=re.MULTILINE)

    # Clean up: remove runs of 3+ blank lines -> 2 blank lines
    content = re.sub(r'\n{4,}', '\n\n\n', content)
    # Clean up leading/trailing whitespace
    content = content.strip() + '\n'
    return content

total_removed = 0
for css_file in CSS_FILES:
    if not os.path.exists(css_file):
        print(f"SKIP (not found): {css_file}")
        continue
    with open(css_file, 'r', encoding='utf-8') as f:
        original = f.read()
    cleaned = clean_css(original)
    if cleaned != original:
        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(cleaned)
        removed_chars = len(original) - len(cleaned)
        print(f"CLEANED: {css_file} (removed {removed_chars} chars)")
        total_removed += 1
    else:
        print(f"OK (no changes): {css_file}")

print(f"\nDone. {total_removed} files cleaned.")
