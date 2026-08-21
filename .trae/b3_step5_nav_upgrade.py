#!/usr/bin/env python3
"""Replace inline mobile-nav onclick handler across all HTML files that
contain class="menu-toggle" with the new shared handler plus a11y attrs.
Then append enhanced mobile-nav behavior into shared/share.js."""
from pathlib import Path
import re

ROOT = Path('/workspace')
SHARE_JS = ROOT / 'shared/share.js'
SHARE_CSS = ROOT / 'shared/share.css'

OLD_ONCLICK = """onclick="document.getElementById('mobileMenu').classList.toggle('active')" """
NEW_ONCLICK = """onclick="toggleMobileNav(this)" aria-expanded="false" aria-controls="mobileMenu" """

count = 0
for html in ROOT.rglob('*.html'):
    # skip anything under node_modules, venv, .trae
    parts = set(html.parts)
    if '.trae' in parts or 'node_modules' in parts or '.venv' in parts:
        continue
    try:
        text = html.read_text(encoding='utf-8')
    except Exception:
        continue
    if 'class="menu-toggle"' not in text:
        continue
    if OLD_ONCLICK.strip() not in text:
        continue
    new = text.replace(OLD_ONCLICK.strip(), NEW_ONCLICK.strip())
    if new != text:
        html.write_text(new, encoding='utf-8')
        count += 1
print(f"Replaced inline menu-toggle onclick in {count} HTML files")

# ---- share.js: append mobile-nav upgrade module ----
JS_MARKER = '/* B3 mobile-nav upgrade */'
JS_BLOCK = f'''

{JS_MARKER}
(function initMobileNavUpgrade() {{
    'use strict';

    function getMenu() {{
        return document.getElementById('mobileMenu');
    }}
    function getToggle() {{
        return document.querySelector('button.menu-toggle[aria-controls="mobileMenu"]')
            || document.querySelector('button.menu-toggle');
    }}

    function setOpen(open) {{
        const menu = getMenu();
        const btn = getToggle();
        if (!menu) return;
        menu.classList.toggle('active', open);
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }}

    // Global toggle function (invoked from inline onclick)
    window.toggleMobileNav = function(btnOrEvent) {{
        const menu = getMenu();
        if (!menu) return;
        const isOpen = !menu.classList.contains('active');
        setOpen(isOpen);
    }};

    // Click outside to close (ignore clicks inside header and ignore a.nav-link clicks so navigation works)
    document.addEventListener('click', function(e) {{
        const menu = getMenu();
        if (!menu || !menu.classList.contains('active')) return;
        const header = document.querySelector('.site-header');
        // If click target is <a class="nav-link"> inside mobile-menu, let it fire and close naturally after page nav
        if (header && header.contains(e.target)) {{
            // But if clicking the toggle button, the global handler already toggled; skip here
            const btn = getToggle();
            if (btn && (btn === e.target || btn.contains(e.target))) return;
            return;
        }}
        setOpen(false);
    }}, true);

    // ESC to close
    document.addEventListener('keydown', function(e) {{
        if (e.key !== 'Escape') return;
        const menu = getMenu();
        if (!menu) return;
        if (menu.classList.contains('active')) setOpen(false);
    }});
}})();
'''

if SHARE_JS.exists():
    text = SHARE_JS.read_text(encoding='utf-8')
    if JS_MARKER not in text:
        SHARE_JS.write_text(text.rstrip() + "\n" + JS_BLOCK + "\n", encoding='utf-8')
        print("[OK ] share.js: appended mobile-nav upgrade module")
    else:
        print("[SKP] share.js already has marker")

# ---- share.css: menu-toggle hover/Focus + mobile-menu transition ----
CSS_MARKER = '/* B3 mobile-nav token styles */'
CSS_BLOCK = f'''
{CSS_MARKER}
@media (max-width: 768px) {{
    .site-header .menu-toggle {{
        display: block;
        border-radius: var(--radius-md, 10px);
        transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        width: 36px;
        height: 36px;
        line-height: 1;
    }}
    .site-header .menu-toggle:hover {{
        background: var(--color-primary-light, #e8eff7);
        color: var(--color-primary, #1e3a5f);
    }}
    .site-header .menu-toggle:active {{
        transform: scale(0.94);
    }}
    .site-header .menu-toggle:focus-visible {{
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #1e3a5f) 22%, transparent);
        background: var(--color-primary-light, #e8eff7);
    }}

    .site-header .mobile-menu {{
        display: block !important; /* so max-height transition can animate */
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--color-surface, #ffffff);
        box-shadow: var(--shadow-md);
        border-top: 1px solid var(--color-border-subtle, #f0f0f0);
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-height 0.24s ease, opacity 0.18s ease;
    }}
    .site-header .mobile-menu.active {{
        max-height: 90vh;
        opacity: 1;
        overflow-y: auto;
    }}
    .site-header .mobile-menu .nav-link {{
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        color: var(--color-text-secondary, #555);
        text-decoration: none;
        font-size: 0.9rem;
        border-bottom: 1px solid var(--color-border-subtle, #f5f5f5);
        border-radius: 0;
    }}
    .site-header .mobile-menu .nav-link:last-child {{
        border-bottom: none;
    }}
    .site-header .mobile-menu .nav-link:hover {{
        background: var(--color-primary-light, #e8eff7);
        color: var(--color-primary, #1e3a5f);
    }}
    .site-header .mobile-menu .nav-link.active {{
        background: var(--color-primary-light, #e8eff7);
        color: var(--color-primary, #1e3a5f);
    }}
}}
'''
text = SHARE_CSS.read_text(encoding='utf-8')
if CSS_MARKER not in text:
    SHARE_CSS.write_text(text.rstrip() + "\n" + CSS_BLOCK + "\n", encoding='utf-8')
    new = SHARE_CSS.read_text(encoding='utf-8')
    if new.count('{') != new.count('}'):
        print("[ERR] share.css BRACE MISMATCH after nav upgrade")
    else:
        print("[OK ] share.css: appended mobile-nav token styles")
else:
    print("[SKP] share.css already has nav marker")
