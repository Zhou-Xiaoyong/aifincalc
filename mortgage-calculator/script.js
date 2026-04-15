// 房贷计算器核心逻辑
// LPR、公积金利率等常量均来自 shared/constants.js，请勿在此处硬编码

// 切换LPR/固定利率显示
function toggleLPR(type) {
    const rateType = document.querySelector(`input[name="${type}RateType"]:checked`).value;
    document.getElementById(`${type}LPRSection`).style.display = rateType === 'lpr' ? 'block' : 'none';
    document.getElementById(`${type}FixedSection`).style.display = rateType === 'fixed' ? 'block' : 'none';
    
    if (rateType === 'lpr') {
        updateLPRRate(type);
    }
}

// 更新LPR执行利率
function updateLPRRate(type) {
    const lpr = parseFloat(document.getElementById(`${type}LPR`).value) || 0;
    const spread = parseFloat(document.getElementById(`${type}LPRSpread`).value) || 0;
    const currentRate = (lpr + spread).toFixed(2);
    document.getElementById(`${type}CurrentRate`).textContent = currentRate + '%';
}

// 监听LPR输入变化
['comm'].forEach(type => {
    const lprInput = document.getElementById(`${type}LPR`);
    const spreadInput = document.getElementById(`${type}LPRSpread`);
    if (lprInput) {
        lprInput.addEventListener('input', () => updateLPRRate(type));
    }
    if (spreadInput) {
        spreadInput.addEventListener('input', () => updateLPRRate(type));
    }
});

// 切换违约金显示
function togglePenalty() {
    const hasPenalty = document.querySelector('input[name="prePenalty"]:checked').value === 'yes';
    document.getElementById('penaltySection').style.display = hasPenalty ? 'block' : 'none';
}

// Tab切换
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// 计算商业贷款
function calculateCommercial() {
    const amount = parseFloat(document.getElementById('commAmount').value) || 0;
    const years = parseFloat(document.getElementById('commYears').value) || 30;
    
    if (amount <= 0) {
        alert('请输入有效的贷款金额');
        return;
    }
    
    // 获取利率
    const rateType = document.querySelector('input[name="commRateType"]:checked').value;
    let rate;
    if (rateType === 'lpr') {
        const lpr = parseFloat(document.getElementById('commLPR').value) || LPR.lpr5y;
        const spread = parseFloat(document.getElementById('commLPRSpread').value) || 0;
        rate = (lpr + spread) / 100;
    } else {
        rate = (parseFloat(document.getElementById('commFixedRate').value) || COMMERCIAL_LOAN_DEFAULT_RATE) / 100;
    }
    
    const repayType = document.querySelector('input[name="commRepayType"]:checked').value;
    const months = years * 12;
    const loanAmount = amount * 10000;
    
    let result;
    if (repayType === 'equal') {
        result = calculateEqualPayment(loanAmount, rate, months);
    } else {
        result = calculatePrincipalPayment(loanAmount, rate, months);
    }
    
    // 显示结果
    displayCommercialResult(result, amount, years);
    
    // 生成还款计划表
    generateSchedule('comm', result, months, repayType);
    
    // 生成AI建议
    const income = parseFloat(document.getElementById('commIncome').value) || 0;
    const otherDebt = parseFloat(document.getElementById('commOtherDebt').value) || 0;
    generateCommercialSuggestions(result, income, otherDebt, amount);
    
    document.getElementById('commResult').style.display = 'block';
    document.getElementById('commResult').scrollIntoView({ behavior: 'smooth' });
}

// 等额本息计算
function calculateEqualPayment(principal, monthlyRate, months) {
    const monthlyRate_decimal = monthlyRate / 12;
    const monthlyPayment = principal * monthlyRate_decimal * Math.pow(1 + monthlyRate_decimal, months) / 
                          (Math.pow(1 + monthlyRate_decimal, months) - 1);
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - principal;
    
    return {
        monthlyPayment: monthlyPayment,
        totalPayment: totalPayment,
        totalInterest: totalInterest,
        principal: principal,
        months: months,
        type: 'equal'
    };
}

