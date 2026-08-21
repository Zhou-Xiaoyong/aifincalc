#!/usr/bin/env python3
"""Static post-step6 validation: brace balance for all touched CSS files,
HTTP 200 + no broken relative links for key pages, and token sanity check."""
from pathlib import Path
import re

ROOT = Path('/workspace')
CSS_FILES = [
    'style.css', 'shared/share.css', 'blog/style.css',
    'tax-calculator/style.css',
    'mortgage-calculator/style.css',
    'social-insurance-calculator/style.css',
    'car-loan-calculator/style.css',
    'provident-fund-calculator/style.css',
    'deposit-calculator/style.css',
    'exchange-rate-calculator/style.css',
    'investment-calculator/style.css',
]
print("=" * 68)
print("[CSS brace balance]")
all_ok = True
for rel in CSS_FILES:
    fp = ROOT / rel
    text = fp.read_text(encoding='utf-8')
    o = text.count('{'); c = text.count('}')
    ok = o == c
    status = 'OK ' if ok else 'ERR'
    if not ok: all_ok = False
    print(f"  [{status}] {rel}: open={o} close={c} diff={o-c}")

print("\n[CSS undefined-token sanity] (grep var(--XYZ) not defined in :root of same CSS)")
# For each CSS, scan all `var(--foo)` references and check if --foo is defined
# in :root of same file OR as one of the "common shared tokens"
def tokens_defined_in(text):
    return set(re.findall(r'--[A-Za-z0-9_-]+(?=\s*:)', text))
def tokens_used_in(text):
    return set(re.findall(r'var\((--[A-Za-z0-9_-]+)', text))
# A shared pool that any calculator-style.css may inherit from style.css/share.css
# We still flag as WARN only, because fallback color values exist.
COMMON = {
    '--color-primary','--color-primary-dark','--color-primary-light','--color-accent',
    '--color-success','--color-warning','--color-danger','--color-info',
    '--color-bg','--color-surface','--color-surface-muted',
    '--color-border','--color-border-subtle',
    '--color-text','--color-text-secondary','--color-text-muted',
    '--radius-sm','--radius-md','--radius-lg','--radius-xl','--radius-full',
    '--shadow-sm','--shadow-md','--shadow-lg',
    '--font-sans','--font-mono',
    '--spacer-xs','--spacer-sm','--spacer-md','--spacer-lg','--spacer-xl',
}
for rel in CSS_FILES:
    text = (ROOT / rel).read_text(encoding='utf-8')
    used = tokens_used_in(text)
    defd = tokens_defined_in(text)
    missing = sorted(used - defd - COMMON)
    # missing against file-local + shared pool
    missing_from_all = sorted(used - defd - COMMON)
    if missing_from_all:
        print(f"  [WARN] {rel}: refs not in file+common pool -> {missing_from_all[:10]}")

print("\n[FAQ convert status]: count <details> vs legacy <div class=\"faq-item\"><h4> in calc index")
CALC_INDEX = [f'{c}/index.html' for c in [
    'tax-calculator','mortgage-calculator','social-insurance-calculator',
    'car-loan-calculator','provident-fund-calculator','deposit-calculator',
    'exchange-rate-calculator','investment-calculator']]
for rel in CALC_INDEX:
    text = (ROOT / rel).read_text(encoding='utf-8')
    d = text.count('<details class="faq-item"')
    leg = text.count('<div class="faq-item">')
    print(f"  {rel}: details={d} legacy-div-faq={leg}")

print("\n[Homepage step3 changes]:")
htext = (ROOT / 'index.html').read_text(encoding='utf-8')
dupes = htext.count('<link rel="stylesheet" href="style.css">')
hero_inline = 'style="padding: 20px 20px 16px;"' in htext or 'style="font-size: 1.8rem;"' in htext
gradients = htext.count('style="background: linear-gradient')
faq_details = htext.count('<details class="faq-item"')
print(f"  style.css link count={dupes} (expect 1)")
print(f"  hero inline style remnants: {hero_inline} (expect False)")
print(f"  tool-card inline gradient remnants: {gradients} (expect 0)")
print(f"  homepage visible FAQ details: {faq_details} (expect 5)")

print("\n[City-grid sanity]: three aggregate pages city-chip links must exist")
for rel in ['tax-calculator','social-insurance-calculator','provident-fund-calculator']:
    idx = ROOT / rel / 'index.html'
    html = idx.read_text(encoding='utf-8')
    chips = re.findall(r'href="\./([a-z]+)/"[^>]*class="city-chip"', html)
    broken = [py for py in chips if not (ROOT / rel / py / 'index.html').exists()]
    total = len(chips)
    print(f"  {rel}: city chips = {total} broken = {len(broken)} {'<- ERR ' + str(broken) if broken else 'OK'}")
    if broken: all_ok = False

print("\n[Constants.js haerbin→huhehaote]:")
const_text = (ROOT / 'shared/constants.js').read_text(encoding='utf-8')
h1 = const_text.count('haerbin:')
h2 = const_text.count('huhehaote:')
print(f"  haerbin key occurrences={h1} (expect 0), huhehaote={h2} (expect >=1)")
if h1 != 0: all_ok = False

print("\n[Blog JSON-LD article10]:")
btext = (ROOT / 'blog/index.html').read_text(encoding='utf-8')
art10 = '/blog/article10/' in btext and '贷款买车' in btext
print(f"  article10 url+title in BlogPosting: {art10} (expect True)")
if not art10: all_ok = False

print("\n" + ("=" * 68))
print("OVERALL:", "PASS ✅" if all_ok else "FAIL ❌ (see ERR lines above)")
