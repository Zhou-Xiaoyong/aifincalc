// ─── 使用 constants.js 中的统一常量 ───────────────────────
// cityData / taxBrackets / bonusBrackets 均来自 shared/constants.js
// 请勿在此处硬编码，直接引用常量即可
const cityData       = CITY_SOCIAL_RATES;
const taxBrackets    = TAX_BRACKETS;
const bonusBrackets  = BONUS_BRACKETS;

// 填充城市下拉列表
(function() {
    const sel = document.getElementById('city');
    if (!sel || typeof CITY_SOCIAL_RATES === 'undefined') return;
    const keys = Object.keys(CITY_SOCIAL_RATES);
    keys.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = CITY_SOCIAL_RATES[key].name;
        sel.appendChild(opt);
    });
    // 添加"其他城市"选项
    const otherOpt = document.createElement('option');
    otherOpt.value = 'other';
    otherOpt.textContent = '其他城市';
    sel.appendChild(otherOpt);
})();

// Tab切换
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// 自动填充城市社保比例
function autoFillSocial() {
    const city = document.getElementById('city').value;
    if (cityData[city]) {
        const data = cityData[city];
        document.getElementById('pensionRate').value = data.pension;
        document.getElementById('medicalRate').value = data.medical;
        document.getElementById('unemploymentRate').value = data.unemployment;
        document.getElementById('housingRate').value = data.housing;
    }
}

// calculateMonthly 在下方定义（含月度结果存储与年度同步逻辑）

// calculateBonus 在下方定义（含月度结果存储逻辑）

// 计算年度汇算
function calculateAnnual() {
    const income = parseFloat(document.getElementById('annualIncome').value) || 0;
    const insurance = parseFloat(document.getElementById('annualInsurance').value) || 0;
    const deduction = parseFloat(document.getElementById('annualDeduction').value) || 0;

    if (income <= 0) {
        alert('请输入有效的年度综合所得');
        return;
    }

    const threshold = TAX_THRESHOLD_ANNUAL;
    const taxable = Math.max(0, income - insurance - deduction - threshold);

    let tax = 0;
    let taxDetail = '';
    if (taxable > 0) {
        for (let bracket of taxBrackets) {
            if (taxable <= bracket.limit) {
                tax = taxable * bracket.rate - bracket.deduction;
                taxDetail = `适用税率 ${(bracket.rate * 100).toFixed(0)}%，速算扣除数 ${formatMoney(bracket.deduction)}`;
                break;
            }
        }
    }

    document.getElementById('annualResultGrid').innerHTML = `
        <div class="result-item">
            <span class="label">年度综合所得</span>
            <span class="value">${formatMoney(income)}</span>
        </div>
        <div class="result-item">
            <span class="label">五险一金扣除</span>
            <span class="value deduct">-${formatMoney(insurance)}</span>
        </div>
        <div class="result-item">
            <span class="label">专项附加扣除</span>
            <span class="value deduct">-${formatMoney(deduction)}</span>
        </div>
        <div class="result-item">
            <span class="label">基本减除费用</span>
            <span class="value deduct">-${formatMoney(threshold)}</span>
        </div>
        <div class="result-item">
            <span class="label">应纳税所得额</span>
            <span class="value">${formatMoney(taxable)}</span>
        </div>
        <div class="result-item highlight">
            <span class="label">年度应缴个税</span>
            <span class="value tax">${formatMoney(tax)}</span>
        </div>
        <div class="result-item" style="grid-column: 1 / -1;">
            <p style="color:#667eea;margin-top:10px;">${taxDetail}</p>
        </div>
    `;

    document.getElementById('annualResult').style.display = 'block';
    document.getElementById('annualResult').scrollIntoView({ behavior: 'smooth' });
}

