#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhance the 7 blog articles for SEO (per strategy report):
  1. Add a "相关计算器" card group (content -> tool backlinks, report P1).
  2. Add a visible FAQ section + FAQPage JSON-LD (capture featured snippets).
Reuses existing .related-section / .related-card CSS; appends .faq-block CSS
to blog/style.css once.
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

TOOL_DESC = {
    "tax-calculator": "2026最新个税计算，支持专项附加扣除与年终奖计税",
    "mortgage-calculator": "LPR房贷月供、等额本息/本金对比与提前还贷测算",
    "provident-fund-calculator": "公积金贷款额度与月冲年冲冲还贷规划",
    "investment-calculator": "复利、定投模拟与退休规划收益测算",
    "deposit-calculator": "活定期、零存整取与自动转存利息计算",
    "social-insurance-calculator": "五险一金明细与缴费基数计算",
    "car-loan-calculator": "车贷月供、方案对比与提前还款分析",
}
TOOL_NAME = {
    "tax-calculator": "个人所得税计算器",
    "mortgage-calculator": "房贷计算器",
    "provident-fund-calculator": "公积金贷款计算器",
    "investment-calculator": "投资收益计算器",
    "deposit-calculator": "存款利息计算器",
    "social-insurance-calculator": "社保计算器",
    "car-loan-calculator": "车贷计算器",
}

# article folder -> list of (tool_dir,)
ARTICLE_TOOLS = {
    "article1": ["tax-calculator"],
    "article2": ["mortgage-calculator", "provident-fund-calculator"],
    "article3": ["provident-fund-calculator", "mortgage-calculator"],
    "article4": ["investment-calculator", "deposit-calculator"],
    "article5": ["tax-calculator"],
    "article6": ["social-insurance-calculator"],
    "article7": ["mortgage-calculator", "car-loan-calculator"],
}

# article folder -> list of (question, answer)
ARTICLE_FAQ = {
    "article1": [
        ("2026年个税起征点是多少？",
         "2026年个人所得税起征点仍为每月5000元（全年6万元），沿用综合与分类相结合的税制。"),
        ("七项专项附加扣除包括哪些？",
         "包括子女教育、继续教育、大病医疗、住房贷款利息、住房租金、赡养老人、3岁以下婴幼儿照护七项。"),
        ("住房贷款利息和住房租金扣除能同时享受吗？",
         "不能，两者只能二选一。一般来说大城市租房选租金扣除（1500元/月）更划算，有房贷则选利息扣除（1000元/月）。"),
    ],
    "article2": [
        ("等额本息和等额本金哪个总利息更少？",
         "等额本金总利息更少，因为每月归还的本金固定，利息随剩余本金减少而递减。"),
        ("哪种还款方式更适合提前还款？",
         "等额本息前期利息占比高、本金还得少，提前还款节省的利息通常更多；等额本金前期已还较多本金，还得越晚节省越有限。"),
        ("月供压力大该选哪种还款方式？",
         "选等额本息，每月还款额固定、前期压力更小，适合现金流紧张的购房者。"),
    ],
    "article3": [
        ("公积金贷款额度怎么算？",
         "额度由账户余额倍数、缴存基数、当地最高限额、所购房屋总价与首付比例共同决定，各地公式不同。"),
        ("2026年公积金贷款利率是多少？",
         "首套个人住房公积金贷款5年以上利率为2.60%，二套利率上浮，具体以当地公积金中心公布为准。"),
        ("公积金和商贷组合贷怎么选？",
         "优先用满公积金贷款额度（利率低），差额部分再用商业贷款补充，即组合贷通常最划算。"),
    ],
    "article4": [
        ("基金定投适合什么样的人？",
         "适合有长期理财目标、不愿或不会择时、希望强制储蓄的普通投资者。"),
        ("什么是复利？72法则怎么用？",
         "复利是利滚利。72法则：用72除以年化收益率，约等于本金翻倍所需年数，例如年化6%约12年翻倍。"),
        ("定投和一次性投资哪个更好？",
         "定投分批买入、平滑成本、降低择时风险，长期更适合大多数人；一次性投资在低点入场收益更高但风险集中。"),
    ],
    "article5": [
        ("年终奖可以单独计税吗？",
         "可以。全年一次性奖金单独计税优惠政策已延续至2027年12月31日。"),
        ("单独计税和并入综合所得哪个更省？",
         "取决于工资与年终奖水平：工资高、年终奖多时单独计税通常更省；低收入者并入综合所得可能更省，建议用计算器对比。"),
        ("年终奖计税有“盲区”吗？",
         "有。由于税率分档，存在多发一元反而税后更少的“无效区间”，填报时应避开临界点。"),
    ],
    "article6": [
        ("社保缴费基数怎么确定？",
         "按职工上年度月平均工资确定，在当地社保上下限之间核定；低于下限按下限、高于上限按上限。"),
        ("社保包含哪“五险”？",
         "养老保险、医疗保险、失业保险、工伤保险、生育保险；加上住房公积金即常说的“五险一金”。"),
        ("社保断缴有什么影响？",
         "会影响医保实时报销、购房购车落户资格、生育保险待遇及养老金累计年限，尽量避免断缴。"),
    ],
    "article7": [
        ("提前还贷一定划算吗？",
         "不一定。当房贷利率明显高于你能稳定获得的投资收益率时提前还贷才划算；否则资金用于投资可能更优。"),
        ("缩短年限和减少月供哪种省利息？",
         "选择“缩短年限、月供基本不变”节省的总利息远多于“减少月供、年限不变”。"),
        ("提前还款要付违约金吗？",
         "多数银行要求正常还款满12个月后提前还款免收违约金，具体以贷款合同为准。"),
    ],
}

