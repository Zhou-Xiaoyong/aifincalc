# 方案b 阶段三（信息层/展示层）优化实施计划

## 仓库调研结论

当前阶段二已完成 8 个计算器页 + 首页 + share.css 的「设计令牌系统（Design Tokens）统一」与核心组件（Tabs / 表单 / 立即计算按钮 / 结果高亮卡）样式收敛。阶段二已验证的状态：
- 13 个关键页（首页 + 8 个计算器 + 3 个城市详情 + 关于）HTTP 200、结构完整、对比度≥AA、DOM 计算交互能产出非空结果；
- 10 份 CSS 括号平衡、主要令牌齐全，A 类 7 份同构计算器 3 项阶段二标记（`btn:focus-visible`、`tabs→radius-lg`、`highlight→primary-light`）全部命中。

但仍有 4 个区域 **未触及**，与阶段二的 token 体系存在视觉断层（硬编码颜色、字体、圆角、阴影），信息密度与层级有待优化：

### ① 博客（blog/style.css、blog/index.html、11 篇文章页）
- 整体仍使用「紫蓝大渐变 hero + 动画」（与首页阶段二后「浅色柔和 hero」不一致）。
- 大量硬编码：`#667eea`、`#764ba2`、`#f0f2f5`、`border-radius: 18px`、`box-shadow: 0 4px 24px rgba(0,0,0,0.06)`、`color: #6c757d` 等未接 token。
- `body` 没有接入 `--font-sans` 与 `--color-bg` / `--color-text` / `tabular-nums`。
- 侧边栏搜索框输入样式、widget 卡片、标签、阅读更多，均与阶段二的计算器组件（`.filter-btn`、`.feature-tag`、`.result-item`）规格不一致。
- `index.html` 顶部仍有重复的 CSS 加载模式风险（虽然只有一份，但没有复用首页 style.css 中的 tokens，需要**保留 blog 独立 style.css**，只在内部补齐 tokens 并替换硬编码，不能引用 `/style.css`，因为品牌色体系与计算器首页的 `--color-primary:#1e3a5f` 不同）。
- 11 篇文章页共享同样的问题，且目前没有统一从 blog/style.css 继承响应式正文排版的结构。

### ② 首页信息密度与层级（index.html、style.css）
- hero 标题区的 `style=""` 内联样式（L263-265：padding/font-size）需要迁移到 style.css，保证可维护。
- 8 张 tool-card 里有 `style="background: linear-gradient(...)"` 的内联渐变图标底色（个税/社保/房贷/车贷/公积金/汇率/存款/投资），阶段二虽然 `.card-icon` 的默认值已经是浅色块，但内联样式优先级更高，导致这些图标仍保留个人化渐变，与"收敛个人渐变、统一浅色块+深色"的阶段二承诺不符。
- `features-section` 的 4 列布局（`.features-list`）未接入 tokens（虽然已用 `--radius-lg` 等，但 `box-shadow: 0 4px 24px` 等仍是硬编码，需收敛到 `--shadow-sm/md`）。
- 首页缺少「页面内 FAQ 可见折叠」（首页有 JSON-LD FAQPage Schema，但没有用户可见的 FAQ 折叠 DOM，对 SEO click-rate 无明显伤害，但信息可获得性偏弱——如果不增加 FAQ DOM，至少把 JSON-LD FAQ 对应的内容以 FAQ 卡片形式落在 features-section 之下，**保持与 Schema 一致，避免 Schema 与可见内容脱节被搜索引擎降权**。
- 目前首页 `hero-bg` 与计算器页（no-hero-bg）存在一致性问题：`body.no-hero-bg` 机制完整，但首页 `hero-bg` 高度 360px + 装饰圆导致移动端首屏被压缩，需确认信息层级。

### ③ 计算器页 FAQ / AI 建议 / 底部推荐（8 计算器 + 城市页）
- 计算器页的 `.faq-section` 没有 `<details>/<summary>` 折叠交互——所有问题全部展开，长页（tax/mortgage）可达 4000+ px 高，信息密度低，关键结果被 FAQ 推走。
- `.ai-suggestions`（share.css 定义）仍有硬编码 `::before` 边框、`background: var(--color-surface)` 外，颜色/圆角部分已接 token 但 `border-left: 3px solid color` 仍有硬编码 `#adb5bd` / success/warning 类混用，需收敛为 `--color-primary-light` 边框语义。
- `.bottom-recommend` 里 `.recommend-article-item` `border-left: 3px solid var(--color-text-muted)` 与 `.recommend-card:hover` 边框语义不一致，且 `.recommend-green` / `.recommend-purple` 两套颜色类（share.css L505-535）仍需决定是否保留，建议**删除**，仅保留统一 neutral→primary hover，避免每个计算器的推荐区颜色不同（会产生视觉不一致）。
- share.css 中的 `ai-suggestions::before` 背景色为硬编码：`background: linear-gradient(...)` 需替换成 token 渐变或纯 token 软底。

