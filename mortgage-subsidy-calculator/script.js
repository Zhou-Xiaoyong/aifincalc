// 房贷贴息计算器核心逻辑
// 政策常量（MORTGAGE_SUBSIDY_POLICY、PROVIDENT_FUND_RATE、LPR）均来自 shared/constants.js

// 政策常量快捷引用
const SUBSIDY = MORTGAGE_SUBSIDY_POLICY;

// 资格校验：返回 { passed, checks: [{name, ok, detail}] }
function checkEligibility(input) {
    const c = SUBSIDY.conditions;
    const checks = [
        {
            name: '贷款发放日期',
            ok: input.loanDate === 'after',
            detail: input.loanDate === 'after'
                ? `符合：贷款在 ${c.effectiveAfter} 之后新发放`
                : `不符：政策要求贷款须在 ${c.effectiveAfter} 之后新发放`
        },
        {
            name: '贷款类型',
            ok: true, // 本计算器仅处理纯商贷场景，默认符合
            detail: '符合：纯商业性个人住房贷款（组合贷商贷部分不适用）'
        },
        {
            name: '家庭首套房',
            ok: input.isFirstHome === 'yes',
            detail: input.isFirstHome === 'yes'
                ? '符合：家庭首套房'
                : '不符：政策仅适用于家庭首套房'
        },
        {
            name: '房屋总价',
            ok: input.housePrice <= c.maxPrice,
            detail: input.housePrice <= c.maxPrice
                ? `符合：房屋总价 ${input.housePrice} 万元 ≤ ${c.maxPrice} 万元`
                : `不符：房屋总价 ${input.housePrice} 万元 超过 ${c.maxPrice} 万元上限`
        },
        {
            name: '房屋面积',
            ok: input.houseArea <= c.maxArea,
            detail: input.houseArea <= c.maxArea
                ? `符合：房屋面积 ${input.houseArea} ㎡ ≤ ${c.maxArea} ㎡`
                : `不符：房屋面积 ${input.houseArea} ㎡ 超过 ${c.maxArea} ㎡ 上限`
        }
    ];
    const passed = checks.every(x => x.ok);
    return { passed, checks };
}

