#!/usr/bin/env python3
import os

def fix_blog_article(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        '''<div class="container page-top-space">
        <div class="article-detail">
            <a href="../../index.html" class="nav-item">
                <span class="nav-icon">🏠</span>
                <span>首页</span>
            </a>
            <a href="../index.html" class="nav-item active">
                <span class="nav-icon">📝</span>
                <span>博客</span>
            </a>
            <a href="../../tax-calculator/index.html" class="nav-item">
                <span class="nav-icon">💰</span>
                <span>个税计算器</span>
            </a>
            <a href="../../mortgage-calculator/index.html" class="nav-item">
                <span class="nav-icon">🏡</span>
                <span>房贷计算器</span>
            </a>
            <a href="../../car-loan-calculator/index.html" class="nav-item">
                <span class="nav-icon">🚗</span>
                <span>车贷计算器</span>
            </a>
            <a href="../../provident-fund-calculator/index.html" class="nav-item">
                <span class="nav-icon">🏦</span>
                <span>公积金贷款</span>
            </a>
            <a href="../../exchange-rate-calculator/index.html" class="nav-item">
                <span class="nav-icon">💱</span>
                <span>汇率换算</span>
            </a>
            <a href="../../investment-calculator/index.html" class="nav-item">
                <span class="nav-icon">📈</span>
                <span>投资收益</span>
            </a>
        </nav>

        <article class="article-detail">''',
        '<div class="container page-top-space">\n        <div class="article-detail">'
    )
    
    content = content.replace(
        '''<!-- 评论区占位 -->
            <div class="comment-section">
                <div class="comment-placeholder">
                    <div class="comment-placeholder-icon">💬</div>
                    <h3>评论区建设中</h3>
                    <p>感谢您的关注，评论功能即将上线，敬请期待！</p>
                </div>
            </div>''',
        ''
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {filepath}")

if __name__ == '__main__':
    os.chdir('/workspace')
    
    articles = ['article1', 'article2', 'article3', 'article4', 'article5', 'article6', 'article7']
    
    for article in articles:
        filepath = f'blog/{article}/index.html'
        if os.path.exists(filepath):
            fix_blog_article(filepath)
    
    print("\nAll blog articles fixed successfully!")