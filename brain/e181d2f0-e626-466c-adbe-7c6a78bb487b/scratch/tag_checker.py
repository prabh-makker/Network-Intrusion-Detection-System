
import re

with open(r'c:\Users\khalo\prabh\Network-Intrusion-Detection-System\frontend\src\app\dashboard\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    # Find all tags in the line
    tags = re.findall(r'<(div|motion\.div)|</(div|motion\.div)>', line)
    for open_tag, close_tag in tags:
        if open_tag:
            # Check if it's self-closing on the same line
            if re.search(fr'<{re.escape(open_tag)}[^>]*/>', line):
                continue
            stack.append((open_tag, i + 1))
        elif close_tag:
            if not stack:
                print(f"Error: Unexpected closing tag </{close_tag}> at line {i + 1}")
            else:
                top_tag, top_line = stack.pop()
                if top_tag != close_tag:
                    print(f"Error: Mismatched tag </{close_tag}> at line {i + 1} (opened <{top_tag}> at line {top_line})")

for tag, line in stack:
    print(f"Error: Unclosed tag <{tag}> opened at line {line}")
