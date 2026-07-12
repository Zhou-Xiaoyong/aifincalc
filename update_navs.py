#!/usr/bin/env python3
import os

NAV_HTML = '''<header class="site-header">
        <div class="header-container">
            <a href="{home_url}" class="brand-link">
                <span class="brand-logo">🧮</span>
                <span class="brand-name">AI金融计算器</span>
            </a>
            <nav class="nav-links">
                <a href="{home_url}" class="nav-link">
                    <span class="nav-icon">🏠</span>
                    <span>首页</span>
                </a>
                <a href="{tax_url}" class="nav-link {tax_active}">
                    <span class="nav-icon">💰</span>
                    <span>个税</span>
                </a>
                <a href="{social_url}" class="nav-link {social_active}">
                    <span class="nav-icon">🏥</span>
                    <span>社保</span>
                </a>
                <a href="{mortgage_url}" class="nav-link {mortgage_active}">
                    <span class="nav-icon">🏡</span>
                    <span>房贷</span>
                </a>
                <a href="{car_url}" class="nav-link {car_active}">
                    <span class="nav-icon">🚗</span>
                    <span>车贷</span>
                </a>
                <a href="{fund_url}" class="nav-link {fund_active}">
                    <span class="nav-icon">🏦</span>
                    <span>公积金</span>
                </a>
                <a href="{deposit_url}" class="nav-link {deposit_active}">
                    <span class="nav-icon">💵</span>
                    <span>存款</span>
                </a>
                <a href="{exchange_url}" class="nav-link {exchange_active}">
                    <span class="nav-icon">💱</span>
                    <span>汇率</span>
                </a>
                <a href="{investment_url}" class="nav-link {investment_active}">
                    <span class="nav-icon">📈</span>
                    <span>投资</span>
                </a>
                <a href="{blog_url}" class="nav-link {blog_active}">
                    <span class="nav-icon">📝</span>
                    <span>博客</span>
                </a>
            </nav>
        </div>
    </header>

    <div class="container page-top-space">
        <div class="page-header">
            <h1>{page_title}</h1>
            <p>{page_desc}</p>
        </div>

        <div class="calculator-card">'''

SIMPLE_NAV_HTML = '''<header class="site-header">
        <div class="header-container">
            <a href="{home_url}" class="brand-link">
                <span class="brand-logo">🧮</span>
                <span class="brand-name">AI金融计算器</span>
            </a>
            <nav class="nav-links">
                <a href="{home_url}" class="nav-link {home_active}">
                    <span class="nav-icon">🏠</span>
                    <span>首页</span>
                </a>
                <a href="{tax_url}" class="nav-link {tax_active}">
                    <span class="nav-icon">💰</span>
                    <span>个税</span>
                </a>
                <a href="{social_url}" class="nav-link {social_active}">
                    <span class="nav-icon">🏥</span>
                    <span>社保</span>
                </a>
                <a href="{mortgage_url}" class="nav-link {mortgage_active}">
                    <span class="nav-icon">🏡</span>
                    <span>房贷</span>
                </a>
                <a href="{car_url}" class="nav-link {car_active}">
                    <span class="nav-icon">🚗</span>
                    <span>车贷</span>
                </a>
                <a href="{fund_url}" class="nav-link {fund_active}">
                    <span class="nav-icon">🏦</span>
                    <span>公积金</span>
                </a>
                <a href="{deposit_url}" class="nav-link {deposit_active}">
                    <span class="nav-icon">💵</span>
                    <span>存款</span>
                </a>
                <a href="{exchange_url}" class="nav-link {exchange_active}">
                    <span class="nav-icon">💱</span>
                    <span>汇率</span>
                </a>
                <a href="{investment_url}" class="nav-link {investment_active}">
                    <span class="nav-icon">📈</span>
                    <span>投资</span>
                </a>
                <a href="{blog_url}" class="nav-link {blog_active}">
                    <span class="nav-icon">📝</span>
                    <span>博客</span>
                </a>
            </nav>
        </div>
    </header>

    <div class="container page-top-space">'''

