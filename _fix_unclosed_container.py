#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 HTML 结构缺陷：伪闭合标签 </article> 与多余 </div>

问题来源
--------
36 个页面存在「结束标签与开标签不匹配」的结构缺陷，全部由历史生成脚本的
「伪闭合」写法造成：

  A. 32 个博客文章页（blog/article*.html）
     主容器写成 <div class="article-detail">，收尾却写了 </article>。
     浏览器会**忽略**这个孤立的 </article>，于是：
       · .article-detail 未闭合
       · 紧随其后的 .container 也未闭合
       · <footer class="site-footer"> 被嵌进 .container（max-width:1100px）中
       · 页脚顶部的 border-top 只画 1060px 宽、两侧留白，
         与其余 134 页「整宽页脚」不一致
       · 底部 share-float 悬浮按钮同样被错误嵌套
     → 正确写法：把 </article> 改回 </div>。

  B. 4 个公积金城市页（dongguan / nanjing / ningbo / wuxi）
     在 </section> 与 <footer> 之间多写了一个 </div>，成为孤立结束标签。
     → 正确写法：删除该多余的 </div>。

判定方式
--------
用标准 HTML 解析器（html.parser）建栈校验，只对「无法匹配的结束标签」动手，
不做启发式猜测。修完再跑一遍解析器，未匹配数必须为 0。

用法:
    python _fix_unclosed_container.py            # 预演
    python _fix_unclosed_container.py --apply    # 写入
"""

import os
import re
import sys
from html.parser import HTMLParser

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
SKIP_FILES = {"404.html", "baidu_verify_codeva-WTMipmucLG.html"}
VOID = {"br", "hr", "img", "input", "meta", "link", "source", "area",
        "base", "col", "embed", "param", "track", "wbr"}


class StackChecker(HTMLParser):
    """栈式校验：记录无法匹配的结束标签（行号）。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.unmatched = []      # [(tag, line)]

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag in self.stack:
            # 弹出到该标签（其间若有未闭合元素，一并弹掉）
            i = len(self.stack) - 1 - self.stack[::-1].index(tag)
            del self.stack[i:]
            return
        self.unmatched.append((tag, self.getpos()[0]))


def check(html):
    c = StackChecker()
    c.feed(html)
    c.close()
    return c.unmatched, c.stack


def fix_page(html):
    """返回 (新 html, 说明列表)。

    两道工序，都是"先测量、再动手"，不做启发式猜测：
      ① 解析器报出的「无法匹配的结束标签」→ 按行号修正
         （32 个博客页的伪闭合 </article> 改成 </div>；4 个城市页删掉多余 </div>）
      ② 修完后如果 <footer> 之前仍有未闭合的 div（净深度 > 0），
         就在 <footer> 正前方补齐同等数量的 </div>
         （blog/article26-30 这 5 页除伪闭合外，还各少一个 </div>）
    """
    notes = []
    for _ in range(5):
        unmatched, _stack = check(html)
        if not unmatched:
            break
        lines = html.split("\n")
        line_no = None
        action = None
        for tag, ln in unmatched:
            if 1 <= ln <= len(lines):
                line_no, action = ln, tag
                break
        if line_no is None:
            break
        idx = line_no - 1
        raw = lines[idx]
        if action == "article":
            if "</article>" not in raw:
                break
            lines[idx] = raw.replace("</article>", "</div>", 1)
            html = "\n".join(lines)
            notes.append("第 {} 行 </article> -> </div>".format(line_no))
        elif action == "div":
            if "</div>" not in raw:
                break
            if raw.strip() == "</div>":
                del lines[idx]
                html = "\n".join(lines)
                notes.append("删除第 {} 行多余的 </div>".format(line_no))
            else:
                lines[idx] = raw.replace("</div>", "", 1)
                html = "\n".join(lines)
                notes.append("第 {} 行移除多余的 </div>".format(line_no))
        else:
            break

    # ② 补齐 <footer> 之前仍然缺失的闭合标签
    masked = mask_nonsemantic(html)
    fm = re.search(r"<footer[\s>]", masked, re.I)
    if fm:
        seg = masked[:fm.start()]
        d = (len(re.findall(r"<div[\s>]", seg, re.I))
             - len(re.findall(r"</div>", seg, re.I)))
        if d > 0:
            at = fm.start()
            prefix = "" if at == 0 or html[at - 1] == "\n" else "\n"
            html = html[:at] + prefix + ("    </div>\n" * d) + html[at:]
            notes.append("<footer> 前补 {} 个 </div>".format(d))
    return html, notes


def mask_nonsemantic(html):
    def blank(m):
        return " " * len(m.group(0))
    s = re.sub(r"<script[^>]*>.*?</script>", blank, html, flags=re.S | re.I)
    s = re.sub(r"<style[^>]*>.*?</style>", blank, s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", blank, s, flags=re.S)
    return s


def main():
    apply_changes = "--apply" in sys.argv
    pages = []
    for root, dirs, files in os.walk(SITE_DIR):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
        for f in files:
            if f.endswith(".html") and f not in SKIP_FILES:
                pages.append(os.path.join(root, f))
    pages.sort()

    print("=" * 78)
    print("HTML 结构缺陷修复 {} · 共 {} 页".format("（写入模式）" if apply_changes else "（预演模式）", len(pages)))
    print("=" * 78)

    n_fixed = 0
    for p in pages:
        rel = os.path.relpath(p, SITE_DIR).replace(os.sep, "/")
        original = open(p, "r", encoding="utf-8", errors="replace").read()
        unmatched, _ = check(original)

        masked = mask_nonsemantic(original)
        fm = re.search(r"<footer[\s>]", masked, re.I)
        depth_open = 0
        if fm:
            seg = masked[:fm.start()]
            depth_open = (len(re.findall(r"<div[\s>]", seg, re.I))
                          - len(re.findall(r"</div>", seg, re.I)))

        if not unmatched and depth_open <= 0:
            continue
        html, notes = fix_page(original)
        after, _ = check(html)
        status = "OK" if not after else "仍有 {} 处未匹配".format(len(after))
        print("✎ {:<52} {}".format(rel, "; ".join(notes) if notes else "无需改动"))
        print("    → 校验: {}".format(status))
        if html != original and apply_changes and not after:
            with open(p, "w", encoding="utf-8", newline="") as f:
                f.write(html)
            n_fixed += 1

    print("-" * 78)
    print("  修复页面数: {} 页".format(n_fixed if apply_changes else
                                       sum(1 for p in pages if check(open(p, encoding="utf-8",
                                                                          errors="replace").read())[0])))
    if not apply_changes:
        print("提示：以上为预演结果，加 --apply 才会写入文件。")


if __name__ == "__main__":
    main()
