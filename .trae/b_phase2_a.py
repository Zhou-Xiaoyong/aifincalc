"""方案b 阶段二 A 类同构组件 token 化脚本。

只替换 7 份目标 CSS 中「明确存在的选择器声明块」，
不会全文颜色字面量替换，不会碰 lpr-section / income-planning 等非目标块。
"""
from __future__ import annotations

import re
from pathlib import Path

FILES = [
    "/workspace/tax-calculator/style.css",
    "/workspace/mortgage-calculator/style.css",
    "/workspace/social-insurance-calculator/style.css",
    "/workspace/car-loan-calculator/style.css",
    "/workspace/provident-fund-calculator/style.css",
    "/workspace/deposit-calculator/style.css",
    "/workspace/investment-calculator/style.css",
]

# 每一项为 (selector_regex, new_block_template)
# new_block_template 直接用 var(--xxx) 引用已在各文件 :root 中定义的 token。
# 对青绿/紫蓝主色差异：统一用 --color-primary / --color-accent / --color-primary-light，
# 这些 token 在各文件 :root 中已设置对应品牌色。

RULES: list[tuple[str, str]] = [
    # ---------- Tabs ----------
    (
        r"^\.tabs\s*\{[^}]*\}",
        """.tabs {
    display: flex;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: 6px;
    gap: 4px;
    overflow-x: auto;
}""",
    ),
    (
        r"^\.tab\s*\{[^}]*\n\}",
        """.tab {
    flex: 1;
    min-width: 100px;
    padding: 10px 14px;
    text-align: center;
    cursor: pointer;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    white-space: nowrap;
}""",
    ),
    (
        r"^\.tab\.active\s*\{[^}]*\}",
        """.tab.active {
    color: var(--color-primary);
    background: var(--color-surface);
    border-color: var(--color-border-subtle);
    box-shadow: var(--shadow-sm);
}""",
    ),
    (
        r"^\.tab:hover\s*\{[^}]*\}",
        """.tab:hover {
    color: var(--color-primary);
    background: var(--color-surface);
}""",
    ),
    (
        r"^\.tab-content\.active\s*\{[^}]*\}",
        """.tab-content.active {
    display: block;
}""",
    ),
    # ---------- Form ----------
    (
        r"^\.form-group label\s*\{[^}]*\}",
        """.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--color-text);
}""",
    ),
    (
        r"^\.form-group label \.badge\s*\{[^}]*\}",
        """.form-group label .badge {
    background: var(--color-success);
    color: white;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: 12px;
    margin-left: 8px;
}""",
    ),
    (
        r"^\.form-group label \.badge\.highlight\s*\{[^}]*\}",
        """.form-group label .badge.highlight {
    background: var(--color-primary);
}""",
    ),
    (
        r"^\.form-group label \.required\s*\{[^}]*\}",
        """.form-group label .required {
    color: var(--color-danger);
}""",
    ),
    (
        r"^\.form-control\s*\{[^}]*\}",
        """.form-control {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 16px;
    background: var(--color-surface);
    color: var(--color-text);
    transition: all 0.2s ease;
    line-height: 1.5;
}""",
    ),
    (
        r"^\.form-control:focus\s*\{[^}]*\}",
        """.form-control:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
    background: var(--color-surface);
}""",
    ),
    (
        r"^\.input-group \.form-control\s*\{[^}]*\}",
        """.input-group .form-control {
    border-radius: var(--radius-md) 0 0 var(--radius-md);
    border-right: none;
    flex: 1;
}""",
    ),
    (
        r"^\.input-group \.unit\s*\{[^}]*\}",
        """.input-group .unit {
    padding: 12px 16px;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    border-left: none;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    color: var(--color-text-secondary);
    font-weight: 500;
}""",
    ),
    (
        r"^\.help-text\s*\{[^}]*\}",
        """.help-text {
    display: block;
    margin-top: 6px;
    color: var(--color-text-secondary);
    font-size: 14px;
}""",
    ),
    # ---------- Deduction items (tax) ----------
    (
        r"^\.deduction-item\s*\{[^}]*\}",
        """.deduction-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--color-surface-muted);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}""",
    ),
    (
        r"^\.deduction-item:hover\s*\{[^}]*\}",
        """.deduction-item:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
}""",
    ),
    (
        r"^\.deduction-item \.amount\s*\{[^}]*\}",
        """.deduction-item .amount {
    color: var(--color-primary);
    font-weight: 500;
    font-size: 14px;
}""",
    ),
    (
        r"^\.deduction-item \.small-select\s*\{[^}]*\}",
        """.deduction-item .small-select {
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 14px;
    background: var(--color-surface);
    color: var(--color-text);
}""",
    ),
    # ---------- Radio items (mortgage/social) ----------
    (
        r"^\.radio-item\s*\{[^}]*\}",
        """.radio-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--color-surface-muted);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    flex: 1;
    min-width: 140px;
}""",
    ),
    (
        r"^\.radio-item:hover\s*\{[^}]*\}",
        """.radio-item:hover {
    border-color: var(--color-primary);
}""",
    ),
    (
        r"^\.radio-item:has\(input:checked\)\s*\{[^}]*\}",
        """.radio-item:has(input:checked) {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
}""",
    ),
    # ---------- Button ----------
    (
        r"^\.btn-calculate\s*\{[^}]*\}",
        """.btn-calculate {
    width: 100%;
    padding: 14px 16px;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent, var(--color-primary-dark)) 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 10px;
    min-height: 48px;
    box-shadow: var(--shadow-md);
}""",
    ),
    (
        r"^\.btn-calculate:hover\s*\{[^}]*\}",
        """.btn-calculate:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    filter: brightness(1.02);
}""",
    ),
    # ---------- Result ----------
    (
        r"^\.result-section\s*\{[^}]*\}",
        """.result-section {
    margin-top: 30px;
    padding: 24px;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
}""",
    ),
    (
        r"^\.result-section h3\s*\{[^}]*\}",
        """.result-section h3 {
    color: var(--color-text);
    margin-bottom: 20px;
    font-size: 1.2rem;
}""",
    ),
    (
        r"^\.result-item\s*\{[^}]*\}",
        """.result-item {
    background: var(--color-surface);
    padding: 16px;
    border-radius: var(--radius-md);
    text-align: center;
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-sm);
}""",
    ),
    (
        r"^\.result-item \.label\s*\{[^}]*\}",
        """.result-item .label {
    display: block;
    color: var(--color-text-secondary);
    font-size: 14px;
    margin-bottom: 8px;
}""",
    ),
    (
        r"^\.result-item \.value\s*\{[^}]*\}",
        """.result-item .value {
    display: block;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text);
}""",
    ),
    (
        r"^\.result-item \.value\.primary\s*\{[^}]*\}",
        """.result-item .value.primary {
    color: var(--color-primary);
}""",
    ),
    (
        r"^\.result-item \.value\.success\s*\{[^}]*\}",
        """.result-item .value.success {
    color: var(--color-success);
}""",
    ),
    (
        r"^\.result-item \.value\.warning\s*\{[^}]*\}",
        """.result-item .value.warning {
    color: var(--color-warning);
}""",
    ),
    (
        r"^\.result-item \.value\.danger\s*\{[^}]*\}",
        """.result-item .value.danger {
    color: var(--color-danger);
}""",
    ),
    (
        r"^\.result-item \.value\.deduct\s*\{[^}]*\}",
        """.result-item .value.deduct {
    color: var(--color-danger);
}""",
    ),
    (
        r"^\.result-item \.value\.tax\s*\{[^}]*\}",
        """.result-item .value.tax {
    color: var(--color-warning);
}""",
    ),
    (
        r"^\.result-item \.value\.income\s*\{[^}]*\}",
        """.result-item .value.income {
    color: var(--color-success);
}""",
    ),
    (
        r"^\.result-item \.value\.profit\s*\{[^}]*\}",
        """.result-item .value.profit {
    color: var(--color-success);
}""",
    ),
    (
        r"^\.result-item \.value\.important\s*\{[^}]*\}",
        """.result-item .value.important {
    color: var(--color-primary);
}""",
    ),
    (
        r"^\.result-item\.highlight\s*\{[^}]*\}",
        """.result-item.highlight {
    background: var(--color-primary);
    border-color: var(--color-primary);
}""",
    ),
    (
        r"^\.result-item\.highlight \.label,\s*\n\.result-item\.highlight \.value\s*\{[^}]*\}",
        """.result-item.highlight .label,
.result-item.highlight .value {
    color: white;
}""",
    ),
    (
        r"^\.result-item\.important\s*\{[^}]*\}",
        """.result-item.important {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
}""",
    ),
    (
        r"^\.result-item\.important \.label,\s*\n\.result-item\.important \.value\s*\{[^}]*\}",
        """.result-item.important .label,
.result-item.important .value {
    color: var(--color-primary);
}""",
    ),
]


