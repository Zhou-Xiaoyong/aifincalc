#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复内页缺失 <h1>（aifincalc.com）

做两件事：
  1. 在各页 <head> 内引入 shared/page-hero.css
  2. 在 <div class="container page-top-space"> 之后插入 <section class="page-hero">
     含 <h1>（页面主关键词）与 <p class="page-hero-sub"> 摘要

幂等：已含 page-hero 的页面自动跳过。
用法:
    python _fix_h1.py            # 执行修复
    python _fix_h1.py --dry-run  # 只报告，不写盘
"""

import os
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
CSS_HREF = "../shared/page-hero.css?v=20261010.1"
CONTAINER_ANCHOR = '<div class="container page-top-space">'

# 页面 → (h1, 副标题)
PAGES = {
    "tax-calculator": (
        "个税计算器 2026",
        "按 <strong>2026 年最新七级超额累进税率</strong>测算工资薪金个税，支持年终奖"
        "单独计税与合并计税智能对比、年度汇算清缴，自动核算五险一金与子女教育、"
        "住房租金、赡养老人等 7 项专项附加扣除，一键生成税后收入明细。",
    ),
    "social-insurance-calculator": (
        "社保计算器 2026",
        "五险一金缴费明细计算，按全国 19 城最新缴费基数上下限自动核定，"
        "养老、医疗、失业、工伤、生育各险种分项列示，个人月缴与单位月缴一目了然。",
    ),
    "mortgage-calculator": (
        "房贷计算器 2026",
        "商业贷款、公积金贷款、组合贷款全面测算，等额本息与等额本金逐月对比，"
        "输出完整还款计划与利息总额，并可评估提前还贷的省息空间。",
    ),
    "car-loan-calculator": (
        "车贷计算器 2026",
        "汽车贷款月供测算与多方案横向对比，支持首付比例、贷款期限、利率自定义，"
        "并同步评估提前还款可节省的利息金额。",
    ),
    "provident-fund-calculator": (
        "公积金贷款计算器 2026",
        "额度评估、月冲年冲规划、公积金与商贷方案对比，覆盖全国 38 城最新"
        "缴存基数与贷款额度上限，按本地政策预置参数直接测算。",
    ),
    "deposit-calculator": (
        "存款利息计算器 2026",
        "活期、定期、零存整取、通知存款利息测算，支持自动转存与多期限横向对比，"
        "看清不同存法在同一本金下的实际收益差距。",
    ),
    "exchange-rate-calculator": (
        "汇率换算器 2026",
        "20 种主要货币实时换算，含 30 天走势图与场景化换算，"
        "覆盖亚太及东南亚主要币种，适合跨境出行与结算参考。",
    ),
    "investment-calculator": (
        "投资收益计算器 2026",
        "复利计算、基金定投模拟、退休规划测算，7 种投资产品收益横向对比，"
        "直观呈现时间与复利对最终收益的放大作用。",
    ),
    "about": (
        "关于我们",
        "AI金融计算器 是一个专注<strong>中国大陆金融政策与个人财务测算</strong>的"
        "在线工具平台，覆盖个税、社保、公积金、房贷、车贷、存款与投资收益等场景，"
        "所有计算参数均依据各地经办机构最新公开口径预置。",
    ),
    "contact": (
        "联系我们",
        "使用中遇到问题、发现数据与本地最新政策有出入，或希望我们补充新的计算场景，"
        "都欢迎随时与我们联系。",
    ),
    "privacy": (
        "隐私政策",
        "本页说明 AI金融计算器 会收集哪些信息、如何使用与保护这些信息，"
        "以及你对个人信息享有的控制方式。",
    ),
    "blog": (
        "金融知识与政策解读博客",
        "个人所得税、房贷车贷、公积金、社保与投资理财的实用解读、"
        "政策分析与真实案例测算，帮你把复杂的金融规则算清楚。",
    ),
}


def build_hero(h1: str, sub: str) -> str:
    if sub:
        return (
            f'\n        <section class="page-hero">\n'
            f"            <h1>{h1}</h1>\n"
            f'            <p class="page-hero-sub">{sub}</p>\n'
            f"        </section>\n"
        )
    return (
        f'\n        <section class="page-hero">\n'
        f"            <h1>{h1}</h1>\n"
        f"        </section>\n"
    )


def add_css_link(content: str) -> tuple:
    """在 <head> 内最后一个 stylesheet 之后插入 page-hero.css。返回 (新内容, 是否改动)"""
    if CSS_HREF in content:
        return content, False
    head_end = content.find("</head>")
    if head_end == -1:
        return content, False
    head = content[:head_end]
    idx = head.rfind('<link rel="stylesheet"')
    if idx == -1:
        return content, False
    line_end = head.find("\n", idx)
    if line_end == -1:
        line_end = len(head)
    indent = "    "
    new_head = head[:line_end] + f'\n{indent}<link rel="stylesheet" href="{CSS_HREF}">' + head[line_end:]
    return new_head + content[head_end:], True


def process(rel_dir: str, dry: bool) -> str:
    path = os.path.join(SITE_DIR, rel_dir, "index.html")
    if not os.path.isfile(path):
        return f"  [跳过] 文件不存在: {rel_dir}/index.html"

    h1, sub = PAGES[rel_dir]
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'class="page-hero"' in content:
        return f"  [跳过] 已存在 page-hero: {rel_dir}/index.html"

    if "</h1>" in content and "<h1" in content:
        return f"  [跳过] 已有 <h1>: {rel_dir}/index.html"

    if CONTAINER_ANCHOR not in content:
        return f"  [失败] 未找到容器锚点: {rel_dir}/index.html"

    # 1) 插入 hero
    hero = build_hero(h1, sub)
    content = content.replace(CONTAINER_ANCHOR, CONTAINER_ANCHOR + hero, 1)

    # 2) 引入 CSS
    content, css_ok = add_css_link(content)

    if not dry:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    tag = "预演" if dry else "已修"
    return f"  [{tag}] {rel_dir}/index.html  →  <h1>{h1}</h1>  (css_link={'Y' if css_ok else 'N'})"


def main():
    dry = "--dry-run" in sys.argv
    print("=" * 72)
    print("修复内页缺失 <h1>" + ("（预演模式，不写盘）" if dry else ""))
    print("=" * 72)
    fixed = 0
    for rel in PAGES:
        msg = process(rel, dry)
        print(msg)
        if "[已修]" in msg or "[预演]" in msg:
            fixed += 1
    print("")
    print(f"完成：{fixed} 个页面已插入 H1 与样式引用" if not dry else f"预演：{fixed} 个页面待修复")
    print("=" * 72)


if __name__ == "__main__":
    main()