// 生成AI智能结果解读
function generateSuggestions(salary, insurance, deduction, tax, taxable) {
    const analysis = [];
    
    const taxRate = taxable > 0 ? tax / taxable * 100 : 0;
    const effectiveRate = salary > 0 ? tax / salary * 100 : 0;
    
    analysis.push(`## 💰 计算结果分析`);
    analysis.push(`您的税前月薪为 **${formatMoney(salary)}**，税后到手收入为 **${formatMoney(salary - insurance - tax)}**。`);
    analysis.push(`每月缴纳个税 **${formatMoney(tax)}**，税后占比 **${effectiveRate.toFixed(1)}%**。`);
    
    if (taxable > 0) {
        const currentBracket = taxBrackets.find(b => taxable * 12 <= b.limit);
        if (currentBracket) {
            analysis.push(`当前适用 **${(currentBracket.rate * 100).toFixed(0)}%** 税率档，速算扣除数 **${formatMoney(currentBracket.deduction / 12)}**。`);
            if (currentBracket.rate >= 0.25) {
                analysis.push(`⚠️ **注意**：您处于较高税率档，建议关注节税优化方案。`);
            }
        }
    }
    
    analysis.push('');
    analysis.push(`## 📊 扣除项分析`);
    
    const threshold = TAX_THRESHOLD_MONTHLY;
    const totalDeductible = insurance + deduction + threshold;
    analysis.push(`您的月度总扣除金额为 **${formatMoney(totalDeductible)}**，其中：`);
    analysis.push(`- 基本减除费用（起征点）：**${formatMoney(threshold)}**`);
    analysis.push(`- 五险一金：**${formatMoney(insurance)}**（占税前工资的 **${(insurance/salary*100).toFixed(1)}%**）`);
    analysis.push(`- 专项附加扣除：**${formatMoney(deduction)}**`);
    
    if (deduction === 0) {
        analysis.push('');
        analysis.push(`⚠️ **节税建议**：您当前未享受任何专项附加扣除。根据个税政策，以下项目可申请扣除：`);
        analysis.push(`- 👶 子女教育：每个子女每月1000元`);
        analysis.push(`- 🏠 住房贷款利息：每月1000元`);
        analysis.push(`- 🏠 住房租金：根据城市不同800-1500元`);
        analysis.push(`- 🧓 赡养老人：独生子女每月2000元，非独生子女分摊`);
        analysis.push(`- 📚 继续教育：学历教育每月400元，职业资格每年3600元`);
        analysis.push(`- 👶 3岁以下婴幼儿照护：每个婴幼儿每月1000元`);
        analysis.push(`建议检查是否符合上述条件，合理利用扣除政策可有效降低税负。`);
    } else {
        const unusedDeductions = [];
        if (!document.getElementById('child')?.checked) unusedDeductions.push('子女教育');
        if (!document.getElementById('housingLoan')?.checked && !document.getElementById('housingRent')?.checked) unusedDeductions.push('住房贷款利息/租金');
        if (!document.getElementById('elderly')?.checked) unusedDeductions.push('赡养老人');
        if (!document.getElementById('education')?.checked) unusedDeductions.push('继续教育');
        if (!document.getElementById('infant')?.checked) unusedDeductions.push('婴幼儿照护');
        
        if (unusedDeductions.length > 0) {
            analysis.push('');
            analysis.push(`💡 **优化空间**：您还未申报以下专项附加扣除，如有符合条件的项目建议补充申报：`);
            analysis.push(`- ${unusedDeductions.join('、')}`);
        }
    }
    
    analysis.push('');
    analysis.push(`## 💡 智能节税建议`);
    
    if (insurance < salary * 0.15) {
        analysis.push(`1️⃣ **社保缴纳优化**：您的社保缴纳比例为 **${(insurance/salary*100).toFixed(1)}%**，建议确认是否按实际工资基数缴纳。足额缴纳社保不仅能增加税前扣除，还能提高未来养老医疗保障水平。`);
    }
    
    if (salary > 15000) {
        analysis.push(`2️⃣ **年终奖计税方式选择**：高收入人群建议分别计算年终奖单独计税和并入综合所得两种方式，选择税负更低的方案。通常收入越高，单独计税优势越明显。`);
    }
    
    if (tax > 500) {
        const potentialSavings = Math.min(tax, (SPECIAL_DEDUCTIONS.elderlyMain + SPECIAL_DEDUCTIONS.child + SPECIAL_DEDUCTIONS.infant - deduction) * 0.2);
        analysis.push(`3️⃣ **充分利用专项附加扣除**：如果您目前的扣除项目较少，建议尽可能申报符合条件的扣除。例如申报赡养老人和子女教育，每月可多扣除 **${SPECIAL_DEDUCTIONS.elderlyMain + SPECIAL_DEDUCTIONS.child}** 元，预计每月可节税 **${formatMoney(potentialSavings)}**。`);
    }
    
    analysis.push('4️⃣ **年度汇算清缴**：每年3月1日至6月30日进行个税年度汇算，多退少补。如果您有年度一次性奖金、劳务报酬等其他收入，建议汇算时统一计算。');
    
    analysis.push('');
    analysis.push(`## 📋 年度预估`);
    analysis.push(`按当前计算标准，您的年度预估数据如下：`);
    analysis.push(`- 年度税前收入：**${formatMoney(salary * 12)}**`);
    analysis.push(`- 年度个税缴纳：**${formatMoney(tax * 12)}**`);
    analysis.push(`- 年度税后收入：**${formatMoney((salary - insurance - tax) * 12)}**`);
    
    const htmlContent = analysis.map(line => {
        if (line.startsWith('## ')) {
            return `<h4>${line.replace('## ', '')}</h4>`;
        } else if (line.startsWith('- ')) {
            return `<li>${line.replace('- ', '')}</li>`;
        } else if (line.startsWith('⚠️ ') || line.startsWith('💡 ') || line.startsWith('1️⃣ ') || line.startsWith('2️⃣ ') || line.startsWith('3️⃣ ') || line.startsWith('4️⃣ ')) {
            return `<p>${line}</p>`;
        } else if (line === '') {
            return `<br>`;
        }
        return `<p>${line}</p>`;
    }).join('');

    document.getElementById('suggestionsContent').innerHTML = htmlContent;
    document.getElementById('aiSuggestions').style.display = 'block';
}

