// ====== 车贷计算器 ======
// 核心逻辑：等额本息/等额本金计算 + 方案对比 + 提前还款分析

// 存储月度还款明细
let monthlySchedule = [];

// ====== 标签页切换 ======
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// ====== 核心计算函数 ======

// 等额本息月供
function calcEqualPayment(principal, monthlyRate, months) {
    if (monthlyRate === 0) return principal / months;
    return principal * monthlyRate * Math.pow(1 + monthlyRate, months)
        / (Math.pow(1 + monthlyRate, months) - 1);
}

// 生成完整月度还款计划
function generateSchedule(principal, annualRate, years, type) {
    const monthlyRate = annualRate / 100 / 12;
    const months = years * 12;
    const schedule = [];
    let remaining = principal;

    for (let i = 1; i <= months; i++) {
        const interest = remaining * monthlyRate;
        let principalPart, payment;

        if (type === 'equal') {
            payment = calcEqualPayment(principal, monthlyRate, months);
            principalPart = payment - interest;
        } else {
            // 等额本金
            principalPart = principal / months;
            payment = principalPart + interest;
        }

        remaining -= principalPart;
        if (remaining < 0) remaining = 0;

        schedule.push({
            month: i,
            payment: payment,
            principalPart: principalPart,
            interest: interest,
            remaining: remaining
        });
    }

    return schedule;
}

// ====== 常规车贷计算 ======
function calculate() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const years = parseInt(document.getElementById('loanYears').value);
    const rate = parseFloat(document.getElementById('loanRate').value);
    const type = document.querySelector('input[name="repayType"]:checked').value;
    const downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;

    if (!amount || !years || !rate) {
        alert('请填写贷款金额、贷款期限和年利率');
        return;
    }

    const principal = amount * 10000; // 转为元
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    monthlySchedule = generateSchedule(principal, rate, years, type);

    // 计算总额
    const totalPayment = monthlySchedule.reduce((s, m) => s + m.payment, 0);
    const totalInterest = totalPayment - principal;
    const firstPayment = monthlySchedule[0].payment;
    const lastPayment = monthlySchedule[months - 1].payment;

    // 渲染结果
    const grid = document.getElementById('resultGrid');
    grid.innerHTML = `
        <div class="result-item highlight">
            <span class="label">每月还款（首期）</span>
            <span class="value">¥${formatMoney(firstPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">每月还款（末期）</span>
            <span class="value">${type === 'equal' ? '¥' + formatMoney(lastPayment) : '¥' + formatMoney(lastPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">贷款总额</span>
            <span class="value">¥${formatMoney(principal)}</span>
        </div>
        <div class="result-item">
            <span class="label">支付利息</span>
            <span class="value warning">¥${formatMoney(totalInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">还款总额</span>
            <span class="value primary">¥${formatMoney(totalPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">利息占比</span>
            <span class="value">${(totalInterest / totalPayment * 100).toFixed(1)}%</span>
        </div>
    `;

    // 购车成本概览
    if (carPrice > 0 || downPayment > 0) {
        const dp = downPayment > 0 ? downPayment * 10000 : (carPrice > 0 ? (carPrice - amount) * 10000 : 0);
        const total = dp + principal + totalInterest;
        const dpPct = (dp / total * 100).toFixed(1);
        const principalPct = (principal / total * 100).toFixed(1);
        const interestPct = (totalInterest / total * 100).toFixed(1);

        const overview = document.getElementById('costOverview');
        overview.style.display = 'block';
        document.getElementById('costBarDown').style.width = dpPct + '%';
        document.getElementById('costBarDown').textContent = dp > 0 ? (dp / 10000).toFixed(1) + '万' : '';
        document.getElementById('costBarLoan').style.width = principalPct + '%';
        document.getElementById('costBarLoan').textContent = amount.toFixed(1) + '万';
        document.getElementById('costBarInterest').style.width = interestPct + '%';
        document.getElementById('costBarInterest').textContent = (totalInterest / 10000).toFixed(2) + '万';
    } else {
        document.getElementById('costOverview').style.display = 'none';
    }

    // 渲染还款计划表
    renderScheduleTable('yearly');

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 渲染还款计划表
function showSchedule(type) {
    document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderScheduleTable(type);
}