def replace_block(text: str, pattern: str, replacement: str) -> tuple[str, int]:
    new_text, n = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE | re.DOTALL)
    return new_text, n


def main() -> None:
    total_replacements = 0
    for file in FILES:
        path = Path(file)
        text = path.read_text(encoding="utf-8")
        original = text
        file_hits = 0
        for pattern, new_block in RULES:
            text, n = replace_block(text, pattern, new_block)
            if n:
                file_hits += n
                total_replacements += n
        # 追加一些全局选择器的缺失项（focus-visible / disabled / placeholder）
        extras: list[str] = []
        if re.search(r"^\.btn-calculate:disabled\s*\{", text, flags=re.MULTILINE) is None:
            extras.append(
                """
.btn-calculate:disabled {
    background: var(--color-surface-muted) !important;
    color: var(--color-text-muted) !important;
    cursor: not-allowed !important;
    box-shadow: none !important;
    filter: none !important;
    border: 1px solid var(--color-border) !important;
}
.btn-calculate:focus-visible {
    outline: none;
    box-shadow: var(--shadow-md), 0 0 0 3px var(--color-primary-light);
}""".strip()
            )
        if re.search(r"^\.form-control::placeholder\s*\{", text, flags=re.MULTILINE) is None:
            extras.append(
                ".form-control::placeholder { color: var(--color-text-muted); opacity: 1; }"
            )
        if extras:
            text += "\n\n/* ---------- phase2 追加：组件交互态统一 ---------- */\n" + "\n".join(extras) + "\n"
        if text != original:
            path.write_text(text, encoding="utf-8")
        print(f"{path.name}: hit {file_hits} block(s), extras {len(extras)} (total {file_hits + len(extras)})")
    print(f"\nA类批量完成：共 {total_replacements} 次规则命中。")


if __name__ == "__main__":
    main()
