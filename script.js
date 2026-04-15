/**
 * AI金融计算器 - 首页交互
 */

document.addEventListener('DOMContentLoaded', function () {
    // 卡片点击涟漪效果
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.borderColor = 'transparent';
        });
    });

    // 页脚版权年份
    const year = new Date().getFullYear();
    const footerText = document.querySelector('.footer-bottom p');
    if (footerText) {
        footerText.textContent = `© ${year} AI金融计算器(aifincalc.com). 计算结果仅供参考，不构成任何决策建议。`;
    }
});