BLOG_ARTICLE_NAV = '''<header class="site-header">
        <div class="header-container">
            <a href="{home_url}" class="brand-link">
                <span class="brand-logo">🧮</span>
                <span class="brand-name">AI金融计算器</span>
            </a>
            <nav class="nav-links">
                <a href="{home_url}" class="nav-link">
                    <span class="nav-icon">🏠</span>
                    <span>首页</span>
                </a>
                <a href="{tax_url}" class="nav-link">
                    <span class="nav-icon">💰</span>
                    <span>个税</span>
                </a>
                <a href="{social_url}" class="nav-link">
                    <span class="nav-icon">🏥</span>
                    <span>社保</span>
                </a>
                <a href="{mortgage_url}" class="nav-link">
                    <span class="nav-icon">🏡</span>
                    <span>房贷</span>
                </a>
                <a href="{car_url}" class="nav-link">
                    <span class="nav-icon">🚗</span>
                    <span>车贷</span>
                </a>
                <a href="{fund_url}" class="nav-link">
                    <span class="nav-icon">🏦</span>
                    <span>公积金</span>
                </a>
                <a href="{deposit_url}" class="nav-link">
                    <span class="nav-icon">💵</span>
                    <span>存款</span>
                </a>
                <a href="{exchange_url}" class="nav-link">
                    <span class="nav-icon">💱</span>
                    <span>汇率</span>
                </a>
                <a href="{investment_url}" class="nav-link">
                    <span class="nav-icon">📈</span>
                    <span>投资</span>
                </a>
                <a href="{blog_url}" class="nav-link active">
                    <span class="nav-icon">📝</span>
                    <span>博客</span>
                </a>
            </nav>
        </div>
    </header>

    <div class="container page-top-space">
        <div class="article-detail">'''

def get_paths(base_dir, depth=1):
    parts = ['..'] * depth
    return {
        'home': '/'.join(parts) + '/index.html',
        'tax': '/'.join(parts) + '/tax-calculator/index.html',
        'social': '/'.join(parts) + '/social-insurance-calculator/index.html',
        'mortgage': '/'.join(parts) + '/mortgage-calculator/index.html',
        'car': '/'.join(parts) + '/car-loan-calculator/index.html',
        'fund': '/'.join(parts) + '/provident-fund-calculator/index.html',
        'deposit': '/'.join(parts) + '/deposit-calculator/index.html',
        'exchange': '/'.join(parts) + '/exchange-rate-calculator/index.html',
        'investment': '/'.join(parts) + '/investment-calculator/index.html',
        'blog': '/'.join(parts) + '/blog/index.html',
    }

def update_calculator_page(filepath, page_title, page_desc, active_tab):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    paths = get_paths(filepath)
    
    active = {}
    for key in ['home', 'tax', 'social', 'mortgage', 'car', 'fund', 'deposit', 'exchange', 'investment', 'blog']:
        active[key] = 'active' if key == active_tab else ''
    
    new_nav = NAV_HTML.format(
        home_url=paths['home'],
        tax_url=paths['tax'],
        social_url=paths['social'],
        mortgage_url=paths['mortgage'],
        car_url=paths['car'],
        fund_url=paths['fund'],
        deposit_url=paths['deposit'],
        exchange_url=paths['exchange'],
        investment_url=paths['investment'],
        blog_url=paths['blog'],
        tax_active=active['tax'],
        social_active=active['social'],
        mortgage_active=active['mortgage'],
        car_active=active['car'],
        fund_active=active['fund'],
        deposit_active=active['deposit'],
        exchange_active=active['exchange'],
        investment_active=active['investment'],
        blog_active=active['blog'],
        page_title=page_title,
        page_desc=page_desc
    )
    
    content = content.replace(
        '<body>\n    <div class="container">\n        <header class="sub-header">\n            <a href="../index.html" class="brand-link">\n                <span class="brand-logo">🧮</span>\n                <span class="brand-name">AI金融计算器</span>\n            </a>\n            <h1>' + page_title + '</h1>\n            <p>' + page_desc + '</p>\n        </header>\n\n        <!-- 工具导航 -->\n        <nav class="tool-nav">',
        '<body>\n    ' + new_nav
    )
    
    content = content.replace('</nav>\n\n        <div class="calculator-card">', '')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

