/**
 * ============================================================
 *  政策常量配置文件  constants.js
 *  最后更新：2026年
 * ------------------------------------------------------------
 *  !! 每年政策调整时，只需修改此文件 !!
 *  涵盖：个税 / 社保公积金 / LPR利率 / 投资产品参考利率
 * ============================================================
 */

// ────────────────────────────────────────────────────────────
//  一、个人所得税
// ────────────────────────────────────────────────────────────

/**
 * 综合所得月度起征点（元/月）
 * 依据：《个人所得税法》第六条，2018年10月起执行
 */
const TAX_THRESHOLD_MONTHLY = 5000;

/**
 * 年度综合所得基本减除费用（元/年）= 月度起征点 × 12
 */
const TAX_THRESHOLD_ANNUAL = TAX_THRESHOLD_MONTHLY * 12; // 60000

/**
 * 综合所得年度税率表
 * limit      : 该级距上限（年度应纳税所得额，单位：元）
 * rate       : 适用税率
 * deduction  : 速算扣除数（元）
 * 依据：《个人所得税法》附件一
 */
const TAX_BRACKETS = [
    { limit:   36000, rate: 0.03, deduction:      0 },
    { limit:  144000, rate: 0.10, deduction:   2520 },
    { limit:  300000, rate: 0.20, deduction:  16920 },
    { limit:  420000, rate: 0.25, deduction:  31920 },
    { limit:  660000, rate: 0.30, deduction:  52920 },
    { limit:  960000, rate: 0.35, deduction:  85920 },
    { limit: Infinity, rate: 0.45, deduction: 181920 }
];

/**
 * 全年一次性奖金（年终奖）单独计税税率表
 * 按"奖金÷12"查找对应税率
 * 依据：财税〔2018〕164号，2027年底到期（政策延续需关注）
 */
const BONUS_BRACKETS = [
    { limit:   3000, rate: 0.03, deduction:     0 },
    { limit:  12000, rate: 0.10, deduction:   210 },
    { limit:  25000, rate: 0.20, deduction:  1410 },
    { limit:  35000, rate: 0.25, deduction:  2660 },
    { limit:  55000, rate: 0.30, deduction:  4410 },
    { limit:  80000, rate: 0.35, deduction:  7160 },
    { limit: Infinity, rate: 0.45, deduction: 15160 }
];

/**
 * 专项附加扣除标准（元/月）
 * 依据：国发〔2018〕41号 及 国办发〔2023〕13号（2023年起调整）
 *
 *  - child          子女教育（每孩）
 *  - continuing     继续教育（学历/职业资格）
 *  - housingLoan    住房贷款利息
 *  - housingRent    住房租金（一线城市及省会城市适用最高额）
 *  - elderlyMain    赡养老人 - 独生子女
 *  - elderlyShared  赡养老人 - 非独生子女分摊上限
 *  - infant         3岁以下婴幼儿照护（每孩）
 */
const SPECIAL_DEDUCTIONS = {
    child:         2000,   // 元/月/孩
    continuing:     400,   // 元/月
    housingLoan:   1000,   // 元/月
    housingRent:   1500,   // 元/月（直辖市/省会城市/计划单列市最高额）
    elderlyMain:   3000,   // 元/月（独生子女）
    elderlyShared: 1500,   // 元/月（非独生子女分摊上限）
    infant:        2000,   // 元/月/孩
};

// ────────────────────────────────────────────────────────────
//  二、城市社保 & 公积金个人缴纳比例（%）
// ────────────────────────────────────────────────────────────
/**
 * 各城市个人缴纳比例
 * 字段说明：
 *   pension      养老保险
 *   medical      医疗保险
 *   unemployment 失业保险
 *   housing      住房公积金
 *
 * 注意：各城市每年可能调整，以当地社保局最新公告为准
 */
