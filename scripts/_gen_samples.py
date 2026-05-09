from PIL import Image, ImageDraw
import os

out = os.path.join(os.path.dirname(__file__), "..", "gallery", "sample-album", "images")
os.makedirs(out, exist_ok=True)

samples = [("pic1.jpg", (70, 130, 180)), ("pic2.jpg", (144, 238, 144)), ("pic3.jpg", (255, 165, 100))]
for fname, color in samples:
    img = Image.new("RGB", (1200, 900), color)
    ImageDraw.Draw(img).text((40, 40), fname, fill=(255, 255, 255))
    img.save(os.path.join(out, fname), "JPEG", quality=85)
    print(f"  created {fname}")
print("Done")