function renderScheduleTable(type) {
    if (monthlySchedule.length === 0) return;

    const table = document.getElementById('scheduleTable');

    if (type === 'yearly') {
        // 按年汇总
        const years = {};
        monthlySchedule.forEach(m => {
            const year = Math.ceil(m.month / 12);
            if (!years[year]) years[year] = { payment: 0, principalPart: 0, interest: 0, remaining: 0 };
            years[year].payment += m.payment;
            years[year].principalPart += m.principalPart;
            years[year].interest += m.interest;
            years[year].remaining = m.remaining;
        });

        table.innerHTML = `<table>
            <thead><tr><th>年份</th><th>年还款额</th><th>本金</th><th>利息</th><th>剩余本金</th></tr></thead>
            <tbody>${Object.entries(years).map(([y, d]) => `
                <tr>
                    <td>第${y}年</td>
                    <td>¥${formatMoney(d.payment)}</td>
                    <td>¥${formatMoney(d.principalPart)}</td>
                    <td>¥${formatMoney(d.interest)}</td>
                    <td>¥${formatMoney(d.remaining)}</td>
                </tr>
            `).join('')}</tbody>
        </table>`;
    } else {
        table.innerHTML = `<table>
            <thead><tr><th>期数</th><th>月供</th><th>本金</th><th>利息</th><th>剩余本金</th></tr></thead>
            <tbody>${monthlySchedule.map(m => `
                <tr>
                    <td>第${m.month}期</td>
                    <td>¥${formatMoney(m.payment)}</td>
                    <td>¥${formatMoney(m.principalPart)}</td>
                    <td>¥${formatMoney(m.interest)}</td>
                    <td>¥${formatMoney(m.remaining)}</td>
                </tr>
            `).join('')}</tbody>
        </table>`;
    }
}

