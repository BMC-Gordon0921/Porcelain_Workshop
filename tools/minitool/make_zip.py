"""把 dist 目录打成小工具可上传的 zip（deflate，路径统一 / 分隔）。

小工具要求 index.html 在 zip 根、全部相对路径；Windows 上必须显式写 arcname，
否则会用反斜杠或带上 dist 目录名。
用法：python tools/minitool/make_zip.py <dist_dir> <out_zip>
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path


def main() -> int:
    src = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    if not (src / "index.html").is_file():
        print(f"missing index.html in {src}", file=sys.stderr)
        return 1
    map_path = "maps/jingdezhen.png"
    app_path = src / "assets" / "app.js"
    if not (src / map_path).is_file() or f"./{map_path}" not in app_path.read_text(encoding="utf-8"):
        print(f"missing bundled map or app reference: {map_path}", file=sys.stderr)
        return 1
    files = sorted(p for p in src.rglob("*") if p.is_file())
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, arcname=path.relative_to(src).as_posix())
    print(f"zipped {len(files)} file(s) -> {out} ({out.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
