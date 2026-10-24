from PIL import Image
import os

src = r"C:\Users\17038\.dsh\attachments\v1\objects\83\8330b24eae15271a3134e9e996debba10fc650c098b7f1e44fdfa55726bc9afb"
out_dir = r"D:\ECNU\BOKE\Porcelain_Workshop_Code\src\assets"
os.makedirs(out_dir, exist_ok=True)

im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

# The badge is the deep navy rounded square: strong blue dominance.
minx, miny, maxx, maxy = w, h, 0, 0
for y in range(0, int(h * 0.5)):
    for x in range(0, int(w * 0.36)):
        r, g, b = px[x, y]
        if b - r > 60 and b > 90 and r < 110:
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)
print("badge bbox", minx, miny, maxx, maxy)

pad = 4
x0, y0 = max(0, minx - pad), max(0, miny - pad)
x1, y1 = min(w, maxx + pad), min(h, maxy + pad)
side = max(x1 - x0, y1 - y0)
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
badge = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((512, 512), Image.LANCZOS)
badge.save(os.path.join(out_dir, "logo-mark.png"))
print("badge side", side)

# Lockup: wordmark + tagline, above the bottom app icon.
region = im.crop((maxx + 30, 150, w - 20, 480))
bg = region.getpixel((3, 3))
rw, rh = region.size
rp = region.load()
bx0, by0, bx1, by1 = rw, rh, 0, 0
for y in range(rh):
    for x in range(rw):
        r, g, b = rp[x, y]
        if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 70:
            bx0 = min(bx0, x); bx1 = max(bx1, x)
            by0 = min(by0, y); by1 = max(by1, y)
print("lockup bbox", bx0, by0, bx1, by1)
lock = region.crop((max(0, bx0 - 6), max(0, by0 - 6), min(rw, bx1 + 6), min(rh, by1 + 6)))
lock.save(os.path.join(out_dir, "logo-lockup.png"))
print("lockup size", lock.size, "bg", bg)
