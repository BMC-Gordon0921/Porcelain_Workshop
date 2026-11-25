# 由 build.mjs 调用：ttf -> 改名 XZ Round -> pyftsubset woff2 -> 导出 cmap。
import json, subprocess, sys
from fontTools.ttLib import TTFont

src, unicodes_file, out_woff2, out_json = sys.argv[1:5]
requested = [int(line, 16) for line in open(unicodes_file, encoding='utf8') if line.strip()]
source_cmap = set(TTFont(src).getBestCmap().keys())
unsupported = sorted(cp for cp in requested if cp not in source_cmap)
subprocess.run([sys.executable, '-m', 'fontTools.subset', src,
                '--unicodes-file=' + unicodes_file,
                '--flavor=woff2', '--layout-features=*', '--no-hinting',
                '--output-file=' + out_woff2], check=True)
font = TTFont(out_woff2)
for record in font['name'].names:
    if record.nameID in (1, 4, 6, 16):
        record.string = 'XZ Round'
font.save(out_woff2)
font = TTFont(out_woff2)
codepoints = sorted(font.getBestCmap().keys())
with open(out_json, 'w', encoding='utf8') as fp:
    json.dump({'codepoints': codepoints, 'unsupported': unsupported}, fp, ensure_ascii=False)
    fp.write('\n')
print('glyphs=%d codepoints=%d unsupported=%d (%s)' % (len(font.getGlyphOrder()), len(codepoints), len(unsupported),
      ' '.join('U+%04X' % cp for cp in unsupported)))