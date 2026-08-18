#!/usr/bin/env python3
"""Add Baidu auto-push JS to all HTML files before </body>."""

import os
import re

SITE_DIR = os.path.dirname(os.path.abspath(__file__))

# Baidu auto-push JS code
BAIDU_PUSH = """<script>
(function(){
    var bp = document.createElement('script');
    var curProtocol = window.location.protocol.split(':')[0];
    if (curProtocol === 'https') {
        bp.src = 'https://zz.bdstatic.com/linksubmit/push.js';
    } else {
        bp.src = 'http://push.zhanzhang.baidu.com/push.js';
    }
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(bp, s);
})();
</script>
</body>"""

# Marker to detect if already added
MARKER = "zz.bdstatic.com/linksubmit/push.js"

modified = 0
skipped = 0
errors = 0

for root, dirs, files in os.walk(SITE_DIR):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Skip if already has the push script
            if MARKER in content:
                skipped += 1
                continue

            # Skip if no </body> tag (shouldn't happen)
            if '</body>' not in content:
                print(f"  WARNING: no </body> in {fpath}")
                errors += 1
                continue

            # Insert push script before </body>
            new_content = content.replace('</body>', BAIDU_PUSH, 1)

            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            modified += 1

        except Exception as e:
            print(f"  ERROR: {fpath}: {e}")
            errors += 1

print(f"\nResults: {modified} modified, {skipped} skipped (already had push), {errors} errors")

# Verify
count = 0
for root, dirs, files in os.walk(SITE_DIR):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            if MARKER in f.read():
                count += 1
print(f"Verification: {count} files now have Baidu auto-push JS")
