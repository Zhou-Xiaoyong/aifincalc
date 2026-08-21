"""方案b阶段二浏览器终验：13页截图 + 组件可见性 + 对比度 + 计算交互"""
import json, os, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

PAGES = [
    ("首页", "/"),
    ("个税计算器", "/tax-calculator/"),
    ("房贷计算器", "/mortgage-calculator/"),
    ("社保计算器", "/social-insurance-calculator/"),
    ("车贷计算器", "/car-loan-calculator/"),
    ("公积金计算器", "/provident-fund-calculator/"),
    ("存款计算器", "/deposit-calculator/"),
    ("投资计算器", "/investment-calculator/"),
    ("汇率计算器", "/exchange-rate-calculator/"),
    ("北京社保", "/social-insurance-calculator/beijing/"),
    ("上海个税", "/tax-calculator/shanghai/"),
    ("广州公积金", "/provident-fund-calculator/guangzhou/"),
    ("关于我们", "/about/"),
]

OUT = Path("/tmp/phase2_verify")
OUT.mkdir(parents=True, exist_ok=True)
report = {"passed": 0, "failed": 0, "items": []}

def add_item(name, status, detail=""):
    report["items"].append({"name": name, "status": status, "detail": detail})
    if status == "pass":
        report["passed"] += 1
    else:
        report["failed"] += 1

def wcag_contrast(c1, c2):
    """Relative luminance contrast ratio (WCAG)."""
    def _hex(h):
        h = h.lstrip("#")
        if len(h) == 3:
            h = "".join(ch*2 for ch in h)
        return tuple(int(h[i:i+2], 16)/255.0 for i in (0,2,4))
    def _srgb_to_lin(c):
        return c/12.92 if c <= 0.03928 else ((c + 0.055)/1.055)**2.4
    r1,g1,b1 = _hex(c1)
    r2,g2,b2 = _hex(c2)
    l1 = 0.2126*_srgb_to_lin(r1) + 0.7152*_srgb_to_lin(g1) + 0.0722*_srgb_to_lin(b1)
    l2 = 0.2126*_srgb_to_lin(r2) + 0.7152*_srgb_to_lin(g2) + 0.0722*_srgb_to_lin(b2)
    lighter, darker = max(l1,l2), min(l1,l2)
    return (lighter + 0.05) / (darker + 0.05)

def rgb_to_hex(rgb):
    """Parse rgb(r,g,b) or rgba(r,g,b,a) → #rrggbb (alpha blended on white)."""
    m = re.match(r"rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)", rgb)
    if not m:
        return None
    r,g,b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = float(m.group(4)) if m.group(4) else 1.0
    # blend over white
    r = round(r*a + 255*(1-a))
    g = round(g*a + 255*(1-a))
    b = round(b*a + 255*(1-a))
    return f"#{r:02x}{g:02x}{b:02x}"

