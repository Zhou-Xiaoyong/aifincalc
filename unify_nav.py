#!/usr/bin/env python3
"""
Robust script to unify navigation across all pages.
Uses regex to remove old headers/navs and insert new unified site-header.
"""
import os
import re

# Nav items with full SEO-friendly names
NAV_ITEMS = [
    ('home',    '🏠', '首页'),
    ('tax',     '💰', '个人所得税计算器'),
    ('social',  '🏥', '社保计算器'),
    ('mortgage','🏡', '房贷计算器'),
    ('car',     '🚗', '车贷计算器'),
    ('fund',    '🏦', '公积金贷款计算器'),
    ('deposit', '💵', '存款利息计算器'),
    ('exchange','💱', '汇率换算器'),
    ('invest',  '📈', '投资收益计算器'),
    ('blog',    '📝', '博客'),
]

def build_nav_html(prefix, active_key):
    """Build the site-header HTML with correct relative paths."""
    links = []
    for key, icon, label in NAV_ITEMS:
        cls = 'nav-link active' if key == active_key else 'nav-link'
        links.append(f'''                <a href="{prefix}{get_url(key)}" class="{cls}">
                    <span class="nav-icon">{icon}</span>
                    <span>{label}</span>
                </a>''')
    
    # Build mobile menu (duplicate links)
    mobile_links = []
    for key, icon, label in NAV_ITEMS:
        cls = 'nav-link active' if key == active_key else 'nav-link'
        mobile_links.append(f'''                    <a href="{prefix}{get_url(key)}" class="{cls}">
                        <span class="nav-icon">{icon}</span>
                        <span>{label}</span>
                    </a>''')
    
    return f'''<header class="site-header">
        <div class="header-container">
            <a href="{prefix}index.html" class="brand-link">
                <span class="brand-logo">🧮</span>
                <span class="brand-name">AI金融计算器</span>
            </a>
            <nav class="nav-links">
{chr(10).join(links)}
            </nav>
            <button class="menu-toggle" onclick="document.getElementById('mobileMenu').classList.toggle('active')">☰</button>
        </div>
        <div class="mobile-menu" id="mobileMenu">
{chr(10).join(mobile_links)}
        </div>
    </header>'''

def get_url(key):
    urls = {
        'home':     'index.html',
        'tax':      'tax-calculator/index.html',
        'social':   'social-insurance-calculator/index.html',
        'mortgage': 'mortgage-calculator/index.html',
        'car':      'car-loan-calculator/index.html',
        'fund':     'provident-fund-calculator/index.html',
        'deposit':  'deposit-calculator/index.html',
        'exchange': 'exchange-rate-calculator/index.html',
        'invest':   'investment-calculator/index.html',
        'blog':     'blog/index.html',
    }
    return urls[key]


