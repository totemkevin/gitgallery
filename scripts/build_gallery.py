import os
import json
import sys
from datetime import datetime, timezone
from PIL import Image

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
COVER_SIZE = (400, 300)


def crop_center(img, target_w, target_h):
    src_w, src_h = img.size
    if src_w / src_h > target_w / target_h:
        new_w = int(src_h * target_w / target_h)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w * target_h / target_w)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))
    return img.resize((target_w, target_h), Image.LANCZOS)


def get_images(images_dir):
    return sorted(
        f for f in os.listdir(images_dir)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTS
    )


def process_image_set(set_dir):
    set_name = os.path.basename(set_dir)
    meta_path = os.path.join(set_dir, "meta.json")
    images_dir = os.path.join(set_dir, "images")

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    if not meta.get("createTime") or meta["createTime"] == "ISO":
        meta["createTime"] = datetime.now(timezone.utc).isoformat()
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    images = get_images(images_dir)
    cover_filename = meta.get("cover", "")
    if cover_filename not in images:
        cover_filename = images[0] if images else None

    if cover_filename:
        with Image.open(os.path.join(images_dir, cover_filename)) as img:
            cover = crop_center(img.convert("RGB"), *COVER_SIZE)
            cover.save(os.path.join(set_dir, "cover.webp"), "WEBP", quality=85)

    return {
        "id": set_name,
        "title": meta.get("title", set_name),
        "tags": meta.get("tags", []),
        "author": meta.get("author", ""),
        "cover": f"gallery/{set_name}/cover.webp",
        "images": [f"gallery/{set_name}/images/{f}" for f in images],
        "createTime": meta["createTime"],
    }


def build(gallery_dir="gallery", index_file="gallery-index.json"):
    if not os.path.isdir(gallery_dir):
        print(f"gallery directory not found: {gallery_dir}")
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump([], f)
        return []

    sets = []
    for entry in sorted(os.scandir(gallery_dir), key=lambda e: e.name):
        if not entry.is_dir():
            continue
        meta_path = os.path.join(entry.path, "meta.json")
        images_dir = os.path.join(entry.path, "images")
        if not os.path.exists(meta_path) or not os.path.isdir(images_dir):
            continue
        try:
            sets.append(process_image_set(entry.path))
        except Exception as e:
            print(f"Error processing {entry.name}: {e}", file=sys.stderr)

    sets.sort(key=lambda s: s["createTime"], reverse=True)

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(sets, f, ensure_ascii=False, indent=2)

    print(f"Built {len(sets)} image set(s) → {index_file}")
    return sets


if __name__ == "__main__":
    build()