// 等额本金计算
function calculatePrincipalPayment(principal, monthlyRate, months) {
    const monthlyPrincipal = principal / months;
    const monthlyRate_decimal = monthlyRate / 12;
    
    let totalInterest = 0;
    let firstMonthPayment = 0;
    let lastMonthPayment = 0;
    
    const schedule = [];
    
    for (let i = 0; i < months; i++) {
        const remainingPrincipal = principal - monthlyPrincipal * i;
        const monthInterest = remainingPrincipal * monthlyRate_decimal;
        const monthPayment = monthlyPrincipal + monthInterest;
        
        if (i === 0) firstMonthPayment = monthPayment;
        if (i === months - 1) lastMonthPayment = monthPayment;
        
        totalInterest += monthInterest;
        
        schedule.push({
            month: i + 1,
            payment: monthPayment,
            principal: monthlyPrincipal,
            interest: monthInterest,
            remaining: remainingPrincipal - monthlyPrincipal
        });
    }
    
    return {
        firstMonthPayment: firstMonthPayment,
        lastMonthPayment: lastMonthPayment,
        monthlyPrincipal: monthlyPrincipal,
        totalPayment: principal + totalInterest,
        totalInterest: totalInterest,
        principal: principal,
        months: months,
        type: 'principal',
        schedule: schedule
    };
}

// 显示商业贷款结果
function displayCommercialResult(result, amount, years) {
    let html = '';
    
    if (result.type === 'equal') {
        html = `
            <div class="result-item highlight">
                <span class="label">每月还款</span>
                <span class="value primary">${formatMoney(result.monthlyPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">还款总额</span>
                <span class="value">${formatMoney(result.totalPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">利息总额</span>
                <span class="value warning">${formatMoney(result.totalInterest)}</span>
            </div>
        `;
    } else {
        html = `
            <div class="result-item highlight">
                <span class="label">首月还款</span>
                <span class="value primary">${formatMoney(result.firstMonthPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">末月还款</span>
                <span class="value">${formatMoney(result.lastMonthPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">每月递减</span>
                <span class="value success">${formatMoney(result.monthlyPrincipal * (result.months > 1 ? result.schedule[0].interest - result.schedule[1].interest : 0) / result.monthlyPrincipal)}</span>
            </div>
            <div class="result-item">
                <span class="label">还款总额</span>
                <span class="value">${formatMoney(result.totalPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">利息总额</span>
                <span class="value warning">${formatMoney(result.totalInterest)}</span>
            </div>
        `;
    }
    
    html += `
        <div class="result-item">
            <span class="label">贷款金额</span>
            <span class="value">${amount}万</span>
        </div>
        <div class="result-item">
            <span class="label">贷款期限</span>
            <span class="value">${years}年</span>
        </div>
    `;
    
    document.getElementById('commResultGrid').innerHTML = html;
}

// 生成还款计划表
function generateSchedule(type, result, months, repayType) {
    let html = '<table><thead><tr><th>期数</th><th>月供</th><th>本金</th><th>利息</th><th>剩余本金</th></tr></thead><tbody>';
    
    if (repayType === 'equal') {
        const monthlyRate = result.monthlyPayment / result.principal;
        let remaining = result.principal;
        
        for (let i = 1; i <= Math.min(months, 12); i++) {
            const interest = remaining * (result.monthlyPayment * 12 - result.principal) / result.principal / 12;
            const principal = result.monthlyPayment - interest;
            remaining -= principal;
            
            html += `<tr><td>${i}</td><td>${formatMoney(result.monthlyPayment)}</td><td>${formatMoney(principal)}</td><td>${formatMoney(interest)}</td><td>${formatMoney(Math.max(0, remaining))}</td></tr>`;
        }
    } else {
        for (let i = 0; i < Math.min(result.schedule.length, 12); i++) {
            const item = result.schedule[i];
            html += `<tr><td>${item.month}</td><td>${formatMoney(item.payment)}</td><td>${formatMoney(item.principal)}</td><td>${formatMoney(item.interest)}</td><td>${formatMoney(Math.max(0, item.remaining))}</td></tr>`;
        }
    }
    
    html += '</tbody></table>';
    document.getElementById(`${type}ScheduleTable`).innerHTML = html;
}

// 显示还款计划（年/月切换）
function showSchedule(type, view) {
    document.querySelectorAll(`#${type} .btn-toggle`).forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    // 这里可以扩展按年显示的逻辑
}

