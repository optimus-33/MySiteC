"""Small structural check for index.html: tag balance, duplicate ids, size."""
import re
from html.parser import HTMLParser
from pathlib import Path

VOID = {
    "meta", "link", "br", "hr", "img", "input", "source", "area",
    "base", "col", "embed", "param", "track", "wbr",
}


class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f"extra </{tag}> at {self.getpos()}")
            return
        opened, position = self.stack.pop()
        if opened != tag:
            self.errors.append(
                f"mismatch: <{opened}> at {position} closed by </{tag}> at {self.getpos()}"
            )


path = Path(__file__).resolve().parent.parent / "index.html"
source = path.read_text(encoding="utf-8")

checker = Checker()
checker.feed(source)

ids = re.findall(r'\bid="([^"]+)"', source)
duplicates = sorted({value for value in ids if ids.count(value) > 1})

visible_source = re.sub(r"<!--.*?-->", "", source, flags=re.S)
references = re.findall(r'(?:href|src)="([^"]+)"', visible_source)
local_assets = [
    value for value in references
    if not value.startswith(("http", "mailto:", "#", "data:"))
]
missing_assets = sorted(
    value for value in set(local_assets) if not (path.parent / value).exists()
)

anchor_targets = {value for value in re.findall(r'href="#([^"]+)"', source)}
missing_anchors = sorted(anchor_targets - set(ids))

print("errors:", checker.errors[:10] or "none")
print("unclosed:", [(tag, pos) for tag, pos in checker.stack][:10] or "none")
print(f"ids: {len(ids)} total, {len(set(ids))} unique")
print("duplicate ids:", duplicates or "none")
print("missing local assets:", missing_assets or "none")
print("missing anchor targets:", missing_anchors or "none")
print(f"html size: {len(source.encode('utf-8')):,} bytes")
