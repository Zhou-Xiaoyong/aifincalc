// Tab切换功能
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
});

// 整存整取参考利率
const fixedRates = {
    0.25: 1.25,
    0.5: 1.45,
    1: 1.55,
    2: 1.85,
    3: 2.25,
    5: 2.55
};

// 零存整取参考利率
const installmentRates = {
    1: 1.35,
    3: 1.55,
    5: 1.65
};

// 通知存款参考利率
const noticeRates = {
    1: 0.95,
    7: 1.35
};

// 设置整存整取利率
function setFixedRate() {
    const term = parseFloat(document.getElementById('fixedTerm').value);
    document.getElementById('fixedRate').value = fixedRates[term];
}

// 设置零存整取利率
function setInstallmentRate() {
    const term = parseFloat(document.getElementById('installmentTerm').value);
    document.getElementById('installmentRate').value = installmentRates[term];
}

// 设置通知存款利率
function setNoticeRate() {
    const type = parseFloat(document.getElementById('noticeType').value);
    document.getElementById('noticeRate').value = noticeRates[type];
}

// 格式化金额
function formatMoney(amount) {
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 活期存款计算
function calculateDemand() {
    const principal = parseFloat(document.getElementById('demandPrincipal').value);
    const days = parseInt(document.getElementById('demandDays').value);
    const rate = parseFloat(document.getElementById('demandRate').value);
    const method = document.getElementById('demandMethod').value;

    if (isNaN(principal) || isNaN(days) || isNaN(rate)) {
        alert('请输入有效的存款金额、存款天数和年利率');
        return;
    }

    if (principal <= 0 || days <= 0 || rate <= 0) {
        alert('存款金额、存款天数和年利率必须大于0');
        return;
    }

    const annualRate = rate / 100;
    let interest;

    if (method === 'daily') {
        interest = principal * annualRate / 360 * days;
    } else {
        const quarters = Math.floor(days / 90);
        const remainingDays = days % 90;
        let balance = principal;
        interest = 0;
        
        for (let i = 0; i < quarters; i++) {
            const quarterInterest = balance * annualRate / 360 * 90;
            interest += quarterInterest;
            balance += quarterInterest;
        }
        
        interest += balance * annualRate / 360 * remainingDays;
    }

    const totalAmount = principal + interest;
    const monthlyInterest = interest / (days / 30);

    const resultHtml = `
        <div class="result-item highlight">
            <span class="label">到期利息</span>
            <span class="value">${formatMoney(interest)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">本息合计</span>
            <span class="value important">${formatMoney(totalAmount)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">每月利息</span>
            <span class="value profit">${formatMoney(monthlyInterest)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">日均利息</span>
            <span class="value">${formatMoney(interest / days)} 元</span>
        </div>
    `;

    document.getElementById('demandResultGrid').innerHTML = resultHtml;
    document.getElementById('demandResult').style.display = 'block';
    document.getElementById('demandResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 整存整取计算
function calculateFixed() {
    const principal = parseFloat(document.getElementById('fixedPrincipal').value);
    const term = parseFloat(document.getElementById('fixedTerm').value);
    const rate = parseFloat(document.getElementById('fixedRate').value);
    const rollover = document.getElementById('fixedRollover').value;
    const rolloverTimes = parseInt(document.getElementById('fixedRolloverTimes').value) || 0;

    if (isNaN(principal) || isNaN(term) || isNaN(rate)) {
        alert('请输入有效的存款金额、存款期限和年利率');
        return;
    }

    if (principal <= 0 || rate <= 0) {
        alert('存款金额和年利率必须大于0');
        return;
    }

    const annualRate = rate / 100;

    if (rollover === 'none' || rolloverTimes === 0) {
        const interest = principal * annualRate * term;
        const totalAmount = principal + interest;
        const monthlyInterest = interest / (term * 12);

        const resultHtml = `
            <div class="result-item highlight">
                <span class="label">到期利息</span>
                <span class="value">${formatMoney(interest)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">本息合计</span>
                <span class="value important">${formatMoney(totalAmount)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">每月利息</span>
                <span class="value profit">${formatMoney(monthlyInterest)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">存款期限</span>
                <span class="value">${term} 年</span>
            </div>
        `;

        document.getElementById('fixedResultGrid').innerHTML = resultHtml;
        document.getElementById('rolloverTable').style.display = 'none';
    } else {
        let balance = principal;
        let totalInterest = 0;
        const rolloverData = [];

        const totalPeriods = rolloverTimes + 1;
        for (let i = 0; i < totalPeriods; i++) {
            const periodInterest = balance * annualRate * term;
            totalInterest += periodInterest;
            
            rolloverData.push({
                period: i + 1,
                startPrincipal: balance,
                interest: periodInterest,
                endBalance: balance + (rollover === 'all' ? periodInterest : 0)
            });

            if (rollover === 'all') {
                balance += periodInterest;
            }
        }

        const finalAmount = balance;
        const totalYears = term * totalPeriods;
        const monthlyInterest = totalInterest / (totalYears * 12);

        const resultHtml = `
            <div class="result-item highlight">
                <span class="label">累计利息</span>
                <span class="value">${formatMoney(totalInterest)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">最终本息</span>
                <span class="value important">${formatMoney(finalAmount)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">月均利息</span>
                <span class="value profit">${formatMoney(monthlyInterest)} 元</span>
            </div>
            <div class="result-item">
                <span class="label">总存期</span>
                <span class="value">${totalYears} 年</span>
            </div>
        `;

        document.getElementById('fixedResultGrid').innerHTML = resultHtml;

        let tableHtml = '<h4>📋 转存明细</h4><table><thead><tr><th>存期</th><th>期初本金</th><th>当期利息</th><th>期末本息</th></tr></thead><tbody>';
        rolloverData.forEach(item => {
            tableHtml += `
                <tr>
                    <td>第${item.period}期</td>
                    <td>${formatMoney(item.startPrincipal)} 元</td>
                    <td>${formatMoney(item.interest)} 元</td>
                    <td>${formatMoney(item.endBalance)} 元</td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table>';

        document.getElementById('rolloverTable').innerHTML = tableHtml;
        document.getElementById('rolloverTable').style.display = 'block';
    }

    document.getElementById('fixedResult').style.display = 'block';
    document.getElementById('fixedResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 零存整取计算
function calculateInstallment() {
    const amount = parseFloat(document.getElementById('installmentAmount').value);
    const term = parseFloat(document.getElementById('installmentTerm').value);
    const rate = parseFloat(document.getElementById('installmentRate').value);
    const date = document.getElementById('installmentDate').value;

    if (isNaN(amount) || isNaN(term) || isNaN(rate)) {
        alert('请输入有效的每月存入金额、存款期限和年利率');
        return;
    }

    if (amount <= 0 || rate <= 0) {
        alert('每月存入金额和年利率必须大于0');
        return;
    }

    const months = term * 12;
    const monthlyRate = rate / 100 / 12;
    const totalPrincipal = amount * months;

    let interest;
    if (date === 'end') {
        const accumulatedMonths = (months + 1) / 2 * months;
        interest = amount * accumulatedMonths * monthlyRate;
    } else {
        const accumulatedMonths = months / 2 * (months + 1);
        interest = amount * accumulatedMonths * monthlyRate;
    }

    const totalAmount = totalPrincipal + interest;
    const monthlyInterest = interest / months;

    const resultHtml = `
        <div class="result-item highlight">
            <span class="label">到期利息</span>
            <span class="value">${formatMoney(interest)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">本息合计</span>
            <span class="value important">${formatMoney(totalAmount)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">累计本金</span>
            <span class="value">${formatMoney(totalPrincipal)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">每月利息</span>
            <span class="value profit">${formatMoney(monthlyInterest)} 元</span>
        </div>
    `;

    document.getElementById('installmentResultGrid').innerHTML = resultHtml;
    document.getElementById('installmentResult').style.display = 'block';
    document.getElementById('installmentResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 通知存款计算
function calculateNotice() {
    const principal = parseFloat(document.getElementById('noticePrincipal').value);
    const noticeType = parseInt(document.getElementById('noticeType').value);
    const days = parseInt(document.getElementById('noticeDays').value);
    const rate = parseFloat(document.getElementById('noticeRate').value);

    if (isNaN(principal) || isNaN(days) || isNaN(rate)) {
        alert('请输入有效的存款金额、存款天数和年利率');
        return;
    }

    if (principal <= 0 || days <= 0 || rate <= 0) {
        alert('存款金额、存款天数和年利率必须大于0');
        return;
    }

    if (principal < 50000) {
        alert('通知存款起存金额一般为5万元');
    }

    const annualRate = rate / 100;
    const interest = principal * annualRate / 360 * days;
    const totalAmount = principal + interest;
    const monthlyInterest = interest / (days / 30);

    const resultHtml = `
        <div class="result-item highlight">
            <span class="label">到期利息</span>
            <span class="value">${formatMoney(interest)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">本息合计</span>
            <span class="value important">${formatMoney(totalAmount)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">每月利息</span>
            <span class="value profit">${formatMoney(monthlyInterest)} 元</span>
        </div>
        <div class="result-item">
            <span class="label">日均利息</span>
            <span class="value">${formatMoney(interest / days)} 元</span>
        </div>
    `;

    document.getElementById('noticeResultGrid').innerHTML = resultHtml;
    document.getElementById('noticeResult').style.display = 'block';
    document.getElementById('noticeResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