def remove_old_header_nav(content):
    """Remove ALL old header/nav patterns from content using regex."""
    
    # Pattern 1: <header class="sub-header">...</header>
    content = re.sub(
        r'<header\s+class="sub-header">.*?</header>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 2: <!-- 工具导航 --> <nav class="tool-nav">...</nav>
    content = re.sub(
        r'<!--\s*工具导航\s*-->\s*<nav\s+class="tool-nav">.*?</nav>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 3: <nav class="tool-nav">...</nav> (without comment)
    content = re.sub(
        r'<nav\s+class="tool-nav">.*?</nav>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 4: Remove old <header> blocks that contain brand-link (but NOT site-header)
    # Match <header> (without class="site-header") that contains brand-link
    content = re.sub(
        r'<header(?![^>]*class="site-header")[^>]*>\s*<a\s+[^>]*class="brand-link".*?</header>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 5: Remove standalone <header> blocks (without site-header class) on about/contact/privacy pages
    # These have <a href="../index.html" class="brand-link"> inside
    content = re.sub(
        r'<header(?![^>]*site-header)[^>]*>\s*(?:<a\s+[^>]*brand-link.*?</a>\s*)?(?:<h1>.*?</h1>\s*)?(?:<p[^>]*>.*?</p>\s*)?</header>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 6: Remove page-header divs
    content = re.sub(
        r'<div\s+class="page-header">\s*<h1>.*?</h1>\s*<p>.*?</p>\s*</div>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 7: Remove leftover nav-item links that escaped (standalone <a class="nav-item">)
    content = re.sub(
        r'<a\s+[^>]*class="nav-item[^"]*".*?</a>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 8: Remove empty <nav> tags
    content = re.sub(
        r'<nav\s+class="nav-links">\s*</nav>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Pattern 9: Remove duplicate site-headers (keep only the first)
    # Count site-headers
    headers = list(re.finditer(r'<header\s+class="site-header">.*?</header>', content, re.DOTALL))
    if len(headers) > 1:
        # Keep first, remove rest
        for match in reversed(headers[1:]):
            content = content[:match.start()] + content[match.end():]
    
    # Clean up multiple blank lines
    content = re.sub(r'\n{4,}', '\n\n\n', content)
    
    return content


def insert_site_header(content, prefix, active_key):
    """Insert the site-header right after <body> tag."""
    nav_html = build_nav_html(prefix, active_key)
    
    # Check if site-header already exists
    if 'class="site-header"' in content:
        # Replace existing site-header
        content = re.sub(
            r'<header\s+class="site-header">.*?</header>',
            nav_html,
            content,
            count=1,
            flags=re.DOTALL
        )
        return content
    
    # Insert after <body> tag (and optional hero-bg)
    body_match = re.search(r'<body[^>]*>', content)
    if body_match:
        insert_pos = body_match.end()
        
        # Check if hero-bg follows
        hero_match = re.match(r'\s*<div\s+class="hero-bg"></div>', content[insert_pos:])
        if hero_match:
            insert_pos += hero_match.end()
        
        content = content[:insert_pos] + '\n    ' + nav_html + '\n' + content[insert_pos:]
    
    return content


def ensure_container_top_space(content):
    """Ensure the main container has page-top-space class."""
    # Add page-top-space to container divs that don't have it
    content = re.sub(
        r'<div\s+class="container"(?![^>]*page-top-space)>',
        '<div class="container page-top-space"',
        content,
        count=1  # Only the first container
    )
    return content


def fix_share_css_link(content, depth):
    """Ensure share.css is linked."""
    if 'shared/share.css' not in content:
        # Insert before </head>
        prefix = '../' * depth
        content = content.replace(
            '</head>',
            f'    <link rel="stylesheet" href="{prefix}shared/share.css">\n</head>'
        )
    return content


def process_file(filepath, active_key, depth=1):
    """Process a single HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    prefix = '../' * depth
    
    # 1. Ensure share.css is linked
    content = fix_share_css_link(content, depth)
    
    # 2. Remove old headers/navs
    content = remove_old_header_nav(content)
    
    # 3. Insert new site-header
    content = insert_site_header(content, prefix, active_key)
    
    # 4. Ensure container has page-top-space
    content = ensure_container_top_space(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def process_homepage(filepath):
    """Special handling for homepage - simplify hero section."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ensure share.css linked
    if 'shared/share.css' not in content:
        content = content.replace(
            '<link rel="stylesheet" href="style.css">',
            '<link rel="stylesheet" href="style.css">\n    <link rel="stylesheet" href="shared/share.css">'
        )
    
    # Remove old headers/navs
    content = remove_old_header_nav(content)
    
    # Insert/replace site-header
    nav_html = build_nav_html('', 'home')
    if 'class="site-header"' in content:
        content = re.sub(
            r'<header\s+class="site-header">.*?</header>',
            nav_html,
            content,
            count=1,
            flags=re.DOTALL
        )
    else:
        # Insert after hero-bg
        content = content.replace(
            '<div class="hero-bg"></div>',
            '<div class="hero-bg"></div>\n\n    ' + nav_html
        )
    
    # Simplify hero section - reduce padding
    content = content.replace(
        '<header>\n            <div class="logo">🧮</div>\n            <h1>AI金融计算器</h1>\n            <p class="tagline">',
        '<header style="padding: 20px 20px 16px;">\n            <h1 style="font-size: 1.8rem;">AI金融计算器</h1>\n            <p class="tagline" style="font-size: 0.9rem;">'
    )
    
    # Remove the logo div and update badge
    content = content.replace(
        '            <div class="update-badge">数据更新于 2026 年</div>\n        </header>',
        '        </header>'
    )
    
    # Ensure page-top-space on container
    content = ensure_container_top_space(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")


def process_blog_article(filepath, depth=2):
    """Process blog article pages."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    prefix = '../' * depth
    
    # Ensure share.css
    content = fix_share_css_link(content, depth)
    
    # Remove old headers/navs  
    content = remove_old_header_nav(content)
    
    # Insert site-header
    content = insert_site_header(content, prefix, 'blog')
    
    # Ensure page-top-space
    content = ensure_container_top_space(content)
    
    # Remove comment sections (regex)
    content = re.sub(r'\s*<section\s+class="comment-section">.*?</section>\s*', '', content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")


def process_calculator_style(filepath):
    """Fix body padding in calculator style.css files."""
    if not os.path.exists(filepath):
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Change body padding from 20px to 0 20px 20px (remove top padding)
    content = re.sub(
        r'body\s*\{[^}]*padding:\s*20px\s*;',
        lambda m: m.group(0).replace('padding: 20px;', 'padding: 0 20px 20px;'),
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed style: {filepath}")


if __name__ == '__main__':
    os.chdir('/workspace')
    
    # 1. Homepage
    process_homepage('index.html')
    
    # 2. Calculator pages (depth=1)
    calc_pages = [
        ('tax-calculator/index.html', 'tax'),
        ('social-insurance-calculator/index.html', 'social'),
        ('mortgage-calculator/index.html', 'mortgage'),
        ('car-loan-calculator/index.html', 'car'),
        ('provident-fund-calculator/index.html', 'fund'),
        ('deposit-calculator/index.html', 'deposit'),
        ('exchange-rate-calculator/index.html', 'exchange'),
        ('investment-calculator/index.html', 'invest'),
    ]
    for path, key in calc_pages:
        if process_file(path, key, depth=1):
            print(f"Updated: {path}")
        else:
            print(f"Skipped (no change): {path}")
    
    # 3. About/Contact/Privacy (depth=1)
    for path, key in [('about/index.html', 'home'), ('contact/index.html', 'home'), ('privacy/index.html', 'home')]:
        if process_file(path, key, depth=1):
            print(f"Updated: {path}")
        else:
            print(f"Skipped (no change): {path}")
    
    # 4. City pages (depth=2)
    for calc_dir, active_key in [('tax-calculator', 'tax'), ('provident-fund-calculator', 'fund')]:
        city_dirs = [d for d in os.listdir(calc_dir) if os.path.isdir(os.path.join(calc_dir, d))]
        for city in city_dirs:
            filepath = os.path.join(calc_dir, city, 'index.html')
            if os.path.exists(filepath):
                if process_file(filepath, active_key, depth=2):
                    print(f"Updated: {filepath}")
                else:
                    print(f"Skipped (no change): {filepath}")
    
    # 5. Blog home (depth=1)
    if process_file('blog/index.html', 'blog', depth=1):
        print(f"Updated: blog/index.html")
    else:
        print(f"Skipped (no change): blog/index.html")
    
    # 6. Blog articles (depth=2)
    for i in range(1, 8):
        filepath = f'blog/article{i}/index.html'
        if os.path.exists(filepath):
            process_blog_article(filepath, depth=2)
    
    # 7. Fix calculator body padding
    for calc_dir in ['tax-calculator', 'social-insurance-calculator', 'mortgage-calculator',
                     'car-loan-calculator', 'provident-fund-calculator', 'deposit-calculator',
                     'exchange-rate-calculator', 'investment-calculator']:
        process_calculator_style(f'{calc_dir}/style.css')
    
    print("\n✅ All pages processed!")
