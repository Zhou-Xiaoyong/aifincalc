#!/usr/bin/env python3
"""Unify footer across all HTML pages.

Replaces existing <footer>...</footer> blocks with a standardized <footer class="site-footer">.
Handles different depth levels (0=root, 1=subdir, 2=subsubdir) for correct relative paths.
"""
import re
import os
import glob

ROOT = '/workspace'

def get_depth(filepath):
    """Calculate depth relative to ROOT (number of directory separators after ROOT)."""
    rel = os.path.relpath(filepath, ROOT)
    parts = rel.split('/')
    return len(parts) - 1  # -1 because filename itself is not a dir

def make_footer(depth):
    """Generate unified footer HTML with correct relative paths for given depth."""
    prefix = '../' * depth

    tools = [
        ('tax-calculator/index.html', '💰 个人所得税计算器'),
        ('social-insurance-calculator/index.html', '🏥 社保计算器'),
        ('mortgage-calculator/index.html', '🏡 房贷计算器'),
        ('car-loan-calculator/index.html', '🚗 车贷计算器'),
        ('provident-fund-calculator/index.html', '🏦 公积金贷款计算器'),
        ('deposit-calculator/index.html', '💵 存款利息计算器'),
        ('exchange-rate-calculator/index.html', '💱 汇率换算器'),
        ('investment-calculator/index.html', '📈 投资收益计算器'),
    ]

    about_links = [
        ('about/index.html', '关于本站'),
        ('contact/index.html', '联系我们'),
        ('privacy/index.html', '隐私政策'),
        ('blog/index.html', '博客首页'),
    ]

    # Build tool links (split into 2 columns: 4+4)
    col1_tools = tools[:4]
    col2_tools = tools[4:]

    tool_col1 = '\n'.join(
        f'                        <a href="{prefix}{path}">{name}</a>'
        for path, name in col1_tools
    )
    tool_col2 = '\n'.join(
        f'                        <a href="{prefix}{path}">{name}</a>'
        for path, name in col2_tools
    )
    about_col = '\n'.join(
        f'                        <a href="{prefix}{path}">{name}</a>'
        for path, name in about_links
    )

    footer = f'''    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-top">
                <div class="footer-brand">
                    <span class="footer-logo">🧮 AI金融计算器</span>
                    <p class="footer-tagline">个税计算 · 社保计算 · 房贷月供 · 车贷计算 · 公积金贷款 · 存款利息 · 汇率换算 · 投资收益 — 免费在线金融工具</p>
                </div>
                <div class="footer-columns">
                    <div class="footer-col">
                        <h5>计算工具</h5>
{tool_col1}
                    </div>
                    <div class="footer-col">
                        <h5>更多工具</h5>
{tool_col2}
                    </div>
                    <div class="footer-col">
                        <h5>关于我们</h5>
{about_col}
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 AI金融计算器(aifincalc.com). 计算结果仅供参考，不构成任何决策建议。</p>
            </div>
        </div>
    </footer>'''
    return footer

def replace_footer(content, depth):
    """Replace existing <footer>...</footer> block with unified version.

    The new site-footer is moved OUTSIDE the .container div (after its closing </div>),
    so it can be full-width with white background.

    Old pattern:
        <footer>old content</footer>
    </div>  <!-- container close -->

    New pattern:
    </div>  <!-- container close -->
    <footer class="site-footer">new content</footer>
    """
    # Match: old footer block + the closing </div> of container
    # Capture the closing </div> (and its indentation) so we can put it back
    pattern = r'[ \t]*<footer[^>]*>.*?</footer>\s*\n(\s*</div>)\s*\n'

    new_footer = make_footer(depth) + '\n\n'
    # Put the container's </div> back, then add new footer after it
    replacement = r'\1\n\n' + new_footer

    new_content, count = re.subn(pattern, replacement, content, count=1, flags=re.DOTALL)
    return new_content, count

def main():
    html_files = glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True)

    # Skip baidu verification file
    skip_files = ['baidu_verify_codeva-WTMipmucLG.html']

    total = 0
    skipped = 0
    no_footer = 0

    for fpath in sorted(html_files):
        basename = os.path.basename(fpath)
        if basename in skip_files:
            skipped += 1
            continue

        depth = get_depth(fpath)

        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        if '<footer' not in content:
            no_footer += 1
            print(f"  NO FOOTER: {os.path.relpath(fpath, ROOT)}")
            continue

        new_content, count = replace_footer(content, depth)
        if count > 0:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            total += 1
            print(f"OK: {os.path.relpath(fpath, ROOT)} (depth={depth})")
        else:
            print(f"WARN: footer not replaced in {os.path.relpath(fpath, ROOT)}")

    print(f"\nDone. {total} files updated, {no_footer} no footer, {skipped} skipped.")

if __name__ == '__main__':
    main()