const CITY_SOCIAL_RATES = {
    // ── 一线城市 ──
    beijing: {
        name: '北京',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    shanghai: {
        name: '上海',
        pension: 8, medical: 2, unemployment: 0.5, housing: 7
    },
    guangzhou: {
        name: '广州',
        pension: 8, medical: 2, unemployment: 0.2, housing: 12
    },
    shenzhen: {
        name: '深圳',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    // ── 新一线 / 强二线 ──
    hangzhou: {
        name: '杭州',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    nanjing: {
        name: '南京',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    chengdu: {
        name: '成都',
        pension: 8, medical: 2, unemployment: 0.4, housing: 12
    },
    wuhan: {
        name: '武汉',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    xian: {
        name: '西安',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    chongqing: {
        name: '重庆',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    tianjin: {
        name: '天津',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    suzhou: {
        name: '苏州',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    zhengzhou: {
        name: '郑州',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    changsha: {
        name: '长沙',
        pension: 8, medical: 2, unemployment: 0.7, housing: 12
    },
    qingdao: {
        name: '青岛',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    dalian: {
        name: '大连',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    shenyang: {
        name: '沈阳',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    harbin: {
        name: '哈尔滨',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    changchun: {
        name: '长春',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    kunming: {
        name: '昆明',
        pension: 8, medical: 2, unemployment: 0.6, housing: 12
    },
    hefei: {
        name: '合肥',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    fuzhou: {
        name: '福州',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    xiamen: {
        name: '厦门',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    jinan: {
        name: '济南',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    nanchang: {
        name: '南昌',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    shijiazhuang: {
        name: '石家庄',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    taiyuan: {
        name: '太原',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    guiyang: {
        name: '贵阳',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    nanning: {
        name: '南宁',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    lanzhou: {
        name: '兰州',
        pension: 8, medical: 2, unemployment: 0.3, housing: 12
    },
    wuxi: {
        name: '无锡',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    ningbo: {
        name: '宁波',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    dongguan: {
        name: '东莞',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    foshan: {
        name: '佛山',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    wenzhou: {
        name: '温州',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    // ── 三线及省会城市 ──
    haikou: {
        name: '海口',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    haerbin: {
        name: '呼和浩特',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    wulumuqi: {
        name: '乌鲁木齐',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    xining: {
        name: '西宁',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    yinchuan: {
        name: '银川',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    },
    lhasa: {
        name: '拉萨',
        pension: 8, medical: 2, unemployment: 0.5, housing: 12
    }
};

// ────────────────────────────────────────────────────────────
//  三、LPR 及房贷利率
// ────────────────────────────────────────────────────────────
/**
 * 贷款市场报价利率（LPR）
 * 每月20日由中国人民银行授权全国银行间同业拆借中心公布
 * 依据：中国人民银行公告〔2019〕第15号
 *
 *  lpr5y     5年期以上 LPR（住房贷款主要参考）
 *  lpr1y     1年期 LPR
 *  updateDate 本次数据更新日期（每月20日公布后更新此处）
 */
const LPR = {
    lpr5y:      3.6,       // % — 5年期以上（2025年2月）
    lpr1y:      3.1,       // % — 1年期（2025年2月）
    updateDate: '2025-02-20'
};

/**
 * 住房公积金贷款基准利率
 * 依据：中国人民银行 2025年5月8日公告（下调0.25%）
 *
 *  below5y   5年以下（含5年）— 首套
 *  above5y   5年以上 — 首套
 *  secondBelow5y  5年以下（含5年）— 二套（不低于此值，各城市可能上浮）
 *  secondAbove5y  5年以上 — 二套（不低于此值）
 *  updateDate 本次利率更新日期
 */
const PROVIDENT_FUND_RATE = {
    below5y:       2.10,   // %  首套 5年以下
    above5y:       2.60,   // %  首套 5年以上
    secondBelow5y: 2.525,  // %  二套 5年以下
    secondAbove5y: 3.075,  // %  二套 5年以上
    updateDate:    '2025-05-08'
};

/**
 * 商业贷款利率参考（固定利率默认值）
 * 仅作为页面默认值，用户可自由修改
 */
const COMMERCIAL_LOAN_DEFAULT_RATE = 4.20; // %

// ────────────────────────────────────────────────────────────
//  三-B、公积金贷款额度相关常量
// ────────────────────────────────────────────────────────────

/**
 * 还贷能力系数（收入中可用于还贷的比例上限）
 * 一般为 50%，即月供不超过 (收入-负债) × 50%
 */
const LOAN_ABILITY_RATIO = 0.5;

/**
 * 各城市住房公积金贷款最高额度（万元）
 *
 * 字段说明：
 *   name         城市名称
 *   single       单职工最高可贷额度
 *   family       双职工（夫妻共同申请）最高可贷额度
 *   second       二套房最高可贷额度
 *   balanceX     余额倍数（账户余额 × 倍数 = 余额法额度）
 *   minContribution  最低月缴存额要求（元），低于此值可能影响额度
 *
 * 注意：各城市政策频繁调整，以下为参考值，以当地公积金中心最新公告为准
 * 更新时间：2025年
 */
const PROVIDENT_FUND_LIMITS = {
    // ── 一线城市 ──
    beijing: {
        name: '北京', single: 120, family: 120, second: 60,
        balanceX: 10, minContribution: 0
    },
    shanghai: {
        name: '上海', single: 65, family: 130, second: 65,
        balanceX: 10, minContribution: 0
    },
    guangzhou: {
        name: '广州', single: 70, family: 120, second: 60,
        balanceX: 10, minContribution: 0
    },
    shenzhen: {
        name: '深圳', single: 50, family: 100, second: 50,
        balanceX: 14, minContribution: 0
    },
    // ── 新一线 / 强二线 ──
    hangzhou: {
        name: '杭州', single: 100, family: 120, second: 60,
        balanceX: 10, minContribution: 0
    },
    nanjing: {
        name: '南京', single: 50, family: 100, second: 50,
        balanceX: 10, minContribution: 0
    },
    chengdu: {
        name: '成都', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    wuhan: {
        name: '武汉', single: 70, family: 90, second: 50,
        balanceX: 10, minContribution: 0
    },
    xian: {
        name: '西安', single: 65, family: 85, second: 50,
        balanceX: 10, minContribution: 0
    },
    chongqing: {
        name: '重庆', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    tianjin: {
        name: '天津', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    suzhou: {
        name: '苏州', single: 60, family: 90, second: 50,
        balanceX: 10, minContribution: 0
    },
    zhengzhou: {
        name: '郑州', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    changsha: {
        name: '长沙', single: 70, family: 70, second: 35,
        balanceX: 12, minContribution: 0
    },
    qingdao: {
        name: '青岛', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    dalian: {
        name: '大连', single: 45, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    shenyang: {
        name: '沈阳', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    harbin: {
        name: '哈尔滨', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    changchun: {
        name: '长春', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    kunming: {
        name: '昆明', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    hefei: {
        name: '合肥', single: 55, family: 70, second: 45,
        balanceX: 10, minContribution: 0
    },
    fuzhou: {
        name: '福州', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    xiamen: {
        name: '厦门', single: 50, family: 100, second: 50,
        balanceX: 10, minContribution: 0
    },
    jinan: {
        name: '济南', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    nanchang: {
        name: '南昌', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    shijiazhuang: {
        name: '石家庄', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    taiyuan: {
        name: '太原', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    guiyang: {
        name: '贵阳', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    nanning: {
        name: '南宁', single: 60, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    lanzhou: {
        name: '兰州', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    wuxi: {
        name: '无锡', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    ningbo: {
        name: '宁波', single: 60, family: 100, second: 50,
        balanceX: 10, minContribution: 0
    },
    dongguan: {
        name: '东莞', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    foshan: {
        name: '佛山', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    wenzhou: {
        name: '温州', single: 50, family: 80, second: 40,
        balanceX: 10, minContribution: 0
    },
    // ── 三线及省会城市 ──
    haikou: {
        name: '海口', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    haerbin: {
        name: '呼和浩特', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    wulumuqi: {
        name: '乌鲁木齐', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    xining: {
        name: '西宁', single: 40, family: 60, second: 30,
        balanceX: 10, minContribution: 0
    },
    yinchuan: {
        name: '银川', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    },
    lhasa: {
        name: '拉萨', single: 50, family: 70, second: 35,
        balanceX: 10, minContribution: 0
    }
};

// ────────────────────────────────────────────────────────────
//  四、投资产品参考年化收益率（用于产品对比）
// ────────────────────────────────────────────────────────────
/**
 * 各类投资产品长期参考年化收益率
 * !! 均为历史参考数据，不构成任何投资建议 !!
 *
 * 字段说明：
 *   name   产品名称
 *   rate   参考年化收益率（%）
 *   risk   风险等级描述
 *   color  图表配色
 */
const INVESTMENT_PRODUCTS = [
    { name: '银行活期',    rate: 0.3,  risk: '极低', color: '#28a745' },
    { name: '银行定存3年', rate: 2.5,  risk: '低',   color: '#5cb85c' },
    { name: '货币基金',    rate: 2.8,  risk: '低',   color: '#8bc34a' },
    { name: '债券基金',    rate: 5.0,  risk: '中低', color: '#ffc107' },
    { name: '混合基金',    rate: 8.0,  risk: '中等', color: '#fd7e14' },
    { name: '股票基金',    rate: 10.0, risk: '高',   color: '#f44336' },
    { name: '沪深300指数', rate: 9.5,  risk: '中高', color: '#e91e63' }
];

/**
 * 定投功能 - 产品类型与年化利率映射（下拉菜单使用）
 * key   : 下拉选项的 value
 * value : 年化收益率（%）
 */
const SIP_PRODUCT_RATES = {
    '2.5':  '银行定存3年 (2.5%)',
    '2.8':  '货币基金 (2.8%)',
    '5.0':  '债券基金 (5.0%)',
    '8.0':  '混合基金 (8.0%)',
    '10.0': '股票基金 (10.0%)',
    '9.5':  '沪深300指数 (9.5%)'
};

/**
 * 退休规划 - 退休后保守型年化收益率假设
 * 用于计算退休后资金可持续年数
 */
const RETIREMENT_POST_RATE = 3.0; // %

// ────────────────────────────────────────────────────────────
//  五、页面初始化：将常量注入 HTML 默认值
// ────────────────────────────────────────────────────────────
/**
 * DOM Ready 后自动将常量写入对应输入框的 value 和 data 属性
 * 这样修改常量后页面默认值也会同步更新，无需手动改 HTML
 */
document.addEventListener('DOMContentLoaded', function () {

    // ── 个税：专项附加扣除 data-monthly ──────────────────
    const deductionMap = {
        'child':       SPECIAL_DEDUCTIONS.child,
        'continuing':  SPECIAL_DEDUCTIONS.continuing,
        'housingLoan': SPECIAL_DEDUCTIONS.housingLoan,
        'housingRent': SPECIAL_DEDUCTIONS.housingRent,
        'infant':      SPECIAL_DEDUCTIONS.infant
    };
    Object.entries(deductionMap).forEach(([id, amount]) => {
        const el = document.getElementById(id);
        if (el) {
            el.dataset.monthly = amount;
            // 同步更新旁边的金额说明文字
            const amountSpan = el.closest('.deduction-item')?.querySelector('.amount');
            if (amountSpan) amountSpan.textContent = amount + '元/月';
        }
    });

    // 赡养老人下拉选项
    const elderlyEl = document.getElementById('elderlyAmount');
    if (elderlyEl) {
        elderlyEl.innerHTML = `
            <option value="${SPECIAL_DEDUCTIONS.elderlyMain}">独生子女 ${SPECIAL_DEDUCTIONS.elderlyMain}元/月</option>
            <option value="${SPECIAL_DEDUCTIONS.elderlyShared}">非独生分摊 ${SPECIAL_DEDUCTIONS.elderlyShared}元/月</option>
        `;
    }

    // ── 房贷：LPR 默认值 ─────────────────────────────────
    const commLPR = document.getElementById('commLPR');
    if (commLPR) {
        commLPR.value = LPR.lpr5y;
        // 更新日期徽章
        const badge = commLPR.closest('.form-group')?.querySelector('.badge');
        if (badge) {
            const d = new Date(LPR.updateDate);
            badge.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月`;
        }
    }

    // 公积金利率默认值（首套5年以上）
    const provRate = document.getElementById('provRate');
    if (provRate) provRate.value = PROVIDENT_FUND_RATE.above5y;

    // 组合贷 - 商业利率
    const combCommRate = document.getElementById('combCommRate');
    if (combCommRate) combCommRate.value = (LPR.lpr5y - 0.2).toFixed(2);

    // 组合贷 - 公积金利率
    const combProvRate = document.getElementById('combProvRate');
    if (combProvRate) combProvRate.value = PROVIDENT_FUND_RATE.above5y;

    // 固定利率默认值
    const commFixedRate = document.getElementById('commFixedRate');
    if (commFixedRate) commFixedRate.value = COMMERCIAL_LOAN_DEFAULT_RATE;

    // LPR 执行利率实时展示（初始化）
    const commCurrentRate = document.getElementById('commCurrentRate');
    if (commCurrentRate) {
        const spread = parseFloat(document.getElementById('commLPRSpread')?.value) || -0.45;
        commCurrentRate.textContent = (LPR.lpr5y + spread).toFixed(2) + '%';
    }
});
