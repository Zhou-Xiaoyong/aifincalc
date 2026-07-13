/**
 * AI金融计算器 - 分享功能（所有页面共用）
 */
(function() {
    'use strict';

    // 导航栏优化 - 动态重构为两行布局
    function initNavigation() {
        const header = document.querySelector('.site-header');
        const navLinks = document.querySelector('.nav-links');
        const headerContainer = document.querySelector('.header-container');
        
        if (!header || !navLinks || !headerContainer) return;

        const calcKeywords = ['个税', '社保', '房贷', '车贷', '公积金', '存款', '汇率', '投资'];
        const mainLinks = [];
        const calcLinks = [];

        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => {
            const text = link.textContent || '';
            const isCalc = calcKeywords.some(keyword => text.includes(keyword));
            if (isCalc) {
                calcLinks.push(link.cloneNode(true));
            } else {
                mainLinks.push(link.cloneNode(true));
            }
        });

        navLinks.innerHTML = '';
        mainLinks.forEach(link => navLinks.appendChild(link));

        const calcNav = document.createElement('nav');
        calcNav.className = 'calc-nav';
        
        const currentPath = window.location.pathname;
        
        calcLinks.forEach(link => {
            const calcLink = document.createElement('a');
            calcLink.href = link.href;
            calcLink.className = 'calc-nav-link' + (link.classList.contains('active') ? ' active' : '');
            
            const icon = link.querySelector('.nav-icon');
            const iconHtml = icon ? `<span class="calc-nav-icon">${icon.textContent}</span>` : '';
            
            let text = link.textContent.replace(icon ? icon.textContent : '', '').trim();
            
            const linkPath = new URL(link.href, window.location.origin).pathname;
            const pathParts = linkPath.split('/').filter(p => p);
            const linkDir = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : pathParts[0];
            const isCurrentPage = currentPath.includes('/' + linkDir + '/') || currentPath === '/' + linkDir;
            
            if (isCurrentPage) {
                calcLink.innerHTML = iconHtml + '<span>' + text + '</span>';
            } else {
                text = text.replace('个人所得税计算器', '个税')
                           .replace('计算器', '')
                           .replace('换算器', '');
                calcLink.innerHTML = iconHtml + '<span>' + text + '</span>';
            }
            
            calcNav.appendChild(calcLink);
        });

        header.insertBefore(calcNav, header.querySelector('.mobile-menu') || null);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }

    // 点击外部关闭菜单
    document.addEventListener('click', function(e) {
        const float = document.getElementById('shareFloat');
        const menu = document.getElementById('shareMenu');
        const btn = document.querySelector('.share-float-btn');
        if (float && !float.contains(e.target) && menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
            if (btn) btn.classList.remove('active');
        }
    });

    window.toggleShareMenu = function() {
        const menu = document.getElementById('shareMenu');
        const btn = document.querySelector('.share-float-btn');
        if (menu) {
            menu.classList.toggle('show');
            if (btn) btn.classList.toggle('active');
        }
    };

    window.shareWeChat = function() {
        const menu = document.getElementById('shareMenu');
        const btn = document.querySelector('.share-float-btn');
        if (menu) menu.classList.remove('show');
        if (btn) btn.classList.remove('active');

        const url = encodeURIComponent(window.location.href);

        let overlay = document.getElementById('shareQrOverlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'shareQrOverlay';
        overlay.className = 'share-qr-overlay';
        overlay.innerHTML =
            '<div class="share-qr-card">' +
                '<h3>微信扫码分享</h3>' +
                '<p>打开微信扫一扫，分享给好友</p>' +
                '<div id="qrContainer"></div>' +
                '<button class="share-qr-close" onclick="closeQrOverlay()">关闭</button>' +
            '</div>';
        document.body.appendChild(overlay);

        requestAnimationFrame(function() {
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeQrOverlay();
        });

        var qrContainer = document.getElementById('qrContainer');
        if (qrContainer) {
            var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + url;
            var img = document.createElement('img');
            img.src = qrUrl;
            img.alt = '分享二维码';
            img.style.width = '200px';
            img.style.height = '200px';
            qrContainer.appendChild(img);
        }
    };

    window.closeQrOverlay = function() {
        var overlay = document.getElementById('shareQrOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
        }
    };

    window.copyLink = function() {
        var menu = document.getElementById('shareMenu');
        var btn = document.querySelector('.share-float-btn');
        if (menu) menu.classList.remove('show');
        if (btn) btn.classList.remove('active');

        var url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showToast('链接已复制到剪贴板');
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
    };

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('链接已复制到剪贴板');
        } catch (e) {
            showToast('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }

    function showToast(msg) {
        var toast = document.getElementById('shareToast');
        if (toast) toast.remove();

        toast = document.createElement('div');
        toast.id = 'shareToast';
        toast.className = 'share-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('show');
        });

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    }
})();
