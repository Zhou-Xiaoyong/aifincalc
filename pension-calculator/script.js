/**
 * 全国版退休金计算器页逻辑（site/pension-calculator/）
 *
 * 依赖 shared/pension.js 暴露的 window.PensionCalc（纯计算，不耦合任何 DOM）。
 * 与城市社保页内嵌试算块的区别只有数据来源：
 *   城市页 → 从 window.PAGE_DATA 取该市一组固定参数；
 *   本页   → 从 #ppCity 选中 option 的 data-* 属性取参数，可手动覆盖计发基数。
 */
(function () {
    'use strict';

    var PC = window.PensionCalc;
    var out = document.getElementById('ppResult');
    if (!PC || !out) return;

    function $(id) { return document.getElementById(id); }
    function money(n) { return '¥' + Math.round(n).toLocaleString('zh-CN'); }
    function pct(v) { return (v * 100).toFixed(1) + '%'; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
        });
    }

    var citySel = $('ppCity');
    var baseInput = $('ppBase');
    var cityNote = $('ppCityNote');
    var wageDirty = false;

    // ?city=beijing 预选参保城市：从「城市社保页 / 城市综合页 / 个税城市页」的退休金入口
    // 跳转过来时直达该城参数，用户不必再选一次。只读取查询参数做预选，
    // canonical / og:url / sitemap 一律仍指向干净 URL（/pension-calculator/），不产生重复内容。
    (function preselectCityFromUrl() {
        var m = /[?&]city=([a-z0-9_-]+)/i.exec(window.location.search || '');
        if (!m) return;
        var want = m[1].toLowerCase(), i;
        for (i = 0; i < citySel.options.length; i++) {
            if (citySel.options[i].value === want) { citySel.selectedIndex = i; return; }
        }
    })();

    function cityOpt() {
        return citySel.options[citySel.selectedIndex];
    }

    function optNum(attr) {
        var v = cityOpt().getAttribute(attr);
        return (v === null || v === '') ? null : parseFloat(v);
    }

    // 切换城市：刷新计发基数、缴费基数上下限、数据状态说明；月薪未被用户改过时同步为该市社平工资
    function syncCity() {
        var o = cityOpt();
        baseInput.value = o.getAttribute('data-base');
        var ok = o.getAttribute('data-verified') === '1';
        var w = o.getAttribute('data-wage');
        if (!wageDirty && w) $('ppWage').value = Math.round(parseFloat(w));
        cityNote.textContent = ok
            ? '该市计发基数已核到人社部门正式文号，可直接使用。'
            : '该市计发基数暂未查到正式文号，为社保经办系统现行执行口径（已多源交叉核对）。';
    }

    function syncMode() {
        var precise = $('ppMode').value === 'precise';
        var q = document.querySelectorAll('#pensionCard .pp-quick-only');
        var p = document.querySelectorAll('#pensionCard .pp-precise-only');
        var i;
        for (i = 0; i < q.length; i++) q[i].hidden = precise;
        for (i = 0; i < p.length; i++) p[i].hidden = !precise;
    }

    function readOpts() {
        var mode = $('ppMode').value;
        var base = parseFloat(baseInput.value);
        var o = {
            birthYear: parseInt($('ppBirthY').value, 10),
            birthMonth: parseInt($('ppBirthM').value, 10),
            category: $('ppCategory').value,
            pensionBase: base,
            socAvgNow: optNum('data-wage') || base,
            baseMin: optNum('data-min'),
            baseMax: optNum('data-max'),
            mode: mode
        };
        if (mode === 'precise') {
            o.accountBalance = parseFloat($('ppBalance').value) || 0;
            o.contribMonths = parseFloat($('ppMonths').value) || 0;
            o.avgIndex = parseFloat($('ppAvgIndex').value);
        } else {
            o.monthlyWage = parseFloat($('ppWage').value) || o.socAvgNow;
            o.paidYears = parseFloat($('ppPaidYears').value) || 0;
        }
        return o;
    }

    function render() {
        var o = readOpts();
        if (!(o.pensionBase > 0)) {
            out.innerHTML = '<p class="pp-alert pp-alert-warn">请填写有效的养老金计发基数（元/月）。可选择参保城市自动填充，也可手动填写你所在地的实际值。</p>';
            return;
        }
        if (!o.birthYear || o.birthYear < 1940 || o.birthYear > 2012 ||
            !o.birthMonth || o.birthMonth < 1 || o.birthMonth > 12) {
            out.innerHTML = '<p class="pp-alert pp-alert-warn">请填写有效的出生年月（年份 1940–2012，月份 1–12）后再试算。</p>';
            return;
        }
        if (o.mode === 'precise' && !(o.avgIndex > 0)) {
            out.innerHTML = '<p class="pp-alert pp-alert-warn">精算模式需要填写本人平均缴费指数（常见取值 0.6–1.0）。</p>';
            return;
        }

        var r = PC.simulate(o);
        var cityName = cityOpt().textContent.split('（')[0].split(' —')[0];
        var html = '';

        if (r.monthsToRetire <= 0) {
            html += '<p class="pp-alert pp-alert-info">按 ' + o.birthYear + ' 年 ' + o.birthMonth +
                ' 月出生推算，你的法定退休时间为 ' + esc(r.retire.retireText) +
                '，距今已不足 1 个月。本试算针对尚未达到法定退休年龄的参保人，已退休人员的实际待遇以社保经办机构核定为准。</p>';
        }

        var delayTxt = r.retire.delayMonths > 0
            ? '比改革前的 ' + r.retire.origAge + ' 周岁延迟 ' + r.retire.delayMonths + ' 个月'
            : '未受延迟退休影响';
        html += '<div class="pp-out-head"><p class="pp-lead">按 <strong>' + o.birthYear + ' 年 ' + o.birthMonth +
            ' 月</strong>出生、' + esc(r.retire.ruleLabel) + '、参保地 <strong>' + esc(cityName) +
            '</strong>（计发基数 ' + money(o.pensionBase) + '/月）测算：法定退休时间为 <strong>' +
            esc(r.retire.retireText) + '</strong>（' + esc(r.retire.ageText) + '，' + delayTxt +
            '）；退休当年需累计缴费满 <strong>' + esc(r.retire.minYearsText) + '</strong>。</p></div>';

        html += '<div class="pp-tiers">';
        r.scenarioRows.forEach(function (s, i) {
            html += '<div class="pp-tier' + (i === 1 ? ' pp-tier-mid' : '') + '">' +
                '<span class="pp-tier-name">' + s.name + '档 · 月养老金</span>' +
                '<span class="pp-tier-val">' + money(s.total) + '</span>' +
                '<span class="pp-tier-note">社平年增 ' + (s.wageGrowth * 100).toFixed(1) +
                '%，记账利率 ' + (s.accountRate * 100).toFixed(1) + '%</span></div>';
        });
        html += '</div>';

        html += '<div class="pp-table-wrap"><table class="pp-table"><tr><th>档位</th><th>退休时计发基数</th>' +
            '<th>累计缴费年限</th><th>退休时个人账户</th><th>基础养老金</th><th>个人账户养老金</th>' +
            '<th>月合计</th><th>替代率</th></tr>';
        r.scenarioRows.forEach(function (s) {
            html += '<tr><td>' + s.name + '</td><td>' + money(s.baseAtRetire) + '</td><td>' +
                esc(s.contribYearsText) + '</td><td>' + money(s.accountBalance) + '</td><td>' +
                money(s.basic) + '</td><td>' + money(s.account) + '</td><td class="pp-em">' +
                money(s.total) + '</td><td>' + pct(s.replacement) + '</td></tr>';
        });
        html += '</table></div>';

        if (r.meetsMinYears) {
            html += '<p class="pp-alert pp-alert-ok">中性档下累计缴费约 ' +
                esc(r.scenarioRows[1].contribYearsText) + '，已达到退休当年 ' +
                esc(r.retire.minYearsText) + ' 的最低缴费年限要求。</p>';
        } else {
            html += '<p class="pp-alert pp-alert-warn">中性档下累计缴费约 ' +
                esc(r.scenarioRows[1].contribYearsText) + '，距退休当年 ' + esc(r.retire.minYearsText) +
                ' 的最低缴费年限还差约 ' + PC.fmtYears(r.shortfallYears) +
                '。缴不满最低年限无法按月领取职工基本养老金，需继续缴费或按当地规定处理。</p>';
        }

        if (o.mode === 'precise') {
            if (!r.scenarioRows[1].accountBalance) {
                html += '<p class="pp-alert pp-alert-warn">个人账户储存额填的是 0，个人账户养老金会显示为 0。请到电子社保卡查询后回填。</p>';
            }
            html += '<p class="pp-alert pp-alert-info">精算模式已采用你填写的个人账户储存额与累计缴费月数，结果接近实际；剩余误差只来自「未来」——退休前的社平工资增长与记账利率。</p>';
        } else {
            html += '<p class="pp-alert pp-alert-info">快速模式的历史个人账户余额是按「当前缴费基数 × 8% × 已缴年限」保守估算的，与实际可能偏差较大。<a href="https://si.12333.gov.cn/" target="_blank" rel="noopener nofollow">到电子社保卡查到真实数据</a>后切换精算模式，结果会准得多。</p>';
        }

        html += '<p class="pp-alert pp-alert-info">本试算只含基础养老金 + 个人账户养老金。若你在当地建立个人账户之前就已参加工作（「中人」），实际待遇还包含过渡性养老金，真实金额会高于以上结果。</p>';
        html += '<p class="pp-disclaim">测算基于所选城市 2025 年度计发基数与三档假设，仅供个人估算参考，不构成任何待遇承诺。实际养老金以社保经办机构核定为准。</p>';

        out.innerHTML = html;
    }

    citySel.addEventListener('change', function () { syncCity(); render(); });
    $('ppWage').addEventListener('input', function () { wageDirty = true; });
    $('ppBtn').addEventListener('click', render);
    // 表单内任何控件「值确定」后即重算（change 在失焦/回车时触发，不会在键入中途抖动）。
    document.querySelector('.pp-form').addEventListener('change', function (e) {
        if (e.target && e.target.id === 'ppMode') syncMode();
        render();
    });

    syncCity();
    syncMode();
    render();
})();