// 等额本息月供
function equalPaymentMonthly(principal, annualRate, months) {
    const r = annualRate / 12;
    if (r === 0) return principal / months;
    return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

// 等额本息总利息
function equalPaymentTotalInterest(principal, annualRate, months) {
    const m = equalPaymentMonthly(principal, annualRate, months);
    return m * months - principal;
}

// 等额本金首月月供、总利息
function principalPayment(principal, annualRate, months) {
    const monthlyPrincipal = principal / months;
    const r = annualRate / 12;
    let totalInterest = 0;
    for (let i = 0; i < months; i++) {
        totalInterest += (principal - monthlyPrincipal * i) * r;
    }
    const firstMonthly = monthlyPrincipal + principal * r;
    const lastMonthly = monthlyPrincipal + (principal - monthlyPrincipal * (months - 1)) * r;
    return { firstMonthly, lastMonthly, totalInterest, monthlyPrincipal };
}

// 主计算
function calculateSubsidy() {
    const principal = parseFloat(document.getElementById('loanPrincipal').value) || 0;
    const years = parseFloat(document.getElementById('loanYears').value) || 30;
    const rate = parseFloat(document.getElementById('loanRate').value) || 0;
    const housePrice = parseFloat(document.getElementById('housePrice').value) || 0;
    const houseArea = parseFloat(document.getElementById('houseArea').value) || 0;
    const isFirstHome = document.querySelector('input[name="isFirstHome"]:checked').value;
    const loanDate = document.querySelector('input[name="loanDate"]:checked').value;
    const repayType = document.querySelector('input[name="repayType"]:checked').value;

    if (principal <= 0 || rate <= 0) {
        alert('请输入有效的贷款本金与利率');
        return;
    }

    const input = { principal, years, rate, housePrice, houseArea, isFirstHome, loanDate };
    const elig = checkEligibility(input);
    renderEligibility(elig);

    if (!elig.passed) {
        document.getElementById('subsidyResult').style.display = 'none';
        document.getElementById('eligibilityResult').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // 贴息计算
    const principalYuan = principal * 10000;
    const subsidizedPrincipalWan = Math.min(principal, SUBSIDY.maxPrincipal); // 万元
    const annualSubsidy = subsidizedPrincipalWan * 10000 * SUBSIDY.subsidyRate; // 元
    const monthlySubsidy = annualSubsidy / 12;
    const subsidyYears = Math.min(years, SUBSIDY.maxYears);
    const totalSubsidy = annualSubsidy * subsidyYears;

    // 原月供与总利息
    const months = years * 12;
    const annualRate = rate / 100;
    let originalMonthly, originalTotalInterest, firstMonthly = 0, lastMonthly = 0;
    if (repayType === 'equal') {
        originalMonthly = equalPaymentMonthly(principalYuan, annualRate, months);
        originalTotalInterest = originalMonthly * months - principalYuan;
    } else {
        const p = principalPayment(principalYuan, annualRate, months);
        originalMonthly = p.firstMonthly; // 首月（等额本金首月最高）
        firstMonthly = p.firstMonthly;
        lastMonthly = p.lastMonthly;
        originalTotalInterest = p.totalInterest;
    }

    // 贴息期内自付月供
    const selfPayDuringSubsidyEqual = originalMonthly - monthlySubsidy;
    const selfPayFirstDuringSubsidy = firstMonthly ? firstMonthly - monthlySubsidy : 0;

    // 贴息后总利息（净利息 = 原总利息 - 5年总贴息）
    const netTotalInterest = originalTotalInterest - totalSubsidy;

    // 公积金对比（2.60%）
    const fundRate = PROVIDENT_FUND_RATE.above5y / 100;
    let fundMonthly, fundTotalInterest, fundFirstMonthly = 0;
    if (repayType === 'equal') {
        fundMonthly = equalPaymentMonthly(principalYuan, fundRate, months);
        fundTotalInterest = fundMonthly * months - principalYuan;
    } else {
        const fp = principalPayment(principalYuan, fundRate, months);
        fundFirstMonthly = fp.firstMonthly;
        fundMonthly = fp.firstMonthly;
        fundTotalInterest = fp.totalInterest;
    }

    renderSubsidyResult({
        principal, years, rate, repayType,
        annualSubsidy, monthlySubsidy, totalSubsidy, subsidyYears,
        subsidizedPrincipalWan,
        originalMonthly, originalTotalInterest,
        firstMonthly, lastMonthly,
        selfPayDuringSubsidyEqual, selfPayFirstDuringSubsidy,
        netTotalInterest,
        fundMonthly, fundTotalInterest, fundFirstMonthly
    });

    renderFundComparison({
        repayType, principal, years,
        originalMonthly, originalTotalInterest, totalSubsidy, netTotalInterest,
        fundMonthly, fundTotalInterest,
        selfPayDuringSubsidyEqual, monthlySubsidy, subsidyYears
    });

    renderSuggestions({
        principal, years, rate, repayType,
        annualSubsidy, totalSubsidy, subsidyYears,
        originalMonthly, netTotalInterest,
        fundMonthly, fundTotalInterest,
        selfPayDuringSubsidyEqual, monthlySubsidy
    });

    document.getElementById('eligibilityResult').style.display = 'block';
    document.getElementById('subsidyResult').style.display = 'block';
    document.getElementById('subsidyResult').scrollIntoView({ behavior: 'smooth' });
}

function renderEligibility(elig) {
    const html = elig.checks.map(c => `
        <div class="elig-item ${c.ok ? 'ok' : 'fail'}">
            <span class="elig-icon">${c.ok ? '✓' : '✗'}</span>
            <div class="elig-text">
                <strong>${c.name}</strong>
                <span>${c.detail}</span>
            </div>
        </div>
    `).join('') + `
        <div class="elig-summary ${elig.passed ? 'ok' : 'fail'}">
            ${elig.passed
                ? '✓ 全部条件符合，可享受首套房贷贴息政策'
                : '✗ 存在不符合条件项，本笔贷款不适用首套房贷贴息'}
        </div>
    `;
    document.getElementById('eligibilityList').innerHTML = html;
    document.getElementById('eligibilityResult').style.display = 'block';
}

function fmt(n, d = 2) {
    if (!isFinite(n)) return '—';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function renderSubsidyResult(r) {
    const cards = [];
    cards.push(`<div class="result-card highlight"><div class="rc-label">5年总贴息</div><div class="rc-value">${fmt(r.totalSubsidy, 0)} 元</div><div class="rc-note">年贴息 ${fmt(r.annualSubsidy, 0)} 元 × ${r.subsidyYears} 年</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">年贴息额</div><div class="rc-value">${fmt(r.annualSubsidy, 0)} 元</div><div class="rc-note">按本金 ${r.subsidizedPrincipalWan} 万 × 1%</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">月贴息额</div><div class="rc-value">${fmt(r.monthlySubsidy, 2)} 元</div><div class="rc-note">贴息期内每月抵减</div></div>`);
    if (r.repayType === 'equal') {
        cards.push(`<div class="result-card"><div class="rc-label">原月供（等额本息）</div><div class="rc-value">${fmt(r.originalMonthly, 2)} 元</div><div class="rc-note">利率 ${r.rate}% / ${r.years}年</div></div>`);
        cards.push(`<div class="result-card highlight"><div class="rc-label">贴息期内自付月供</div><div class="rc-value">${fmt(r.selfPayDuringSubsidyEqual, 2)} 元</div><div class="rc-note">原月供 − 月贴息，前 ${r.subsidyYears} 年</div></div>`);
    } else {
        cards.push(`<div class="result-card"><div class="rc-label">首月月供（等额本金）</div><div class="rc-value">${fmt(r.firstMonthly, 2)} 元</div><div class="rc-note">逐月递减，末月 ${fmt(r.lastMonthly, 2)} 元</div></div>`);
        cards.push(`<div class="result-card highlight"><div class="rc-label">贴息期首月自付</div><div class="rc-value">${fmt(r.selfPayFirstDuringSubsidy, 2)} 元</div><div class="rc-note">前 ${r.subsidyYears} 年每月抵减月贴息</div></div>`);
    }
    cards.push(`<div class="result-card"><div class="rc-label">原总利息</div><div class="rc-value">${fmt(r.originalTotalInterest, 0)} 元</div><div class="rc-note">不贴息情况下</div></div>`);
    cards.push(`<div class="result-card highlight"><div class="rc-label">贴息后净总利息</div><div class="rc-value">${fmt(r.netTotalInterest, 0)} 元</div><div class="rc-note">原总利息 − 5年总贴息</div></div>`);
    document.getElementById('subsidyResultGrid').innerHTML = `<div class="result-grid-inner">${cards.join('')}</div>`;
}

function renderFundComparison(r) {
    // 全周期总支出 = 本金 + 净利息（贴息商贷） vs 本金 + 公积金总利息
    const principalYuan = r.principal * 10000;
    const subsidyTotalCost = principalYuan + r.netTotalInterest; // 贴息商贷全周期净支出
    const fundTotalCost = principalYuan + r.fundTotalInterest;   // 公积金全周期支出
    const diff = subsidyTotalCost - fundTotalCost; // 正：贴息商贷更贵；负：贴息商贷更省

    const monthlyNow = r.repayType === 'equal' ? r.originalMonthly : r.firstMonthly; // 商贷当前月供
    const fundMonthlyNow = r.repayType === 'equal' ? r.fundMonthly : r.fundFirstMonthly;
    const monthlyDiff = r.selfPayDuringSubsidyEqual - r.fundMonthly; // 贴息期内自付 vs 公积金月供

    const subsidyBetter = diff < 0;
    const rows = [
        `<tr><td>当前执行利率</td><td>${r.rate}%（贴息期等效约 ${(r.rate - 1).toFixed(2)}%）</td><td>${(PROVIDENT_FUND_RATE.above5y).toFixed(2)}%（固定）</td></tr>`,
        `<tr><td>月供</td><td>${fmt(monthlyNow, 2)} 元（原）</td><td>${fmt(r.fundMonthly, 2)} 元</td></tr>`,
        `<tr><td>贴息期${r.subsidyYears}年内自付月供</td><td><strong>${fmt(r.selfPayDuringSubsidyEqual, 2)} 元</strong></td><td>${fmt(r.fundMonthly, 2)} 元（无变化）</td></tr>`,
        `<tr><td>贴息期月供差额</td><td colspan="2">${fmt(Math.abs(monthlyDiff), 2)} 元 / 月（${monthlyDiff < 0 ? '贴息商贷更低' : '公积金更低'}）</td></tr>`,
        `<tr><td>全周期总利息</td><td>${fmt(r.netTotalInterest, 0)} 元（贴息后）</td><td>${fmt(r.fundTotalInterest, 0)} 元</td></tr>`,
        `<tr><td>全周期总支出</td><td>${fmt(subsidyTotalCost, 0)} 元</td><td>${fmt(fundTotalCost, 0)} 元</td></tr>`,
        `<tr class="highlight-row"><td>30年总差额</td><td colspan="2"><strong>${fmt(Math.abs(diff), 0)} 元</strong>（${subsidyBetter ? '贴息商贷更省' : '公积金更省'}）</td></tr>`
    ].join('');
    document.getElementById('fundCompareTable').innerHTML = `
        <table class="compare-tbl">
            <thead><tr><th>对比项</th><th>贴息商贷</th><th>公积金贷款</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p class="compare-note">* 贴息仅 ${r.subsidyYears} 年，5年后商贷恢复原利率；公积金利率全程不变。比较基于同本金、同期限、同还款方式。</p>
    `;
}

function renderSuggestions(r) {
    const principalYuan = r.principal * 10000;
    const subsidyTotalCost = principalYuan + r.netTotalInterest;
    const fundTotalCost = principalYuan + r.fundTotalInterest;
    const diff = subsidyTotalCost - fundTotalCost;
    const monthlyDiff = r.selfPayDuringSubsidyEqual - r.fundMonthly;

    const tips = [];
    if (diff < 0) {
        tips.push(`✓ 全周期看，贴息商贷比公积金省 <strong>${fmt(Math.abs(diff), 0)} 元</strong>，但前提是贴息期内月供压力低 ${fmt(Math.abs(monthlyDiff), 2)} 元/月。注意贴息仅 ${r.subsidyYears} 年，5年后商贷月供恢复 ${fmt(r.originalMonthly, 2)} 元。`);
    } else {
        tips.push(`△ 全周期看，公积金比贴息商贷省 <strong>${fmt(Math.abs(diff), 0)} 元</strong>。贴息商贷在贴息期内月供虽低 ${fmt(Math.abs(monthlyDiff), 2)} 元/月，但 5 年后恢复较高利率，长期成本反超。`);
    }

    if (r.principal > SUBSIDY.maxPrincipal) {
        tips.push(`⚠ 你的贷款本金 ${r.principal} 万超过单户贴息上限 ${SUBSIDY.maxPrincipal} 万，仅 ${SUBSIDY.maxPrincipal} 万部分享受贴息，超出部分按原利率计息，贴息杠杆效应下降。`);
    }

    if (r.years <= 5) {
        tips.push(`i 你的贷款期限 ${r.years} 年 ≤ 5 年，贴息覆盖全周期，性价比最高。`);
    } else if (r.years <= 10) {
        tips.push(`i 贷款期限 ${r.years} 年，贴息 ${r.subsidyYears} 年覆盖前半段，节省效应明显。`);
    } else {
        tips.push(`i 贷款期限 ${r.years} 年较长，贴息 ${r.subsidyYears} 年仅覆盖前期；若计划提前还贷，建议优先用 <a href="../mortgage-calculator/" style="color:#667eea">房贷计算器</a> 测算提前还款与贴息叠加效果。`);
    }

    // 决策建议
    let decision = '';
    if (diff < 0 && Math.abs(diff) > 10000) {
        decision = `<div class="decision recommend">建议选 <strong>贴息商贷</strong>：全周期更省 ${fmt(Math.abs(diff), 0)} 元，且贴息期内月供压力更低。</div>`;
    } else if (diff > 0 && Math.abs(diff) > 10000) {
        decision = `<div class="decision recommend">建议选 <strong>公积金贷款</strong>：全周期更省 ${fmt(Math.abs(diff), 0)} 元，利率全程锁定 2.60% 不变。</div>`;
    } else {
        decision = `<div class="decision neutral">两方案全周期差额在 1 万元以内，可结合现金流偏好选择：注重短期月供压力选贴息商贷，注重长期锁定低利率选公积金。</div>`;
    }

    document.getElementById('subsidySuggestionsContent').innerHTML = `
        <ul class="suggestion-list">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
        ${decision}
        <p class="suggestion-note">* 本建议基于政策规则与等额本息/本金标准公式测算，实际以经办银行审批与当地公积金政策为准。组合贷中的商贷部分不适用贴息。</p>
    `;
    document.getElementById('subsidySuggestions').style.display = 'block';
}
