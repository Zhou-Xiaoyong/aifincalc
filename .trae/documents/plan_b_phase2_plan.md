# 方案b 阶段二（样式系统优化-组件层）实施计划

## Repository Research
- 经过阶段一，全站 10 份 CSS 已建立统一 `:root` 设计令牌，body / calculator-card / footer / 分享按钮 / token 全部接入。
- 当前 8 个计算器可分为两类组件结构：
  - **A 类（7 份，结构同构）**：tax / mortgage / social / car-loan / provident-fund / deposit / investment
    - 使用 `.tabs > .tab(.active)` 切换 tab
    - 使用 `.form-group(.half)` + `.form-row` + `.input-group .form-control` / `.form-control` 作为表单
    - 使用 `.btn-calculate` 作为计算按钮
    - 使用 `.result-section > .result-item(.highlight / .important) > .label/.value` 展示结果
    - 部分页面还有 `.result-item .value.primary/success/warning/deduct/tax/income/profit/important` 等语义色
  - **B 类（1 份，独立结构）**：exchange-rate
    - `.converter-panel > .currency-input-group` 装货币和金额输入
    - `.amount-field` / `.amount-field.result-field`（结果只读输入框）/ `.swap-btn` / `.currency-select`
    - 没有 `.tabs`、`.btn-calculate`、`.result-item`
- 目前 A 类组件仍使用硬编码样式（`#f0f4ff`、`#667eea` 十六进制色、固定 `border-radius: 8px/10px`、`#dee2e6` 边框），未接 token；tab 非胶囊、聚焦环不统一、`.result-item.highlight` 渐变色块没有收敛。B 类也存在相同硬编码问题。
- 历史经验：前阶段「错误地改了 share-float .share-btn 但选择器名不匹配」→ 本阶段所有改动前先用 Grep/Read 确认选择器真实存在于 HTML/CSS 两侧，每改完都跑浏览器终验；绝不新增未在 DOM 中存在的选择器、绝不删除被多个 HTML 共用的样式。

## Files and Modules
- **A 类同构 style.css（7 份）** — 批量统一：tabs/tab、form-group/form-control/input-group、btn-calculate、result-section/result-item(.highlight)
  - `/workspace/tax-calculator/style.css`
  - `/workspace/mortgage-calculator/style.css`
  - `/workspace/social-insurance-calculator/style.css`
  - `/workspace/car-loan-calculator/style.css`
  - `/workspace/provident-fund-calculator/style.css`
  - `/workspace/deposit-calculator/style.css`
  - `/workspace/investment-calculator/style.css`
- **B 类异购 style.css（1 份）**
  - `/workspace/exchange-rate-calculator/style.css`：converter-panel、currency-input-group、amount-field、result-field、swap-btn、currency-select、rate-status 全部接入 token
