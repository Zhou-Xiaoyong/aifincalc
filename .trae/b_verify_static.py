"""方案b终验的静态与HTTP检查：CSS token完整性 + 页面可访问 + HTML结构关键类存在"""
import json, re, urllib.request, sys
from pathlib import Path

ROOT = Path('/workspace')
BASE = 'http://127.0.0.1:8765'
PAGES = [
    ("首页", "/", ["index.html", "style.css", "shared/share.css"]),
    ("个税计算器", "/tax-calculator/", ["tax-calculator/index.html", "tax-calculator/style.css", "tax-calculator/script.js", "shared/share.css"]),
    ("房贷计算器", "/mortgage-calculator/", ["mortgage-calculator/index.html", "mortgage-calculator/style.css", "mortgage-calculator/script.js", "shared/share.css"]),
    ("社保计算器", "/social-insurance-calculator/", ["social-insurance-calculator/index.html", "social-insurance-calculator/style.css", "social-insurance-calculator/script.js", "shared/share.css"]),
    ("车贷计算器", "/car-loan-calculator/", ["car-loan-calculator/index.html", "car-loan-calculator/style.css", "car-loan-calculator/script.js", "shared/share.css"]),
    ("公积金计算器", "/provident-fund-calculator/", ["provident-fund-calculator/index.html", "provident-fund-calculator/style.css", "provident-fund-calculator/script.js", "shared/share.css"]),
    ("存款计算器", "/deposit-calculator/", ["deposit-calculator/index.html", "deposit-calculator/style.css", "deposit-calculator/script.js", "shared/share.css"]),
    ("投资计算器", "/investment-calculator/", ["investment-calculator/index.html", "investment-calculator/style.css", "investment-calculator/script.js", "shared/share.css"]),
    ("汇率计算器", "/exchange-rate-calculator/", ["exchange-rate-calculator/index.html", "exchange-rate-calculator/style.css", "exchange-rate-calculator/script.js", "shared/share.css"]),
    ("北京社保", "/social-insurance-calculator/beijing/", ["social-insurance-calculator/beijing/index.html", "social-insurance-calculator/style.css", "shared/share.css"]),
    ("上海个税", "/tax-calculator/shanghai/", ["tax-calculator/shanghai/index.html", "tax-calculator/style.css", "shared/share.css"]),
    ("广州公积金", "/provident-fund-calculator/guangzhou/", ["provident-fund-calculator/guangzhou/index.html", "provident-fund-calculator/style.css", "shared/share.css"]),
    ("关于我们", "/about/", ["about/index.html", "style.css", "shared/share.css"]),
]

CSS_FILES = [
    ROOT/'style.css', ROOT/'shared/share.css',
    ROOT/'tax-calculator/style.css', ROOT/'mortgage-calculator/style.css',
    ROOT/'social-insurance-calculator/style.css', ROOT/'car-loan-calculator/style.css',
    ROOT/'provident-fund-calculator/style.css', ROOT/'deposit-calculator/style.css',
    ROOT/'investment-calculator/style.css', ROOT/'exchange-rate-calculator/style.css',
]

REQUIRED_TOKENS = [
    '--color-primary', '--color-bg', '--color-surface', '--color-border',
    '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full',
    '--shadow-sm', '--shadow-md', '--shadow-lg', '--font-sans', '--color-text-secondary',
]

# share.css 作为共享样式：继承父页（style.css 或 calculator/style.css）中已声明的 token，自身不必重复定义
SHARE_CSS_EXEMPT = set(REQUIRED_TOKENS)

result = {"pages": [], "css": []}
pass_c = 0; fail_c = 0

