from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')
for start, end in (
    ('    <section class="mk-section mk-wrap" id="toolkit">', '    <section class="mk-section mk-wrap" id="community">'),
    ('    <section class="mk-section mk-wrap" id="stories">', '    <footer class="mk-footer">'),
):
    left = html.index(start)
    right = html.index(end, left)
    html = html[:left] + html[right:]
path.write_text(html, encoding='utf-8')
