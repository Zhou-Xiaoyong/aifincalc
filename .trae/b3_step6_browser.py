#!/usr/bin/env python3
"""Playwright browser regression for phase-3 changes:
- Homepage: 5 FAQ summary visible; click FAQ[2] summary → open attribute.
- Blog: hero height + article card count; search input focus ring.
- Tax index: city-grid chips exist + click chip to shanghai → 200.
- Mortgage index: FAQ first item is open by default.
- Provident-fund index: "显示全部" city-all details expand.
- Mobile 375x812: click menu-toggle → active class + ESC closes.
- Console error counts across pages.
"""
from playwright.sync_api import sync_playwright

PAGES = [
    ('首页',       'http://127.0.0.1:8766/index.html'),
    ('博客首页',   'http://127.0.0.1:8766/blog/'),
    ('文章详情',   'http://127.0.0.1:8766/blog/article1/'),
    ('个税聚合',   'http://127.0.0.1:8766/tax-calculator/'),
    ('房贷首页',   'http://127.0.0.1:8766/mortgage-calculator/'),
    ('社保聚合',   'http://127.0.0.1:8766/social-insurance-calculator/'),
    ('公积金聚合', 'http://127.0.0.1:8766/provident-fund-calculator/'),
    ('车贷计算器', 'http://127.0.0.1:8766/car-loan-calculator/'),
    ('存款计算器', 'http://127.0.0.1:8766/deposit-calculator/'),
    ('汇率计算器', 'http://127.0.0.1:8766/exchange-rate-calculator/'),
]

def desktop_check(page, url, name):
    errors = []
    infos = []
    page.on('console', lambda msg: errors.append(f'console:{msg.type} {msg.text}') if msg.type in ('error','warning') else None)
    page.goto(url, wait_until='networkidle', timeout=30000)
    infos.append(f'http={page.evaluate("document.title")[:40]}')
    # 1) HTTP OK indicator
    status = page.evaluate("() => performance.getEntriesByType('navigation')[0]?.responseStatus ?? 200")
    infos.append(f'navStatus={status}')

    if name == '首页':
        faqs = page.locator('section.faq-section details.faq-item').count()
        infos.append(f'faq-details={faqs}/5')
        # click Q2 and verify open state
        page.locator('section.faq-section details.faq-item').nth(1).locator('summary').click()
        opened = page.evaluate(
            "() => document.querySelectorAll('section.faq-section details.faq-item')[1].hasAttribute('open')")
        infos.append(f'faq[1] click open={opened}')
        infos.append(f'tool-card gradient inline 0 -> {page.evaluate("() => document.querySelectorAll(\'.card-icon[style]\').length")}')
        infos.append(f'duplicate style.css link = {page.evaluate("() => document.querySelectorAll(`link[href$=style.css]`).length")}')

    if name == '博客首页':
        cards = page.locator('a.article-card').count()
        infos.append(f'article-cards={cards}')
        # tokenization: hero-bg not purple gradient
        hero_bg = page.evaluate(
            "() => getComputedStyle(document.querySelector('.hero-bg')).backgroundImage")
        infos.append(f'hero-bg uses soft radial={("radial" in str(hero_bg).lower())}')

    if name in ('个税聚合', '社保聚合', '公积金聚合'):
        total = page.locator('.city-chip').count()
        infos.append(f'city-chips={total}')
        # expand "显示全部" details
        if page.locator('details.city-all').count() > 0:
            page.locator('details.city-all > summary').click()
            page.wait_for_timeout(150)
            open_all = page.evaluate("() => document.querySelector('details.city-all').hasAttribute('open')")
            infos.append(f'city-all open={open_all}')
        # first chip click goes 200-ish
        if page.locator('.city-chip').count() > 0:
            with page.expect_navigation(wait_until='domcontentloaded', timeout=12000):
                page.locator('.city-chip').first.click()
            infos.append(f'chip click ok')

    if name == '房贷首页':
        first_open = page.evaluate(
            "() => document.querySelector('details.faq-item')?.hasAttribute('open') ?? false")
        cnt = page.locator('details.faq-item').count()
        infos.append(f'faq={cnt}/4 firstOpen={first_open}')

    # mobile nav test
    if name == '首页':
        pass # tested separately below

    # Capture console errors
    console_err = [e for e in errors if e.startswith('console:error')]
    return infos, console_err

def mobile_check(browser):
    ctx = browser.new_context(viewport={'width': 375, 'height': 812},
                              device_scale_factor=2, is_mobile=True)
    page = ctx.new_page()
    errors = []
    infos = []
    page.on('console', lambda msg: errors.append(f'{msg.type}:{msg.text}') if msg.type == 'error' else None)
    page.goto('http://127.0.0.1:8766/index.html', wait_until='networkidle', timeout=30000)
    # Toggle nav
    btn = page.locator('button.menu-toggle')
    btn.click()
    page.wait_for_timeout(300)
    active = page.evaluate("() => document.getElementById('mobileMenu').classList.contains('active')")
    aria = btn.get_attribute('aria-expanded')
    infos.append(f'toggle.active={active} aria-expanded={aria}')
    # ESC close
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    active_after_esc = page.evaluate(
        "() => document.getElementById('mobileMenu').classList.contains('active')")
    infos.append(f'after ESC active={active_after_esc}')
    ctx.close()
    return infos, [e for e in errors if e.startswith('error:')]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        for name, url in PAGES:
            infos, cerrs = desktop_check(page, url, name)
            flag = '❌' if cerrs else '✅'
            print(f'{flag} {name:8} | ' + ' | '.join(infos))
            if cerrs:
                for e in cerrs[:5]:
                    print('   -', e)
        # mobile
        infos, cerrs = mobile_check(browser)
        flag = '❌' if cerrs else '✅'
        print(f'{flag} 移动端导航 | ' + ' | '.join(infos))
        if cerrs:
            for e in cerrs[:5]:
                print('   -', e)
        browser.close()

if __name__ == '__main__':
    main()
