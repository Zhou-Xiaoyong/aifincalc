// ====== 汇率换算器 ======
// 核心逻辑：双API容错 + localStorage缓存 + 实时换算

// ====== 货币定义 ======
// category: 'major'(主要) / 'asia'(亚太) / 'sea'(东南亚) / 'other'(其他)
const CURRENCIES = [
    // 主要货币
    { code: 'USD', name: '美元',       flag: '🇺🇸', category: 'major' },
    { code: 'EUR', name: '欧元',       flag: '🇪🇺', category: 'major' },
    { code: 'GBP', name: '英镑',       flag: '🇬🇧', category: 'major' },
    { code: 'JPY', name: '日元',       flag: '🇯🇵', category: 'major' },
    { code: 'CHF', name: '瑞士法郎',   flag: '🇨🇭', category: 'major' },
    { code: 'CAD', name: '加元',       flag: '🇨🇦', category: 'major' },
    { code: 'AUD', name: '澳元',       flag: '🇦🇺', category: 'major' },
    // 亚太
    { code: 'KRW', name: '韩元',       flag: '🇰🇷', category: 'asia' },
    { code: 'HKD', name: '港元',       flag: '🇭🇰', category: 'asia' },
    { code: 'TWD', name: '新台币',     flag: '🇹🇼', category: 'asia' },
    { code: 'SGD', name: '新加坡元',   flag: '🇸🇬', category: 'asia' },
    { code: 'MOP', name: '澳门元',     flag: '🇲🇴', category: 'asia' },
    // 东南亚
    { code: 'THB', name: '泰铢',       flag: '🇹🇭', category: 'sea' },
    { code: 'MYR', name: '林吉特',     flag: '🇲🇾', category: 'sea' },
    { code: 'IDR', name: '印尼盾',     flag: '🇮🇩', category: 'sea' },
    { code: 'PHP', name: '菲律宾比索', flag: '🇵🇭', category: 'sea' },
    { code: 'VND', name: '越南盾',     flag: '🇻🇳', category: 'sea' },
    // 其他（与中国经贸关系密切）
    { code: 'RUB', name: '俄罗斯卢布', flag: '🇷🇺', category: 'other' },
    { code: 'BRL', name: '巴西雷亚尔', flag: '🇧🇷', category: 'other' },
    { code: 'CNY', name: '人民币',     flag: '🇨🇳', category: 'major' }
];

// 类别中文标签
const CATEGORY_LABELS = {
    major: '主要货币',
    asia: '亚太货币',
    sea: '东南亚货币',
    other: '其他'
};

const CATEGORY_TAG_CLASS = {
    major: 'tag-major',
    asia: 'tag-asia',
    sea: 'tag-sea',
    other: 'tag-other'
};

// 快速换算常用金额
const QUICK_AMOUNTS = [1, 10, 100, 1000, 5000, 10000, 50000, 100000];

// 常用换算场景
const COMMON_CONVERTS = [
    { label: '旅游预算 ¥10,000', amount: 10000 },
    { label: '海淘购物 ¥1,000', amount: 1000 },
    { label: '学费参考 ¥50,000', amount: 50000 },
    { label: '日常换算 ¥100', amount: 100 },
    { label: '商务往来 ¥100,000', amount: 100000 },
    { label: '小额支付 ¥500', amount: 500 }
];

// ====== 状态变量 ======
let rates = {};           // { CNY: 1, USD: 0.137, ... } 以CNY为基准
let ratesDate = '';       // 汇率日期
let ratesSource = '';     // 数据来源
let rateChart = null;     // Chart.js 实例

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', async () => {
    populateCurrencySelectors();
    await fetchRates();
    loadHistoricalRates();
});

// ====== 填充货币选择器 ======
function populateCurrencySelectors() {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');

    CURRENCIES.forEach(c => {
        const opt1 = new Option(`${c.code} - ${c.name}`, c.code);
        const opt2 = new Option(`${c.code} - ${c.name}`, c.code);
        fromSelect.add(opt1);
        toSelect.add(opt2);
    });

    fromSelect.value = 'CNY';
    toSelect.value = 'USD';

    // 同步图表货币选择器
    updateChartSelectors();
}