// 格式化金额
function formatMoney(amount) {
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 高亮当前税率档位
function highlightTaxRate(monthlyTaxable) {
    // 清除之前的高亮
    document.querySelectorAll('.tax-rate-table tbody tr').forEach(row => {
        row.classList.remove('current-rate');
    });
    
    if (monthlyTaxable <= 0) return;
    
    const annualTaxable = monthlyTaxable * 12;
    let currentRate = 0;
    
    for (let bracket of taxBrackets) {
        if (annualTaxable <= bracket.limit) {
            currentRate = bracket.rate * 100;
            break;
        }
    }
    
    // 高亮对应税率行
    const rateRow = document.querySelector(`.tax-rate-table tbody tr[data-rate="${currentRate}"]`);
    if (rateRow) {
        rateRow.classList.add('current-rate');
        rateRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 监听专项扣除选择
document.querySelectorAll('.deduction-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function() {
        this.closest('.deduction-item').style.background = this.checked ? '#e3f2fd' : '#f8f9fa';
        this.closest('.deduction-item').style.borderColor = this.checked ? '#667eea' : 'transparent';
    });
});

// 存储计算结果，用于年度汇算同步
let monthlyResultData = null;
let bonusResultData = null;

// 月度计算函数（含结果存储与年度同步逻辑）
calculateMonthly = function() {
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    if (salary <= 0) {
        alert('请输入有效的税前月薪');
        return;
    }

    const socialBase = parseFloat(document.getElementById('socialBase').value) || salary;
    const pensionRate = parseFloat(document.getElementById('pensionRate').value) || 0;
    const medicalRate = parseFloat(document.getElementById('medicalRate').value) || 0;
    const unemploymentRate = parseFloat(document.getElementById('unemploymentRate').value) || 0;
    const housingRate = parseFloat(document.getElementById('housingRate').value) || 0;

    const pension = socialBase * pensionRate / 100;
    const medical = socialBase * medicalRate / 100;
    const unemployment = socialBase * unemploymentRate / 100;
    const housing = socialBase * housingRate / 100;
    const insurance = pension + medical + unemployment + housing;

    let deduction = 0;
    document.querySelectorAll('.deduction-item input[type="checkbox"]:checked').forEach(cb => {
        if (cb.id === 'elderly') {
            deduction += parseFloat(document.getElementById('elderlyAmount').value);
        } else {
            deduction += parseFloat(cb.dataset.monthly) || 0;
        }
    });

    const otherDeduction = parseFloat(document.getElementById('otherDeduction').value) || 0;
    deduction += otherDeduction;

    const threshold = TAX_THRESHOLD_MONTHLY;
    const taxable = Math.max(0, salary - insurance - deduction - threshold);

    let tax = 0;
    if (taxable > 0) {
        const annualTaxable = taxable * 12;
        for (let bracket of taxBrackets) {
            if (annualTaxable <= bracket.limit) {
                const annualTax = annualTaxable * bracket.rate - bracket.deduction;
                tax = annualTax / 12;
                break;
            }
        }
    }

    const income = salary - insurance - tax;

    // 保存计算结果
    monthlyResultData = {
        salary: salary,
        insurance: insurance,
        deduction: deduction,
        tax: tax,
        income: income
    };

    // 显示结果
    document.getElementById('resSalary').textContent = formatMoney(salary);
    document.getElementById('resInsurance').textContent = '-' + formatMoney(insurance);
    document.getElementById('resDeduction').textContent = '-' + formatMoney(deduction);
    document.getElementById('resTaxable').textContent = formatMoney(taxable);
    document.getElementById('resTax').textContent = formatMoney(tax);
    document.getElementById('resIncome').textContent = formatMoney(income);
    
    // 高亮当前税率档位
    highlightTaxRate(taxable);

    document.getElementById('taxDetail').innerHTML = `
        <h4>计算详情</h4>
        <table>
            <tr><th>项目</th><th>金额</th></tr>
            <tr><td>养老保险</td><td>${formatMoney(pension)}</td></tr>
            <tr><td>医疗保险</td><td>${formatMoney(medical)}</td></tr>
            <tr><td>失业保险</td><td>${formatMoney(unemployment)}</td></tr>
            <tr><td>住房公积金</td><td>${formatMoney(housing)}</td></tr>
            <tr><td>起征点</td><td>${formatMoney(threshold)}</td></tr>
        </table>
    `;

    generateSuggestions(salary, insurance, deduction, tax, taxable);

    document.getElementById('monthlyResult').style.display = 'block';
    document.getElementById('monthlyResult').scrollIntoView({ behavior: 'smooth' });

    // 自动同步到年度汇算
    setTimeout(() => syncAnnualData(), 500);
};