// ====== 方案对比 ======
function compare() {
    const carPrice = parseFloat(document.getElementById('compCarPrice').value);
    const years1 = parseInt(document.getElementById('compYears1').value);
    const rate1 = parseFloat(document.getElementById('compRate1').value);
    const years2 = parseInt(document.getElementById('compYears2').value);
    const rate2 = parseFloat(document.getElementById('compRate2').value);
    const type = document.querySelector('input[name="compRepayType"]:checked').value;

    if (!carPrice) {
        alert('请填写车辆总价');
        return;
    }

    // 假设首付30%
    const downPayment = carPrice * 0.3;
    const loanAmount = carPrice - downPayment;

    const schedule1 = generateSchedule(loanAmount * 10000, rate1, years1, type);
    const schedule2 = generateSchedule(loanAmount * 10000, rate2, years2, type);

    const total1 = schedule1.reduce((s, m) => s + m.payment, 0);
    const interest1 = total1 - loanAmount * 10000;
    const monthly1 = schedule1[0].payment;

    const total2 = schedule2.reduce((s, m) => s + m.payment, 0);
    const interest2 = total2 - loanAmount * 10000;
    const monthly2 = schedule2[0].payment;

    // 结果网格
    document.getElementById('compResultGrid').innerHTML = `
        <div class="result-item">
            <span class="label">首付（30%）</span>
            <span class="value">¥${formatMoney(downPayment * 10000)}</span>
        </div>
        <div class="result-item">
            <span class="label">贷款金额</span>
            <span class="value">¥${formatMoney(loanAmount * 10000)}</span>
        </div>
        <div class="result-item highlight">
            <span class="label">方案一月供</span>
            <span class="value">¥${formatMoney(monthly1)}</span>
        </div>
        <div class="result-item highlight">
            <span class="label">方案二月供</span>
            <span class="value">¥${formatMoney(monthly2)}</span>
        </div>
        <div class="result-item">
            <span class="label">方案一总利息</span>
            <span class="value warning">¥${formatMoney(interest1)}</span>
        </div>
        <div class="result-item">
            <span class="label">方案二总利息</span>
            <span class="value warning">¥${formatMoney(interest2)}</span>
        </div>
    `;

    // 对比表
    document.getElementById('compTable').innerHTML = `
        <table>
            <thead>
                <tr><th>对比项</th><th>方案一（${years1}年 ${rate1}%）</th><th>方案二（${years2}年 ${rate2}%）</th></tr>
            </thead>
            <tbody>
                <tr><td>贷款期限</td><td>${years1}年（${years1 * 12}期）</td><td>${years2}年（${years2 * 12}期）</td></tr>
                <tr><td>月供（首期）</td><td>¥${formatMoney(monthly1)}</td><td>¥${formatMoney(monthly2)}</td></tr>
                <tr class="highlight-row"><td>还款总额</td><td>¥${formatMoney(total1)}</td><td>¥${formatMoney(total2)}</td></tr>
                <tr><td>支付利息</td><td>¥${formatMoney(interest1)}</td><td>¥${formatMoney(interest2)}</td></tr>
                <tr><td>利息差额</td><td colspan="2" style="font-weight:700;color:${interest1 < interest2 ? '#28a745' : '#fd7e14'};">
                    ${interest1 < interest2 ? '方案一' : '方案二'}更省 ¥${formatMoney(Math.abs(interest1 - interest2))}</td></tr>
            </tbody>
        </table>
    `;

    // 建议
    const suggestions = [];
    if (monthly1 > monthly2) {
        suggestions.push(`方案二月供少 ¥${formatMoney(monthly1 - monthly2)}，月度还款压力更小`);
    } else {
        suggestions.push(`方案一月供少 ¥${formatMoney(monthly2 - monthly1)}，月度还款压力更小`);
    }
    if (interest1 < interest2) {
        suggestions.push(`方案一总利息少 ¥${formatMoney(interest2 - interest1)}，总成本更低`);
    } else {
        suggestions.push(`方案二总利息少 ¥${formatMoney(interest1 - interest2)}，总成本更低`);
    }
    suggestions.push(`建议月供不超过家庭月收入的20%-30%，确保生活质量`);

    document.getElementById('compSuggestionsContent').innerHTML = `<ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
    document.getElementById('compSuggestions').style.display = 'block';
    document.getElementById('compResult').style.display = 'block';
    document.getElementById('compResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ====== 提前还款 ======
function calculatePrepay() {
    const loanAmount = parseFloat(document.getElementById('preLoanAmount').value);
    const rate = parseFloat(document.getElementById('preRate').value);
    const years = parseInt(document.getElementById('preYears').value);
    const type = document.querySelector('input[name="preRepayType"]:checked').value;
    const paidMonths = parseInt(document.getElementById('prePaidMonths').value);
    const preAmount = parseFloat(document.getElementById('preAmount').value);
    const method = document.querySelector('input[name="preMethod"]:checked').value;

    if (!loanAmount || !rate || !preAmount) {
        alert('请填写完整的贷款信息');
        return;
    }

    const principal = loanAmount * 10000;
    const monthlyRate = rate / 100 / 12;
    const totalMonths = years * 12;

    // 原始还款计划
    const originalSchedule = generateSchedule(principal, rate, years, type);
    const originalTotal = originalSchedule.reduce((s, m) => s + m.payment, 0);
    const originalInterest = originalTotal - principal;

    // 已还部分
    const paidPayment = originalSchedule.slice(0, paidMonths).reduce((s, m) => s + m.payment, 0);
    const paidInterest = originalSchedule.slice(0, paidMonths).reduce((s, m) => s + m.interest, 0);
    const paidPrincipal = originalSchedule.slice(0, paidMonths).reduce((s, m) => s + m.principalPart, 0);
    const remainingBefore = principal - paidPrincipal;

    // 提前还款后剩余本金
    const prepayAmount = preAmount * 10000;
    const remainingAfter = remainingBefore - prepayAmount;

    if (remainingAfter <= 0) {
        // 一次性还清
        const savedInterest = originalInterest - paidInterest;
        document.getElementById('preResultGrid').innerHTML = `
            <div class="result-item highlight">
                <span class="label">已还期数</span>
                <span class="value">${paidMonths}期</span>
            </div>
            <div class="result-item">
                <span class="label">已还利息</span>
                <span class="value">¥${formatMoney(paidInterest)}</span>
            </div>
            <div class="result-item">
                <span class="label">节省利息</span>
                <span class="value success">¥${formatMoney(savedInterest)}</span>
            </div>
            <div class="result-item">
                <span class="label">需额外支付</span>
                <span class="value">¥${formatMoney(remainingBefore)}</span>
            </div>
        `;
        document.getElementById('preCompareTable').innerHTML = '';
        document.getElementById('preSuggestionsContent').innerHTML = `<ul><li>恭喜！提前还清所有贷款，节省利息 ¥${formatMoney(savedInterest)}</li></ul>`;
        document.getElementById('preSuggestions').style.display = 'block';
        document.getElementById('preResult').style.display = 'block';
        return;
    }

    // 计算提前还款后的新月供或新期限
    let newSchedule, newMonthly, newMonths;
    const originalMonthly = originalSchedule[0].payment;

    if (method === 'reduceTerm') {
        // 缩短年限，月供不变
        // 用月供反推期数
        if (monthlyRate === 0) {
            newMonths = Math.ceil(remainingAfter / originalMonthly);
        } else {
            const x = Math.log(originalMonthly / (originalMonthly - remainingAfter * monthlyRate))
                / Math.log(1 + monthlyRate);
            newMonths = Math.ceil(x);
        }
        newSchedule = generateSchedule(remainingAfter, rate, Math.ceil(newMonths / 12), type);
        // 修正：只取 newMonths 期
        newSchedule = newSchedule.slice(0, newMonths);
        newMonthly = originalMonthly;
    } else {
        // 减少月供，年限不变
        const leftMonths = totalMonths - paidMonths;
        newSchedule = generateSchedule(remainingAfter, rate, Math.ceil(leftMonths / 12), type);
        newSchedule = newSchedule.slice(0, leftMonths);
        newMonthly = newSchedule[0].payment;
        newMonths = leftMonths;
    }

    const newTotal = newSchedule.reduce((s, m) => s + m.payment, 0);
    const newInterest = newTotal - remainingAfter;
    const totalNewPayment = paidPayment + prepayAmount + newTotal;
    const totalNewInterest = paidInterest + newInterest;
    const savedInterest = originalInterest - totalNewInterest;

    // 结果
    document.getElementById('preResultGrid').innerHTML = `
        <div class="result-item highlight">
            <span class="label">节省利息</span>
            <span class="value success">¥${formatMoney(savedInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">${method === 'reduceTerm' ? '新还款期限' : '新月供'}</span>
            <span class="value primary">${method === 'reduceTerm' ? newMonths + '期（' + Math.ceil(newMonths / 12) + '年）' : '¥' + formatMoney(newMonthly)}</span>
        </div>
        <div class="result-item">
            <span class="label">原剩余利息</span>
            <span class="value">¥${formatMoney(originalInterest - paidInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">还款后剩余利息</span>
            <span class="value warning">¥${formatMoney(newInterest)}</span>
        </div>
    `;

    // 对比表
    document.getElementById('preCompareTable').innerHTML = `
        <table>
            <thead>
                <tr><th>对比项</th><th>不提前还款</th><th>提前还款后</th><th>差异</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>剩余期数</td><td>${totalMonths - paidMonths}期</td>
                    <td>${newMonths}期</td>
                    <td style="color:#28a745;">少${totalMonths - paidMonths - newMonths}期</td>
                </tr>
                <tr>
                    <td>剩余月供</td><td>¥${formatMoney(originalMonthly)}</td>
                    <td>¥${formatMoney(newMonthly)}</td>
                    <td>${newMonthly < originalMonthly ? '月供减少 ¥' + formatMoney(originalMonthly - newMonthly) : '不变'}</td>
                </tr>
                <tr class="highlight-row">
                    <td>剩余利息</td><td>¥${formatMoney(originalInterest - paidInterest)}</td>
                    <td>¥${formatMoney(newInterest)}</td>
                    <td style="color:#28a745;">省 ¥${formatMoney(savedInterest)}</td>
                </tr>
            </tbody>
        </table>
    `;

    // 建议
    const suggestions = [];
    if (savedInterest > 0) {
        suggestions.push(`提前还款 ¥${preAmount}万元，可节省利息 ¥${formatMoney(savedInterest)}`);
    }
    if (method === 'reduceTerm') {
        suggestions.push(`选择缩短年限，可提前 ${(totalMonths - paidMonths - newMonths)} 期还清贷款`);
    } else {
        suggestions.push(`选择减少月供，每月少还 ¥${formatMoney(originalMonthly - newMonthly)}，减轻还款压力`);
    }
    if (savedInterest / prepayAmount < 0.05) {
        suggestions.push('节省的利息占比较低，建议考虑将资金用于更高收益的投资');
    } else {
        suggestions.push('节省利息可观，提前还款是合理的选择');
    }

    document.getElementById('preSuggestionsContent').innerHTML = `<ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
    document.getElementById('preSuggestions').style.display = 'block';
    document.getElementById('preResult').style.display = 'block';
    document.getElementById('preResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ====== 工具函数 ======
function formatMoney(num) {
    if (isNaN(num) || num === null) return '0.00';
    return num.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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
