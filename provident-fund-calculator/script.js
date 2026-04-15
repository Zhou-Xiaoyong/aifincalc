// 公积金贷款计算器核心逻辑
// 所有利率、额度等常量均来自 shared/constants.js，请勿在此处硬编码

// ═══════════════════════════════════════════
//  全局变量
// ═══════════════════════════════════════════
let compareChartInstance = null; // 公积金vs商贷对比图表

// ═══════════════════════════════════════════
//  一、Tab 切换
// ═══════════════════════════════════════════
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// ═══════════════════════════════════════════
//  二、页面初始化
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    initQuotaCity();
    initLoanRate();
    initDeductionRate();
    initCompareRate();
    initProvRateTable();
});

/**
 * 初始化城市下拉列表（Tab1 额度评估）
 */
function initQuotaCity() {
    const sel = document.getElementById('quotaCity');
    if (!sel) return;
    sel.innerHTML = '<option value="">请选择城市</option>';
    Object.entries(PROVIDENT_FUND_LIMITS).forEach(([key, city]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = city.name;
        sel.appendChild(opt);
    });
}

/**
 * 初始化贷款方案利率（Tab2）
 */
function initLoanRate() {
    const rateInput = document.getElementById('loanRate');
    if (rateInput) rateInput.value = PROVIDENT_FUND_RATE.above5y;

    // 套数切换时自动更新利率
    document.querySelectorAll('input[name="loanHouseType"]').forEach(radio => {
        radio.addEventListener('change', updateLoanRate);
    });
    updateLoanRate();
}

function updateLoanRate() {
    const houseType = document.querySelector('input[name="loanHouseType"]:checked')?.value || 'first';
    const years = parseInt(document.getElementById('loanYears')?.value) || 30;
    const rateInput = document.getElementById('loanRate');
    const badge = document.getElementById('loanRateBadge');
    const hint = document.getElementById('loanRateHint');

    let rate, label, hintText;
    if (houseType === 'first') {
        rate = years <= 5 ? PROVIDENT_FUND_RATE.below5y : PROVIDENT_FUND_RATE.above5y;
        label = '首套';
        hintText = years <= 5 ? '5年以下首套房利率 ' + PROVIDENT_FUND_RATE.below5y + '%' : '5年以上首套房利率 ' + PROVIDENT_FUND_RATE.above5y + '%';
    } else {
        rate = years <= 5 ? PROVIDENT_FUND_RATE.secondBelow5y : PROVIDENT_FUND_RATE.secondAbove5y;
        label = '二套';
        hintText = years <= 5 ? '5年以下二套房利率(最低) ' + PROVIDENT_FUND_RATE.secondBelow5y + '%' : '5年以上二套房利率(最低) ' + PROVIDENT_FUND_RATE.secondAbove5y + '%';
    }

    if (rateInput) rateInput.value = rate;
    if (badge) badge.textContent = label;
    if (hint) hint.textContent = hintText;
}

// 监听年限变化更新利率提示
const loanYearsInput = document.getElementById('loanYears');
if (loanYearsInput) loanYearsInput.addEventListener('input', updateLoanRate);

/**
 * 初始化冲还贷利率（Tab3）
 */
function initDeductionRate() {
    const rateInput = document.getElementById('dedRate');
    if (rateInput) rateInput.value = PROVIDENT_FUND_RATE.above5y;
}

/**
 * 初始化对比页商贷利率（Tab4）
 */
function initCompareRate() {
    const rateInput = document.getElementById('compCommRate');
    if (rateInput) rateInput.value = (LPR.lpr5y - 0.2).toFixed(2);
}

/**
 * 初始化底部利率参考表
 */
