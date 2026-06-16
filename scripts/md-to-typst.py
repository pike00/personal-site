#!/usr/bin/env python3
"""Convert markdown CV to Typst format."""

import sys
import re
from pathlib import Path


def escape_typst(text: str) -> str:
    """Escape special Typst characters."""
    # Convert email addresses with angle brackets to monospace
    text = re.sub(r'<([^>]+@[^>]+)>', r'`\1`', text)
    return text


def process_inline_formatting(text: str) -> str:
    """Process inline markdown formatting into Typst markup.

    Typst uses *x* for bold and _x_ for italic, the opposite of markdown's
    single-asterisk italic. Protect bold spans first so the italic pass cannot
    see their asterisks, map markdown italic to Typst italic, then restore bold.
    """
    text = re.sub(r'\*\*(.+?)\*\*', '\x00\\1\x00', text)  # protect **bold**
    text = re.sub(r'\*(.+?)\*', r'_\1_', text)             # *italic* -> _italic_
    text = text.replace('\x00', '*')                        # bold -> Typst *bold*
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'#link("\2")[\1]', text)
    return escape_typst(text)


def split_role_org(heading: str) -> tuple[str, str]:
    """Split a level-3 heading 'Role -- Org' into (role, org)."""
    parts = heading.split(' -- ', 1)
    role = process_inline_formatting(parts[0].strip())
    org = process_inline_formatting(parts[1].strip()) if len(parts) > 1 else ''
    return role, org


def parse_meta(line: str) -> tuple[str, str]:
    """Parse a '*Dates* | Location' meta line into (date, location)."""
    segments = line.split('|')
    date = segments[0].strip().strip('*').strip()
    location = segments[1].strip() if len(segments) > 1 else ''
    return process_inline_formatting(date), process_inline_formatting(location)


def typst_field(value: str) -> str:
    """Render a value as a Typst content block, or `none` when empty."""
    return f'[{value}]' if value else 'none'


def convert_md_to_typst(md_content: str) -> str:
    """Convert markdown content to Typst format."""
    lines = md_content.split('\n')
    typst_lines = []
    frontmatter_end = 0

    # Skip YAML frontmatter
    if lines and lines[0].strip() == '---':
        for i in range(1, len(lines)):
            if lines[i].strip() == '---':
                frontmatter_end = i + 1
                break

    # Process markdown content
    seen_section = False  # contact/intro lines appear before the first ## heading
    first_in_section = False  # the next entry hugs its section heading
    i = frontmatter_end
    while i < len(lines):
        line = lines[i]

        # Skip empty lines at the start
        if not typst_lines and not line.strip():
            i += 1
            continue

        # Section headings
        if line.startswith('## '):
            seen_section = True
            first_in_section = True
            heading = line[3:].strip()
            typst_lines.append(f'#heading(level: 2)[{heading}]')
            typst_lines.append('')
        # Entries: role/school heading, optionally followed by a meta line
        elif line.startswith('### '):
            role, org = split_role_org(line[4:].strip())
            date, location = '', ''
            peek = i + 1
            while peek < len(lines) and not lines[peek].strip():
                peek += 1
            if peek < len(lines):
                next_line = lines[peek].strip()
                if next_line and not next_line.startswith('-') and not next_line.startswith('#'):
                    date, location = parse_meta(next_line)
                    i = peek  # consume the meta line
            func = 'firstentry' if first_in_section else 'entry'
            first_in_section = False
            typst_lines.append(
                f'#{func}([{role}], {typst_field(org)}, {typst_field(date)}, {typst_field(location)})'
            )
            typst_lines.append('')
        # List items
        elif line.startswith('- '):
            item = process_inline_formatting(line[2:].strip())
            typst_lines.append(f'- {item}')
        # Regular paragraph
        elif line.strip():
            text = process_inline_formatting(line)
            if seen_section:
                typst_lines.append(text)
            else:
                # Contact/intro line: centered and muted under the masthead
                typst_lines.append(f'#align(center)[#text(fill: rgb("#6b7280"), size: 9pt)[{text}]]')
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
