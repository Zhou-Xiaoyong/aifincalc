#!/usr/bin/env python3
"""Inject city-grid section (热门 12 + 展开全部按钮) into the 3 calculator
aggregate pages. Then append tokenized city-grid styles to their CSS."""
from pathlib import Path
import re

ROOT = Path('/workspace')

# pinyin -> Chinese name (kept in use order)
NAMES = {
    'beijing': '北京', 'shanghai': '上海', 'guangzhou': '广州', 'shenzhen': '深圳',
    'hangzhou': '杭州', 'nanjing': '南京', 'chengdu': '成都', 'wuhan': '武汉',
    'xian': '西安', 'tianjin': '天津', 'suzhou': '苏州', 'chongqing': '重庆',
    'qingdao': '青岛', 'dalian': '大连', 'ningbo': '宁波', 'xiamen': '厦门',
    'changsha': '长沙', 'zhengzhou': '郑州', 'hefei': '合肥', 'foshan': '佛山',
    'dongguan': '东莞', 'kunming': '昆明', 'shenyang': '沈阳', 'jinan': '济南',
    'harbin': '哈尔滨', 'changchun': '长春', 'taiyuan': '太原', 'nanning': '南宁',
    'guiyang': '贵阳', 'lanzhou': '兰州', 'nanchang': '南昌', 'haikou': '海口',
    'wulumuqi': '乌鲁木齐', 'xining': '西宁', 'shijiazhuang': '石家庄',
    'wenzhou': '温州', 'wuxi': '无锡', 'fuzhou': '福州',
}
HOT = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou', 'nanjing',
       'chengdu', 'wuhan', 'xian', 'tianjin', 'suzhou', 'chongqing']

# 8 geographic regions for grouping in "全部城市"
REGIONS = [
    ('直辖市',   ['beijing', 'shanghai', 'tianjin', 'chongqing']),
    ('华北',     ['shijiazhuang', 'taiyuan']),
    ('东北',     ['shenyang', 'changchun', 'harbin', 'dalian']),
    ('华东',     ['nanjing', 'suzhou', 'wuxi', 'hangzhou', 'ningbo',
                 'wenzhou', 'hefei', 'fuzhou', 'xiamen', 'jinan', 'qingdao']),
    ('华中',     ['zhengzhou', 'wuhan', 'changsha', 'nanchang']),
    ('华南',     ['guangzhou', 'shenzhen', 'foshan', 'dongguan',
                 'nanning', 'haikou']),
    ('西南',     ['chengdu', 'kunming', 'guiyang']),
    ('西北',     ['xian', 'lanzhou', 'xining', 'wulumuqi']),
]

CALC_TITLES = {
    'tax-calculator': ('个人所得税', '个税计算 / 直接切换城市'),
    'social-insurance-calculator': ('社保公积金', '社保缴纳城市切换'),
    'provident-fund-calculator': ('公积金贷款', '公积金贷款城市切换 / 直达计算'),
}

def city_chip(py):
    name = NAMES.get(py, py)
    return f'                    <a class="city-chip" href="./{py}/">{name}</a>'

def build_grid(py_cities, calc_rel):
    hot_cities = [p for p in HOT if p in py_cities]
    remaining = [p for p in py_cities if p not in hot_cities]

    hot_rows = '\n'.join(city_chip(p) for p in hot_cities)
    full_parts = []
    for region_name, py_list in REGIONS:
        present = [p for p in py_list if p in (remaining + hot_cities)]
        # include all cities present in the calc inside full region view
        present_full = [p for p in py_list if p in py_cities]
        if not present_full:
            continue
        chips = '\n'.join(city_chip(p) for p in present_full)
        full_parts.append(f"""                <div class="city-group">
                    <div class="city-group-title">{region_name}</div>
                    <div class="city-chips-row">
{chips}
                    </div>
                </div>""")
    full = '\n'.join(full_parts)
    calc_name, title_text = CALC_TITLES[calc_rel]
    return f"""
        <!-- 城市入口网格 -->
        <section class="city-grid" aria-label="{calc_name}计算器城市入口">
            <div class="city-grid-inner">
                <h2 class="city-grid-title">🗺️ {title_text}</h2>

                <div class="city-group">
                    <div class="city-group-title">🔥 热门城市</div>
                    <div class="city-chips-row">
{hot_rows}
                    </div>
                </div>

                <details class="city-all">
                    <summary>显示全部 {len(py_cities)} 个城市</summary>
                    <div class="city-all-body">
{full}
                    </div>
                </details>
            </div>
        </section>
"""