function updateChartSelectors() {
    const fromSel = document.getElementById('chartFromCurrency');
    const toSel = document.getElementById('chartToCurrency');
    if (!fromSel || !toSel) return;

    // 填充选项（保留当前选择）
    const fromVal = fromSel.value;
    const toVal = toSel.value;
    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    CURRENCIES.filter(c => c.code !== 'CNY').forEach(c => {
        fromSel.add(new Option(`${c.code} - ${c.name}`, c.code));
        toSel.add(new Option(`${c.code} - ${c.name}`, c.code));
    });
    // CNY 作为源货币
    const cnyOpt = new Option('CNY - 人民币', 'CNY');
    fromSel.add(cnyOpt);
    fromSel.insertBefore(cnyOpt, fromSel.firstChild);
    // CNY 作为目标货币
    const cnyOpt2 = new Option('CNY - 人民币', 'CNY');
    toSel.add(cnyOpt2);

    if (fromVal) fromSel.value = fromVal;
    if (toVal) toSel.value = toVal;
}

// ====== 获取汇率（双API容错 + 缓存） ======
async function fetchRates() {
    const statusEl = document.getElementById('rateStatus');
    const statusText = document.getElementById('statusText');

    // 1. 尝试从缓存读取（24小时内有效）
    const cached = loadCachedRates();
    if (cached) {
        rates = cached.rates;
        ratesDate = cached.date;
        ratesSource = cached.source;
        onRatesLoaded(true);
    }

    // 2. 尝试主API（ExchangeRate-API - 覆盖东南亚货币更全）
    try {
        statusText.textContent = '正在获取最新汇率...';
        const resp = await fetch('https://open.er-api.com/v6/latest/CNY');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (data.result === 'success' && data.rates) {
            rates = data.rates;
            ratesDate = data.time_last_update_utc || data.time_last_update || '';
            ratesSource = 'ExchangeRate-API';

            // 确保CNY自身 = 1
            rates['CNY'] = 1;

            cacheRates(rates, ratesDate, ratesSource);
            onRatesLoaded(false);
            return;
        }
    } catch (e) {
        console.warn('ExchangeRate-API 获取失败:', e.message);
    }

    // 3. 备用API（Frankfurter - 稳定但缺少部分东南亚货币）
    try {
        statusText.textContent = '尝试备用数据源...';
        const resp = await fetch('https://api.frankfurter.dev/v1/latest?from=CNY');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (data.rates) {
            rates = data.rates;
            ratesDate = data.date || '';
            ratesSource = 'Frankfurter (ECB)';

            rates['CNY'] = 1;

            cacheRates(rates, ratesDate, ratesSource);
            onRatesLoaded(false);
            return;
        }
    } catch (e) {
        console.warn('Frankfurter API 获取失败:', e.message);
    }

    // 4. 两个API都失败
    if (Object.keys(cached?.rates || {}).length > 0) {
        statusEl.classList.add('error');
        statusText.textContent = `⚠️ 无法获取最新汇率，显示缓存数据（${cached.date}）`;
    } else {
        statusEl.classList.add('error');
        statusText.textContent = '❌ 汇率数据获取失败，请检查网络后刷新页面';
    }
}

function onRatesLoaded(isCached) {
    const statusEl = document.getElementById('rateStatus');
    const statusText = document.getElementById('statusText');

    statusEl.classList.remove('error');
    statusText.textContent = isCached
        ? `✅ 汇率已加载（${ratesDate}）— 正在检查更新...`
        : `✅ 汇率已更新（${ratesDate}）来源：${ratesSource}`;

    // 更新界面
    updateRateDisplay();
    convert();
    renderRatesTable();
    renderQuickConvert();
    renderCommonConverts();
}

// ====== 缓存管理 ======
function cacheRates(ratesData, date, source) {
    try {
        const cache = {
            rates: ratesData,
            date: date,
            source: source,
            timestamp: Date.now()
        };
        localStorage.setItem('fx_rates_cache', JSON.stringify(cache));
    } catch (e) {
        console.warn('缓存写入失败:', e);
    }
}

function loadCachedRates() {
    try {
        const raw = localStorage.getItem('fx_rates_cache');
        if (!raw) return null;
        const cache = JSON.parse(raw);
        // 24小时有效
        if (Date.now() - cache.timestamp > 24 * 60 * 60 * 1000) return null;
        return cache;
    } catch (e) {
        return null;
    }
}

// ====== 核心换算 ======
function convert() {
    const fromCode = document.getElementById('fromCurrency').value;
    const toCode = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('fromAmount').value) || 0;

    if (!rates[fromCode] || !rates[toCode]) return;

    // 以CNY为基准：amount (from) → CNY → to
    const amountInCNY = amount / rates[fromCode];
    const result = amountInCNY * rates[toCode];

    document.getElementById('toAmount').value = result > 0 ? formatNumber(result) : '';

    updateRateDisplay();
    updateQuickConvertTarget();
    renderCommonConverts();
}