function initProvRateTable() {
    const tbody = document.getElementById('provRateTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td>首套住房公积金贷款</td>
            <td>${PROVIDENT_FUND_RATE.below5y}%</td>
            <td>${PROVIDENT_FUND_RATE.above5y}%</td>
        </tr>
        <tr>
            <td>二套住房公积金贷款</td>
            <td>≥${PROVIDENT_FUND_RATE.secondBelow5y}%</td>
            <td>≥${PROVIDENT_FUND_RATE.secondAbove5y}%</td>
        </tr>
    `;
    const dateEl = document.getElementById('provRateUpdateDate');
    if (dateEl) dateEl.textContent = PROVIDENT_FUND_RATE.updateDate;
}

// ═══════════════════════════════════════════
//  三、工具函数
// ═══════════════════════════════════════════

/** 等额本息月供计算 */
function calcEqualPayment(principal, monthlyRate, months) {
    if (monthlyRate === 0) return principal / months;
    const pow = Math.pow(1 + monthlyRate, months);
    return principal * monthlyRate * pow / (pow - 1);
}

/** 等额本金第 n 期月供 */
function calcPrincipalPayment(principal, monthlyRate, months, monthN) {
    return principal / months + principal * (months - monthN + 1) / months * monthlyRate;
}

/** 格式化金额（万元） */
function fmtWan(yuan) {
    if (yuan >= 10000) return (yuan / 10000).toFixed(2) + ' 万';
    return yuan.toFixed(0) + ' 元';
}

/** 格式化金额（元，带千分位） */
function fmtYuan(yuan) {
    return yuan.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' 元';
}

/** 按整数倍取整（5000元为单位） */
function roundTo5000(val) {
    return Math.floor(val / 5000) * 5000;
}

// ═══════════════════════════════════════════
//  Tab 1：贷款额度评估
// ═══════════════════════════════════════════
function calculateQuota() {
    // 获取输入
    const cityKey = document.getElementById('quotaCity').value;
    const workerType = document.querySelector('input[name="quotaWorkerType"]:checked').value;
    const houseType = document.querySelector('input[name="quotaHouseType"]:checked').value;
    const monthlyContrib = parseFloat(document.getElementById('quotaMonthlyContribution').value) || 0;
    const contributionMonths = parseInt(document.getElementById('quotaContributionMonths').value) || 0;
    const balance = parseFloat(document.getElementById('quotaBalance').value) || 0;
    const income = parseFloat(document.getElementById('quotaIncome').value) || 0;
    const otherDebt = parseFloat(document.getElementById('quotaOtherDebt').value) || 0;
    const years = parseInt(document.getElementById('quotaYears').value) || 30;

    // 验证
    if (!cityKey) { alert('请选择所在城市'); return; }
    if (monthlyContrib <= 0) { alert('请输入公积金月缴存额'); return; }
    if (contributionMonths < 6) { alert('公积金缴存月数不足6个月，一般无法申请贷款'); return; }
    if (balance <= 0) { alert('请输入公积金账户余额'); return; }
    if (income <= 0) { alert('请输入家庭月收入'); return; }

    const city = PROVIDENT_FUND_LIMITS[cityKey];
    const months = years * 12;

    // ① 账户余额法
    const balanceMethod = roundTo5000(balance * city.balanceX);

    // ② 月缴存额法（月缴存额 × 缴存月数 × 一定倍数，简化为 月缴存额 × months × 1.5 / 10000 向下取整）
    const contribMethod = roundTo5000(monthlyContrib * contributionMonths * 1.5);

    // ③ 还款能力法: (收入 - 负债) × 50% × 贷款月数
    const abilityMethod = roundTo5000((income - otherDebt) * LOAN_ABILITY_RATIO * months);

    // ④ 城市最高限额
    let cityLimit;
    if (houseType === 'second') {
        cityLimit = city.second * 10000;
    } else {
        cityLimit = (workerType === 'family' ? city.family : city.single) * 10000;
    }

    // 最终额度取四种最小值
    const finalQuota = Math.min(balanceMethod, contribMethod, abilityMethod, cityLimit);

    // 判断哪一个是瓶颈
    const methods = [
        { name: '账户余额法', value: balanceMethod, formula: `余额 ${balance.toLocaleString()}元 × ${city.balanceX}倍`, isLimited: balanceMethod === finalQuota },
        { name: '月缴存额法', value: contribMethod, formula: `月缴 ${monthlyContrib}元 × ${contributionMonths}个月 × 1.5`, isLimited: contribMethod === finalQuota },
        { name: '还款能力法', value: abilityMethod, formula: `(${income.toLocaleString()} - ${otherDebt.toLocaleString()}) × 50% × ${months}月`, isLimited: abilityMethod === finalQuota },
        { name: '城市最高限额', value: cityLimit, formula: `${city.name}${houseType === 'second' ? '二套' : (workerType === 'family' ? '家庭' : '个人')}上限`, isLimited: cityLimit === finalQuota }
    ];

    // 渲染结果
    document.getElementById('quotaResult').style.display = 'block';
    document.getElementById('quotaResultGrid').innerHTML = `
        <div class="result-item highlight">
            <span class="label">预估可贷额度</span>
            <span class="value">${fmtWan(finalQuota)}</span>
        </div>
        <div class="result-item">
            <span class="label">所在城市</span>
            <span class="value">${city.name}</span>
        </div>
        <div class="result-item">
            <span class="label">${houseType === 'second' ? '二套房' : '首套房'}</span>
            <span class="value">${years <= 5 ? PROVIDENT_FUND_RATE.below5y : (houseType === 'first' ? PROVIDENT_FUND_RATE.above5y : PROVIDENT_FUND_RATE.secondAbove5y)}%</span>
        </div>
        <div class="result-item">
            <span class="label">余额倍数</span>
            <span class="value">${city.balanceX}倍</span>
        </div>
    `;

    // 渲染四种方式明细
    document.getElementById('quotaMethodGrid').innerHTML = methods.map(m => `
        <div class="quota-method-card ${m.isLimited ? 'limited' : ''}">
            <span class="method-tag">${m.isLimited ? '⬅ 限额瓶颈' : '通过'}</span>
            <span class="method-value">${fmtWan(m.value)}</span>
            <span class="method-formula">${m.name}<br>${m.formula}</span>
        </div>
    `).join('');

    // AI建议
    generateQuotaSuggestions(finalQuota, methods, city, workerType, houseType, monthlyContrib, contributionMonths, balance, income, otherDebt);

    document.getElementById('quotaResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 额度评估AI建议
 */
function generateQuotaSuggestions(quota, methods, city, workerType, houseType, monthlyContrib, months, balance, income, otherDebt) {
    const suggestions = [];
    const limitedMethod = methods.find(m => m.isLimited);
    const quotaWan = quota / 10000;

    if (quotaWan >= 100) {
        suggestions.push(`额度较充裕（${quotaWan.toFixed(0)}万），可以覆盖大部分刚需购房需求。建议选择等额本息还款以降低月供压力。`);
    } else if (quotaWan >= 50) {
        suggestions.push(`额度中等（${quotaWan.toFixed(0)}万），在一二线城市可能需要组合贷款补充商贷部分。`);
    } else {
        suggestions.push(`额度偏低（${quotaWan.toFixed(0)}万），建议考虑以下优化措施或使用组合贷款。`);
    }

    if (limitedMethod && limitedMethod.name === '账户余额法') {
        suggestions.push(`当前额度受<strong>账户余额</strong>限制。建议继续缴存积累余额（余额${(balance/10000).toFixed(1)}万 × ${city.balanceX}倍 = ${(balance*city.balanceX/10000).toFixed(0)}万），每增加1万余额可多贷约${city.balanceX}万元。`);
    }
    if (limitedMethod && limitedMethod.name === '还款能力法') {
        suggestions.push(`当前额度受<strong>还款能力</strong>限制。月供上限为 ${(income - otherDebt) * LOAN_ABILITY_RATIO * 10000 / 10000} 元/月。可通过增加共同申请人（双职工）、提高收入证明或减少其他负债来提高额度。`);
    }
    if (limitedMethod && limitedMethod.name === '城市最高限额') {
        suggestions.push(`当前额度已达到${city.name}${houseType === 'second' ? '二套房' : '首套'}最高限额，无法继续提高。如有更大资金需求，建议使用组合贷款。`);
    }
    if (limitedMethod && limitedMethod.name === '月缴存额法') {
        suggestions.push(`当前额度受<strong>月缴存额</strong>限制。建议与单位协商提高公积金缴存基数，月缴存额越高、缴存时间越长，额度越高。`);
    }

    if (workerType === 'single') {
        const familyQuota = (houseType === 'second' ? city.second : city.family) * 10000;
        if (familyQuota > quota) {
            suggestions.push(`若配偶也有公积金，可申请双职工贷款，${city.name}${houseType === 'second' ? '二套' : '家庭'}最高额度为${familyQuota/10000}万元，可增加${(familyQuota - quota)/10000}万元。`);
        }
    }

    // 月供预估
    const rate = years <= 5 ? PROVIDENT_FUND_RATE.below5y : (houseType === 'first' ? PROVIDENT_FUND_RATE.above5y : PROVIDENT_FUND_RATE.secondAbove5y);
    const monthlyRate = rate / 100 / 12;
    const loanYears = parseInt(document.getElementById('quotaYears').value) || 30;
    const estMonthly = calcEqualPayment(quota, monthlyRate, loanYears * 12);
    const debtRatio = estMonthly / income * 100;
    suggestions.push(`按贷款${quotaWan.toFixed(0)}万、${loanYears}年、利率${rate}%估算，等额本息月供约 ${estMonthly.toFixed(0)} 元，占月收入 ${debtRatio.toFixed(1)}%。${debtRatio > 50 ? '<strong style="color:#dc3545">超过50%警戒线，建议延长贷款年限或减少贷款金额。</strong>' : '在合理范围内。'}`);

    const container = document.getElementById('quotaSuggestions');
    container.style.display = 'block';
    document.getElementById('quotaSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
}

// ═══════════════════════════════════════════
//  Tab 2：贷款方案计算
// ═══════════════════════════════════════════
let loanScheduleData = { yearly: null, monthly: null };

function calculateLoan() {
    const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const years = parseInt(document.getElementById('loanYears').value) || 30;
    const rate = parseFloat(document.getElementById('loanRate').value) || PROVIDENT_FUND_RATE.above5y;
    const repayType = document.querySelector('input[name="loanRepayType"]:checked').value;

    if (amount <= 0) { alert('请输入有效的贷款金额'); return; }

    const principal = amount * 10000;
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    let monthlyPayment, totalPayment, totalInterest;
    let schedule = [];

    if (repayType === 'equal') {
        // 等额本息
        monthlyPayment = calcEqualPayment(principal, monthlyRate, months);
        totalPayment = monthlyPayment * months;
        totalInterest = totalPayment - principal;

        let remaining = principal;
        for (let m = 1; m <= months; m++) {
            const interest = remaining * monthlyRate;
            const principalPart = monthlyPayment - interest;
            remaining -= principalPart;
            schedule.push({
                month: m,
                payment: monthlyPayment,
                principal: principalPart,
                interest: interest,
                remaining: Math.max(0, remaining)
            });
        }
    } else {
        // 等额本金
        const monthlyPrincipal = principal / months;
        const firstPayment = calcPrincipalPayment(principal, monthlyRate, months, 1);
        const lastPayment = calcPrincipalPayment(principal, monthlyRate, months, months);
        monthlyPayment = firstPayment;
        totalInterest = 0;

        let remaining = principal;
        for (let m = 1; m <= months; m++) {
            const interest = remaining * monthlyRate;
            const principalPart = monthlyPrincipal;
            const payment = principalPart + interest;
            remaining -= principalPart;
            totalInterest += interest;
            schedule.push({
                month: m,
                payment: payment,
                principal: principalPart,
                interest: interest,
                remaining: Math.max(0, remaining)
            });
        }
        totalPayment = principal + totalInterest;
    }

    // 保存数据
    loanScheduleData = { yearly: buildYearlySchedule(schedule), monthly: schedule };

    // 渲染结果
    document.getElementById('loanResult').style.display = 'block';

    const isFirstMonth = repayType === 'equal' ? '' : `<div class="result-item"><span class="label">首月月供</span><span class="value">${fmtYuan(schedule[0].payment)}</span></div>`;
    const isLastMonth = repayType === 'equal' ? '' : `<div class="result-item"><span class="label">末月月供</span><span class="value">${fmtYuan(schedule[schedule.length - 1].payment)}</span></div>`;

    document.getElementById('loanResultGrid').innerHTML = `
        <div class="result-item highlight">
            <span class="label">${repayType === 'equal' ? '每月月供' : '首月月供'}</span>
            <span class="value">${fmtYuan(schedule[0].payment)}</span>
        </div>
        ${isLastMonth}
        <div class="result-item">
            <span class="label">还款总额</span>
            <span class="value warning">${fmtYuan(totalPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">利息总额</span>
            <span class="value warning">${fmtYuan(totalInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">贷款金额</span>
            <span class="value">${amount} 万元</span>
        </div>
        <div class="result-item">
            <span class="label">利率</span>
            <span class="value">${rate}%</span>
        </div>
    `;

    // 渲染年度还款计划
    renderLoanSchedule('yearly');

    // AI建议
    generateLoanSuggestions(amount, years, rate, repayType, totalPayment, totalInterest, principal);

    document.getElementById('loanResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** 按年汇总还款计划 */
function buildYearlySchedule(monthlyData) {
    const yearly = {};
    monthlyData.forEach(row => {
        const year = Math.ceil(row.month / 12);
        if (!yearly[year]) yearly[year] = { year, payment: 0, principal: 0, interest: 0, remaining: 0 };
        yearly[year].payment += row.payment;
        yearly[year].principal += row.principal;
        yearly[year].interest += row.interest;
        yearly[year].remaining = row.remaining;
    });
    return Object.values(yearly);
}

/** 渲染还款计划表 */
function toggleLoanSchedule(type, btn) {
    document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLoanSchedule(type);
}

function renderLoanSchedule(type) {
    const data = type === 'yearly' ? loanScheduleData.yearly : loanScheduleData.monthly;
    if (!data || data.length === 0) return;

    const periodLabel = type === 'yearly' ? '年份' : '期数';
    let html = `<table><thead><tr>
        <th>${periodLabel}</th><th>月供(元)</th><th>本金(元)</th><th>利息(元)</th><th>剩余本金(元)</th>
    </tr></thead><tbody>`;

    data.forEach(row => {
        html += `<tr>
            <td>${type === 'yearly' ? '第' + row.year + '年' : row.month}</td>
            <td>${row.payment.toFixed(2)}</td>
            <td>${row.principal.toFixed(2)}</td>
            <td>${row.interest.toFixed(2)}</td>
            <td>${row.remaining.toFixed(2)}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('loanScheduleTable').innerHTML = html;
}

/**
 * 贷款方案AI建议
 */
function generateLoanSuggestions(amount, years, rate, repayType, totalPayment, totalInterest, principal) {
    const suggestions = [];
    const monthlyRate = rate / 100 / 12;
    const equalMonthly = calcEqualPayment(principal, monthlyRate, years * 12);

    // 还款方式建议
    if (repayType === 'equal') {
        const totalInterestPrincipal = (principal / (years * 12)) * monthlyRate * (years * 12 + 1) / 2;
        const saved = totalInterestPrincipal - totalInterest;
        suggestions.push(`当前选择等额本息，月供固定 ${equalMonthly.toFixed(0)} 元，便于财务规划。如切换为等额本金，总利息可节省约 ${Math.abs(saved).toFixed(0)} 元，但前期月供压力更大。`);
    } else {
        suggestions.push(`当前选择等额本金，总利息 ${totalInterest.toFixed(0)} 元。等额本息的总利息虽高一些，但月供固定便于管理。`);
    }

    // 与商贷对比
    const commRate = parseFloat(document.getElementById('compCommRate')?.value) || (LPR.lpr5y - 0.2);
    const commMonthly = calcEqualPayment(principal, commRate / 100 / 12, years * 12);
    const commTotalInterest = commMonthly * years * 12 - principal;
    const savedVsComm = commTotalInterest - totalInterest;
    suggestions.push(`与商业贷款（利率${commRate}%）对比，公积金贷款可节省利息约 <strong style="color:#28a745">${fmtWan(savedVsComm)}</strong>，每月少还 ${(commMonthly - equalMonthly).toFixed(0)} 元。`);

    // 利率走势
    suggestions.push(`当前公积金利率 ${rate}%（${PROVIDENT_FUND_RATE.updateDate}起执行），为历史低位。如考虑提前还款，建议优先在经济宽裕的前几年多还，因为前期利息占比更高。`);

    const container = document.getElementById('loanSuggestions');
    container.style.display = 'block';
    document.getElementById('loanSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
}

// ═══════════════════════════════════════════
//  Tab 3：冲还贷规划
// ═══════════════════════════════════════════
function calculateDeduction() {
    const loanBalance = parseFloat(document.getElementById('dedLoanBalance').value) || 0;
    const rate = parseFloat(document.getElementById('dedRate').value) || PROVIDENT_FUND_RATE.above5y;
    const remainingYears = parseInt(document.getElementById('dedRemainingYears').value) || 25;
    const monthlyPayment = parseFloat(document.getElementById('dedMonthlyPayment').value) || 0;
    const balance = parseFloat(document.getElementById('dedBalance').value) || 0;
    const monthlyContrib = parseFloat(document.getElementById('dedMonthlyContrib').value) || 0;

    if (loanBalance <= 0) { alert('请输入贷款余额'); return; }
    if (monthlyPayment <= 0) { alert('请输入当前月供'); return; }
    if (balance <= 0) { alert('请输入公积金账户余额'); return; }

    const principal = loanBalance * 10000;
    const monthlyRate = rate / 100 / 12;
    const remainingMonths = remainingYears * 12;

    // ─── 不冲还贷（基准） ───
    const baseTotalInterest = monthlyPayment * remainingMonths - principal;

    // ─── 月冲：每月从公积金账户提取固定金额冲抵月供 ───
    // 假设每月可提取 min(月缴存额, 月供) 用于冲抵
    const monthlyDeduction = Math.min(monthlyContrib || monthlyPayment, monthlyPayment);
    const cashOutPerMonth = monthlyPayment - monthlyDeduction;

    // 月冲持续月数：余额 + 每月缴存 覆盖多少个月
    // 简化计算：不考虑缴存利息
    let totalAvailable = balance;
    let monthCount = 0;
    while (totalAvailable >= monthlyDeduction && monthCount < remainingMonths) {
        totalAvailable -= monthlyDeduction;
        totalAvailable += monthlyContrib; // 每月继续缴存
        monthCount++;
    }
    const monthlyCoverMonths = monthCount;
    const monthlyTotalCashSaving = cashOutPerMonth * monthlyCoverMonths;

    // ─── 年冲：每年末一次性用全部余额冲抵本金 ───
    // 第一年末：余额 + 12个月缴存，一次性冲抵本金
    // 重新计算新月供和期限
    let yearDedPrincipal = principal;
    let yearDedMonths = remainingMonths;
    let yearDedTotalInterest = 0;
    let yearlyDeductionData = []; // 记录每年冲抵情况

    let currentBalance = balance;
    let yearlySavings = 0;
    for (let y = 1; y <= remainingYears && yearDedMonths > 0; y++) {
        // 本年12个月的正常还款
        let yearInterest = 0;
        for (let m = 0; m < 12 && yearDedMonths > 0; m++) {
            const interest = yearDedPrincipal * monthlyRate;
            const prinPart = Math.min(yearDedPrincipal, monthlyPayment - interest);
            yearInterest += interest;
            yearDedPrincipal -= prinPart;
            yearDedMonths--;
        }
        yearDedTotalInterest += yearInterest;

        // 年末冲抵
        const yearEndBalance = currentBalance + monthlyContrib * 12;
        if (yearEndBalance > 0 && yearDedPrincipal > 0) {
            const deduction = Math.min(yearEndBalance, yearDedPrincipal);
            yearDedPrincipal -= deduction;
            currentBalance = yearEndBalance - deduction;
            yearlyDeductionData.push({ year: y, deduction: deduction, remaining: yearDedPrincipal });
        } else {
            yearlyDeductionData.push({ year: y, deduction: 0, remaining: yearDedPrincipal });
        }

        if (yearDedPrincipal <= 0) break;
    }

    // 年冲节省的利息 = 基准利息 - 年冲利息
    const yearlySavedInterest = baseTotalInterest - yearDedTotalInterest;

    // 重新计算年冲后的新月供
    let newMonthlyPayment = 0;
    if (yearDedPrincipal > 0 && yearDedMonths > 0) {
        newMonthlyPayment = calcEqualPayment(yearDedPrincipal, monthlyRate, yearDedMonths);
    }

    // 判断推荐哪种方式
    const recommendMonthly = yearlySavedInterest > 0 ? 'yearly' : 'monthly';

    // 渲染结果
    document.getElementById('deductionResult').style.display = 'block';
    document.getElementById('deductionCompare').innerHTML = `
        <div class="deduction-card ${recommendMonthly === 'monthly' ? 'recommended' : ''}">
            ${recommendMonthly === 'monthly' ? '<div class="recommend-tag">推荐</div>' : ''}
            <h4>📅 月冲（逐月提取还贷）</h4>
            <div class="deduction-stat">
                <span class="stat-label">每月公积金冲抵</span>
                <span class="stat-value">${monthlyDeduction.toFixed(0)} 元</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">每月实际现金支出</span>
                <span class="stat-value">${cashOutPerMonth.toFixed(0)} 元</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">可覆盖月数</span>
                <span class="stat-value">${monthlyCoverMonths} 个月（${(monthlyCoverMonths / 12).toFixed(1)}年）</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">累计节省现金支出</span>
                <span class="stat-value highlight-green">${fmtYuan(monthlyTotalCashSaving)}</span>
            </div>
        </div>
        <div class="deduction-card ${recommendMonthly === 'yearly' ? 'recommended' : ''}">
            ${recommendMonthly === 'yearly' ? '<div class="recommend-tag">推荐</div>' : ''}
            <h4>🏠 年冲（一次性冲抵本金）</h4>
            <div class="deduction-stat">
                <span class="stat-label">首年可冲抵本金</span>
                <span class="stat-value">${yearlyDeductionData[0] ? fmtWan(yearlyDeductionData[0].deduction) : '0'}</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">冲抵后剩余本金</span>
                <span class="stat-value">${fmtWan(yearDedPrincipal)}</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">新月供</span>
                <span class="stat-value highlight-green">${newMonthlyPayment > 0 ? fmtYuan(newMonthlyPayment) : '已还清'}</span>
            </div>
            <div class="deduction-stat">
                <span class="stat-label">累计节省利息</span>
                <span class="stat-value highlight-green">${fmtYuan(yearlySavedInterest)}</span>
            </div>
        </div>
    `;

    // AI建议
    generateDeductionSuggestions(monthlyDeduction, cashOutPerMonth, monthlyCoverMonths, yearlySavedInterest, newMonthlyPayment, recommendMonthly, balance, monthlyContrib);

    document.getElementById('deductionResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateDeductionSuggestions(monthlyDeduction, cashOut, months, savedInterest, newMonthly, recommend, balance, monthlyContrib) {
    const suggestions = [];

    if (recommend === 'yearly') {
        suggestions.push(`推荐<strong>年冲方式</strong>，可节省利息 ${fmtYuan(savedInterest)}。年冲一次性减少本金后，后续利息大幅降低，长期节省效果更显著。`);
    } else {
        suggestions.push(`当前情况下月冲和年冲差异不大。${savedInterest > 0 ? '年冲可节省' + fmtYuan(savedInterest) + '利息，' : ''}月冲可减轻每月现金支出压力，适合日常现金流紧张的情况。`);
    }

    if (balance < 50000 && monthlyContrib < 1000) {
        suggestions.push(`公积金账户余额较低（${fmtWan(balance)}），月冲可覆盖时间有限。建议保持正常还款，同时继续缴存积累余额。`);
    }

    if (monthlyContrib > 0) {
        suggestions.push(`您的每月公积金缴存额 ${monthlyContrib} 元会持续充实账户，冲还贷可持续更长时间。若余额不足时，可转为自费还款。`);
    }

    suggestions.push(`注意：具体冲还贷方式需向当地公积金管理中心申请，部分城市可能只支持其中一种方式。建议咨询当地公积金热线 12329。`);

    const container = document.getElementById('deductionSuggestions');
    container.style.display = 'block';
    document.getElementById('deductionSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
}

// ═══════════════════════════════════════════
//  Tab 4：公积金 vs 商贷对比
// ═══════════════════════════════════════════
function calculateCompare() {
    const totalPrice = parseFloat(document.getElementById('compTotalPrice').value) || 0;
    const downRatio = parseFloat(document.getElementById('compDownPaymentRatio').value) || 30;
    const years = parseInt(document.getElementById('compYears').value) || 30;
    const provAmount = parseFloat(document.getElementById('compProvAmount').value) || 0;
    const commRate = parseFloat(document.getElementById('compCommRate').value) || (LPR.lpr5y - 0.2);

    if (totalPrice <= 0) { alert('请输入房屋总价'); return; }

    const downPayment = totalPrice * downRatio / 100;
    const totalLoan = totalPrice - downPayment;
    const months = years * 12;
    const monthlyRateProv = PROVIDENT_FUND_RATE.above5y / 100 / 12;
    const monthlyRateComm = commRate / 100 / 12;

    // 方案A：纯公积金贷款
    const provAble = totalLoan <= provAmount * 10000 && provAmount > 0;
    let planA = null;
    if (provAble) {
        const provMonthly = calcEqualPayment(totalLoan * 10000, monthlyRateProv, months);
        const provTotalPayment = provMonthly * months;
        planA = {
            name: '纯公积金贷款',
            loanAmount: totalLoan,
            provPart: totalLoan,
            commPart: 0,
            rate: PROVIDENT_FUND_RATE.above5y,
            monthly: provMonthly,
            totalPayment: provTotalPayment,
            totalInterest: provTotalPayment - totalLoan * 10000,
            color: '#0f9b8e'
        };
    }

    // 方案B：纯商业贷款
    const commMonthly = calcEqualPayment(totalLoan * 10000, monthlyRateComm, months);
    const commTotalPayment = commMonthly * months;
    const planB = {
        name: '纯商业贷款',
        loanAmount: totalLoan,
        provPart: 0,
        commPart: totalLoan,
        rate: commRate,
        monthly: commMonthly,
        totalPayment: commTotalPayment,
        totalInterest: commTotalPayment - totalLoan * 10000,
        color: '#f44336'
    };

    // 方案C：组合贷款（公积金 + 商贷）
    const provLoan = provAmount > 0 ? Math.min(provAmount, totalLoan) : 0;
    const commLoan = totalLoan - provLoan;
    let planC = null;
    if (provLoan > 0 && commLoan > 0) {
        const provMonthly = calcEqualPayment(provLoan * 10000, monthlyRateProv, months);
        const commMonthlyC = calcEqualPayment(commLoan * 10000, monthlyRateComm, months);
        const combinedMonthly = provMonthly + commMonthlyC;
        const combinedTotal = combinedMonthly * months;
        planC = {
            name: '组合贷款',
            loanAmount: totalLoan,
            provPart: provLoan,
            commPart: commLoan,
            provMonthly: provMonthly,
            commMonthly: commMonthlyC,
            rate: `公积金${PROVIDENT_FUND_RATE.above5y}% + 商贷${commRate}%`,
            monthly: combinedMonthly,
            totalPayment: combinedTotal,
            totalInterest: combinedTotal - totalLoan * 10000,
            color: '#fd7e14'
        };
    }

    // 找最优方案
    const allPlans = [planA, planB, planC].filter(Boolean);
    const bestPlan = allPlans.reduce((a, b) => a.totalInterest < b.totalInterest ? a : b);

    // 渲染表格
    document.getElementById('compareResult').style.display = 'block';
    let tableHtml = `<table class="compare-table">
        <thead><tr>
            <th>对比项</th>`;
    allPlans.forEach(p => {
        tableHtml += `<th class="${p === bestPlan ? 'plan-col-header' : ''}">${p.name}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    const rows = [
        {
            label: '贷款总额',
            values: allPlans.map(p => fmtWan(p.loanAmount * 10000))
        },
        {
            label: '公积金部分',
            values: allPlans.map(p => p.provPart > 0 ? fmtWan(p.provPart * 10000) : '—')
        },
        {
            label: '商贷部分',
            values: allPlans.map(p => p.commPart > 0 ? fmtWan(p.commPart * 10000) : '—')
        },
        {
            label: '利率',
            values: allPlans.map(p => p.rate + '%')
        },
        {
            label: '每月月供',
            values: allPlans.map(p => p === bestPlan ? `<span class="highlight-cell">${fmtYuan(p.monthly)}</span>` : fmtYuan(p.monthly))
        },
        {
            label: '还款总额',
            values: allPlans.map(p => p === bestPlan ? `<span class="highlight-cell">${fmtYuan(p.totalPayment)}</span>` : fmtYuan(p.totalPayment))
        },
        {
            label: '利息总额',
            values: allPlans.map(p => p === bestPlan ? `<span class="highlight-cell">${fmtYuan(p.totalInterest)}</span>` : fmtYuan(p.totalInterest))
        }
    ];

    rows.forEach(row => {
        tableHtml += `<tr>`;
        tableHtml += `<td><strong>${row.label}</strong></td>`;
        row.values.forEach(v => tableHtml += `<td>${v}</td>`);
        tableHtml += `</tr>`;
    });
    tableHtml += '</tbody></table>';

    // 如果纯公积金不可用，加提示
    if (!planA) {
        tableHtml = `<div class="info-banner" style="margin-bottom:20px;">
            <p>⚠️ 公积金可贷额度（${provAmount > 0 ? provAmount + '万' : '未设置'}）不足以覆盖全部贷款需求（${totalLoan.toFixed(0)}万），纯公积金方案不可用。建议使用组合贷款或纯商贷。</p>
        </div>` + tableHtml;
    }

    document.getElementById('compareTableWrap').innerHTML = tableHtml;

    // 图表
    renderCompareChart(allPlans, bestPlan);

    // AI建议
    generateCompareSuggestions(allPlans, bestPlan, totalLoan, provAmount, downPayment, years);

    document.getElementById('compareResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCompareChart(plans, bestPlan) {
    const ctx = document.getElementById('compareChart');
    if (!ctx) return;

    if (compareChartInstance) compareChartInstance.destroy();

    compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: plans.map(p => p.name + (p === bestPlan ? ' ⭐' : '')),
            datasets: [
                {
                    label: '贷款本金',
                    data: plans.map(p => p.loanAmount * 10000),
                    backgroundColor: 'rgba(45, 140, 240, 0.7)'
                },
                {
                    label: '利息总额',
                    data: plans.map(p => p.totalInterest),
                    backgroundColor: plans.map(p => p === bestPlan ? 'rgba(40, 167, 69, 0.7)' : 'rgba(244, 67, 54, 0.7)')
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '贷款方案对比（本金 vs 利息）',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + fmtYuan(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return (value / 10000).toFixed(0) + '万';
                        }
                    }
                }
            }
        }
    });
}

function generateCompareSuggestions(plans, bestPlan, totalLoan, provAmount, downPayment, years) {
    const suggestions = [];
    const totalLoanWan = totalLoan;

    suggestions.push(`推荐 <strong>${bestPlan.name}</strong>，利息总额最低为 ${fmtYuan(bestPlan.totalInterest)}。`);

    // 对比最贵方案
    const worstPlan = plans.reduce((a, b) => a.totalInterest > b.totalInterest ? a : b);
    if (bestPlan !== worstPlan) {
        const saved = worstPlan.totalInterest - bestPlan.totalInterest;
        suggestions.push(`相比${worstPlan.name}，可节省利息 <strong style="color:#28a745">${fmtWan(saved)}</strong>，相当于节省了 ${(saved / years / 12).toFixed(0)} 元/月。`);
    }

    // 组合贷建议
    if (provAmount > 0 && provAmount < totalLoan) {
        const provRatio = (provAmount / totalLoan * 100).toFixed(0);
        suggestions.push(`当前公积金可贷 ${provAmount}万，占总贷款 ${provRatio}%。建议尽可能提高公积金额度（如提高缴存基数、延长缴存时间），公积金比例越高越划算。`);
    }

    // 提前还款建议
    if (plans.find(p => p.commPart > 0)) {
        suggestions.push(`组合贷/商贷部分利率较高，经济宽裕时建议<strong>优先提前偿还商贷部分</strong>，节省效果更明显。`);
    }

    suggestions.push(`提示：以上计算基于等额本息还款。如选择等额本金，总利息会更低，但前期月供压力更大。`);

    const container = document.getElementById('compareSuggestions');
    container.style.display = 'block';
    document.getElementById('compareSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
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