// 生成商业贷款建议
function generateCommercialSuggestions(result, income, otherDebt, loanAmount) {
    const suggestions = [];
    const monthlyPayment = result.type === 'equal' ? result.monthlyPayment : result.firstMonthPayment;
    
    if (income > 0) {
        const debtRatio = (monthlyPayment + otherDebt) / income * 100;
        
        if (debtRatio <= 30) {
            suggestions.push(`您的月供占收入比例为${debtRatio.toFixed(1)}%，处于健康水平，财务压力较小。`);
        } else if (debtRatio <= 40) {
            suggestions.push(`您的月供占收入比例为${debtRatio.toFixed(1)}%，处于合理范围，建议保持稳定的收入来源。`);
        } else if (debtRatio <= 50) {
            suggestions.push(`您的月供占收入比例为${debtRatio.toFixed(1)}%，偏高，建议适当控制其他支出或考虑延长贷款期限降低月供。`);
        } else {
            suggestions.push(`⚠️ 您的月供占收入比例为${debtRatio.toFixed(1)}%，超过50%，财务风险较高，建议重新评估贷款方案。`);
        }
        
        // 收入规划建议
        const recommendedMax = income * 0.4;
        if (monthlyPayment > recommendedMax) {
            suggestions.push(`建议月供控制在${formatMoney(recommendedMax)}以内，您可以考虑增加首付比例或延长贷款期限。`);
        }
    }
    
    // 还款方式建议
    if (result.type === 'equal') {
        suggestions.push('等额本息每月还款固定，适合收入稳定的购房者。如果前期资金充裕，可考虑等额本金节省利息。');
    } else {
        suggestions.push('等额本金前期还款压力大但总利息少，适合前期资金充裕的购房者。');
    }
    
    // 提前还款建议
    const interestRatio = result.totalInterest / result.totalPayment * 100;
    suggestions.push(`您的贷款利息占总还款的${interestRatio.toFixed(1)}%，如果手头有闲置资金，可以考虑提前还款节省利息。`);
    
    // LPR建议
    const rateType = document.querySelector('input[name="commRateType"]:checked').value;
    if (rateType === 'lpr') {
        suggestions.push('您选择了LPR浮动利率，利率会随市场调整。建议关注LPR变化趋势，适时考虑转换为固定利率或调整还款策略。');
    }
    
    document.getElementById('commSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
    document.getElementById('commSuggestions').style.display = 'block';
}

// 计算公积金贷款
function calculateProvident() {
    const amount = parseFloat(document.getElementById('provAmount').value) || 0;
    const years = parseFloat(document.getElementById('provYears').value) || 30;
    const rate = (parseFloat(document.getElementById('provRate').value) || PROVIDENT_FUND_RATE.above5y) / 100;
    
    if (amount <= 0) {
        alert('请输入有效的贷款金额');
        return;
    }
    
    const repayType = document.querySelector('input[name="provRepayType"]:checked').value;
    const months = years * 12;
    const loanAmount = amount * 10000;
    
    let result;
    if (repayType === 'equal') {
        result = calculateEqualPayment(loanAmount, rate, months);
    } else {
        result = calculatePrincipalPayment(loanAmount, rate, months);
    }
    
    displayProvidentResult(result, amount, years, rate);
    
    const income = parseFloat(document.getElementById('provIncome').value) || 0;
    const balance = parseFloat(document.getElementById('provBalance').value) || 0;
    generateProvidentSuggestions(result, income, balance);
    
    document.getElementById('provResult').style.display = 'block';
    document.getElementById('provResult').scrollIntoView({ behavior: 'smooth' });
}

// 显示公积金贷款结果
function displayProvidentResult(result, amount, years, rate) {
    let html = '';
    
    if (result.type === 'equal') {
        html = `
            <div class="result-item highlight">
                <span class="label">每月还款</span>
                <span class="value primary">${formatMoney(result.monthlyPayment)}</span>
            </div>
        `;
    } else {
        html = `
            <div class="result-item highlight">
                <span class="label">首月还款</span>
                <span class="value primary">${formatMoney(result.firstMonthPayment)}</span>
            </div>
        `;
    }
    
    html += `
        <div class="result-item">
            <span class="label">还款总额</span>
            <span class="value">${formatMoney(result.totalPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">利息总额</span>
            <span class="value warning">${formatMoney(result.totalInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">贷款金额</span>
            <span class="value">${amount}万</span>
        </div>
        <div class="result-item">
            <span class="label">年利率</span>
            <span class="value">${(rate * 100).toFixed(2)}%</span>
        </div>
    `;
    
    document.getElementById('provResultGrid').innerHTML = html;
}

// 生成公积金贷款建议
function generateProvidentSuggestions(result, income, balance) {
    const suggestions = [];
    const monthlyPayment = result.type === 'equal' ? result.monthlyPayment : result.firstMonthPayment;
    
    suggestions.push('公积金贷款利率低于商业贷款，是最划算的贷款方式，建议优先使用公积金贷款额度。');
    
    if (balance > 0) {
        const canCoverMonths = Math.floor(balance / monthlyPayment);
        suggestions.push(`您的公积金账户余额${formatMoney(balance)}可以抵扣约${canCoverMonths}个月的月供，建议办理月冲业务减轻现金压力。`);
    }
    
    if (income > 0) {
        const ratio = monthlyPayment / income * 100;
        suggestions.push(`公积金月供占收入${ratio.toFixed(1)}%，${ratio <= 30 ? '压力较小' : ratio <= 40 ? '在合理范围' : '建议适当调整'}。`);
    }
    
    suggestions.push('公积金可以提取用于支付房租、装修等，建议了解当地公积金提取政策，合理利用公积金。');
    
    document.getElementById('provSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
    document.getElementById('provSuggestions').style.display = 'block';
}

// 计算组合贷款
function calculateCombined() {
    const commAmount = parseFloat(document.getElementById('combCommAmount').value) || 0;
    const provAmount = parseFloat(document.getElementById('combProvAmount').value) || 0;
    const years = parseFloat(document.getElementById('combYears').value) || 30;
    const commRate = (parseFloat(document.getElementById('combCommRate').value) || LPR.lpr5y) / 100;
    const provRate = (parseFloat(document.getElementById('combProvRate').value) || PROVIDENT_FUND_RATE.above5y) / 100;
    
    if (commAmount <= 0 && provAmount <= 0) {
        alert('请输入商业贷款或公积金贷款金额');
        return;
    }
    
    const repayType = document.querySelector('input[name="combRepayType"]:checked').value;
    const months = years * 12;
    
    let commResult, provResult;
    
    if (commAmount > 0) {
        if (repayType === 'equal') {
            commResult = calculateEqualPayment(commAmount * 10000, commRate, months);
        } else {
            commResult = calculatePrincipalPayment(commAmount * 10000, commRate, months);
        }
    }
    
    if (provAmount > 0) {
        if (repayType === 'equal') {
            provResult = calculateEqualPayment(provAmount * 10000, provRate, months);
        } else {
            provResult = calculatePrincipalPayment(provAmount * 10000, provRate, months);
        }
    }
    
    displayCombinedResult(commResult, provResult, commAmount, provAmount, years);
    
    const income = parseFloat(document.getElementById('combIncome').value) || 0;
    generateCombinedSuggestions(commResult, provResult, income, commAmount, provAmount);
    
    document.getElementById('combResult').style.display = 'block';
    document.getElementById('combResult').scrollIntoView({ behavior: 'smooth' });
}

// 显示组合贷款结果
function displayCombinedResult(commResult, provResult, commAmount, provAmount, years) {
    let totalMonthly = 0;
    let totalPayment = 0;
    let totalInterest = 0;
    let html = '';
    
    if (commResult) {
        const monthly = commResult.type === 'equal' ? commResult.monthlyPayment : commResult.firstMonthPayment;
        totalMonthly += monthly;
        totalPayment += commResult.totalPayment;
        totalInterest += commResult.totalInterest;
        
        html += `
            <div class="result-item">
                <span class="label">商业贷月供</span>
                <span class="value">${formatMoney(monthly)}</span>
            </div>
        `;
    }
    
    if (provResult) {
        const monthly = provResult.type === 'equal' ? provResult.monthlyPayment : provResult.firstMonthPayment;
        totalMonthly += monthly;
        totalPayment += provResult.totalPayment;
        totalInterest += provResult.totalInterest;
        
        html += `
            <div class="result-item">
                <span class="label">公积金月供</span>
                <span class="value">${formatMoney(monthly)}</span>
            </div>
        `;
    }
    
    html += `
        <div class="result-item highlight">
            <span class="label">总月供</span>
            <span class="value primary">${formatMoney(totalMonthly)}</span>
        </div>
        <div class="result-item">
            <span class="label">还款总额</span>
            <span class="value">${formatMoney(totalPayment)}</span>
        </div>
        <div class="result-item">
            <span class="label">利息总额</span>
            <span class="value warning">${formatMoney(totalInterest)}</span>
        </div>
        <div class="result-item">
            <span class="label">贷款总额</span>
            <span class="value">${commAmount + provAmount}万</span>
        </div>
    `;
    
    document.getElementById('combResultGrid').innerHTML = html;
}

// 生成组合贷款建议
function generateCombinedSuggestions(commResult, provResult, income, commAmount, provAmount) {
    const suggestions = [];
    const totalAmount = commAmount + provAmount;
    
    if (totalAmount > 0) {
        const provRatio = provAmount / totalAmount * 100;
        suggestions.push(`您的贷款中公积金占比${provRatio.toFixed(0)}%，${provRatio >= 50 ? '比例较高，充分利用了低利率优势' : '可以适当提高公积金比例以降低利息支出'}。`);
    }
    
    if (income > 0 && commResult && provResult) {
        const commMonthly = commResult.type === 'equal' ? commResult.monthlyPayment : commResult.firstMonthPayment;
        const provMonthly = provResult.type === 'equal' ? provResult.monthlyPayment : provResult.firstMonthPayment;
        const totalMonthly = commMonthly + provMonthly;
        const ratio = totalMonthly / income * 100;
        
        suggestions.push(`组合贷月供占收入${ratio.toFixed(1)}%，${ratio <= 40 ? '财务状况良好' : '建议关注现金流管理'}。`);
    }
    
    suggestions.push('组合贷款可以充分利用公积金贷款的低利率优势，同时通过商业贷款补充额度，是大多数购房者的最优选择。');
    suggestions.push('建议优先使用公积金贷款额度，不足部分再用商业贷款补充，这样可以最大程度降低利息支出。');
    
    document.getElementById('combSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
    document.getElementById('combSuggestions').style.display = 'block';
}

// 计算提前还款
function calculatePrepay() {
    const remain = parseFloat(document.getElementById('preRemain').value) || 0;
    const rate = (parseFloat(document.getElementById('preRate').value) || LPR.lpr5y) / 100;
    const years = parseFloat(document.getElementById('preYears').value) || 20;
    const currentPayment = parseFloat(document.getElementById('preCurrentPayment').value) || 0;
    const prepayAmount = parseFloat(document.getElementById('preAmount').value) || 0;
    const method = document.querySelector('input[name="preMethod"]:checked').value;
    
    if (remain <= 0 || prepayAmount <= 0) {
        alert('请输入有效的剩余本金和提前还款金额');
        return;
    }
    
    const months = years * 12;
    const remainPrincipal = remain * 10000;
    const prepayPrincipal = prepayAmount * 10000;
    const newPrincipal = remainPrincipal - prepayPrincipal;
    
    // 计算违约金
    const hasPenalty = document.querySelector('input[name="prePenalty"]:checked').value === 'yes';
    const penaltyRate = hasPenalty ? (parseFloat(document.getElementById('prePenaltyRate').value) || 1) / 100 : 0;
    const penalty = prepayPrincipal * penaltyRate;
    
    let result;
    if (method === 'reduceTerm') {
        // 缩短年限，月供不变
        result = calculateReduceTerm(remainPrincipal, newPrincipal, rate, months, currentPayment);
    } else {
        // 减少月供，年限不变
        result = calculateReducePayment(newPrincipal, rate, months);
    }
    
    displayPrepayResult(result, prepayAmount, penalty, method);
    generatePrepaySuggestions(result, penalty, method);
    
    document.getElementById('preResult').style.display = 'block';
    document.getElementById('preResult').scrollIntoView({ behavior: 'smooth' });
}

// 缩短年限计算
function calculateReduceTerm(oldPrincipal, newPrincipal, rate, months, currentPayment) {
    const monthlyRate = rate / 12;
    
    // 原方案总利息
    const oldTotalInterest = currentPayment * months - oldPrincipal;
    
    // 新月供不变，计算新期限
    let newMonths = 0;
    let remaining = newPrincipal;
    let newTotalInterest = 0;
    
    while (remaining > 0 && newMonths < 360) {
        const interest = remaining * monthlyRate;
        const principal = currentPayment - interest;
        if (principal <= 0) break;
        remaining -= principal;
        newTotalInterest += interest;
        newMonths++;
    }
    
    const savedInterest = oldTotalInterest - newTotalInterest;
    const savedMonths = months - newMonths;
    
    return {
        method: 'reduceTerm',
        newMonths: newMonths,
        savedMonths: savedMonths,
        savedInterest: savedInterest,
        monthlyPayment: currentPayment,
        newTotalPayment: newPrincipal + newTotalInterest
    };
}

// 减少月供计算
function calculateReducePayment(newPrincipal, rate, months) {
    const monthlyRate = rate / 12;
    const newMonthlyPayment = newPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                              (Math.pow(1 + monthlyRate, months) - 1);
    const newTotalPayment = newMonthlyPayment * months;
    
    return {
        method: 'reducePayment',
        newMonthlyPayment: newMonthlyPayment,
        newTotalPayment: newTotalPayment,
        months: months
    };
}

// 显示提前还款结果
function displayPrepayResult(result, prepayAmount, penalty, method) {
    let html = '';
    
    if (method === 'reduceTerm') {
        html = `
            <div class="result-item highlight">
                <span class="label">节省利息</span>
                <span class="value success">${formatMoney(result.savedInterest)}</span>
            </div>
            <div class="result-item">
                <span class="label">缩短年限</span>
                <span class="value">${Math.floor(result.savedMonths / 12)}年${result.savedMonths % 12}个月</span>
            </div>
            <div class="result-item">
                <span class="label">月供不变</span>
                <span class="value">${formatMoney(result.monthlyPayment)}</span>
            </div>
        `;
    } else {
        html = `
            <div class="result-item highlight">
                <span class="label">新月供</span>
                <span class="value primary">${formatMoney(result.newMonthlyPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">月供减少</span>
                <span class="value success">${formatMoney(result.monthlyPayment - result.newMonthlyPayment)}</span>
            </div>
            <div class="result-item">
                <span class="label">还款期限</span>
                <span class="value">不变</span>
            </div>
        `;
    }
    
    if (penalty > 0) {
        html += `
            <div class="result-item">
                <span class="label">违约金</span>
                <span class="value warning">${formatMoney(penalty)}</span>
            </div>
        `;
    }
    
    html += `
        <div class="result-item">
            <span class="label">提前还款</span>
            <span class="value">${prepayAmount}万</span>
        </div>
    `;
    
    document.getElementById('preResultGrid').innerHTML = html;
}

// 生成提前还款建议
function generatePrepaySuggestions(result, penalty, method) {
    const suggestions = [];
    
    if (method === 'reduceTerm') {
        suggestions.push(`选择缩短年限方式，您可以节省${formatMoney(result.savedInterest)}利息，并提前${Math.floor(result.savedMonths / 12)}年还清贷款。`);
        suggestions.push('缩短年限方式适合收入稳定、希望尽快还清贷款的购房者。');
    } else {
        suggestions.push('选择减少月供方式，您可以降低每月还款压力，增加现金流灵活性。');
        suggestions.push('减少月供方式适合希望提高生活质量或有其他投资计划的购房者。');
    }
    
    if (penalty > 0) {
        suggestions.push(`提前还款需支付${formatMoney(penalty)}违约金，建议在计算节省利息后再决定是否提前还款。`);
    }
    
    suggestions.push('提前还款最佳时机通常是贷款初期，此时利息占比高，提前还款节省效果明显。');
    suggestions.push('如果您有其他收益率高于贷款利率的投资渠道，可以考虑投资而非提前还款。');
    
    document.getElementById('preSuggestionsContent').innerHTML = '<ul>' + suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
    document.getElementById('preSuggestions').style.display = 'block';
}

// 切换利率表显示
function showRateTable(type) {
    document.querySelectorAll('.rate-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('lprRateTable').style.display = type === 'lpr' ? 'block' : 'none';
    document.getElementById('providentRateTable').style.display = type === 'provident' ? 'block' : 'none';
}

// 格式化金额
function formatMoney(amount) {
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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