function updateRateDisplay() {
    const fromCode = document.getElementById('fromCurrency').value;
    const toCode = document.getElementById('toCurrency').value;

    const fromInfo = CURRENCIES.find(c => c.code === fromCode);
    const toInfo = CURRENCIES.find(c => c.code === toCode);

    if (!rates[fromCode] || !rates[toCode]) return;

    // 更新旗帜和名称
    document.getElementById('fromFlag').textContent = fromInfo?.flag || '🏳️';
    document.getElementById('fromCurrencyName').textContent = fromInfo?.name || fromCode;
    document.getElementById('toFlag').textContent = toInfo?.flag || '🏳️';
    document.getElementById('toCurrencyName').textContent = toInfo?.name || toCode;

    // 计算汇率
    const rate = rates[toCode] / rates[fromCode];
    const formattedRate = formatRate(rate);

    document.getElementById('rateValue').textContent =
        `1 ${fromCode} = ${formattedRate} ${toCode}`;
    document.getElementById('rateUpdateTime').textContent =
        `更新时间：${ratesDate}`;
    document.getElementById('rateSource').textContent =
        `数据来源：${ratesSource}`;
}

// ====== 交换货币 ======
function swapCurrencies() {
    const fromSel = document.getElementById('fromCurrency');
    const toSel = document.getElementById('toCurrency');
    const fromAmt = document.getElementById('fromAmount');
    const toAmt = document.getElementById('toAmount');

    const tmpCode = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmpCode;

    const tmpAmt = toAmt.value;
    fromAmt.value = tmpAmt;

    handleCurrencyChange();
    convert();
}

function handleCurrencyChange() {
    updateRateDisplay();
    updateQuickConvertTarget();
    convert();
    renderCommonConverts();
}

// ====== 快速换算 ======
function updateQuickConvertTarget() {
    const toCode = document.getElementById('toCurrency').value;
    const toInfo = CURRENCIES.find(c => c.code === toCode);
    const fromCode = document.getElementById('fromCurrency').value;
    const fromInfo = CURRENCIES.find(c => c.code === fromCode);

    const descEl = document.getElementById('quickConvertDesc');
    if (descEl) {
        descEl.textContent = `1 ${fromInfo?.name || fromCode} = ? ${toInfo?.name || toCode}`;
    }

    renderQuickConvert();
}

function renderQuickConvert() {
    const grid = document.getElementById('quickGrid');
    if (!grid) return;

    const fromCode = document.getElementById('fromCurrency').value;
    const toCode = document.getElementById('toCurrency').value;

    if (!rates[fromCode] || !rates[toCode]) {
        grid.innerHTML = '<p style="color:#6c757d;grid-column:1/-1;text-align:center;">等待汇率数据...</p>';
        return;
    }

    const rate = rates[toCode] / rates[fromCode];

    grid.innerHTML = QUICK_AMOUNTS.map(amt => {
        const result = amt * rate;
        return `
            <div class="quick-card" onclick="document.getElementById('fromAmount').value=${amt};convert();">
                <span class="quick-amount">${formatNumber(amt)} ${fromCode}</span>
                <span class="quick-result">${formatNumber(result)} ${toCode}</span>
            </div>
        `;
    }).join('');
}

// ====== 常用换算 ======
function renderCommonConverts() {
    const grid = document.getElementById('commonGrid');
    if (!grid) return;

    const fromCode = document.getElementById('fromCurrency').value;
    const toCode = document.getElementById('toCurrency').value;

    if (!rates[fromCode] || !rates[toCode]) return;

    const rate = rates[toCode] / rates[fromCode];

    grid.innerHTML = COMMON_CONVERTS.map(item => {
        const result = item.amount * rate;
        return `
            <div class="common-card" onclick="document.getElementById('fromAmount').value=${item.amount};convert();window.scrollTo({top:0,behavior:'smooth'});">
                <span class="common-label">${item.label}</span>
                <span class="common-value">${formatNumber(result)} ${toCode}</span>
            </div>
        `;
    }).join('');
}

