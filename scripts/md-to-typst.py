#!/usr/bin/env python3
"""Convert markdown CV to Typst format."""

import sys
import re
from pathlib import Path


def escape_typst(text: str) -> str:
    """Escape special Typst characters."""
    # Convert email addresses with angle brackets to plain text
    text = re.sub(r'<([^>]+@[^>]+)>', r'`\1`', text)
    return text


def convert_md_to_typst(md_content: str) -> str:
    """Convert markdown content to Typst format."""
    lines = md_content.split('\n')
    typst_lines = []
    in_frontmatter = False
    frontmatter_end = 0

    # Skip YAML frontmatter
    if lines and lines[0].strip() == '---':
        in_frontmatter = True
        for i in range(1, len(lines)):
            if lines[i].strip() == '---':
                frontmatter_end = i + 1
                break

    # Process markdown content
    i = frontmatter_end
    while i < len(lines):
        line = lines[i]

        # Skip empty lines at the start
        if not typst_lines and not line.strip():
            i += 1
            continue

        # Headings
        if line.startswith('## '):
            heading = line[3:].strip()
            typst_lines.append(f'#heading(level: 2)[{heading}]')
            typst_lines.append('')
        elif line.startswith('### '):
            heading = line[4:].strip()
            typst_lines.append(f'#heading(level: 3)[{heading}]')
            typst_lines.append('')
        elif line.startswith('# '):
            heading = line[2:].strip()
            typst_lines.append(f'#heading(level: 1)[{heading}]')
            typst_lines.append('')
        # List items
        elif line.startswith('- '):
            item = line[2:].strip()
            # Process inline formatting in list items
            item = re.sub(r'\*\*(.+?)\*\*', r'*\1*', item)
            item = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'#link("\2")[\1]', item)
            item = escape_typst(item)
            typst_lines.append(f'  - {item}')
        # Regular paragraph
        elif line.strip():
            # Process inline formatting
            line = re.sub(r'\*\*(.+?)\*\*', r'*\1*', line)
            line = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'#link("\2")[\1]', line)
            line = escape_typst(line)
            typst_lines.append(line)
        # Empty line
        else:
            if typst_lines and typst_lines[-1]:  # Avoid multiple empty lines
                typst_lines.append('')

        i += 1

    return '\n'.join(typst_lines).rstrip()


def main():
    if len(sys.argv) != 2:
        print("Usage: md-to-typst.py <cv.md>", file=sys.stderr)
        sys.exit(1)

    md_file = Path(sys.argv[1])
    if not md_file.exists():
        print(f"Error: {md_file} not found", file=sys.stderr)
        sys.exit(1)

    md_content = md_file.read_text(encoding='utf-8')
    typst_content = convert_md_to_typst(md_content)
    print(typst_content)


if __name__ == '__main__':
    main()