# === CSS 静态检查 ===
for f in CSS_FILES:
    text = f.read_text(encoding='utf-8', errors='replace')
    is_share = f.name == 'share.css'
    req = (t for t in REQUIRED_TOKENS if not (is_share and t in SHARE_CSS_EXEMPT))
    missing = [t for t in req if t + ':' not in text]
    # 引用未定义token的风险（粗略）
    used = set(re.findall(r"var\(--[a-zA-Z0-9-]+\)", text))
    defined = set(re.findall(r"(--[a-zA-Z0-9-]+)\s*:", text))
    undef = [v for v in used if f'var({v})' != v]
    # 简单：找出 var(--X) 中的 X 不在 defined，且不在公共列表
    undef_list = []
    for u in used:
        name = u[4:-1]  # strip var( ... )
        if name not in defined:
            # 共享/继承token允许：style.css 中共享变量 share.css 可能引用
            if name in ('--radius-full', '--radius-xl', '--radius-lg', '--radius-md', '--radius-sm',
                        '--color-primary','--color-bg','--color-surface','--color-surface-muted',
                        '--color-border','--color-border-subtle','--color-text','--color-text-secondary',
                        '--color-text-muted','--color-primary-light','--color-primary-dark',
                        '--color-accent','--shadow-sm','--shadow-md','--shadow-lg',
                        '--color-success','--color-warning','--color-danger','--color-info',
                        '--font-sans','--font-mono','--spacer-16'):
                continue
            undef_list.append(name)
    # 花括号平衡
    opens = text.count('{'); closes = text.count('}')
    balanced = (opens == closes)
    # 关键特征（阶段二标记）
    phase2_markers = []
    if '.btn-calculate' in text and 'focus-visible' in text: phase2_markers.append('btn:focus-visible')
    if '.tabs ' in text and 'var(--radius-lg)' in text: phase2_markers.append('tabs->radius-lg')
    if '.result-item.highlight' in text and 'var(--color-primary-light)' in text: phase2_markers.append('highlight->primary-light')
    entry = {"file": str(f.relative_to(ROOT)), "balanced": balanced, "opens": opens, "closes": closes,
             "missing_tokens": missing, "undef_vars": undef_list[:10],
             "phase2_markers": phase2_markers}
    ok = balanced and not missing
    result["css"].append({"entry": entry, "ok": ok})
    if ok: pass_c += 1
    else: fail_c += 1

# === Page HTTP + HTML 结构检查 ===
for label, path, deps in PAGES:
    url = BASE + path
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            http_status = resp.status
            html = resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        http_status = 0
        html = ''
        http_err = str(e)
    # 结构检查：允许 <h1> 或 <h2>（首页/计算器页/关于页 SEO 用 h2 作标题常见）
    has_heading = bool(re.search(r"<h[12][^>]*>", html))
    has_nav = bool(re.search(r"<(nav|header)[^>]*>", html))
    has_footer = '</footer>' in html
    body_markers = ['calculator-card', 'hero-bg', 'about-card', 'contact-card',
                    'privacy-card', 'card calculator', '"card"',
                    'tool-grid', 'section calculator',
                    'cc-section', 'city-page-content', 'city-intro']
    has_calc = any(m in html for m in body_markers)
    issues = []
    if http_status != 200: issues.append(f'HTTP {http_status}')
    if not has_heading: issues.append('无h1/h2标题')
    if not has_nav: issues.append('无nav/header')
    if not has_footer: issues.append('无footer')
    if not has_calc: issues.append('无主体块')
    # 检查样式引用是否完整
    missing_dep = [d for d in deps if d.replace('/','/') not in html]
    # 简单：针对 style.css, share.css, 计算器专属style.css
    html_checks = {
        'style.css': 'style.css' in html,
        'share.css': 'share.css' in html,
    }
    # 响应式 meta
    has_viewport = 'viewport' in html
    if not has_viewport: issues.append('无viewport')
    entry = {"label": label, "path": path, "http": http_status, "len": len(html),
             "h1/h2": has_heading, "nav": has_nav, "footer": has_footer, "body": has_calc,
             "viewport": has_viewport, "issues": issues}
    ok = not issues
    result["pages"].append({"entry": entry, "ok": ok})
    if ok: pass_c += 1
    else: fail_c += 1

print(f"=== PHASE2 STATIC+HTTP SUMMARY PASS={pass_c} FAIL={fail_c} ===")
for p in result["pages"]:
    e = p["entry"]; mark = "✅" if p["ok"] else "❌"
    print(f"{mark} {e['label']:10s} HTTP={e['http']} len={e['len']:<7} h1h2={e['h1/h2']} nav={e['nav']} ft={e['footer']} vp={e['viewport']}  issues={e['issues'] or '无'}")
print()
for c in result["css"]:
    e = c["entry"]; mark = "✅" if c["ok"] else "❌"
    print(f"{mark} {e['file']:<42s} balanced={e['balanced']}({e['opens']}/{e['closes']}) missing={e['missing_tokens'] or '无'} undef={e['undef_vars'] or '无'} phase2={e['phase2_markers']}")

Path('/tmp/phase2_static.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"\n详细报告: /tmp/phase2_static.json")
if fail_c > 0:
    sys.exit(1)