// 年终奖计算函数（含结果存储逻辑）
calculateBonus = function() {
    const bonus = parseFloat(document.getElementById('bonus').value) || 0;
    if (bonus <= 0) {
        alert('请输入有效的年终奖金额');
        return;
    }

    const monthlyAvg = bonus / 12;
    let tax = 0;
    let rate = 0;
    
    for (let bracket of bonusBrackets) {
        if (monthlyAvg <= bracket.limit) {
            rate = bracket.rate;
            tax = bonus * bracket.rate - bracket.deduction;
            break;
        }
    }

    const income = bonus - tax;

    // 保存计算结果
    bonusResultData = {
        bonus: bonus,
        tax: tax,
        income: income,
        rate: rate
    };

    document.getElementById('bonusResultGrid').innerHTML = `
        <div class="result-item">
            <span class="label">年终奖总额</span>
            <span class="value">${formatMoney(bonus)}</span>
        </div>
        <div class="result-item">
            <span class="label">月均金额</span>
            <span class="value">${formatMoney(monthlyAvg)}</span>
        </div>
        <div class="result-item">
            <span class="label">适用税率</span>
            <span class="value">${(rate * 100).toFixed(0)}%</span>
        </div>
        <div class="result-item highlight">
            <span class="label">应缴个税</span>
            <span class="value tax">${formatMoney(tax)}</span>
        </div>
        <div class="result-item important">
            <span class="label">税后收入</span>
            <span class="value income">${formatMoney(income)}</span>
        </div>
    `;

    document.getElementById('bonusResult').style.display = 'block';
    document.getElementById('bonusResult').scrollIntoView({ behavior: 'smooth' });
};

// 同步数据到年度汇算
function syncAnnualData() {
    let hasData = false;
    
    // 同步月度工资数据
    if (monthlyResultData) {
        const annualIncome = monthlyResultData.salary * 12;
        const annualInsurance = monthlyResultData.insurance * 12;
        const annualDeduction = monthlyResultData.deduction * 12;
        
        document.getElementById('annualIncome').value = Math.round(annualIncome);
        document.getElementById('annualInsurance').value = Math.round(annualInsurance);
        document.getElementById('annualDeduction').value = Math.round(annualDeduction);
        
        hasData = true;
    }
    
    // 同步年终奖数据
    if (bonusResultData) {
        document.getElementById('annualBonus').value = Math.round(bonusResultData.bonus);
        hasData = true;
    }
    
    // 显示/隐藏同步提示
    const notice = document.getElementById('syncNotice');
    if (hasData) {
        notice.style.display = 'flex';
        notice.querySelector('span').textContent = '已自动同步月度工资和年终奖数据';
    } else {
        notice.style.display = 'none';
    }
}

// Tab切换时检查是否需要同步
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        if (this.dataset.tab === 'annual') {
            syncAnnualData();
        }
    });
});

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