CSS_MARKER = '/* B3 city-grid token styles */'
CSS_BLOCK = f'''
{CSS_MARKER}
.city-grid {{
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    padding: 36px 32px;
    margin: 36px 0 40px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border-subtle);
}}
.city-grid-inner {{
    max-width: 1100px;
    margin: 0 auto;
}}
.city-grid-title {{
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 20px;
    line-height: 1.4;
}}
.city-group {{ margin-bottom: 18px; }}
.city-group:last-child {{ margin-bottom: 0; }}
.city-group-title {{
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 10px;
    padding-left: 8px;
    border-left: 3px solid var(--color-primary);
    letter-spacing: 0.4px;
}}
.city-chips-row {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}}
.city-chip {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    user-select: none;
    font-weight: 500;
}}
.city-chip:hover {{
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-color: var(--color-primary-light);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}}
.city-chip:focus-visible {{
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
}}
.city-all {{
    margin-top: 16px;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0;
    overflow: hidden;
}}
.city-all > summary {{
    list-style: none;
    cursor: pointer;
    padding: 12px 18px;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    user-select: none;
}}
.city-all > summary::-webkit-details-marker {{ display: none; }}
.city-all > summary::after {{
    content: '+';
    font-size: 1.2rem;
    font-weight: 400;
    color: var(--color-primary);
    transition: transform 0.2s ease;
}}
.city-all[open] > summary::after {{
    content: '−';
    transform: rotate(180deg);
}}
.city-all > summary:focus-visible {{
    outline: none;
    box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}}
.city-all[open] {{ background: var(--color-surface); }}
.city-all-body {{
    padding: 8px 18px 18px;
}}
.city-all-body .city-group {{ margin-bottom: 16px; }}
@media (max-width: 640px) {{
    .city-grid {{ padding: 24px 16px; }}
    .city-grid-title {{ font-size: 1.15rem; }}
    .city-chip {{ padding: 7px 13px; font-size: 0.85rem; }}
}}
'''

def inject_html(calc_rel):
    """Insert city-grid section inside main, before footer (or as the last
    child of <main>/before </main> or before <footer>)."""
    fp = ROOT / calc_rel / 'index.html'
    text = fp.read_text(encoding='utf-8')

    # Avoid double injection
    if 'class="city-grid"' in text:
        print(f"[SKP] {calc_rel}/index.html: already has city-grid")
        return

    # Collect cities from actual existing sub dirs
    cities = sorted(p.name for p in (ROOT / calc_rel).iterdir()
                    if p.is_dir() and (p / 'index.html').exists())

    # Find the insertion point. Prefer "before last </main>"; else before <footer.
    grid_html = build_grid(cities, calc_rel)

    # Strategy: insert right before the <footer or <footer> tag.
    # If not found, fall back to before last </div> that looks like a main wrapper.
    m_footer = re.search(r'\n[ \t]*(<footer\b|<!-- 页脚 -->)', text)
    m_main_end = re.search(r'\n[ \t]*</main>', text)

    def insert_before(idx):
        # ensure blank lines around insertion
        before = text[:idx].rstrip() + "\n"
        after = "\n" + text[idx:].lstrip("\n")
        return before + grid_html + after

    if m_main_end:
        idx = m_main_end.start()
    elif m_footer:
        idx = m_footer.start()
    else:
        # fallback: before </body>
        idx = text.rfind('</body>')
        if idx < 0:
            print(f"[ERR] {calc_rel}/index.html: can't find anchor (footer/main/body)")
            return

    new = insert_before(idx)
    fp.write_text(new, encoding='utf-8')
    print(f"[OK ] {calc_rel}/index.html: injected city-grid ({len(cities)} cities)")


def inject_css(calc_rel):
    fp = ROOT / calc_rel / 'style.css'
    text = fp.read_text(encoding='utf-8')
    if CSS_MARKER in text:
        print(f"[SKP] {calc_rel}/style.css: already has city-grid CSS")
        return
    new = text.rstrip() + "\n" + CSS_BLOCK + "\n"
    fp.write_text(new, encoding='utf-8')
    if new.count('{') != new.count('}'):
        print(f"[ERR] {calc_rel}/style.css: BRACE MISMATCH")
    else:
        print(f"[OK ] {calc_rel}/style.css: appended city-grid CSS")


for rel in CALC_TITLES:
    inject_html(rel)
    inject_css(rel)
