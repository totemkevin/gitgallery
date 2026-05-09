import unittest
import os
import json
import shutil
import tempfile
import sys
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))


def make_test_image(path, width=800, height=600, color=(255, 0, 0)):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.new("RGB", (width, height), color).save(path)


class TestCropCenter(unittest.TestCase):
    def _fn(self):
        from build_gallery import crop_center
        return crop_center

    def test_wide_image_crops_to_target_size(self):
        result = self._fn()(Image.new("RGB", (800, 400)), 400, 300)
        self.assertEqual(result.size, (400, 300))

    def test_tall_image_crops_to_target_size(self):
        result = self._fn()(Image.new("RGB", (400, 800)), 400, 300)
        self.assertEqual(result.size, (400, 300))


class TestBuild(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.gallery_dir = os.path.join(self.tmpdir, "gallery")
        self.index_file = os.path.join(self.tmpdir, "gallery-index.json")

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _make_set(self, name, meta, images=None):
        set_dir = os.path.join(self.gallery_dir, name)
        images_dir = os.path.join(set_dir, "images")
        os.makedirs(images_dir, exist_ok=True)
        with open(os.path.join(set_dir, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f)
        for img_name in (images or []):
            make_test_image(os.path.join(images_dir, img_name))
        return set_dir

    def test_empty_gallery_returns_empty_list(self):
        from build_gallery import build
        os.makedirs(self.gallery_dir)
        self.assertEqual(build(self.gallery_dir, self.index_file), [])

    def test_single_set_appears_in_index(self):
        from build_gallery import build
        self._make_set("album1", {
            "title": "Album One", "tags": ["人物"], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        result = build(self.gallery_dir, self.index_file)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "album1")
        self.assertEqual(result[0]["title"], "Album One")
        self.assertEqual(result[0]["tags"], ["人物"])

    def test_cover_webp_is_400x300(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        cover = Image.open(os.path.join(set_dir, "cover.webp"))
        self.assertEqual(cover.size, (400, 300))

    def test_missing_cover_falls_back_to_first_image(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "nonexistent.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["b.jpg", "c.jpg"])
        build(self.gallery_dir, self.index_file)
        self.assertTrue(os.path.exists(os.path.join(set_dir, "cover.webp")))

    def test_create_time_iso_sentinel_is_replaced(self):
        from build_gallery import build
        set_dir = self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "ISO"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        with open(os.path.join(set_dir, "meta.json"), encoding="utf-8") as f:
            meta = json.load(f)
        self.assertNotIn(meta["createTime"], ("ISO", ""))

    def test_index_sorted_by_create_time_descending(self):
        from build_gallery import build
        self._make_set("album_old", {
            "title": "Old", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2025-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        self._make_set("album_new", {
            "title": "New", "tags": [], "author": "",
            "cover": "b.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["b.jpg"])
        result = build(self.gallery_dir, self.index_file)
        self.assertEqual(result[0]["id"], "album_new")
        self.assertEqual(result[1]["id"], "album_old")

    def test_gallery_index_json_is_written(self):
        from build_gallery import build
        self._make_set("album1", {
            "title": "A", "tags": [], "author": "",
            "cover": "a.jpg", "createTime": "2026-01-01T00:00:00+00:00"
        }, ["a.jpg"])
        build(self.gallery_dir, self.index_file)
        self.assertTrue(os.path.exists(self.index_file))
        with open(self.index_file, encoding="utf-8") as f:
            self.assertIsInstance(json.load(f), list)


if __name__ == "__main__":
    unittest.main()
