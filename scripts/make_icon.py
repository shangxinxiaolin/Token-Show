# 生成应用图标 assets/icon.png（纯标准库，256x256）
import zlib, struct, os, math
W = H = 256
def px(x, y):
    # 圆角矩形背景，紫色渐变
    r = 56
    cx = min(max(x, r), W - 1 - r); cy = min(max(y, r), H - 1 - r)
    if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
        return (0, 0, 0, 0)
    t = (x + y) / (W + H)
    c = (int(59 + (124 - 59) * t), int(47 + (108 - 47) * t), int(158 + (255 - 158) * t), 255)
    # 三根白色柱状条
    bars = [(64, 112, 150), (112, 160, 96), (160, 208, 128)]
    for x0, x1, top in bars:
        bx0, bx1 = x0 + 6, x1 - 6
        if bx0 <= x < bx1 and top <= y < 200:
            return (255, 255, 255, 240)
    return c
raw = b''.join(b'\x00' + b''.join(bytes(px(x, y)) for x in range(W)) for y in range(H))
def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icon.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'wb').write(png)
print('wrote', out)
