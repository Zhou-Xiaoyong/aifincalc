#!/usr/bin/env python3
import os

def clean_calculator_styles(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        '''header {
    text-align: center;
    color: white;
    padding: 40px 20px;
}

/* 品牌链接 */
.brand-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: white;
    margin-bottom: 12px;
    opacity: 0.85;
    transition: opacity 0.2s;
}

.brand-link:hover {
    opacity: 1;
}

.brand-logo {
    font-size: 1.4rem;
}

.brand-name {
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 1px;
}

h1 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 8px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

header p {
    font-size: 1rem;
    opacity: 0.9;
    font-weight: 300;
}

/* 工具导航 */
.tool-nav {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 30px;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: rgba(255,255,255,0.15);
    border-radius: 20px;
    color: white;
    text-decoration: none;
    font-size: 0.88rem;
    transition: all 0.2s;
    backdrop-filter: blur(4px);
}

.nav-item:hover {
    background: rgba(255,255,255,0.25);
}

.nav-item.active {
    background: rgba(255,255,255,0.35);
    font-weight: 600;
}

.nav-icon {
    font-size: 0.95rem;
}''',
        ''
    )
    
    content = content.replace(
        '''    .tool-nav {
        gap: 6px;
    }

    .nav-item {
        padding: 8px 12px;
        font-size: 0.82rem;
    }''',
        ''
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned: {filepath}")

if __name__ == '__main__':
    os.chdir('/workspace')
    
    calculators = [
        'tax-calculator/style.css',
        'mortgage-calculator/style.css',
        'social-insurance-calculator/style.css',
        'car-loan-calculator/style.css',
        'provident-fund-calculator/style.css',
        'deposit-calculator/style.css',
        'exchange-rate-calculator/style.css',
        'investment-calculator/style.css'
    ]
    
    for calc in calculators:
        if os.path.exists(calc):
            clean_calculator_styles(calc)
    
    print("\nAll styles cleaned successfully!")