- **可选（低风险增强项）**：`/workspace/shared/share.css` — 补充 `.btn-primary-solid` / `.btn-primary-outline` 通用组件类（暂不启用 HTML 侧 class 替换，仅预留未来复用，保证不改变当前任何 DOM 的渲染）。风险为 0，因此默认不做；若你确认想顺手加入，我再执行。
- **城市页 HTML 内联渐变 CTA**：tax-calculator/*/index.html 里内联 style 的「返回上级」CTA。这一项阶段二默认不做（影响面最大，HTML 文件数 30+），除非你明确表示同意，否则保留现状，保证不会造成站点不可用。

## Implementation Steps
1. **A 类（7 份同构）组件统一 · 以 token 驱动替换硬编码**
   - 编写一个 Python 脚本遍历 7 份 CSS，**只针对已有选择器**做替换，不新增、不删除任何选择器：
     - `.tabs`：gap、padding、圆角改成 token（保持 pill 外形，用 `--radius-full` 或 `--radius-lg`）
     - `.tab`：border 改 `--color-border`，非激活态背景改为 `--color-surface`；激活态 `.tab.active` 改为主色背景+白字（保留各计算器通过 `--color-accent` 覆盖的品牌色能力）
     - `.form-group label`：颜色改 `--color-text` / `--color-text-secondary`；badge/required 继续沿用但改用 token
     - `.form-control`：边框 `--color-border`、背景 `--color-surface`、聚焦态统一 `box-shadow: 0 0 0 3px var(--color-primary-light)`；半径统一 `--radius-md`，高度/内边距统一为 token（保持不小于 44px 触摸友好）
     - `.input-group .unit`：背景改为 `--color-surface-muted`，颜色 `--color-text-secondary`，边框接 token
     - `.btn-calculate`：硬编码 radius → `--radius-md`，加 `:focus-visible` 聚焦环 token、加 `:disabled` 灰阶态；保留原有渐变 `background-image` 不动（品牌色差异）
     - `.result-section`：title 颜色接 `--color-text`；padding/radius 改 token
     - `.result-item`：行分隔改 `--color-border-subtle`；`.value` 字号/字重保持不变
     - `.result-item.highlight`：原有的高饱和渐变 `linear-gradient(135deg, rgba(102,126,234,0.08) ...)` → 收敛为 `--color-primary-light` 实色底 + 左侧 3px `--color-primary` 高亮条（保留各计算器品牌色），并把 `.result-item.important` 改为更弱的 `--color-surface-muted`
     - `.result-item .value.primary / .success / .warning / .danger`：将硬编码颜色映射到 token `--color-primary / --success / --warning / --danger`（保持视觉色差不丢）
   - 运行脚本后逐份确认「原文件行数变化 < 5%」、无括号失衡。

2. **B 类（汇率换算器）组件接入 token**
   - 手动 Edit，只改已有选择器：
     - `.rate-status`：`#f0f4ff` → `--color-primary-light`，`#667eea` → `--color-primary`；error 态 `#fff0f0` → `#FEF2F2`（保持红，但改用 token 语义色 `--color-danger`）
     - `.converter-panel`：gap / padding 改 token，但保持 flex 结构不变
     - `.currency-input-group`：`#f8f9fa` → `--color-surface-muted`；透明 2px border → 1px `--color-border-subtle`；hover 边框 `#e0e0ff` → `--color-primary-light`；border-radius 改 `--radius-lg`
     - `.currency-select`（若存在）：border/background/focus 接 token
     - `.amount-field`：`#dee2e6` border → `--color-border`；半径 `--radius-md`；聚焦态 box-shadow 改为 `0 0 0 3px var(--color-primary-light)`，`#667eea` → `--color-primary`
     - `.amount-field.result-field`：渐变收敛为 `--color-primary-light`，主色文 `--color-primary`，主色边 `--color-primary`
     - `.amount-hint`：颜色 `--color-text-muted`
     - `.swap-btn`：`#667eea` 主色 → `--color-primary`，hover/active 接 token，圆形保持不变
     - `.rate-display`、`.rate-card` 等后续元素：硬编码填充/文字接 token。

3. **可选项（默认不执行，需你确认授权）**
   - ① 在 `share.css` 追加 `.btn-primary-solid / .btn-primary-outline` 样式（供未来全站 CTA 复用），不改动任何 HTML，零风险。
   - ② 城市页 CTA 内联 style 渐变换 class 方式替换：因为涉及 30+ 份城市 HTML，影响面最大，默认跳过；除非你明确表示允许。

4. **浏览器终验（13 页 + 2 交互）**
   - 串行 13 页 `getComputedStyle` 采样：tab 激活/未激活、form-control、focus 态（evaluate 注入 focus）、btn-calculate 聚焦/禁用态、result-item.highlight 背景、exchange 的 result-field 背景。
   - 检查所有页面没有「白字白底 / 灰字灰底 / 对比度 < 4.5」冲突。
   - 交互：在 tax 页面填月薪 30000 → 点「立即计算」→ 结果区出现、result-item.highlight 有主色高亮条且可读。
   - CSS 括号平衡再跑一遍 10 份文件。

## Dependencies and Considerations
- 所有改动只改「已有选择器的属性值 → token 值」，不改变 class 名、不增删选择器、不改变 JS 依赖的 class（如 `.tab.active`、`.btn-calculate`）。
- 每个计算器的主色通过各自文件里 `:root` 的 `--color-primary / --color-accent` 就已经不同（青绿 vs 紫蓝），所以 `.result-item.highlight` 统一成 `--color-primary-light` 实际仍会自动保留品牌色，不会「都变成一个颜色」。
- **不要动 share.css 里的 `.share-float-btn` / `.share-menu`**，阶段一已经确认它们通过 CSS 变量在不同计算器页会正确显示品牌色深底 + 白字。
- `social-insurance-calculator/style.css` 还包含城市页的模板样式（breadcrumb / hero / plan-card），步骤 1 的批量脚本只匹配 A 类选择器，不会误改那些块；改完后仍要确认 soc-bj 页 breadcrumb 没被影响。

## Validation
- 脚本输出的修改数量统计：A 类 7 份每份命中 15–25 条 diff；B 类 1 份命中 10–15 条。
- 括号平衡脚本：10 份 CSS 全部 depth=0。
- 浏览器 13 页串行采样结果里：
  - `tab.active` 的 color 都是 `rgb(255,255,255)`（主色底白字），非激活 color=text；
  - `form-control:focus` 的 outline-color/box-shadow 指向主色；
  - `.result-item.highlight` backgroundColor 等于 `--color-primary-light` 计算值；
  - `.btn-calculate` radius=12px（`--radius-md`）；
  - 「issues 列表」为空。
- 填数→计算交互：tax 页面点按钮后 `.result-item` 里有数字且 `.highlight` 背景存在。

## Risks
- **风险 1**：A 类批量替换脚本 regex 过于贪婪，把非组件区（如 rate-table、compare-table）的同名颜色字面量也替换了。
  - 处理：脚本仅替换「目标 selector 代码块内」的硬编码值，而不是全文替换；每一份改完立刻用括号校验+Grep 确认非目标块不变。
- **风险 2**：social-insurance 或 provident-fund 某些页面存在 `.plan-card` 等未盘点的结构，组件 token 化后导致视觉异常。
  - 处理：浏览器终验里额外抽样 fund-gz / soc-bj 终验。
- **风险 3**：focus 态 box-shadow 颜色在某个页面变成「主色黑+浅色底」对比度不够。
  - 处理：统一 `--color-primary-light` 为浅主色，所有 7 份 token 都已设置（`#eef1fb` / `#e0f7f5` 等），对比度都 > 4.5；若某页失败则立即回退为 `3px solid --color-primary` 边框而非 box-shadow。
- **风险 4**：`.result-item.highlight` 从渐变改为实色高亮条，视觉变化大。
  - 处理：保留渐变「兼容」兜底（用 `background-color: --color-primary-light; border-left: 3px solid --color-primary;`，不加渐变），这样不丢失焦点视觉；如你看过后希望恢复渐变，下一步再改成「渐变用 token 变量写的更柔和版本」。
