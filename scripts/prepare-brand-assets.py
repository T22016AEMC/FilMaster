"""由使用者原圖製作透明網頁資產；不重繪圖案，原檔保持不變。

使用既有工作環境的 Pillow、NumPy。白色方塊內部保留原像素，
外部僅以區域遮罩及白底反合成移除背景，保留抗鋸齒與柔和陰影。
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'brand/filmaster-logo-source.png').convert('RGB')
rgb = np.asarray(source, dtype=float)
signal = 255 - rgb.min(axis=2)

# 原圖方塊的白底與細邊框完整保留，僅在外緣羽化一個像素。
plate = Image.new('L', source.size)
ImageDraw.Draw(plate).rounded_rectangle((289, 175, 672, 547), radius=82, fill=255)
preserve = np.asarray(plate.filter(ImageFilter.GaussianBlur(0.6))) / 255

# 文字區只保留有圖案的區域，避免近白漸層／壓縮雜訊成為方框。
seed = Image.fromarray(np.uint8((signal > 35) * 255))
support = np.asarray(seed.filter(ImageFilter.MaxFilter(17))) / 255
y, x = np.indices(signal.shape)
badge_region = (x > 265) & (x < 700) & (y > 150) & (y < 575)
support = np.maximum(support, badge_region)
alpha = np.maximum(preserve, np.clip((signal - 3) / 77, 0, 1) * support)
foreground = np.clip((rgb - 255 * (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-9), 0, 255)
rgba = np.dstack((np.rint(foreground), np.rint(alpha * 255))).astype('uint8')
rgba[rgba[:, :, 3] == 0, :3] = 0
transparent = Image.fromarray(rgba)

# 去掉原圖大面積留白，保留方塊陰影的空間。
logo = transparent.crop((265, 150, 1905, 575))
logo = logo.resize((1000, 259), Image.Resampling.LANCZOS)
logo.save(ROOT / 'public/brand/filmaster-logo.png', optimize=True, compress_level=9)
logo.save(ROOT / 'public/brand/filmaster-logo.webp', lossless=True, method=6)
# 方塊四周約 8% 邊距；沿用相同去背結果。
icon = transparent.crop((258, 145, 704, 591))
for size in (32, 180, 512):
    icon.resize((size, size), Image.Resampling.LANCZOS).save(
        ROOT / f'public/favicon-{size}.png', optimize=True, compress_level=9)
for path in [ROOT / 'public/brand/filmaster-logo.png', *sorted((ROOT / 'public').glob('favicon-*.png'))]:
    print(path.relative_to(ROOT), Image.open(path).size, path.stat().st_size, 'bytes')
