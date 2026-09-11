/**
 * AI金融计算器 - 分享功能（所有页面共用）
 */
(function() {
    'use strict';

    // ── 导航栏优化：动态重构为两行布局 ──
    // 第一行：站点级导航（首页 / 博客 …）
    // 第二行：全部计算器快捷入口（固定顺序、统一全称，锚文本对 SEO 与用户都更友好）
    //
    // 判定依据以 href 的目录 slug 为主、文案关键词为辅。
    // 历史 bug：旧版只按文案 includes('个税') 匹配，而导航文案是「个人所得税计算器」，
    // 其中「个」与「税」并不相邻，includes('个税') 恒为 false，
    // 于是个税被误判成"非计算器"留在第一行，其余 7 个计算器被挤到第二行，
    // 首行出现 首页 / 个人所得税计算器 / 博客 的错乱组合。
    //
    // 2026-09-11：第二行由"短名"改为"全称"。短名（个税/社保…）虽然紧凑，
    //   但锚文本信息量不足，不利于搜索引擎理解每个链接指向的工具，
    //   用户也容易误解。全称在 ≥901px 视口下可单行放下，更窄时由 share.css
    //   的媒体查询缩小字号，≤768px 则整体让位给汉堡菜单。
    var CALC_TOOLS = [
        { slug: 'tax-calculator',              short: '个税',   full: '个人所得税计算器' },
        { slug: 'social-insurance-calculator', short: '社保',   full: '社保计算器' },
        { slug: 'mortgage-calculator',         short: '房贷',   full: '房贷计算器' },
        { slug: 'car-loan-calculator',         short: '车贷',   full: '车贷计算器' },
        { slug: 'provident-fund-calculator',   short: '公积金', full: '公积金贷款计算器' },
        { slug: 'deposit-calculator',          short: '存款',   full: '存款利息计算器' },
        { slug: 'exchange-rate-calculator',    short: '汇率',   full: '汇率换算器' },
        { slug: 'investment-calculator',       short: '投资',   full: '投资收益计算器' }
    ];

    // 文案兜底关键词，与 CALC_TOOLS 顺序一一对应
    var CALC_TEXT_KEYS = ['个人所得税', '社保', '房贷', '车贷', '公积金', '存款', '汇率', '投资'];

    function matchToolIndex(href, text) {
        var h = (href || '').toLowerCase();
        for (var i = 0; i < CALC_TOOLS.length; i++) {
            if (h.indexOf(CALC_TOOLS[i].slug) !== -1) return i;
        }
        for (var j = 0; j < CALC_TEXT_KEYS.length; j++) {
            if (text.indexOf(CALC_TEXT_KEYS[j]) !== -1) return j;
        }
        return -1;
    }

    function initNavigation() {
        var header = document.querySelector('.site-header');
        var navLinks = document.querySelector('.nav-links');
        var headerContainer = document.querySelector('.header-container');

        if (!header || !navLinks || !headerContainer) return;
        if (navLinks.getAttribute('data-nav-split') === '1') return;  // 幂等：重复执行不会叠加

        var links = Array.prototype.slice.call(navLinks.querySelectorAll('.nav-link'));
        var tools = {};        // 计算器序号 -> { href, icon, active }
        var mainLinks = [];    // 站点级导航（首页 / 博客 …）

        links.forEach(function(link) {
            var href = link.getAttribute('href') || '';
            var text = (link.textContent || '').replace(/\s+/g, '');
            var idx = matchToolIndex(href, text);

            if (idx < 0) {
                mainLinks.push(link);
                return;
            }
            if (tools[idx]) return;   // 同一计算器只保留第一个
            var icon = link.querySelector('.nav-icon');
            tools[idx] = {
                href: href,
                icon: icon ? icon.textContent.trim() : '',
                active: link.classList.contains('active')
            };
        });

        // 第一行：清空后只放站点级导航
        if (mainLinks.length) {
            navLinks.innerHTML = '';
            mainLinks.forEach(function(link) { navLinks.appendChild(link); });
        }

        // 第二行：按 CALC_TOOLS 的固定顺序渲染全部计算器，保证各页顺序一致
        var calcNav = document.createElement('nav');
        calcNav.className = 'calc-nav';
        calcNav.setAttribute('aria-label', '计算器快捷入口');

        CALC_TOOLS.forEach(function(tool, i) {
            var info = tools[i];
            if (!info) return;

            var a = document.createElement('a');
            a.href = info.href;
            a.className = 'calc-nav-link' + (info.active ? ' active' : '');
            a.title = tool.full;
            a.innerHTML = (info.icon ? '<span class="calc-nav-icon">' + info.icon + '</span>' : '') +
                          '<span>' + tool.full + '</span>';
            calcNav.appendChild(a);
        });

        var mobileMenu = header.querySelector('.mobile-menu');
        if (mobileMenu) {
            header.insertBefore(calcNav, mobileMenu);
        } else {
            header.appendChild(calcNav);
        }

        navLinks.setAttribute('data-nav-split', '1');
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