// ====== 汇率表格 ======
function renderRatesTable(filter = 'all') {
    const tbody = document.getElementById('ratesTableBody');
    if (!tbody) return;

    const displayCurrencies = CURRENCIES.filter(c => {
        if (c.code === 'CNY') return false;
        if (filter !== 'all' && c.category !== filter) return false;
        return rates[c.code] !== undefined;
    });

    if (displayCurrencies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">暂无数据</td></tr>';
        return;
    }

    // 按货币重要度排序（世界主要货币在前）
    const SORT_PRIORITY = [
        'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD',
        'KRW', 'HKD', 'SGD',
        'THB', 'MYR', 'RUB', 'BRL',
        'TWD', 'MOP', 'IDR', 'PHP', 'VND'
    ];
    displayCurrencies.sort((a, b) => {
        const ai = SORT_PRIORITY.indexOf(a.code);
        const bi = SORT_PRIORITY.indexOf(b.code);
        // 已定义优先级的按优先级排，未定义的放最后按汇率排
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return (rates[b.code] || 0) - (rates[a.code] || 0);
    });

    tbody.innerHTML = displayCurrencies.map(c => {
        const cnyRate = rates[c.code] || 0;    // 1 CNY = X 外币
        const inverseRate = 1 / cnyRate;         // 1 外币 = X CNY

        return `
            <tr onclick="selectCurrency('${c.code}')" title="点击选择此货币">
                <td>
                    <div class="currency-cell">
                        <span class="flag">${c.flag}</span>
                        <span>${c.name}</span>
                    </div>
                </td>
                <td class="code-cell">${c.code}</td>
                <td class="rate-cell">${formatRate(cnyRate)}</td>
                <td class="inverse-cell">${formatNumber(inverseRate, 4)}</td>
                <td>
                    <span class="category-tag ${CATEGORY_TAG_CLASS[c.category]}">
                        ${CATEGORY_LABELS[c.category]}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function selectCurrency(code) {
    const fromCode = document.getElementById('fromCurrency').value;
    if (code === fromCode) {
        // 如果点击的是当前源货币，切换
        document.getElementById('toCurrency').value = code;
    } else {
        document.getElementById('toCurrency').value = code;
    }
    handleCurrencyChange();
    convert();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterRates(filter, btnEl) {
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    renderRatesTable(filter);
}

// ====== 历史汇率走势图 ======
async function loadHistoricalRates() {
    const fromCode = document.getElementById('chartFromCurrency').value;
    const toCode = document.getElementById('chartToCurrency').value;

    if (fromCode === toCode) return;

    // 计算30天前的日期
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = d => d.toISOString().split('T')[0];

    try {
        const resp = await fetch(
            `https://api.frankfurter.dev/v1/${formatDate(startDate)}..${formatDate(endDate)}?from=${fromCode}&to=${toCode}`
        );

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (data.rates) {
            renderChart(data.rates, fromCode, toCode);
        }
    } catch (e) {
        console.warn('历史汇率获取失败:', e.message);
        // 尝试使用模拟数据展示图表结构
        renderMockChart(fromCode, toCode);
    }
}

function renderChart(ratesData, fromCode, toCode) {
    const labels = Object.keys(ratesData).sort();
    const values = labels.map(d => ratesData[d][toCode]);

    const ctx = document.getElementById('rateChart');
    if (!ctx) return;

    if (rateChart) rateChart.destroy();

    rateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(d => {
                const parts = d.split('-');
                return `${parts[1]}/${parts[2]}`;
            }),
            datasets: [{
                label: `${fromCode}/${toCode}`,
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `1 ${fromCode} = ${formatRate(ctx.parsed.y)} ${toCode}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 10, font: { size: 11 } }
                },
                y: {
                    grid: { color: '#f0f0f0' },
                    ticks: {
                        font: { size: 11 },
                        callback: v => formatRate(v)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function renderMockChart(fromCode, toCode) {
    const ctx = document.getElementById('rateChart');
    if (!ctx) return;

    if (rateChart) rateChart.destroy();

    const labels = [];
    const values = [];
    for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        // 使用当前汇率 + 随机微扰模拟走势
        if (rates[fromCode] && rates[toCode]) {
            const base = rates[toCode] / rates[fromCode];
            values.push(base * (1 + (Math.random() - 0.5) * 0.008));
        }
    }

    if (values.length === 0) return;

    rateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${fromCode}/${toCode} (模拟)`,
                data: values,
                borderColor: '#aaa',
                backgroundColor: 'rgba(170, 170, 170, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => `模拟值: ${formatRate(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } },
                y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, callback: v => formatRate(v) } }
            }
        }
    });
}

// ====== 格式化工具 ======
function formatNumber(num, decimals = 2) {
    if (isNaN(num) || num === null) return '0';
    // 大数字不需要小数位，小数字需要更多精度
    if (Math.abs(num) >= 1) {
        return num.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else {
        return num.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
}

function formatRate(rate) {
    if (rate >= 100) return rate.toFixed(2);
    if (rate >= 1) return rate.toFixed(4);
    if (rate >= 0.01) return rate.toFixed(6);
    return rate.toFixed(8);
}

// 复制链接分享
function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(function() {
        var toast = document.createElement('div');
        toast.className = 'share-toast';
        toast.textContent = '链接已复制，快去分享吧';
        document.body.appendChild(toast);
        requestAnimationFrame(function() {
            toast.classList.add('show');
        });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    });
}