BASE = "http://localhost:8765"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    page = ctx.new_page()
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type in ("error",) else None)
    page.on("pageerror", lambda exc: console_errors.append(f"PAGEERROR: {exc}"))

    for label, path in PAGES:
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", path).strip("_") or "home"
        url = BASE + path
        console_errors.clear()
        try:
            page.goto(url, timeout=30000, wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=15000)
        except PwTimeout:
            add_item(label, "fail", f"加载超时: {url}")
            continue
        except Exception as e:
            add_item(label, "fail", f"加载异常: {e}")
            continue

        # 1) 满页截图
        shot = OUT / f"{slug}.png"
        try:
            page.screenshot(path=str(shot), full_page=True)
        except Exception as e:
            add_item(label, "fail", f"截图失败: {e}")

        # 2) 可见性检查：关键组件是否有尺寸
        checks = page.evaluate("""() => {
            const tests = {};
            const bodies = document.querySelectorAll('body');
            tests.body_visible = bodies.length && bodies[0].clientHeight > 300;
            tests.body_bg = getComputedStyle(document.body).backgroundColor;
            // 导航
            const nav = document.querySelector('nav, .nav, .navbar, header');
            tests.nav_ok = !!nav && nav.clientHeight > 0;
            // 页脚
            const ft = document.querySelector('footer');
            tests.footer_ok = !!ft && ft.clientHeight > 0;
            // 计算器卡片（计算器页）或 hero（首页）
            const card = document.querySelector('.calculator-card, .hero-bg, .hero');
            tests.card_ok = !!card && card.clientHeight > 100;
            // 按钮或tab
            const btn = document.querySelector('.btn-calculate, button, .tab, .filter-btn');
            tests.btn_ok = !!btn && btn.clientWidth > 0;
            // h1
            const h1 = document.querySelector('h1');
            tests.h1_text = h1 ? h1.innerText.trim().slice(0, 60) : '';
            // 颜色采样
            const bodyText = getComputedStyle(document.body).color;
            tests.body_text_color = bodyText;
            // 主按钮文字&背景
            const cta = document.querySelector('.btn-calculate');
            if (cta) {
                tests.cta_bg = getComputedStyle(cta).backgroundColor;
                tests.cta_color = getComputedStyle(cta).color;
                tests.cta_radius = getComputedStyle(cta).borderRadius;
            }
            // 输入框
            const inp = document.querySelector('input, select, .amount-field, .form-control');
            if (inp) {
                tests.input_border = getComputedStyle(inp).borderColor;
                tests.input_radius = getComputedStyle(inp).borderRadius;
                tests.input_bg = getComputedStyle(inp).backgroundColor;
            }
            return tests;
        }""")
        detail = [f"h1={checks.get('h1_text','')}"]
        failures = []
        if not checks.get("body_visible"):
            failures.append("body高度异常")
        if not checks.get("nav_ok"):
            failures.append("导航不可见")
        if not checks.get("footer_ok"):
            failures.append("页脚不可见")
        if not checks.get("card_ok"):
            failures.append("hero/calc-card不可见")
        if not checks.get("btn_ok"):
            failures.append("无按钮/Tab")
        if console_errors:
            # 忽略第三方资源缺失
            real_errs = [e for e in console_errors if "cdn.jsdelivr.net" not in e and "cloudflareinsights" not in e and "google-analytics" not in e]
            if real_errs:
                failures.append(f"console={real_errs[:2]}")
        # 对比度（正文vs背景；主按钮文字vs按钮背景）
        try:
            body_bg_h = rgb_to_hex(checks.get("body_bg","rgb(255,255,255)")) or "#ffffff"
            body_txt_h = rgb_to_hex(checks.get("body_text_color","rgb(15,23,42)")) or "#0f172a"
            cr_body = round(wcag_contrast(body_bg_h, body_txt_h), 2)
            detail.append(f"正文对比={cr_body}:1")
            if cr_body < 4.5:
                failures.append(f"正文对比度不足({cr_body})")
        except Exception as e:
            detail.append(f"正文对比计算失败:{e}")
        if checks.get("cta_bg") and checks.get("cta_color"):
            try:
                cta_b = rgb_to_hex(checks["cta_bg"])
                cta_c = rgb_to_hex(checks["cta_color"])
                if cta_b and cta_c:
                    cr_cta = round(wcag_contrast(cta_b, cta_c), 2)
                    detail.append(f"按钮对比={cr_cta}:1")
                    if cr_cta < 3.0:
                        failures.append(f"按钮对比度不足({cr_cta})")
            except Exception as e:
                detail.append(f"按钮对比失败:{e}")
        detail.append(f"btnRadius={checks.get('cta_radius','')}|inpRadius={checks.get('input_radius','')}")

        # 3) 交互：在部分计算器上填数并点"立即计算"
        inter_note = ""
        if "计算器" in label and label not in ("汇率计算器",):
            try:
                # 尝试查找数字输入框并填入
                fill_result = page.evaluate("""() => {
                    const inp = document.querySelector('input[type="number"], .form-control[type="number"], input[name^="amount"], input[name^="salary"], input[name^="income"], input[name^="principal"], input[name^="price"]');
                    if (!inp) return {ok:false, reason:"no input found"};
                    inp.focus();
                    inp.value = '15000';
                    inp.dispatchEvent(new Event('input', {bubbles:true}));
                    inp.dispatchEvent(new Event('change', {bubbles:true}));
                    const btn = document.querySelector('.btn-calculate');
                    if (!btn) return {ok:false, reason:"no calculate button"};
                    btn.click();
                    return {ok:true};
                }""")
                page.wait_for_timeout(1200)
                inter_note = "交互:" + ("OK" if fill_result.get("ok") else fill_result.get("reason",""))
                # 检查结果区是否出现非空 highlight
                if fill_result.get("ok"):
                    res_visible = page.evaluate("""() => {
                        const r = document.querySelector('.result-item.highlight, .result-box, .result-card, .result-summary, .results, #result');
                        if (!r) return "missing";
                        const ok = r.clientHeight > 0 && r.innerText.trim().length > 4;
                        return ok ? "ok" : "empty";
                    }""")
                    inter_note += f"/result={res_visible}"
                    if res_visible == "missing":
                        failures.append("无结果区选择器")
                    elif res_visible == "empty":
                        failures.append("计算后结果为空")
            except Exception as e:
                inter_note = f"交互异常:{e}"

        detail_str = " | ".join(detail)
        if inter_note:
            detail_str += " | " + inter_note
        if failures:
            detail_str += " | 故障=" + ",".join(failures)
            add_item(label, "fail", detail_str)
        else:
            add_item(label, "pass", detail_str)

    browser.close()

report_path = OUT / "report.json"
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
# 简要输出
print("=== PHASE2 VERIFY SUMMARY ===")
print(f"PASS={report['passed']}  FAIL={report['failed']}  TOTAL={len(report['items'])}")
for it in report["items"]:
    mark = "✅" if it["status"] == "pass" else "❌"
    print(f"{mark} {it['name']}: {it['detail']}")
print(f"\n详细报告: {report_path}")
print(f"截图目录: {OUT}")
if report["failed"] > 0:
    sys.exit(1)
