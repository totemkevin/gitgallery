"""
Compress all gallery images to WebP for web display.
Max 1920px on longest side, quality 85.
Updates meta.json cover fields when extension changes.
"""

import json
import pathlib
from PIL import Image

GALLERY = pathlib.Path("gallery")
MAX_SIZE = 1920
QUALITY = 85
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def compress():
    renamed: dict[pathlib.Path, dict[str, str]] = {}

    for img_path in sorted(GALLERY.rglob("*")):
        if img_path.suffix.lower() not in IMAGE_EXTS:
            continue
        if "images" not in img_path.parts:
            continue

        album_dir = img_path.parent.parent
        new_path = img_path.with_suffix(".webp")

        # Skip if already WebP and within size limits
        if img_path.suffix.lower() == ".webp":
            with Image.open(img_path) as im:
                w, h = im.size
                if w <= MAX_SIZE and h <= MAX_SIZE:
                    print(f"{img_path.name} → {img_path.name}  (已是 WebP，跳過)")
                    continue

        with Image.open(img_path) as im:
            w, h = im.size
            if w > MAX_SIZE or h > MAX_SIZE:
                im.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGB")
            im.save(new_path, "WEBP", quality=QUALITY)

        old_kb = img_path.stat().st_size // 1024
        new_kb = new_path.stat().st_size // 1024
        print(f"{img_path.name} → {new_path.name}  {old_kb}KB → {new_kb}KB")

        if img_path != new_path:
            renamed.setdefault(album_dir, {})[img_path.name] = new_path.name
            img_path.unlink()

    # Update meta.json cover fields
    for album_dir, name_map in renamed.items():
        meta_path = album_dir / "meta.json"
        if not meta_path.exists():
            continue
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        old_cover = meta.get("cover", "")
        if old_cover in name_map:
            meta["cover"] = name_map[old_cover]
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)
            print(f"Updated {meta_path.parent.name}/meta.json: cover {old_cover} → {meta['cover']}")

    print("\nDone. Run: python scripts/build_gallery.py")


if __name__ == "__main__":
    compress()
