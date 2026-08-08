// ─── 单位缴纳比例数据 ───────────────────────
// 各城市单位社保缴纳比例（个人比例来自 shared/constants.js 的 CITY_SOCIAL_RATES）
const CITY_COMPANY_RATES = {
    beijing: {
        name: '北京',
        pension: 16, medical: 10, unemployment: 0.5, injury: 0.5, maternity: 0.8, housing: 12
    },
    shanghai: {
        name: '上海',
        pension: 16, medical: 10, unemployment: 0.5, injury: 0.5, maternity: 1, housing: 7
    },
    guangzhou: {
        name: '广州',
        pension: 15, medical: 6,   unemployment: 0.32, injury: 0.4, maternity: 0.85, housing: 12
    },
    shenzhen: {
        name: '深圳',
        pension: 15, medical: 6.2, unemployment: 0.5, injury: 0.4, maternity: 0.45, housing: 12
    },
    hangzhou: {
        name: '杭州',
        pension: 15, medical: 10.5, unemployment: 0.5, injury: 0.5, maternity: 1.2, housing: 12
    },
    nanjing: {
        name: '南京',
        pension: 16, medical: 9, unemployment: 0.5, injury: 0.5, maternity: 0.8, housing: 12
    },
    chengdu: {
        name: '成都',
        pension: 16, medical: 7.7, unemployment: 0.6, injury: 0.6, maternity: 0.8, housing: 12
    },
    wuhan: {
        name: '武汉',
        pension: 16, medical: 8, unemployment: 0.7, injury: 0.5, maternity: 0.7, housing: 12
    },
    xian: {
        name: '西安',
        pension: 16, medical: 8, unemployment: 0.7, injury: 0.5, maternity: 0.5, housing: 12
    }
};

// 9个主要城市列表（按顺序显示）
const MAIN_CITIES = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou', 'nanjing', 'chengdu', 'wuhan', 'xian'];

// 填充城市下拉列表
function populateCitySelects() {
    const selects = ['city', 'cityCompany', 'cityCustom'];
    selects.forEach(selectId => {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        MAIN_CITIES.forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = CITY_COMPANY_RATES[key].name;
            sel.appendChild(opt);
        });
    });
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

// 自动填充个人缴纳比例
function autoFillRates() {
    const city = document.getElementById('city').value;
    if (CITY_SOCIAL_RATES && CITY_SOCIAL_RATES[city]) {
        const data = CITY_SOCIAL_RATES[city];
        document.getElementById('personalPension').value = data.pension;
        document.getElementById('personalMedical').value = data.medical;
        document.getElementById('personalUnemployment').value = data.unemployment;
        document.getElementById('personalHousing').value = data.housing;
    }
    if (CITY_COMPANY_RATES[city]) {
        const comData = CITY_COMPANY_RATES[city];
        document.getElementById('personalInjury').value = 0;
        document.getElementById('personalMaternity').value = 0;
    }
}

// 自动填充单位缴纳比例
function autoFillCompanyRates() {
    const city = document.getElementById('cityCompany').value;
    if (CITY_COMPANY_RATES[city]) {
        const data = CITY_COMPANY_RATES[city];
        document.getElementById('companyPension').value = data.pension;
        document.getElementById('companyMedical').value = data.medical;
        document.getElementById('companyUnemployment').value = data.unemployment;
        document.getElementById('companyInjury').value = data.injury;
        document.getElementById('companyMaternity').value = data.maternity;
        document.getElementById('companyHousing').value = data.housing;
    }
}

// 自动填充自定义比例
function autoFillCustomRates() {
    const city = document.getElementById('cityCustom').value;
    if (CITY_SOCIAL_RATES && CITY_SOCIAL_RATES[city]) {
        const perData = CITY_SOCIAL_RATES[city];
        document.getElementById('customPersonalPension').value = perData.pension;
        document.getElementById('customPersonalMedical').value = perData.medical;
        document.getElementById('customPersonalUnemployment').value = perData.unemployment;
        document.getElementById('customPersonalHousing').value = perData.housing;
        document.getElementById('customPersonalInjury').value = 0;
        document.getElementById('customPersonalMaternity').value = 0;
    }
    if (CITY_COMPANY_RATES[city]) {
        const comData = CITY_COMPANY_RATES[city];
        document.getElementById('customCompanyPension').value = comData.pension;
        document.getElementById('customCompanyMedical').value = comData.medical;
        document.getElementById('customCompanyUnemployment').value = comData.unemployment;
        document.getElementById('customCompanyInjury').value = comData.injury;
        document.getElementById('customCompanyMaternity').value = comData.maternity;
        document.getElementById('customCompanyHousing').value = comData.housing;
    }
}

