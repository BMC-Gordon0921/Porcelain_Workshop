"""Validate Office packages and bundle the classroom deliverables."""
from pathlib import Path
import json
import re
import struct
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'source/manifest.json').read_text(encoding='utf-8'))
results = []
for deck in manifest['decks']:
    pptx = root / deck['file']
    with zipfile.ZipFile(pptx) as archive:
        assert archive.testzip() is None, f'Corrupt PPTX: {pptx.name}'
        names = archive.namelist()
        slides = [n for n in names if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)]
        notes = [n for n in names if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml', n)]
        assert len(slides) == len(deck['slides'])
        for name in names:
            if name.endswith(('.xml', '.rels')):
                ET.fromstring(archive.read(name))
    pdf = pptx.with_suffix('.pdf')
    data = pdf.read_bytes()
    assert data.startswith(b'%PDF-')
    page_count = len(re.findall(rb'/Type\s*/Page\b', data))
    assert page_count == len(slides), (pdf.name, page_count)
    for name in deck['slides']:
        png = (root / deck['folder'] / (name + '.png')).read_bytes()
        assert struct.unpack('>II', png[16:24]) == (1920, 1080)
        ET.fromstring((root / deck['folder'] / (name + '.svg')).read_bytes())
    results.append({'file':pptx.name, 'pptxSlides':len(slides), 'pdfPages':page_count, 'speakerNotes':len(notes), 'pngSize':'1920x1080', 'xmlValid':True})
assert not json.loads((root/'source/powerpoint-audit.json').read_text(encoding='utf-8-sig'))
assert json.loads((root/'source/browser-audit.json').read_text(encoding='utf-8'))['navigationPassed']
(root/'source/package-audit.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
destination = root.parent / '\u666f\u5fb7\u9547\u74f7\u5668\u4e4b\u65c5_\u8bfe\u7a0b\u5c55\u793a\u8d44\u6599\u5305.zip'
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file() and not file.name.startswith('~$') and '__pycache__' not in file.parts:
            archive.write(file, file.relative_to(root.parent))
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    count = len(archive.namelist())
print(json.dumps({'checks':results,'zip':str(destination),'files':count,'sizeMB':round(destination.stat().st_size/1024/1024,2)}, ensure_ascii=False, indent=2))
