# Opening title font

`zcool-kuaile-title.woff2` is a subset of **ZCOOL KuaiLe Regular** by Liu Bingke,
Yang Kang and Wu Shaojie. It contains the characters in `开窑啦！Fire Up the Kiln!`.

Source: https://github.com/google/fonts/tree/main/ofl/zcoolkuaile

Licensed under SIL Open Font License 1.1; see `OFL-ZCOOL-KuaiLe.txt`.
Generated from the upstream TTF with fontTools (WOFF2 flavor, retaining required
glyphs and layout closure). The font is served locally without a font CDN.

The title reveal is an original CSS implementation inspired by React Bits
Blur Text: https://reactbits.dev/text-animations/blur-text .

## UI hint-card font

`xz-round-subset.woff2` is a renamed, subset copy of **975 Maru SC Medium (975 圆体)**,
built from `@fontpkg/975-maru-sc` (MTI/fontpkg mirror of the upstream release; the font's
own copyright line reads "(c) 2014-2019 Adobe", license URL http://scripts.sil.org/OFL).

Licensed under SIL Open Font License 1.1; see `OFL-975-Maru.txt`. Per OFL the derived file
is renamed to `XZ Round` in its name table.

Subset contains the characters used by `src/**/*.js`, `src/**/*.css`, `index.html` and
`CHANGELOG.md` (1116 requested codepoints, 1104 glyphs, 178 KB, WOFF2 via fontTools
`pyftsubset`), so hint cards render rounded text without a font CDN and without the
17 MB original. `CHANGELOG.md` must stay in the input list: the update card is rendered
from that file at runtime, and characters missing from the subset silently fall back to
the system sans. The source does not contain the decorative symbols used in menus
(`◈ ✦ ✧ ↶ ↷ ↺ ⌂ ☼ ⚙ ✋ ⟳`, emoji), so those keep rendering from the system font.

## Regenerating the subset

`npm run font:round` rebuilds `xz-round-subset.woff2`: `tools/fonts/collect.mjs` walks `src/**/*.js|.css`, `index.html` and `CHANGELOG.md` for characters, `tools/fonts/build.mjs` runs `pyftsubset` through `tools/fonts/py_build_woff2.py` (needs Python + fontTools and the 17 MB upstream TTF, which is not committed).

`npm run font:check` compares the subset's cmap against the same character set and lists anything that would silently fall back to the system font — run it after adding UI copy.


