#!/usr/bin/env python3
"""Compress critical hero assets and the home page video."""

from __future__ import annotations

import io
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
MAX_WIDTH = 2200
JPEG_QUALITY = 82

CRITICAL = [
    ROOT / "Gargi" / "De Atelier_Cover Pic.jpeg",
    ROOT / "Gallary_image" / "contianer" / "Evara_Cover Pic.png",
    ROOT / "Gallary_image" / "contianer" / "Avena Cover Pic.png",
    ROOT / "Gallary_image" / "Arch_Cover Pic.png",
    ROOT / "Gallary_image" / "banner" / "Brand Philosophy Image.png",
    ROOT / "Evara" / "01_Stilt Floor.png",
    ROOT / "Evara" / "02_Typical Floors.png",
    ROOT / "Evara" / "03_Terrace Floor.png",
    ROOT / "Mungo" / "Floor Plan_01.png",
    ROOT / "Mungo" / "Floor Plan_02.png",
    ROOT / "Mungo" / "Section.png",
    ROOT / "Avena" / "Ground Floor.png",
    ROOT / "Avena" / "First Floor.png",
    ROOT / "Avena" / "Second Floor.png",
    ROOT / "photos" / "Mungo" / "aboutbanner.jpg",
    ROOT / "Public" / "architecture" / "Clip_06 (1) (1).mp4",
]


def compress_image(path: Path) -> None:
    if not path.exists():
        print(f"SKIP missing {path.relative_to(ROOT)}")
        return
    before = path.stat().st_size
    with Image.open(path) as img:
        w, h = img.size
        if w > MAX_WIDTH:
            h = max(1, int(h * MAX_WIDTH / w))
            img = img.resize((MAX_WIDTH, h), Image.Resampling.LANCZOS)
        ext = path.suffix.lower()
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        if ext in {".jpg", ".jpeg"} or (ext == ".png" and not has_alpha):
            rgb = img.convert("RGB")
            out = path if ext != ".png" else path.with_suffix(".jpg")
            buf = io.BytesIO()
            rgb.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            data = buf.getvalue()
            if len(data) < before:
                out.write_bytes(data)
                if out != path:
                    path.unlink(missing_ok=True)
        else:
            rgba = img.convert("RGBA")
            buf = io.BytesIO()
            rgba.save(buf, format="PNG", optimize=True, compress_level=9)
            data = buf.getvalue()
            if len(data) < before:
                path.write_bytes(data)
    after_path = path if path.exists() else path.with_suffix(".jpg")
    after = after_path.stat().st_size if after_path.exists() else 0
    print(f"IMG {path.relative_to(ROOT)}: {before/1024/1024:.2f}MB -> {after/1024/1024:.2f}MB")


def compress_video(path: Path) -> None:
    if not path.exists():
        print(f"SKIP missing {path.relative_to(ROOT)}")
        return
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        print("SKIP video: imageio_ffmpeg not installed")
        return

    before = path.stat().st_size
    tmp = path.with_name(path.stem + "._opt.mp4")
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(path),
        "-an",
        "-vcodec",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "fast",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    if tmp.exists() and tmp.stat().st_size < before:
        backup = path.with_suffix(".mp4.bak")
        shutil.move(path, backup)
        shutil.move(tmp, path)
        after = path.stat().st_size
        print(f"VID {path.relative_to(ROOT)}: {before/1024/1024:.2f}MB -> {after/1024/1024:.2f}MB")
        backup.unlink(missing_ok=True)
    elif tmp.exists():
        tmp.unlink()


def main() -> None:
    for path in CRITICAL:
        if path.suffix.lower() == ".mp4":
            compress_video(path)
        else:
            compress_image(path)


if __name__ == "__main__":
    main()
