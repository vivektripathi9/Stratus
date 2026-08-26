#!/usr/bin/env python3
"""Compress oversized site images referenced in HTML pages."""

from __future__ import annotations

import io
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
HTML_GLOB = "*.html"
MIN_BYTES = 400_000
MAX_WIDTH = 2400
JPEG_QUALITY = 82
PNG_OPTIMIZE = True

SRC_PATTERN = re.compile(
    r'(?:src|href)=["\'](\./[^"\']+\.(?:png|jpg|jpeg|webp))["\']',
    re.IGNORECASE,
)


def collect_referenced_images() -> set[Path]:
    refs: set[Path] = set()
    for html in ROOT.glob(HTML_GLOB):
        text = html.read_text(encoding="utf-8", errors="ignore")
        for match in SRC_PATTERN.findall(text):
            path = (ROOT / match[2:]).resolve()
            if path.exists() and path.is_file():
                refs.add(path)
    return refs


def resize_if_needed(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w <= MAX_WIDTH:
        return img
    ratio = MAX_WIDTH / w
    new_size = (MAX_WIDTH, max(1, int(h * ratio)))
    return img.resize(new_size, Image.Resampling.LANCZOS)


def compress_image(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    if before < MIN_BYTES:
        return before, before

    ext = path.suffix.lower()
    with Image.open(path) as img:
        img = resize_if_needed(img)
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )

        if ext in {".jpg", ".jpeg"}:
            if img.mode != "RGB":
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            data = buf.getvalue()
            if len(data) < before:
                path.write_bytes(data)
        elif ext == ".png":
            if has_alpha:
                img = img.convert("RGBA")
                buf = io.BytesIO()
                img.save(buf, format="PNG", optimize=PNG_OPTIMIZE, compress_level=9)
                data = buf.getvalue()
                if len(data) < before:
                    path.write_bytes(data)
            else:
                rgb = img.convert("RGB")
                jpg_path = path.with_suffix(".jpg")
                buf = io.BytesIO()
                rgb.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                data = buf.getvalue()
                if len(data) < before * 0.85:
                    jpg_path.write_bytes(data)
                    path.unlink(missing_ok=True)
                    return before, jpg_path.stat().st_size

    after = path.stat().st_size if path.exists() else 0
    return before, after


def update_html_png_to_jpg() -> None:
    for html in ROOT.glob(HTML_GLOB):
        text = html.read_text(encoding="utf-8")
        updated = text

        def repl(match: re.Match[str]) -> str:
            src = match.group(1)
            if not src.lower().endswith(".png"):
                return match.group(0)
            jpg_src = src[:-4] + ".jpg"
            jpg_path = ROOT / jpg_src[2:]
            if jpg_path.exists() and not (ROOT / src[2:]).exists():
                return match.group(0).replace(src, jpg_src)
            return match.group(0)

        updated = SRC_PATTERN.sub(repl, updated)
        if updated != text:
            html.write_text(updated, encoding="utf-8")


def main() -> None:
    refs = collect_referenced_images()
    large = sorted((p for p in refs if p.stat().st_size >= MIN_BYTES), key=lambda p: p.stat().st_size, reverse=True)
    total_before = 0
    total_after = 0
    converted = 0

    print(f"Found {len(refs)} referenced images; {len(large)} over {MIN_BYTES // 1000}KB")
    for path in large:
        rel = path.relative_to(ROOT)
        try:
            before, after = compress_image(path)
            total_before += before
            total_after += after
            if before != after:
                pct = 100 * (1 - after / before)
                print(f"  {rel}: {before/1024/1024:.2f}MB -> {after/1024/1024:.2f}MB ({pct:.0f}% saved)")
                if not path.exists() and path.with_suffix(".jpg").exists():
                    converted += 1
        except Exception as exc:
            print(f"  SKIP {rel}: {exc}")

    update_html_png_to_jpg()

    saved_mb = (total_before - total_after) / 1024 / 1024
    print(f"Done. Saved ~{saved_mb:.1f}MB across compressed assets ({converted} PNG->JPG).")


if __name__ == "__main__":
    main()