// 格式化金额
function formatMoney(amount) {
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 计算个人缴纳
function calculateSocial() {
    const base = parseFloat(document.getElementById('socialBase').value) || 0;
    if (base <= 0) {
        alert('请输入有效的社保缴费基数');
        return;
    }

    const pensionRate = parseFloat(document.getElementById('personalPension').value) || 0;
    const medicalRate = parseFloat(document.getElementById('personalMedical').value) || 0;
    const unemploymentRate = parseFloat(document.getElementById('personalUnemployment').value) || 0;
    const injuryRate = parseFloat(document.getElementById('personalInjury').value) || 0;
    const maternityRate = parseFloat(document.getElementById('personalMaternity').value) || 0;
    const housingRate = parseFloat(document.getElementById('personalHousing').value) || 0;

    const pension = base * pensionRate / 100;
    const medical = base * medicalRate / 100;
    const unemployment = base * unemploymentRate / 100;
    const injury = base * injuryRate / 100;
    const maternity = base * maternityRate / 100;
    const housing = base * housingRate / 100;
    const total = pension + medical + unemployment + injury + maternity + housing;
    const totalRate = pensionRate + medicalRate + unemploymentRate + injuryRate + maternityRate + housingRate;

    document.getElementById('resBase').textContent = formatMoney(base);
    document.getElementById('resPersonalTotal').textContent = formatMoney(total);

    document.getElementById('ratePension').textContent = pensionRate + '%';
    document.getElementById('rateMedical').textContent = medicalRate + '%';
    document.getElementById('rateUnemployment').textContent = unemploymentRate + '%';
    document.getElementById('rateInjury').textContent = injuryRate + '%';
    document.getElementById('rateMaternity').textContent = maternityRate + '%';
    document.getElementById('rateHousing').textContent = housingRate + '%';
    document.getElementById('rateTotal').textContent = totalRate.toFixed(1) + '%';

    document.getElementById('amountPension').textContent = formatMoney(pension);
    document.getElementById('amountMedical').textContent = formatMoney(medical);
    document.getElementById('amountUnemployment').textContent = formatMoney(unemployment);
    document.getElementById('amountInjury').textContent = formatMoney(injury);
    document.getElementById('amountMaternity').textContent = formatMoney(maternity);
    document.getElementById('amountHousing').textContent = formatMoney(housing);
    document.getElementById('amountTotal').innerHTML = '<strong>' + formatMoney(total) + '</strong>';

    document.getElementById('personalResult').style.display = 'block';
    document.getElementById('personalResult').scrollIntoView({ behavior: 'smooth' });
}

// 计算单位缴纳
function calculateCompany() {
    const base = parseFloat(document.getElementById('socialBaseCompany').value) || 0;
    if (base <= 0) {
        alert('请输入有效的社保缴费基数');
        return;
    }

    const pensionRate = parseFloat(document.getElementById('companyPension').value) || 0;
    const medicalRate = parseFloat(document.getElementById('companyMedical').value) || 0;
    const unemploymentRate = parseFloat(document.getElementById('companyUnemployment').value) || 0;
    const injuryRate = parseFloat(document.getElementById('companyInjury').value) || 0;
    const maternityRate = parseFloat(document.getElementById('companyMaternity').value) || 0;
    const housingRate = parseFloat(document.getElementById('companyHousing').value) || 0;

    const pension = base * pensionRate / 100;
    const medical = base * medicalRate / 100;
    const unemployment = base * unemploymentRate / 100;
    const injury = base * injuryRate / 100;
    const maternity = base * maternityRate / 100;
    const housing = base * housingRate / 100;
    const total = pension + medical + unemployment + injury + maternity + housing;
    const totalRate = pensionRate + medicalRate + unemploymentRate + injuryRate + maternityRate + housingRate;

    document.getElementById('resBaseCompany').textContent = formatMoney(base);
    document.getElementById('resCompanyTotal').textContent = formatMoney(total);

    document.getElementById('comRatePension').textContent = pensionRate + '%';
    document.getElementById('comRateMedical').textContent = medicalRate + '%';
    document.getElementById('comRateUnemployment').textContent = unemploymentRate + '%';
    document.getElementById('comRateInjury').textContent = injuryRate + '%';
    document.getElementById('comRateMaternity').textContent = maternityRate + '%';
    document.getElementById('comRateHousing').textContent = housingRate + '%';
    document.getElementById('comRateTotal').textContent = totalRate.toFixed(1) + '%';

    document.getElementById('comAmountPension').textContent = formatMoney(pension);
    document.getElementById('comAmountMedical').textContent = formatMoney(medical);
    document.getElementById('comAmountUnemployment').textContent = formatMoney(unemployment);
    document.getElementById('comAmountInjury').textContent = formatMoney(injury);
    document.getElementById('comAmountMaternity').textContent = formatMoney(maternity);
    document.getElementById('comAmountHousing').textContent = formatMoney(housing);
    document.getElementById('comAmountTotal').innerHTML = '<strong>' + formatMoney(total) + '</strong>';

    document.getElementById('companyResult').style.display = 'block';
    document.getElementById('companyResult').scrollIntoView({ behavior: 'smooth' });
}

// 计算自定义比例
function calculateCustom() {
    const base = parseFloat(document.getElementById('socialBaseCustom').value) || 0;
    if (base <= 0) {
        alert('请输入有效的社保缴费基数');
        return;
    }

    const perPensionRate = parseFloat(document.getElementById('customPersonalPension').value) || 0;
    const perMedicalRate = parseFloat(document.getElementById('customPersonalMedical').value) || 0;
    const perUnemploymentRate = parseFloat(document.getElementById('customPersonalUnemployment').value) || 0;
    const perInjuryRate = parseFloat(document.getElementById('customPersonalInjury').value) || 0;
    const perMaternityRate = parseFloat(document.getElementById('customPersonalMaternity').value) || 0;
    const perHousingRate = parseFloat(document.getElementById('customPersonalHousing').value) || 0;

    const comPensionRate = parseFloat(document.getElementById('customCompanyPension').value) || 0;
    const comMedicalRate = parseFloat(document.getElementById('customCompanyMedical').value) || 0;
    const comUnemploymentRate = parseFloat(document.getElementById('customCompanyUnemployment').value) || 0;
    const comInjuryRate = parseFloat(document.getElementById('customCompanyInjury').value) || 0;
    const comMaternityRate = parseFloat(document.getElementById('customCompanyMaternity').value) || 0;
    const comHousingRate = parseFloat(document.getElementById('customCompanyHousing').value) || 0;

    const perPension = base * perPensionRate / 100;
    const perMedical = base * perMedicalRate / 100;
    const perUnemployment = base * perUnemploymentRate / 100;
    const perInjury = base * perInjuryRate / 100;
    const perMaternity = base * perMaternityRate / 100;
    const perHousing = base * perHousingRate / 100;
    const perTotal = perPension + perMedical + perUnemployment + perInjury + perMaternity + perHousing;

    const comPension = base * comPensionRate / 100;
    const comMedical = base * comMedicalRate / 100;
    const comUnemployment = base * comUnemploymentRate / 100;
    const comInjury = base * comInjuryRate / 100;
    const comMaternity = base * comMaternityRate / 100;
    const comHousing = base * comHousingRate / 100;
    const comTotal = comPension + comMedical + comUnemployment + comInjury + comMaternity + comHousing;

    const grandTotal = perTotal + comTotal;

    document.getElementById('resBaseCustom').textContent = formatMoney(base);
    document.getElementById('resPersonalCustom').textContent = formatMoney(perTotal);
    document.getElementById('resCompanyCustom').textContent = formatMoney(comTotal);
    document.getElementById('resTotalCustom').textContent = formatMoney(grandTotal);

    const personalItems = [
        { name: '养老保险', rate: perPensionRate, amount: perPension },
        { name: '医疗保险', rate: perMedicalRate, amount: perMedical },
        { name: '失业保险', rate: perUnemploymentRate, amount: perUnemployment },
        { name: '工伤保险', rate: perInjuryRate, amount: perInjury },
        { name: '生育保险', rate: perMaternityRate, amount: perMaternity },
        { name: '住房公积金', rate: perHousingRate, amount: perHousing }
    ];

    const companyItems = [
        { name: '养老保险', rate: comPensionRate, amount: comPension },
        { name: '医疗保险', rate: comMedicalRate, amount: comMedical },
        { name: '失业保险', rate: comUnemploymentRate, amount: comUnemployment },
        { name: '工伤保险', rate: comInjuryRate, amount: comInjury },
        { name: '生育保险', rate: comMaternityRate, amount: comMaternity },
        { name: '住房公积金', rate: comHousingRate, amount: comHousing }
    ];

    document.getElementById('customPersonalDetail').innerHTML = personalItems.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.rate}%</td>
            <td>${formatMoney(item.amount)}</td>
        </tr>
    `).join('') + `
        <tr>
            <td>合计</td>
            <td>${(perPensionRate + perMedicalRate + perUnemploymentRate + perInjuryRate + perMaternityRate + perHousingRate).toFixed(1)}%</td>
            <td>${formatMoney(perTotal)}</td>
        </tr>
    `;

    document.getElementById('customCompanyDetail').innerHTML = companyItems.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.rate}%</td>
            <td>${formatMoney(item.amount)}</td>
        </tr>
    `).join('') + `
        <tr>
            <td>合计</td>
            <td>${(comPensionRate + comMedicalRate + comUnemploymentRate + comInjuryRate + comMaternityRate + comHousingRate).toFixed(1)}%</td>
            <td>${formatMoney(comTotal)}</td>
        </tr>
    `;

    document.getElementById('customResult').style.display = 'block';
    document.getElementById('customResult').scrollIntoView({ behavior: 'smooth' });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    populateCitySelects();
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