FAQ_CSS = """
/* SEO: FAQ section (added by seo_blog.py) */
.faq-block { margin: 34px 0; }
.faq-block .section-title { margin-bottom: 16px; }
.faq-item {
    background: #f7f8fc;
    border: 1px solid #eceef5;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 12px;
}
.faq-item .faq-q {
    font-weight: 600;
    color: #1f2330;
    margin: 0 0 6px;
    font-size: 1.02rem;
    line-height: 1.6;
}
.faq-item .faq-a {
    margin: 0;
    color: #444;
    line-height: 1.75;
}
"""


def build_related_tools(article):
    tools = ARTICLE_TOOLS.get(article, [])
    if not tools:
        return ""
    cards = []
    for t in tools:
        name = TOOL_NAME[t]
        desc = TOOL_DESC[t]
        cards.append(
            f'            <a href="../../{t}/index.html" class="related-card">\n'
            f'                <span class="related-cat">计算器</span>\n'
            f'                <h3>{name}</h3>\n'
            f'                <p class="related-desc">{desc}</p>\n'
            f'            </a>'
        )
    grid = "\n".join(cards)
    return (
        '    <!-- 相关计算器 -->\n'
        '    <section class="related-section">\n'
        '        <h2 class="section-title">🔧 相关计算器</h2>\n'
        '        <div class="related-grid">\n'
        f'{grid}\n'
        '        </div>\n'
        '    </section>\n\n'
    )


def build_faq_html(article):
    items = ARTICLE_FAQ.get(article, [])
    blocks = []
    for q, a in items:
        blocks.append(
            '        <div class="faq-item">\n'
            f'            <p class="faq-q">Q：{q}</p>\n'
            f'            <p class="faq-a">A：{a}</p>\n'
            '        </div>'
        )
    inner = "\n".join(blocks)
    return (
        '    <!-- 常见问题 FAQ -->\n'
        '    <section class="faq-block">\n'
        '        <h2 class="section-title">❓ 常见问题（FAQ）</h2>\n'
        f'{inner}\n'
        '    </section>\n'
    )


def build_faq_jsonld(article):
    items = ARTICLE_FAQ.get(article, [])
    entries = []
    for q, a in items:
        entries.append(
            '            {\n'
            '                "@type": "Question",\n'
            f'                "name": "{q}",\n'
            '                "acceptedAnswer": {\n'
            '                    "@type": "Answer",\n'
            f'                    "text": "{a}"\n'
            '                }\n'
            '            }'
        )
    inner = ",\n".join(entries)
    return (
        '    <!-- FAQPage -->\n'
        '    <script type="application/ld+json">\n'
        '    {\n'
        '        "@context": "https://schema.org",\n'
        '        "@type": "FAQPage",\n'
        '        "mainEntity": [\n'
        f'{inner}\n'
        '        ]\n'
        '    }\n'
        '    </script>'
    )


def main():
    # 1. Append FAQ CSS once
    css_path = os.path.join(ROOT, "blog", "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    if ".faq-block" not in css:
        with open(css_path, "a", encoding="utf-8") as f:
            f.write("\n" + FAQ_CSS)
        print("Appended FAQ CSS to blog/style.css")
    else:
        print("FAQ CSS already present, skip")

    # 2. Process each article
    for i in range(1, 8):
        art = f"article{i}"
        fpath = os.path.join(ROOT, "blog", art, "index.html")
        if not os.path.exists(fpath):
            print(f"SKIP missing {fpath}")
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        changed = False

        # 2a. Insert related-tools + FAQ html before the 相关推荐 section
        anchor = '<h2 class="section-title">相关推荐</h2>'
        if anchor in content and "相关计算器" not in content:
            insert = build_related_tools(art) + build_faq_html(art)
            content = content.replace(anchor, insert + anchor, 1)
            changed = True

        # 2b. Insert FAQPage JSON-LD before </head>
        if "FAQPage" not in content and "</head>" in content:
            content = content.replace("</head>", build_faq_jsonld(art) + "\n</head>", 1)
            changed = True

        if changed:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"OK: blog/{art}/index.html")
        else:
            print(f"SKIP (no change): blog/{art}/index.html")

    print("\nDone.")


if __name__ == "__main__":
    main()