### ④ 城市聚合页 + 移动端导航体验（tax/social-insurance/provident-fund 三类，每类 30+ 城市）
- 三类计算器聚合页 `*/index.html` 底部，目前无统一的"城市选择入口网格"，用户必须先进计算器再切城市，无法从 SEO 聚合页直达；对收录深度和内链不利。
- 移动端导航：`share.css` 中 `.menu-toggle` 是 `☰` 字符，`:active` 缺少可感知反馈；`.mobile-menu` 是 `display: none`，当 `.active` 后才显示，切换动画不柔和；另外，导航下拉后没有"点击空白关闭"与"ESC 关闭"处理，导致打开后必须再点一次 ☰，体验不佳。
- 城市页（tax/shanghai 等）使用 `cc-section` 类，目前 style.css 没有对应的 token 化样式。
- 首页 `index.html` 仍存在 `style.css` 与 `shared/share.css` 的**双重引用**（L13-14 和 L151-152 都加载了相同文件）——总结里标注为"已修复"，但静态读源码确认**仍未删除 L151-152 的重复 `<link>`**，会导致浏览器重复解析 CSS，这是一个实际 bug（不影响视觉但影响首屏性能与可维护性）。

### ⑤ 遗留结构性 bug（阶段二终验中发现，阶段三顺手修复）
- [index.html L151-152 重复引用 style.css/share.css](file:///workspace/index.html#L151-L152)
- 博客 JSON-LD 中缺少 `article10` 条目（用户声称已修复，需复查；如果仍缺失要在本阶段补齐）。
- `constants.js` 中 `haerbin → huhehaote` 重命名（如果仍未完成则在本阶段完成）。

---

## 文件与模块

| 模块 | 文件 | 改动类别 | 预期变化 |
|---|---|---|---|
| 博客系统 | `blog/style.css` | 重写+token 化 | 补齐 `:root` 设计令牌（保留博客品牌紫蓝，不改与首页/计算器的主色独立性）；替换所有硬编码颜色/圆角/阴影为 token；收敛大渐变 hero；正文排版层次对齐阶段二 |
| 博客系统 | `blog/index.html` + `blog/article1..11/index.html` | 结构微改 | 删除内联 style 断点；可选：新增博客页的面包屑/返回首页胶囊（不改变路径结构） |
| 首页 | `style.css` | 补丁 | `.features-section` / `.features-list` / `.feature-item` 硬编码替换；新增 `.faq-section`（页面可见 FAQ）token 化折叠样式；新增 `.faq-accordion` `<details>/<summary>` 覆盖 |
| 首页 | `index.html` | 补丁 | ① 去 L151-152 重复 CSS 引用；② hero 标题 L263-265 内联 style 改为 class；③ 8 张 tool-card 的内联渐变移除，改为按 `data-color=` 的 CSS 变量浅色底；④ 在 features-section 下方新增 FAQ 可见 DOM（与 JSON-LD FAQPage 的 5 个 Question/Answer 对齐），采用 `<details>` 交互 |
| 计算器 FAQ | 8 份 `*/index.html`（tax/mortgage/social-insurance/car-loan/provident-fund/deposit/investment/exchange-rate） | 结构轻改 | 把 `.faq-section > .faq-item` 包裹成 `<details><summary>问题</summary><div>答案</div></details>`；保留原有文本与标题，仅换壳 |
| 计算器 FAQ | 8 份 `*/style.css` + `shared/share.css` | 补丁 | `<details>`/`<summary>` token 化视觉：`.faq-item > summary { list-style: none; cursor: pointer; }`、图标 +、展开 −、焦点环、圆角、禁用选择、hover 态；`.ai-suggestions` 边框硬编码收敛；`.bottom-recommend` 删除 `.recommend-green/.recommend-purple` 两色类，统一 neutral |
| 城市聚合页 | `tax-calculator/index.html`、`social-insurance-calculator/index.html`、`provident-fund-calculator/index.html` | 结构新增（页面底部） | 新增 `.city-grid` 模块（`城市选择入口` 标题 + 按省份或首字母分组的 30+ 城市胶囊链接），保证内链深度一致；样式复用 `--radius-full/--radius-md/--color-surface-muted/--color-primary-light` token |
| 城市聚合页 | `tax-calculator/style.css`、`social-insurance-calculator/style.css`、`provident-fund-calculator/style.css` | 补丁 | 新增 `.city-grid`、`.city-group-title`、`.city-chip` 三种类（三者共享相同 token 规格，胶囊 `--radius-full`，hover 背景 `--color-primary-light`） |
| 移动端导航 | `shared/share.css` + `shared/share.js`（或新增到 `script.js`） | 补丁 | `.menu-toggle` 的 hover/focus-visible 反馈样式；`.mobile-menu` 过渡动画（`max-height 0.22s ease` + 内容褪色）；share.js 新增：点击空白/ESC 关闭 mobileMenu，以及「再次点击 ☰ → aria-expanded=true/false」的无障碍属性 |
| 遗留 bug | `shared/constants.js` | 补丁 | `haerbin` → `huhehaote`（如果仍存在），并同步检索所有引用点确保无遗漏 |
| 遗留 bug | `blog/index.html` JSON-LD | 补丁 | 若 `article10` 仍缺失，在 `BlogPosting[]` 数组中补齐，`position` 与 datePublished 保持顺序 |

---

## 实现步骤（依赖顺序）

1. **Bug 先修**（先完成保证基线干净）
   1.1 删除首页 `index.html` 重复 CSS link（L151-152），仅保留 L13-14 的一份；
   1.2 复查 blog JSON-LD `BlogPosting` 数组中 article10 是否缺失，是则补齐；
   1.3 复查 `constants.js`：搜索 `haerbin` 并改名为 `huhehaote`，同时全局 grep 引用是否有其它 `haerbin` 出现（city 子目录名是 `harbin` 不影响，只改 PROVIDENT_FUND_LIMITS 的 key 名）。

2. **博客 token 化（B 类异构，独立方案）**
   2.1 在 `blog/style.css` 顶部新增博客专属 `:root` 设计令牌（保留品牌紫蓝 `--color-primary:#667eea` / `--color-accent:#764ba2`，其余 color-surface/border/shadow/font/radius 与阶段二完全一致，确保视觉互通）；
   2.2 把 `hero-bg` 从「大紫蓝渐变 + animation」改为阶段二同款"浅色柔和渐变 + 装饰圆"（与首页的 hero-bg 对齐，高度保持 420px 或缩小到 360px，**保留品牌色但强度下降**，避免与阶段二视觉断层）；
   2.3 把 `.article-card`、`.sidebar-widget`、`.article-category`、`.article-tag`、`.search-box input`、`.read-more`、`.widget-title` 全量硬编码替换成 token 对应值；
   2.4 11 篇文章页如各自拥有独立内联样式，删除内联，接入 blog/style.css（若文章页目前未引用 blog/style.css 则补引用——需要先读文章页的 `<head>` 再决定，保持最小改动）。

3. **首页信息层收敛**
   3.1 把 L263-265 hero 标题区的 `style="padding:20px 20px 16px"`、`style="font-size:1.8rem"`、`style="font-size:0.9rem"` 改写为 `.page-title-wrap` / `.page-title` / `.page-tagline` 三种类，落入 style.css 并接入 token；
   3.2 8 张 tool-card 的内联 `style="background: linear-gradient(...)"` 全部删除；在 style.css 中按 `a.tool-card[data-color="..."] .card-icon` 给不同 `data-color` 设定专属浅色块（`--color-primary-light` 的变体），去掉"多品牌个人渐变"带来的过重视觉负担；同时保持 tool-card 之间可区分性（用不同的 `color-mix()` 浓度即可）；
   3.3 `.features-section` / `.features-list` / `.feature-item` 的所有硬编码 padding/box-shadow/radius 改为 `--radius-lg/--shadow-sm/--spacer-*` token；
   3.4 在 `features-section` 之后插入可见 FAQ 卡片：`.faq-section`（5 个条目与首页 JSON-LD FAQPage 逐条对应），每个都用 `<details><summary>问题...</summary><p>答案...</p></details>` 折叠形式，样式接入 token（与计算器页 FAQ 折叠风格一致）。

4. **计算器页 FAQ 折叠交互改造 + share.css 收敛**
   4.1 对 8 份计算器 `*/index.html`：遍历现有 `.faq-section > .faq-item`（每个由 `<h4>问题</h4><p>答案</p>` 组成），改造成 `<details class="faq-item"><summary>问题</summary><div class="faq-body"><p>答案</p></div></details>`；首条默认 `<details open>`；
   4.2 在 8 份计算器 CSS 中新增 `.faq-item details/summary` 规则（与 share.css 共同保证 fallback 一致性）：`summary { list-style: none; ... }`、`summary::after` 使用 `+`/`−` 展开切换、`[open] summary ~ *` 动画过渡、焦点可见 outline 使用 `--color-primary-light` 3px ring；
   4.3 share.css：
     - `.ai-suggestions::before` 硬编码背景改为 token 软底（如 `color-mix(in srgb, var(--color-primary) 6%, transparent)`）；
     - `.recommend-article-item` 左边框 `#adb5bd` → `var(--color-border)`；`warning/success` 两个 AI 类的颜色改为 token（`--color-warning` / `--color-success`）。
     - 删除 `.recommend-green/.recommend-purple` 6 条规则（L505-535）。所有底部推荐一律走中性灰 + 主色 hover。

5. **三类城市聚合页的城市入口网格 + 移动端导航增强**
   5.1 在 `tax-calculator/`、`social-insurance-calculator/`、`provident-fund-calculator/` 三类计算器首页底部（`</main>` 或 FAQ 下方、`<footer>` 之前），新增 `.city-grid` section：
     - 标题：`<h2 class="city-grid-title">XX 城市切换 / 直接计算</h2>`；
     - 城市胶囊网格：按「直辖市 / 华北 / 华东 / 华南 / 华中 / 西南 / 西北 / 东北」分组（或至少 A-Z 首字母分组保证视觉整齐）；每个城市为 `<a class="city-chip" href="./shanghai/">上海🧭</a>`，全部引用自己目录下的已有城市页；
     - 三组页面的城市名单必须与现有子目录真实存在一致（tax 41 个 / social-insurance 13 个 / provident-fund 41 个）——**禁止链接到不存在的子目录**，需要用 Glob 先读取再生成。
   5.2 在三类 `style.css` 中新增 `.city-grid-title` / `.city-group-title` / `.city-chip` / `.city-chips-row` 四种类：全部 token 化，不引入新颜色。
   5.3 share.css/share.js 移动端导航：
     - `.menu-toggle` 增加 `:hover` 背景 `--color-primary-light`、`:focus-visible` 3px ring；
     - `.mobile-menu` 把 `display:none/block` 改为 `max-height:0 + overflow:hidden + opacity:0 → max-height: 999px + opacity:1` 的过渡动画；
     - share.js 新增：监听 `click` 事件——当 mobileMenu.active 且点击位置不在 header 内时，移除 active；监听 `keydown` ESC 关闭；同时在切换时设置 `button.menu-toggle[aria-expanded="true/false"]`。

6. **终验回归**
   6.1 复用阶段二 `b_verify_static.py`：重跑 13 页 + 10 份 CSS + 博客 index、articles、三类聚合页城市链接全部 200；
   6.2 用 Playwright/browser_use 在博客首页搜索「个税」、点卡片进入 article1，验证正文排版、对比度、无 console error；
   6.3 首页 FAQ 折叠：点任一 `<summary>` → `<details open>` 正确，键盘 Enter 可切换；
   6.4 城市胶囊：点击任一 city-chip 跳转 200；
   6.5 移动端（375×812）断点：menu-toggle → 出现动画 → 点击空白/ESC 关闭。

---

## 依赖与注意事项

- **品牌色隔离**：blog/style.css 保持独立紫蓝主色，**禁止**直接引入 `/style.css` 或复用 `--color-primary:#1e3a5f`，否则博客侧栏标题紫与正文深蓝会产生冲突；但其余 14 项中性 token（radius/shadow/bg/surface/border/text-secondary）必须与阶段二逐字相同。
- **最小改动原则**：本阶段所有改动遵循「CSS 补丁 + HTML 轻改壳（不改动文案不改动 JSON-LD 字段内容）」；不得改动任一计算器的 JavaScript 计算逻辑（`script.js` 中的计算公式、常量、事件绑定方式都不碰）。
- **Schema 与可见 FAQ 一致性**：首页新增可见 FAQ DOM 时，**文本内容必须与已有 JSON-LD FAQPage 的 5 条 Question/Answer 完全一致**（可以去掉 Markdown 标记转换为纯 `<p>`），避免搜索引擎判定不一致。
- **城市列表真实性**：第 5 步生成 `.city-chip` 时**必须用真实存在的子目录名**（tax：tax-calculator/*/index.html 存在的 41 个城市；social-insurance 13 个；provident-fund 41 个）。推荐在实施前先用脚本生成列表再填入 HTML。
- **令牌值一致性**：新增 token 时不能修改阶段二已有的 15 项值（颜色/圆角/阴影/字号）。如确需增补 `--spacer-*`（首页 feature 间距），只能新增，不得改变现有值。
- **CSS 选择器优先级**：`.tool-card[data-color=xxx] .card-icon` 的选择器优先级高于之前写的 `.card-icon { background: var(--color-primary-light) }`，需**避免使用 !important**，保证内联 style 删除后能正确命中。

---

## 验证

在每次实施小步（1.x / 2.x / 3.x / 4.x / 5.x）后分别执行：
- 括号平衡：所有修改过的 CSS 文件，左括号数 === 右括号数；
- HTTP 200 + 无 console error：至少 13 页 + 博客首页 + 随机 3 篇文章 + 三类聚合页首页；
- 对比度 WCAG AA：正文文字与背景对比度 ≥ 4.5:1；
- 可访问性：`details > summary` 可键盘操作、`menu-toggle` 有 aria-expanded，tab 可遍历；
- 回归：所有阶段二的 3 项 phase2_markers 仍然在 8 份计算器 CSS 中命中；
- 无新的未定义 token：`grep "var(--X)"` 中的 X 必须能在对应 CSS 的 :root 或继承链（style.css / calculator-style.css / blog-style.css）中找到定义；blog/share.css 例外继承链仍然有效。

全部通过后再进入下一小步，避免一次提交大范围导致回滚困难。

---

## 风险与处理

| 风险 | 处理方式 |
|---|---|
| 博客 hero 收敛后，品牌识别度下降（紫蓝是博客原来的识别色） | 保留 `--color-primary:#667eea` 作为博客的品牌主色，仅把「hero 全幅大渐变」改成「浅紫柔边 + 装饰圆」，同时 `.article-category` 的徽章仍保留紫蓝实底填充，保证品牌锚点。如果用户认为过度收敛，可以**仅收敛 50%**（hero 紫蓝的透明通道降到 12%）。 |
| FAQ `<details>` 折叠化后，旧 `.faq-item h4` 的样式规则失效，导致首屏文字错位 | 在 8 份计算器 CSS 中保留 `.faq-item h4 { ... }` 规则，但将其迁移为适配 `<summary>` 的字体大小/字重；另外在 `<summary>` 上直接加 class `class="faq-item summary"` 更稳；实施前先 grep 所有 HTML `<h4>` 出现位置，确认命中清单后统一替换。 |
| 三类聚合页的 city-grid 体量很大（tax/provident-fund 各 41 个城市），会导致页面高度急剧增长 | 方案 A：首屏默认只展示「热门 12 城」+「展开全部」button；点击 button 切换显示全部 41 城。这是本计划的**默认处理**（在步骤 5.1 中引入「展开全部」）。方案 B：按分组折叠多个 `<details>`，每个省/地区一个折叠。 |
| 移动端关闭 mobileMenu 的空白点击逻辑，可能误伤「菜单内链接点击后跳转」的场景 | 在 share.js 中判断：如果点击的是 `a.nav-link`，**先不移除 active**，让浏览器正常跳转；只有点击 target 不在 `.site-header` 且不是链接时才关闭。 |
| 删除 `.recommend-green/.recommend-purple` 后，某些计算器页面可能仍在 HTML 中使用这两个 class（share.css L505-535 相关）导致颜色丢失 | 先 grep 全站 HTML：`grep -rn "recommend-green\|recommend-purple"`。如果有使用则保留中性 token 版的 fallback，或直接移除 class。 |
| blog 文章页当前引用的 CSS 链不统一（有的引用 blog/style.css 有的只引 shared/share.css） | 实施 2.4 前先 grep 11 篇 article 的 `<head>`，建立真实引用清单，再统一补上 blog/style.css。 |

