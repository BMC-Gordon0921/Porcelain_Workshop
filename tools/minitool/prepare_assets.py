"""把运行时位图转成 WebP，供小工具包使用（桌面/原生构建仍用原图）。

原图合计 8.4 MiB，超过 10 MiB 包体里能留给位图的份额；转 WebP(q88, 最长边 1536)
后约 0.6 MiB，肉眼差异只在放大到 1:1 时可见。
输出目录：minitool/gen/img/<原相对路径去掉扩展名>.webp
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "minitool" / "gen" / "img"
# (源目录, 需要处理的条目, 输出子目录)——logo 在小工具包里跟 app.js 同级放 assets/
SOURCES = [
    (ROOT / "public", ("references", "maps", "decals"), ""),
    (ROOT / "src" / "assets", ("logo-mark.png", "logo-lockup.png"), "assets"),
]
QUALITY = 88
MAX_EDGE = 1536
EXTS = {".png", ".jpg", ".jpeg"}


def convert(src: Path, out_dir: Path, rel: Path) -> dict | None:
    target = out_dir / rel.with_suffix(".webp")
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as image:
        image.load()
        # 小工具不做 6→7 位 alpha 精细处理，统一 RGBA 才能保留半透明
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        width, height = image.size
        scale = min(1.0, MAX_EDGE / max(width, height))
        if scale < 1.0:
            image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS)
        image.save(target, "WEBP", quality=QUALITY, method=6)
    return {
        "source": str(src.relative_to(ROOT)).replace("\\", "/"),
        "output": str(target.relative_to(OUT)).replace("\\", "/"),
        "srcBytes": src.stat().st_size,
        "outBytes": target.stat().st_size,
        "srcSize": [width, height],
        "outSize": list(Image.open(target).size),
    }


def main() -> int:
    if OUT.exists():
        for stale in OUT.rglob("*.webp"):
            stale.unlink()
    records = []
    for base, entries, prefix in SOURCES:
        for entry in entries:
            candidate = base / entry
            if candidate.is_dir():
                files = [p for p in sorted(candidate.rglob("*")) if p.suffix.lower() in EXTS]
            elif candidate.is_file():
                files = [candidate]
            else:
                print(f"missing source: {candidate}", file=sys.stderr)
                continue
            for src in files:
                record = convert(src, OUT, Path(prefix) / src.relative_to(base))
                if record:
                    records.append(record)
    total_in = sum(r["srcBytes"] for r in records)
    total_out = sum(r["outBytes"] for r in records)
    (ROOT / "minitool" / "gen" / "img-manifest.json").write_text(
        json.dumps({"images": records, "totalIn": total_in, "totalOut": total_out}, indent=2),
        encoding="utf-8",
    )
    print(f"converted {len(records)} images: {total_in/1048576:.2f} MiB -> {total_out/1048576:.2f} MiB")
    for r in sorted(records, key=lambda x: -x["srcBytes"])[:6]:
        print(f"  {r['source']:<44} {r['srcBytes']//1024:>5}K -> {r['outBytes']//1024:>4}K  {r['srcSize']} -> {r['outSize']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