def update_simple_page(filepath, page_title, page_desc, active_tab):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    paths = get_paths(filepath)
    
    active = {}
    for key in ['home', 'tax', 'social', 'mortgage', 'car', 'fund', 'deposit', 'exchange', 'investment', 'blog']:
        active[key] = 'active' if key == active_tab else ''
    
    new_nav = SIMPLE_NAV_HTML.format(
        home_url=paths['home'],
        tax_url=paths['tax'],
        social_url=paths['social'],
        mortgage_url=paths['mortgage'],
        car_url=paths['car'],
        fund_url=paths['fund'],
        deposit_url=paths['deposit'],
        exchange_url=paths['exchange'],
        investment_url=paths['investment'],
        blog_url=paths['blog'],
        home_active=active['home'],
        tax_active=active['tax'],
        social_active=active['social'],
        mortgage_active=active['mortgage'],
        car_active=active['car'],
        fund_active=active['fund'],
        deposit_active=active['deposit'],
        exchange_active=active['exchange'],
        investment_active=active['investment'],
        blog_active=active['blog'],
    )
    
    content = content.replace(
        '<body>\n    <div class="hero-bg"></div>\n    <div class="container">\n        <header>\n            <a href="../index.html" class="brand-link">\n                <span class="brand-logo">🧮</span>\n                <span class="brand-name">AI金融计算器</span>\n            </a>\n            <h1>' + page_title + '</h1>\n            <p class="tagline">' + page_desc + '</p>\n        </header>\n\n        <nav class="tool-nav">',
        '<body>\n    <div class="hero-bg"></div>\n    ' + new_nav
    )
    
    content = content.replace('</nav>\n\n        <div class="calculator-card ', '</nav>\n\n        <div class="calculator-card')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

