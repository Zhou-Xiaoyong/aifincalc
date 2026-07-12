#!/usr/bin/env python3
import os
import re

def remove_comment_section(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(
        r'\s*<section class="comment-section">.*?</section>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Removed comments from: {filepath}")

if __name__ == '__main__':
    os.chdir('/workspace')
    
    articles = ['article1', 'article2', 'article3', 'article4', 'article5', 'article6', 'article7']
    
    for article in articles:
        filepath = f'blog/{article}/index.html'
        if os.path.exists(filepath):
            remove_comment_section(filepath)
    
    print("\nAll comment sections removed successfully!")