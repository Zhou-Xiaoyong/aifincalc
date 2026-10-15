/**
 * AI金融计算器 - 退休金试算核心逻辑（城市社保页 + 全国退休金计算器共用）
 *
 * 顶层必须用 window.PensionCalc = ...（构建期内联约定，禁止顶层 const/let）。
 *
 * 政策依据（详见根 DATA_SOURCES.md「第 3 批来源登记」配套政策口径表）：
 *   1. 延迟退休：全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》及
 *      《国务院关于渐进式延迟法定退休年龄的办法》（2024-09-13 通过，2025-01-01 施行）
 *      男 60→63、原 55 周岁女 55→58，每 4 个月延迟 1 个月；
 *      原 50 周岁女 50→55，每 2 个月延迟 1 个月。
 *   2. 最低缴费年限：办法第二条，2025-2029 为 15 年，2030 起每年提高 6 个月，2039 年达 20 年。
 *   3. 计发月数：国发〔2005〕38 号附表。
 *   4. 养老金构成：基础养老金 + 个人账户养老金（+ 过渡性养老金，中人专属）。
 *
 * ⚠️ 本模块只做「按当前政策与给定假设的静态试算」，不构成待遇承诺。
 */
(function () {
    'use strict';

    // ── 个人账户养老金计发月数表（国发〔2005〕38 号附表）──
    var PAYOUT_MONTHS = {
        40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212, 47: 208,
        48: 204, 49: 199, 50: 195, 51: 190, 52: 185, 53: 180, 54: 175, 55: 170,
        56: 164, 57: 158, 58: 152, 59: 145, 60: 139, 61: 132, 62: 125, 63: 117,
        64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56
    };

    // ── 延迟退休规则 ──
    // from：该类别中「原本恰好 2025 年 1 月达到原法定退休年龄」的出生年月。
    // 例：男职工 1965-01 出生 → 原 2025-01 满 60 岁 → 改革后第一档，延迟 1 个月。
    // 推导校验（与官方对照表一致）：
    //   男  1965-01→60岁1个月 … 1976-09 及以后→63 岁（队列 140 个月 = 36 档 × 4 月 - 4）
    //   女55 1970-01→55岁1个月 … 1981-09 及以后→58 岁
    //   女50 1975-01→50岁1个月 … 1984-11 及以后→55 岁
    var RULES = {
        male: { origAge: 60, fromYear: 1965, fromMonth: 1, step: 4, maxDelay: 36, label: '男职工（原法定退休年龄 60 周岁）' },
        female55: { origAge: 55, fromYear: 1970, fromMonth: 1, step: 4, maxDelay: 36, label: '女职工（原法定退休年龄 55 周岁）' },
        female50: { origAge: 50, fromYear: 1975, fromMonth: 1, step: 2, maxDelay: 60, label: '女职工（原法定退休年龄 50 周岁）' }
    };

    // ── 试算场景：社平工资年增长率 / 个人账户记账利率 ──
    // 依据：2025 年各省计发基数同比增幅多在 1%–2%（浙江 1.48%、上海 1%、北京 1.4%）；
    //      个人账户记账利率 2025 年为 1.5%。故「中性」档取 2.5% / 2.0%。
    var SCENARIOS = [
        { key: 'low', name: '保守', wageGrowth: 0.015, accountRate: 0.015 },
        { key: 'mid', name: '中性', wageGrowth: 0.025, accountRate: 0.020 },
        { key: 'high', name: '乐观', wageGrowth: 0.040, accountRate: 0.030 }
    ];

    function mIdx(y, m) { return y * 12 + (m - 1); }

    function clamp(v, lo, hi) {
        v = Math.max(v, lo);
        if (hi != null) v = Math.min(v, hi);
        return v;
    }

    // 退休当年对应的最低缴费年限（办法第二条）
    function minYearsAt(year) {
        if (year <= 2029) return 15;
        if (year >= 2039) return 20;
        return 15 + (year - 2029) * 0.5;
    }

    function fmtYears(v) {
        var y = Math.floor(v + 1e-9);
        var mo = Math.round((v - y) * 12);
        if (mo === 12) { y += 1; mo = 0; }
        return mo === 0 ? (y + ' 年') : (y + ' 年 ' + mo + ' 个月');
    }

    function fmtYM(y, m) { return y + ' 年 ' + m + ' 月'; }

    /**
     * 计算法定退休年龄。
     * @param {number} birthYear  出生年
     * @param {number} birthMonth 出生月（1-12）
     * @param {string} category   male | female55 | female50
     */
    function legalRetire(birthYear, birthMonth, category) {
        var r = RULES[category] || RULES.male;
        var s = mIdx(birthYear, birthMonth) - mIdx(r.fromYear, r.fromMonth);
        var delay = s < 0 ? 0 : Math.min(Math.floor(s / r.step) + 1, r.maxDelay);
        var totalMonths = r.origAge * 12 + delay;
        var ridx = mIdx(birthYear, birthMonth) + totalMonths;
        var ry = Math.floor(ridx / 12);
        var rm = ridx % 12 + 1;
        return {
            category: category,
            ruleLabel: r.label,
            origAge: r.origAge,
            delayMonths: delay,
            ageYears: Math.floor(totalMonths / 12),
            ageMonths: totalMonths % 12,
            retireYear: ry,
            retireMonth: rm,
            ageText: (Math.floor(totalMonths / 12)) + ' 周岁' +
                (totalMonths % 12 ? ' ' + (totalMonths % 12) + ' 个月' : ''),
            retireText: fmtYM(ry, rm),
            minYearsRequired: minYearsAt(ry),
            minYearsText: fmtYears(minYearsAt(ry))
        };
    }

    function payoutMonths(ageYears) {
        var a = Math.floor(ageYears);
        if (a < 40) return PAYOUT_MONTHS[40];
        if (a > 70) return PAYOUT_MONTHS[70];
        return PAYOUT_MONTHS[a];
    }

    /**
     * 主入口：退休金试算。
     *
     * opts = {
     *   birthYear, birthMonth, category,          // 必填
     *   pensionBase,                              // 当地当前养老金计发基数（元/月）
     *   mode: 'quick' | 'precise',
     *   // quick 模式：
     *   monthlyWage,                              // 当前月工资（元）
     *   paidYears,                                // 已缴费年限（年）
     *   baseMin, baseMax,                         // 当地缴费基数上下限
     *   // precise 模式：
     *   accountBalance,                           // 当前个人账户储存额（元，电子社保卡可查）
     *   contribMonths,                            // 累计缴费月数（电子社保卡可查）
     *   avgIndex,                                 // 本人平均缴费指数（可查）
     *   nowYear, nowMonth                         // 可选，默认取当前日期
     * }
     */
    function simulate(opts) {
        var now = new Date();
        var nowY = opts.nowYear || now.getFullYear();
        var nowM = opts.nowMonth || (now.getMonth() + 1);

        var lr = legalRetire(opts.birthYear, opts.birthMonth, opts.category);
        var monthsToRetire = Math.max(0, mIdx(lr.retireYear, lr.retireMonth) - mIdx(nowY, nowM));
        var yearsToRetire = monthsToRetire / 12;
        var pm = payoutMonths(lr.ageYears);
        var baseNow = opts.pensionBase;
        var precise = opts.mode === 'precise';

        // 缴费指数：精算模式直接用用户填报值；快速模式按 月薪 / 当前社平 反推
        var socNow = opts.socAvgNow || opts.avgWage || opts.pensionBase;
        var avgIndex = precise
            ? (opts.avgIndex != null ? opts.avgIndex : 1)
            : clamp((opts.monthlyWage || 0) / socNow, 0.6, 3);
        var baseMin = opts.baseMin != null ? opts.baseMin : socNow * 0.6;
        var baseMax = opts.baseMax != null ? opts.baseMax : socNow * 3;

        // 当前个人账户余额与已缴月数
        var bal, paidMonths, startIdx;
        if (precise) {
            bal = opts.accountBalance || 0;
            paidMonths = opts.contribMonths || 0;
        } else {
            // 快速模式：按"过去各年缴费基数等于当前缴费基数"保守估算历史积累
            paidMonths = Math.round((opts.paidYears || 0) * 12);
            var baseNow2 = clamp(opts.monthlyWage || socNow, baseMin, baseMax);
            bal = baseNow2 * 0.08 * paidMonths;
        }
        startIdx = paidMonths;

        var rows = SCENARIOS.map(function (sc) {
            // 一、个人账户：逐月推进到退休
            var acc = bal;
            var g = 1 + sc.wageGrowth;
            for (var i = 0; i < monthsToRetire; i++) {
                var t = (i + 1) / 12;
                var soc = socNow * Math.pow(g, t);
                var myBase = clamp(soc * avgIndex, baseMin * Math.pow(g, t), baseMax * Math.pow(g, t));
                acc = acc * (1 + sc.accountRate / 12) + myBase * 0.08;
            }

            // 二、退休时的当地计发基数
            var baseAtRetire = baseNow * Math.pow(g, yearsToRetire);

            // 三、累计缴费年限（含视同）
            var totalMonths = startIdx + monthsToRetire;
            var contribYears = totalMonths / 12;

            // 四、三段养老金
            var basic = baseAtRetire * (1 + avgIndex) / 2 * contribYears * 0.01;
            var account = acc / pm;
            var sum = basic + account;

            // 替代率按国际通用口径：养老金 ÷ **本人退休前工资**（不是 ÷ 社平工资）
            var wageAtRetire = socNow * Math.pow(g, yearsToRetire) * avgIndex;

            return {
                key: sc.key,
                name: sc.name,
                wageGrowth: sc.wageGrowth,
                accountRate: sc.accountRate,
                baseAtRetire: baseAtRetire,
                avgIndex: avgIndex,
                contribYears: contribYears,
                contribYearsText: fmtYears(contribYears),
                accountBalance: acc,
                payoutMonths: pm,
                basic: basic,
                account: account,
                total: sum,
                wageAtRetire: wageAtRetire,
                replacement: wageAtRetire ? sum / wageAtRetire : 0,
                replacementVsAvg: baseAtRetire ? sum / baseAtRetire : 0
            };
        });

        return {
            retire: lr,
            monthsToRetire: monthsToRetire,
            yearsToRetire: yearsToRetire,
            currentAge: (mIdx(nowY, nowM) - mIdx(opts.birthYear, opts.birthMonth)) / 12,
            scenarioRows: rows,
            meetsMinYears: rows[1].contribYears >= lr.minYearsRequired,
            shortfallYears: Math.max(0, lr.minYearsRequired - rows[1].contribYears)
        };
    }

    window.PensionCalc = {
        PAYOUT_MONTHS: PAYOUT_MONTHS,
        RULES: RULES,
        SCENARIOS: SCENARIOS,
        legalRetire: legalRetire,
        minYearsAt: minYearsAt,
        fmtYears: fmtYears,
        payoutMonths: payoutMonths,
        simulate: simulate
    };
})();