def update_city_pages(base_dir, type_name):
    city_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    
    for city_dir in city_dirs:
        filepath = os.path.join(base_dir, city_dir, 'index.html')
        if not os.path.exists(filepath):
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        paths = get_paths(filepath, depth=2)
        
        active_tab = 'tax' if type_name == 'tax' else 'fund'
        active = {}
        for key in ['home', 'tax', 'social', 'mortgage', 'car', 'fund', 'deposit', 'exchange', 'investment', 'blog']:
            active[key] = 'active' if key == active_tab else ''
        
        new_nav = SIMPLE_NAV_HTML.format(
            home_url=paths['home'],
            tax_url=paths['tax'],
            social_url=paths['social'],
            mortgage_url=paths['mortgage'],
            car_url=paths['car'],
            fund_url=paths['fund'],
            deposit_url=paths['deposit'],
            exchange_url=paths['exchange'],
            investment_url=paths['investment'],
            blog_url=paths['blog'],
            home_active=active['home'],
            tax_active=active['tax'],
            social_active=active['social'],
            mortgage_active=active['mortgage'],
            car_active=active['car'],
            fund_active=active['fund'],
            deposit_active=active['deposit'],
            exchange_active=active['exchange'],
            investment_active=active['investment'],
            blog_active=active['blog'],
        )
        
        content = content.replace(
            '<body>\n    <div class="hero-bg"></div>\n\n    <div class="container">\n        <header class="sub-header">\n            <a href="../../index.html" class="brand-link">\n                <span class="brand-logo">🧮</span>\n                <span class="brand-name">AI金融计算器</span>\n            </a>\n            <h1>',
            '<body>\n    <div class="hero-bg"></div>\n    ' + new_nav + '\n        <header>'
        )
        
        content = content.replace('</h1>\n            <p class="tagline">', '</h1>\n            <p>')
        
        nav_start = content.find('        <!-- 工具导航 -->')
        if nav_start != -1:
            nav_end = content.find('        </nav>', nav_start)
            if nav_end != -1:
                nav_end += 8
                content = content[:nav_start] + content[nav_end:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def update_blog_home():
    filepath = 'blog/index.html'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    paths = get_paths(filepath)
    
    new_nav = SIMPLE_NAV_HTML.format(
        home_url=paths['home'],
        tax_url=paths['tax'],
        social_url=paths['social'],
        mortgage_url=paths['mortgage'],
        car_url=paths['car'],
        fund_url=paths['fund'],
        deposit_url=paths['deposit'],
        exchange_url=paths['exchange'],
        investment_url=paths['investment'],
        blog_url=paths['blog'],
        home_active='',
        tax_active='',
        social_active='',
        mortgage_active='',
        car_active='',
        fund_active='',
        deposit_active='',
        exchange_active='',
        investment_active='',
        blog_active='active',
    )
    
    content = content.replace(
        '<body>\n    <div class="hero-bg"></div>\n\n    <div class="container">\n        <header class="sub-header">\n            <a href="../index.html" class="brand-link">\n                <span class="brand-logo">🧮</span>\n                <span class="brand-name">AI金融计算器</span>\n            </a>\n            <h1>金融知识博客</h1>\n            <p class="tagline">政策解读 · 理财干货 · 省钱技巧</p>\n        </header>\n\n        <nav class="tool-nav">',
        '<body>\n    <div class="hero-bg"></div>\n    ' + new_nav
    )
    
    content = content.replace('</nav>\n\n    <div class="blog-main">', '</nav>\n\n    <div class="blog-main">')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

def update_blog_articles():
    articles = ['article1', 'article2', 'article3', 'article4', 'article5', 'article6', 'article7']
    
    for article in articles:
        filepath = f'blog/{article}/index.html'
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        paths = get_paths(filepath, depth=2)
        
        new_nav = BLOG_ARTICLE_NAV.format(
            home_url=paths['home'],
            tax_url=paths['tax'],
            social_url=paths['social'],
            mortgage_url=paths['mortgage'],
            car_url=paths['car'],
            fund_url=paths['fund'],
            deposit_url=paths['deposit'],
            exchange_url=paths['exchange'],
            investment_url=paths['investment'],
            blog_url=paths['blog'],
        )
        
        content = content.replace(
            '<body>\n    <div class="hero-bg"></div>\n\n    <div class="container">\n        <header class="sub-header">\n            <a href="../../index.html" class="brand-link">\n                <span class="brand-logo">🧮</span>\n                <span class="brand-name">AI金融计算器</span>\n            </a>\n            <h1>金融知识博客</h1>\n            <p class="tagline">政策解读 · 理财干货 · 省钱技巧</p>\n        </header>\n\n        <nav class="tool-nav">',
            '<body>\n    <div class="hero-bg"></div>\n    ' + new_nav
        )
        
        content = content.replace('</nav>\n\n        <div class="article-detail">', '')
        
        content = content.replace('<!-- 评论区占位 -->\n            <div class="comment-section">\n                <div class="comment-placeholder">\n                    <div class="comment-placeholder-icon">💬</div>\n                    <h3>评论区建设中</h3>\n                    <p>感谢您的关注，评论功能即将上线，敬请期待！</p>\n                </div>\n            </div>', '')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

if __name__ == '__main__':
    os.chdir('/workspace')
    
    update_calculator_page('mortgage-calculator/index.html', '房贷计算器 2026', '支持LPR利率、商业贷、公积金贷、组合贷，智能规划您的房贷方案', 'mortgage')
    update_calculator_page('social-insurance-calculator/index.html', '社保计算器 2026', '一键计算五险一金缴纳明细，支持9大城市社保标准自动带入', 'social')
    update_calculator_page('car-loan-calculator/index.html', '车贷计算器 2026', '支持等额本息、等额本金，智能规划您的购车贷款方案', 'car')
    update_calculator_page('provident-fund-calculator/index.html', '公积金贷款计算器 2026', '额度评估、冲还贷规划、公积金与商贷对比', 'fund')
    update_calculator_page('deposit-calculator/index.html', '存款利息计算器 2026', '活期、定期、零存整取、通知存款利息计算', 'deposit')
    update_calculator_page('exchange-rate-calculator/index.html', '汇率换算器', '20种主要货币实时换算，30天走势图表', 'exchange')
    update_calculator_page('investment-calculator/index.html', '投资收益计算器', '复利计算、定投模拟、退休规划', 'investment')
    
    update_simple_page('about/index.html', '关于我们', '让金融计算变得简单，让财务决策更加明智', 'home')
    update_simple_page('contact/index.html', '联系我们', '有问题？请联系我们', 'home')
    update_simple_page('privacy/index.html', '隐私政策', '我们如何保护您的隐私', 'home')
    
    update_city_pages('tax-calculator', 'tax')
    update_city_pages('provident-fund-calculator', 'fund')
    
    update_blog_home()
    update_blog_articles()
    
    print("\nAll pages updated successfully!")