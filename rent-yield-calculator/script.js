// 房屋租售比计算器核心逻辑

function toggleLoanSection() {
    const hasLoan = document.querySelector('input[name="hasLoan"]:checked').value === 'yes';
    document.getElementById('loanSection').style.display = hasLoan ? 'block' : 'none';
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

function fmt(n, d = 2) {
    if (!isFinite(n)) return '—';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function calculateRentYield() {
    const housePrice = parseFloat(document.getElementById('housePrice').value) || 0;
    const monthlyRent = parseFloat(document.getElementById('monthlyRent').value) || 0;
    const vacancyRate = parseFloat(document.getElementById('vacancyRate').value) || 0;
    const annualFee = parseFloat(document.getElementById('annualFee').value) || 0;
    const holdYears = parseFloat(document.getElementById('holdYears').value) || 10;
    const bankRate = parseFloat(document.getElementById('bankRate').value) || 0;
    const hasLoan = document.querySelector('input[name="hasLoan"]:checked').value === 'yes';

    if (housePrice <= 0 || monthlyRent <= 0) {
        alert('请输入有效的房屋总价与月租金');
        return;
    }

    const housePriceYuan = housePrice * 10000;
    const grossAnnualRent = monthlyRent * 12;
    const grossYield = grossAnnualRent / housePriceYuan * 100;
    const ratioMonths = Math.round(housePriceYuan / monthlyRent);
    const effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate / 100);

    // 贷款利息（均值口径）
    let avgAnnualInterest = 0;
    let loanMonthly = 0;
    let loanTotalInterest = 0;
    if (hasLoan) {
        const loanBalance = parseFloat(document.getElementById('loanBalance').value) || 0;
        const loanRate = parseFloat(document.getElementById('loanRate').value) || 0;
        const loanYears = parseFloat(document.getElementById('loanYears').value) || 0;
        if (loanBalance > 0 && loanRate > 0 && loanYears > 0) {
            const principal = loanBalance * 10000;
            const months = loanYears * 12;
            const annualRate = loanRate / 100;
            loanMonthly = equalPaymentMonthly(principal, annualRate, months);
            loanTotalInterest = loanMonthly * months - principal;
            avgAnnualInterest = loanTotalInterest / loanYears;
        }
    }

    const netAnnualIncome = effectiveAnnualRent - annualFee - avgAnnualInterest;
    const netYield = netAnnualIncome / housePriceYuan * 100;

    // 买房 vs 存银行（N年）
    const r = bankRate / 100;
    const buyOutcome = housePriceYuan + netAnnualIncome * holdYears; // 房价不变假设
    const bankOutcome = housePriceYuan * Math.pow(1 + r, holdYears);
    const diff = buyOutcome - bankOutcome;
    const buyBetter = diff > 0;

    // 健康度
    let healthLevel, healthColor, healthText;
    if (ratioMonths < 200) {
        healthLevel = '优质'; healthColor = '#28a745';
        healthText = `租售比 1:${ratioMonths} < 1:200，回报率高于6%，出租收益优异，需警惕租金可持续性`;
    } else if (ratioMonths <= 300) {
        healthLevel = '健康'; healthColor = '#28a745';
        healthText = `租售比 1:${ratioMonths} 处于 1:200~1:300 合理区间，回报率4%-6%，买房出租具备投资价值`;
    } else if (ratioMonths <= 500) {
        healthLevel = '偏低'; healthColor = '#fd7e14';
        healthText = `租售比 1:${ratioMonths} 处于 1:300~1:500，回报率2.4%-3.3%，租售比失衡，需依赖房价上涨`;
    } else {
        healthLevel = '泡沫'; healthColor = '#dc3545';
        healthText = `租售比 1:${ratioMonths} > 1:500，回报率低于2.4%，纯出租不划算，房价估值偏高`;
    }

    renderYieldResult({
        housePrice, monthlyRent, ratioMonths, grossYield, grossAnnualRent,
        vacancyRate, effectiveAnnualRent, annualFee,
        hasLoan, avgAnnualInterest, loanMonthly, loanTotalInterest,
        netAnnualIncome, netYield, holdYears
    });

    renderGauge(ratioMonths, grossYield, healthLevel, healthColor, healthText);

    renderBankComparison({
        housePriceYuan, netAnnualIncome, holdYears, bankRate,
        buyOutcome, bankOutcome, diff, buyBetter, netYield
    });

    renderSuggestions({
        ratioMonths, grossYield, netYield, bankRate,
        buyBetter, diff, holdYears, hasLoan
    });

    document.getElementById('yieldResult').style.display = 'block';
    document.getElementById('yieldResult').scrollIntoView({ behavior: 'smooth' });
}

function renderYieldResult(r) {
    const cards = [];
    cards.push(`<div class="result-card highlight"><div class="rc-label">租售比</div><div class="rc-value">1:${r.ratioMonths}</div><div class="rc-note">${r.ratioMonths}个月 ≈ ${(r.ratioMonths/12).toFixed(1)}年租金</div></div>`);
    cards.push(`<div class="result-card highlight"><div class="rc-label">年化毛回报率</div><div class="rc-value">${fmt(r.grossYield, 2)}%</div><div class="rc-note">月租×12÷房价</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">年毛租金</div><div class="rc-value">${fmt(r.grossAnnualRent, 0)} 元</div><div class="rc-note">${fmt(r.monthlyRent, 0)} × 12</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">年实收租金</div><div class="rc-value">${fmt(r.effectiveAnnualRent, 0)} 元</div><div class="rc-note">扣空置 ${r.vacancyRate}%</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">年物业费</div><div class="rc-value">${fmt(r.annualFee, 0)} 元</div><div class="rc-note">持有成本</div></div>`);
    if (r.hasLoan) {
        cards.push(`<div class="result-card"><div class="rc-label">年均贷款利息</div><div class="rc-value">${fmt(r.avgAnnualInterest, 0)} 元</div><div class="rc-note">月供 ${fmt(r.loanMonthly, 2)}，总利息 ${fmt(r.loanTotalInterest, 0)}</div></div>`);
    }
    cards.push(`<div class="result-card highlight"><div class="rc-label">年化净回报率</div><div class="rc-value">${fmt(r.netYield, 2)}%</div><div class="rc-note">扣除全部持有成本后</div></div>`);
    cards.push(`<div class="result-card"><div class="rc-label">年净收益</div><div class="rc-value">${fmt(r.netAnnualIncome, 0)} 元</div><div class="rc-note">${r.holdYears}年累计 ${fmt(r.netAnnualIncome * r.holdYears, 0)} 元</div></div>`);
    document.getElementById('yieldResultGrid').innerHTML = `<div class="result-grid-inner">${cards.join('')}</div>`;
}

function renderGauge(ratioMonths, grossYield, level, color, text) {
    // 仪表条：100-700区间映射
    const minRatio = 100, maxRatio = 700;
    const pos = Math.max(0, Math.min(100, ((ratioMonths - minRatio) / (maxRatio - minRatio)) * 100));
    const zones = [
        { left: '0%', width: '16.67%', color: '#17a2b8', label: '优质 <200' },      // 100-200
        { left: '16.67%', width: '16.67%', color: '#28a745', label: '健康 200-300' }, // 200-300
        { left: '33.33%', width: '33.33%', color: '#fd7e14', label: '偏低 300-500' }, // 300-500
        { left: '66.67%', width: '33.33%', color: '#dc3545', label: '泡沫 >500' }    // 500-700
    ];
    const bars = zones.map(z => `<div class="gauge-zone" style="left:${z.left};width:${z.width};background:${z.color};"></div>`).join('');
    document.getElementById('yieldGauge').innerHTML = `
        <div class="gauge-track">${bars}<div class="gauge-marker" style="left:${pos}%;"><div class="gauge-marker-label">1:${ratioMonths}</div></div></div>
        <div class="gauge-scale"><span>1:100</span><span>1:200</span><span>1:300</span><span>1:500</span><span>1:700+</span></div>
        <div class="gauge-result" style="color:${color}">
            <span class="gauge-level" style="background:${color}">${level}</span>
            <span class="gauge-text">${text}</span>
        </div>
    `;
}

function renderBankComparison(r) {
    const rows = [
        `<tr><td>投入资金</td><td>${fmt(r.housePriceYuan, 0)} 元（房价）</td><td>${fmt(r.housePriceYuan, 0)} 元（本金）</td></tr>`,
        `<tr><td>年化收益率</td><td>${fmt(r.netYield, 2)}%（净回报率）</td><td>${fmt(r.bankRate, 2)}%（理财）</td></tr>`,
        `<tr><td>${r.holdYears}年后总价值</td><td>${fmt(r.buyOutcome, 0)} 元</td><td>${fmt(r.bankOutcome, 0)} 元</td></tr>`,
        `<tr class="highlight-row"><td>${r.holdYears}年差额</td><td colspan="2"><strong>${fmt(Math.abs(r.diff), 0)} 元</strong>（${r.buyBetter ? '买房出租更优' : '存银行更优'}）</td></tr>`
    ].join('');
    document.getElementById('bankCompareTable').innerHTML = `
        <table class="compare-tbl">
            <thead><tr><th>对比项</th><th>买房出租</th><th>存银行理财</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p class="compare-note">* 买房出租终值 = 房价（假设不变） + ${r.holdYears}年累计净租金收益；存银行终值 = 本金 × (1+${fmt(r.bankRate, 2)}%)^${r.holdYears}（复利）。未计房价涨跌与交易税费。</p>
    `;
}

function renderSuggestions(r) {
    const tips = [];
    if (r.ratioMonths < 200) {
        tips.push(`✓ 租售比 1:${r.ratioMonths} 优于 1:200，回报率 ${fmt(r.grossYield, 2)}% 高于6%，出租收益优异。需注意高租金是否可持续、是否存在装修折旧与租客断租风险。`);
    } else if (r.ratioMonths <= 300) {
        tips.push(`✓ 租售比 1:${r.ratioMonths} 处于健康区间，毛回报率 ${fmt(r.grossYield, 2)}%，净回报率 ${fmt(r.netYield, 2)}%，买房出租具备投资价值。`);
    } else if (r.ratioMonths <= 500) {
        tips.push(`△ 租售比 1:${r.ratioMonths} 偏低，净回报率 ${fmt(r.netYield, 2)}% 低于合理区间，纯出租回报不足，需依赖房价上涨才能覆盖机会成本。`);
    } else {
        tips.push(`✗ 租售比 1:${r.ratioMonths} 超过 1:500，净回报率仅 ${fmt(r.netYield, 2)}%，纯出租不划算，房价估值明显偏高。`);
    }

    if (r.buyBetter) {
        tips.push(`✓ ${r.holdYears}年测算，买房出租比存银行多赚 <strong>${fmt(Math.abs(r.diff), 0)} 元</strong>，买房出租更优。前提是房价不跌、租金稳定。`);
    } else {
        tips.push(`△ ${r.holdYears}年测算，存银行比买房出租多赚 <strong>${fmt(Math.abs(r.diff), 0)} 元</strong>，纯财务角度不如存银行。除非预期房价上涨或自住需求。`);
    }

    if (r.netYield < r.bankRate) {
        tips.push(`⚠ 净回报率 ${fmt(r.netYield, 2)}% 低于银行理财 ${fmt(r.bankRate, 2)}%，机会成本为正——把钱存银行收益更高。`);
    } else {
        tips.push(`✓ 净回报率 ${fmt(r.netYield, 2)}% 高于银行理财 ${fmt(r.bankRate, 2)}%，买房出租财务上划算。`);
    }

    if (r.hasLoan) {
        tips.push(`i 已扣除贷款利息（均值口径）。实际持有期前段利息占比更高、后段更低，若计划提前还贷可结合 <a href="../mortgage-calculator/" style="color:#667eea">房贷计算器</a> 测算。`);
    }

    let decision = '';
    if (r.ratioMonths <= 300 && r.buyBetter) {
        decision = `<div class="decision recommend">建议：<strong>适合投资持有</strong>。租售比健康且净回报跑赢理财，买房出租财务上划算。</div>`;
    } else if (r.ratioMonths <= 300 && !r.buyBetter) {
        decision = `<div class="decision neutral">建议：<strong>租售比健康但跑不赢理财</strong>。若看重资产保值与租金现金流可持有，纯财务回报略逊于存银行。</div>`;
    } else if (r.ratioMonths > 300 && r.ratioMonths <= 500) {
        decision = `<div class="decision neutral">建议：<strong>谨慎持有</strong>。租售比偏低，需依赖房价上涨；若预期房价持平或下跌，纯出租不如存银行。</div>`;
    } else {
        decision = `<div class="decision recommend">建议：<strong>不建议纯投资</strong>。租售比严重失衡，纯出租回报远低于理财；若非自住需求，资金更适合配置到 <a href="../investment-calculator/" style="color:#667eea">其他投资</a>。</div>`;
    }

    document.getElementById('yieldSuggestionsContent').innerHTML = `
        <ul class="suggestion-list">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
        ${decision}
        <p class="suggestion-note">* 本测算为静态口径，未计房价涨跌、交易税费、折旧、未来租金变化。一线城市租售比普遍1:500以上，二三线城市较高；最终决策需结合城市能级、个人资金成本与持有目的综合判断。</p>
    `;
    document.getElementById('yieldSuggestions').style.display = 'block';
}
