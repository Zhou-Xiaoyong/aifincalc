// 投资收益计算器核心逻辑
// 产品收益率、退休假设收益率等常量均来自 shared/constants.js，请勿在此处硬编码

// ─── 图表实例管理 ───────────────────────────────────
let compoundChartInstance = null;
let sipChartInstance = null;
let compareChartInstance = null;

// ─── Tab 切换 ────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// ─── 定投选择产品类型时同步利率 ─────────────────────
function setProductRate() {
    const val = document.getElementById('productType').value;
    if (val) {
        document.getElementById('sipRate').value = val;
    }
}

// ─── 格式化金额 ──────────────────────────────────────
function formatMoney(amount) {
    if (amount >= 100000000) {
        return '¥' + (amount / 100000000).toFixed(2) + '亿';
    } else if (amount >= 10000) {
        return '¥' + (amount / 10000).toFixed(2) + '万';
    }
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatMoneyFull(amount) {
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── 销毁旧图表 ──────────────────────────────────────
function destroyChart(instance) {
    if (instance) {
        instance.destroy();
    }
    return null;
}

// ════════════════════════════════════════════════════
//  1. 复利计算
// ════════════════════════════════════════════════════
function calculateCompound() {
    const principal = parseFloat(document.getElementById('principal').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    const years = parseInt(document.getElementById('years').value) || 0;
    const freq = parseInt(document.getElementById('frequency').value) || 12;
    const monthlyAdd = parseFloat(document.getElementById('monthlyAdd').value) || 0;

    if (principal <= 0 && monthlyAdd <= 0) {
        alert('请输入初始投资金额或每月追加金额');
        return;
    }
    if (rate <= 0) {
        alert('请输入有效的年化收益率');
        return;
    }
    if (years <= 0) {
        alert('请输入有效的投资年限');
        return;
    }

    const r = rate / 100;
    const periodRate = r / freq;        // 每期利率
    const totalPeriods = years * freq;  // 总期数
    const monthlyPeriods = freq / 12;   // 每月对应期数

    // 计算按年度的数据
    const yearlyData = [];
    let balance = principal;
    let totalInvested = principal;

    for (let y = 1; y <= years; y++) {
        const periods = y * freq;
        // 本金复利部分
        const principalGrown = principal * Math.pow(1 + periodRate, periods);

        // 每月追加的复利终值（等比数列求和）
        let addGrown = 0;
        if (monthlyAdd > 0) {
            // 每月追加，按 freq 调整：月供折算到每期
            const periodicAdd = monthlyAdd * 12 / freq;
            if (periodRate === 0) {
                addGrown = periodicAdd * periods;
            } else {
                addGrown = periodicAdd * (Math.pow(1 + periodRate, periods) - 1) / periodRate;
            }
        }

        const total = principalGrown + addGrown;
        totalInvested = principal + monthlyAdd * 12 * y;

        yearlyData.push({
            year: y,
            total: total,
            invested: totalInvested,
            interest: total - totalInvested
        });
    }

    const finalData = yearlyData[yearlyData.length - 1];

    // ── 展示结果卡片
    const grid = document.getElementById('compoundResultGrid');
    grid.innerHTML = `
        <div class="result-item highlight">
            <span class="label">最终总资产</span>
            <span class="value">${formatMoney(finalData.total)}</span>
        </div>
        <div class="result-item">
            <span class="label">累计投入本金</span>
            <span class="value">${formatMoney(finalData.invested)}</span>
        </div>
        <div class="result-item">
            <span class="label">复利收益</span>
            <span class="value profit">${formatMoney(finalData.interest)}</span>
        </div>
        <div class="result-item">
            <span class="label">收益倍数</span>
            <span class="value important">${(finalData.total / finalData.invested).toFixed(2)}x</span>
        </div>
    `;

    // ── 绘制图表
    const ctx = document.getElementById('compoundChart').getContext('2d');
    compoundChartInstance = destroyChart(compoundChartInstance);

    const labels = yearlyData.map(d => d.year + '年');
    compoundChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: '投入本金',
                    data: yearlyData.map(d => Math.round(d.invested)),
                    backgroundColor: 'rgba(108, 117, 125, 0.6)',
                    borderColor: '#6c757d',
                    borderWidth: 1
                },
                {
                    label: '复利收益',
                    data: yearlyData.map(d => Math.round(d.interest)),
                    backgroundColor: 'rgba(17, 153, 142, 0.7)',
                    borderColor: '#11998e',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw)
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: {
                        callback: val => formatMoney(val)
                    }
                }
            }
        }
    });

    // ── 年度增长明细表
    const tableEl = document.getElementById('growthTable');
    let tableHtml = `
        <h4>📋 年度增长明细</h4>
        <table>
            <thead>
                <tr>
                    <th>年份</th>
                    <th>累计投入</th>
                    <th>复利收益</th>
                    <th>总资产</th>
                    <th>年化实际收益率</th>
                </tr>
            </thead>
            <tbody>
    `;
    yearlyData.forEach(d => {
        const actualRate = ((d.total / d.invested - 1) / d.year * 100).toFixed(1);
        tableHtml += `
            <tr>
                <td>第${d.year}年</td>
                <td>${formatMoney(d.invested)}</td>
                <td style="color:#11998e">${formatMoney(d.interest)}</td>
                <td><strong>${formatMoney(d.total)}</strong></td>
                <td>${actualRate}%</td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table>';
    tableEl.innerHTML = tableHtml;

    document.getElementById('compoundResult').style.display = 'block';
    document.getElementById('compoundResult').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════════════════════════
//  2. 定投计算
// ════════════════════════════════════════════════════
function calculateSIP() {
    const sipAmount = parseFloat(document.getElementById('sipAmount').value) || 0;
    const sipYears = parseInt(document.getElementById('sipYears').value) || 0;
    const sipRate = parseFloat(document.getElementById('sipRate').value) || 0;

    if (sipAmount <= 0) {
        alert('请输入有效的每月定投金额');
        return;
    }
    if (sipYears <= 0) {
        alert('请输入有效的定投年限');
        return;
    }
    if (sipRate <= 0) {
        alert('请输入有效的年化收益率');
        return;
    }

    const months = sipYears * 12;
    const monthlyRate = sipRate / 100 / 12;

    // 月定投终值：FV = PMT × [(1+r)^n - 1] / r
    let totalValue;
    if (monthlyRate === 0) {
        totalValue = sipAmount * months;
    } else {
        totalValue = sipAmount * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
    }

    const totalInvested = sipAmount * months;
    const totalProfit = totalValue - totalInvested;

    // 年度数据
    const yearlyData = [];
    for (let y = 1; y <= sipYears; y++) {
        const m = y * 12;
        let val;
        if (monthlyRate === 0) {
            val = sipAmount * m;
        } else {
            val = sipAmount * (Math.pow(1 + monthlyRate, m) - 1) / monthlyRate * (1 + monthlyRate);
        }
        yearlyData.push({
            year: y,
            total: val,
            invested: sipAmount * m,
            profit: val - sipAmount * m
        });
    }

    // ── 结果卡片
    document.getElementById('sipResultGrid').innerHTML = `
        <div class="result-item highlight">
            <span class="label">到期总资产</span>
            <span class="value">${formatMoney(totalValue)}</span>
        </div>
        <div class="result-item">
            <span class="label">累计投入</span>
            <span class="value">${formatMoney(totalInvested)}</span>
        </div>
        <div class="result-item">
            <span class="label">投资收益</span>
            <span class="value profit">${formatMoney(totalProfit)}</span>
        </div>
        <div class="result-item">
            <span class="label">收益率</span>
            <span class="value important">${(totalProfit / totalInvested * 100).toFixed(1)}%</span>
        </div>
    `;

    // ── 图表
    const ctx = document.getElementById('sipChart').getContext('2d');
    sipChartInstance = destroyChart(sipChartInstance);

    sipChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: yearlyData.map(d => d.year + '年'),
            datasets: [
                {
                    label: '总资产',
                    data: yearlyData.map(d => Math.round(d.total)),
                    borderColor: '#11998e',
                    backgroundColor: 'rgba(17, 153, 142, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4
                },
                {
                    label: '累计投入',
                    data: yearlyData.map(d => Math.round(d.invested)),
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: val => formatMoney(val)
                    }
                }
            }
        }
    });

    // ── 洞察分析
    const doubleYear = yearlyData.find(d => d.total >= totalInvested * 2);
    const insight = document.getElementById('sipInsight');
    insight.innerHTML = `
        <h4>📊 定投洞察分析</h4>
        <ul style="list-style:none;padding:0;">
            <li style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                💡 每月坚持定投 <strong>${formatMoney(sipAmount)}</strong>，
                ${sipYears}年后总资产达 <strong style="color:#11998e">${formatMoney(totalValue)}</strong>
            </li>
            <li style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                📈 复利让您的收益超过本金 <strong style="color:#11998e">${(totalProfit / totalInvested * 100).toFixed(1)}%</strong>，
                绝对收益 <strong style="color:#11998e">${formatMoney(totalProfit)}</strong>
            </li>
            ${doubleYear ? `<li style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                🚀 预计在第 <strong>${doubleYear.year}年</strong> 时，总资产将超过投入本金的 2 倍
            </li>` : ''}
            <li style="padding:8px 0;">
                ⏰ 坚持定投的关键是"时间"，越早开始越好。若提前5年开始，收益可能翻倍甚至更多！
            </li>
        </ul>
    `;

    document.getElementById('sipResult').style.display = 'block';
    document.getElementById('sipResult').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════════════════════════
//  3. 退休规划
// ════════════════════════════════════════════════════
function calculateRetirement() {
    const currentAge = parseInt(document.getElementById('currentAge').value) || 0;
    const retireAge = parseInt(document.getElementById('retireAge').value) || 0;
    const currentSavings = parseFloat(document.getElementById('currentSavings').value) || 0;
    const monthlyInvest = parseFloat(document.getElementById('monthlyInvest').value) || 0;
    const retireRate = parseFloat(document.getElementById('retireRate').value) || 0;
    const monthlyNeed = parseFloat(document.getElementById('monthlyNeed').value) || 0;

    if (currentAge <= 0 || retireAge <= currentAge) {
        alert('请输入有效的年龄信息，退休年龄须大于当前年龄');
        return;
    }

    const yearsToRetire = retireAge - currentAge;
    const monthlyRate = retireRate / 100 / 12;
    const months = yearsToRetire * 12;

    // 当前储蓄到退休时的终值
    let savingsGrown;
    if (monthlyRate === 0) {
        savingsGrown = currentSavings;
    } else {
        savingsGrown = currentSavings * Math.pow(1 + monthlyRate, months);
    }

    // 每月投资到退休时的终值
    let investGrown = 0;
    if (monthlyInvest > 0) {
        if (monthlyRate === 0) {
            investGrown = monthlyInvest * months;
        } else {
            investGrown = monthlyInvest * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
        }
    }

    const totalAtRetire = savingsGrown + investGrown;
    const totalInvested = currentSavings + monthlyInvest * months;

    // 退休后能支撑多少年（假设退休后仍有 3% 收益率）
    let sustainYears = 0;
    if (monthlyNeed > 0) {
        if (totalAtRetire <= 0) {
            sustainYears = 0;
        } else {
            const withdrawRate = RETIREMENT_POST_RATE / 100 / 12; // 退休后保守型收益率（来自 constants.js）
            // 每月提取 monthlyNeed，求能持续多久
            // n = -ln(1 - PV*r/PMT) / ln(1+r)
            const pv = totalAtRetire;
            const pmt = monthlyNeed;
            const r = withdrawRate;
            if (pmt <= pv * r) {
                // 永续：利息已够支付月支出
                sustainYears = 999;
            } else {
                const n = -Math.log(1 - pv * r / pmt) / Math.log(1 + r);
                sustainYears = Math.floor(n / 12);
            }
        }
    }

    // ── 结果卡片
    const statusColor = totalAtRetire >= monthlyNeed * 12 * 20 ? '#28a745' : '#fd7e14';
    document.getElementById('retireResultGrid').innerHTML = `
        <div class="result-item highlight">
            <span class="label">退休时总资产</span>
            <span class="value">${formatMoney(totalAtRetire)}</span>
        </div>
        <div class="result-item">
            <span class="label">累计投入</span>
            <span class="value">${formatMoney(totalInvested)}</span>
        </div>
        <div class="result-item">
            <span class="label">投资收益</span>
            <span class="value profit">${formatMoney(totalAtRetire - totalInvested)}</span>
        </div>
        <div class="result-item">
            <span class="label">距退休年限</span>
            <span class="value">${yearsToRetire}年</span>
        </div>
        ${monthlyNeed > 0 ? `
        <div class="result-item">
            <span class="label">退休月支出</span>
            <span class="value">${formatMoney(monthlyNeed)}</span>
        </div>
        <div class="result-item">
            <span class="label">资金可支撑</span>
            <span class="value" style="color:${statusColor}">
                ${sustainYears >= 999 ? '永续（利息覆盖支出）' : sustainYears + '年'}
            </span>
        </div>
        ` : ''}
    `;

    // ── 时间轴
    const timeline = document.getElementById('retireTimeline');
    const milestones = [];
    for (let y = 5; y <= yearsToRetire; y += 5) {
        const m = y * 12;
        let sg = monthlyRate === 0 ? currentSavings : currentSavings * Math.pow(1 + monthlyRate, m);
        let ig = monthlyInvest > 0
            ? (monthlyRate === 0 ? monthlyInvest * m : monthlyInvest * (Math.pow(1 + monthlyRate, m) - 1) / monthlyRate * (1 + monthlyRate))
            : 0;
        milestones.push({ year: y, age: currentAge + y, total: sg + ig });
    }

    timeline.innerHTML = `
        <h4>📅 财富增长里程碑</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:12px;">
            ${milestones.map(m => `
                <div style="background:#f8f9fa;border-radius:10px;padding:14px;text-align:center;border-left:4px solid #11998e;">
                    <div style="color:#6c757d;font-size:13px;">${m.age}岁（${m.year}年后）</div>
                    <div style="font-size:1.2rem;font-weight:700;color:#11998e;margin-top:6px;">${formatMoney(m.total)}</div>
                </div>
            `).join('')}
        </div>
    `;

    // ── 建议
    const suggestions = [];
    if (monthlyNeed > 0) {
        if (sustainYears >= 999) {
            suggestions.push('🎉 您的退休规划非常充裕！退休资产的利息收益已能覆盖每月支出，可以实现"躺赢"退休生活。');
        } else if (sustainYears >= 30) {
            suggestions.push(`✅ 您的退休资金可支撑约 ${sustainYears} 年，规划较为稳健。建议保留一定弹性空间应对通货膨胀。`);
        } else if (sustainYears >= 20) {
            suggestions.push(`⚡ 退休资金可支撑约 ${sustainYears} 年，建议适当增加每月投资额或降低退休后月支出目标。`);
        } else {
            suggestions.push(`⚠️ 退休资金仅能支撑约 ${sustainYears} 年，存在缺口风险。建议增加投资额、推迟退休或降低月支出预算。`);
        }
    }

    if (monthlyInvest < 3000 && yearsToRetire > 10) {
        suggestions.push('💡 建议将月收入的 15-20% 用于退休储蓄，越早开始、复利效果越显著。');
    }
    if (retireRate < 5) {
        suggestions.push('📈 可以考虑适当提高投资风险偏好（如增配混合基金），长期来看有望获得更高收益。');
    }
    suggestions.push('🏦 别忘了社保养老金！它将作为退休收入的重要组成部分，可减轻个人积累的压力。');

    const suggestEl = document.getElementById('retireSuggestions');
    suggestEl.innerHTML = `
        <h4>💡 退休规划建议</h4>
        <ul style="list-style:none;padding:0;">
            ${suggestions.map(s => `<li style="padding:8px 0 8px 24px;position:relative;border-bottom:1px solid rgba(33,150,243,0.2);">${s}</li>`).join('')}
        </ul>
    `;
    suggestEl.style.display = 'block';

    document.getElementById('retireResult').style.display = 'block';
    document.getElementById('retireResult').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════════════════════════
//  4. 产品对比
// ════════════════════════════════════════════════════
// 产品列表来自 constants.js 中的 INVESTMENT_PRODUCTS，修改利率只需改常量文件
const products = INVESTMENT_PRODUCTS;

function compareProducts() {
    const amount = parseFloat(document.getElementById('compareAmount').value) || 0;
    const years = parseInt(document.getElementById('compareYears').value) || 0;

    if (amount <= 0) {
        alert('请输入有效的投资金额');
        return;
    }
    if (years <= 0) {
        alert('请输入有效的投资年限');
        return;
    }

    // 计算各产品终值
    const results = products.map(p => {
        const r = p.rate / 100;
        const fv = amount * Math.pow(1 + r, years);
        return { ...p, fv, profit: fv - amount, profitRate: (fv / amount - 1) * 100 };
    });

    // ── 对比表格
    const tableEl = document.getElementById('compareTable');
    tableEl.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>产品类型</th>
                    <th>预期年化</th>
                    <th>风险等级</th>
                    <th>${years}年后总资产</th>
                    <th>收益</th>
                    <th>总收益率</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr>
                        <td><strong>${r.name}</strong></td>
                        <td>${r.rate}%</td>
                        <td><span style="color:${r.color};font-weight:600;">${r.risk}</span></td>
                        <td><strong>${formatMoney(r.fv)}</strong></td>
                        <td style="color:#28a745">${formatMoney(r.profit)}</td>
                        <td style="color:#11998e">${r.profitRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // ── 图表
    const ctx = document.getElementById('compareChart').getContext('2d');
    compareChartInstance = destroyChart(compareChartInstance);

    compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.map(r => r.name),
            datasets: [
                {
                    label: '投入本金',
                    data: results.map(() => Math.round(amount)),
                    backgroundColor: 'rgba(108, 117, 125, 0.5)',
                    borderColor: '#6c757d',
                    borderWidth: 1
                },
                {
                    label: '投资收益',
                    data: results.map(r => Math.round(r.profit)),
                    backgroundColor: results.map(r => r.color + 'BB'),
                    borderColor: results.map(r => r.color),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw)
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: { callback: val => formatMoney(val) }
                }
            }
        }
    });

    document.getElementById('compareResult').style.display = 'block';
    document.getElementById('compareResult').scrollIntoView({ behavior: 'smooth' });
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
