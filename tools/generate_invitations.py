#!/usr/bin/env python3
"""Generate recipient-specific static invitation pages and envelope images.

The generated HTML contains static Open Graph metadata because WhatsApp and
other link-preview crawlers do not execute JavaScript.

Brittany Signature is used only while rasterising the recipient name. The font
file is deliberately not published with the site; put a legitimately obtained
copy at tools/fonts/Brittany-Signature.ttf or pass --font /path/to/font.ttf.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as error:  # pragma: no cover - useful message on a new machine
    raise SystemExit(
        "Pillow is required. Install it with: python3 -m pip install Pillow"
    ) from error


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "invitaciones.json"
DEFAULT_FONT = ROOT / "tools" / "fonts" / "Brittany-Signature.ttf"
HTML_TEMPLATE = ROOT / "index.html"
ENVELOPE_TEMPLATE = ROOT / "assets" / "sobre-base.png"
OUTPUT_ROOT = ROOT / "invitacion"
WITNESS_IMAGE_DIR = ROOT / "assets" / "witness"

# Calligraphic phrases rendered with Brittany only at build time (the font is
# never served). The seal carries the JyP monogram, like the favicon.
WITNESS_TEASER = "¡Espera!"
WITNESS_TITLE = "testigo de nuestra boda"
WITNESS_SEAL_TEXT = "JyP"
WITNESS_INK = (161, 78, 48, 255)      # terracota del sobre
WITNESS_PAPER = (250, 241, 232, 255)   # crema del sobre

# The original lettering occupies approximately x=368..973, y=170..308.
# Keep arbitrary capital swashes below the heart/branches and above the serif
# sentence; a slightly wider horizontal range preserves the source's airy look.
NAME_BOX = (330, 178, 1000, 310)
TEXT_COLOR = (161, 78, 48, 244)
MAX_FONT_SIZE = 72
MIN_PREFERRED_FONT_SIZE = 44
MAX_HORIZONTAL_SCALE = 1.75
MIN_PREFERRED_HORIZONTAL_SCALE = 0.72
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class NameLayout:
    font_size: int
    horizontal_scale: float
    x: int
    y: int
    width: int
    height: int
    compressed: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate static personalised wedding invitations."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument(
        "--font",
        type=Path,
        default=Path(os.environ.get("INVITATION_FONT", DEFAULT_FONT)),
        help="Path to a licensed Brittany Signature TTF/OTF file.",
    )
    parser.add_argument(
        "--only",
        metavar="SLUG",
        help="Generate only one invitation from the configuration.",
    )
    return parser.parse_args()


def load_configuration(path: Path) -> tuple[str, list[dict[str, Any]]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise SystemExit(f"Configuration not found: {path}") from error
    except json.JSONDecodeError as error:
        raise SystemExit(f"Invalid JSON in {path}: {error}") from error

    site_url = str(data.get("site_url", "")).strip().rstrip("/")
    invitations = data.get("invitations")
    if not site_url.startswith("https://"):
        raise SystemExit("site_url must be an absolute https:// URL")
    if not isinstance(invitations, list):
        raise SystemExit("invitations must be a JSON array")
    return site_url, invitations


def validate_invitation(
    item: dict[str, Any],
) -> tuple[str, str, str, str, str, str | None]:
    if not isinstance(item, dict):
        raise SystemExit("Every invitation entry must be a JSON object")

    slug = str(item.get("slug", "")).strip()
    names = " ".join(str(item.get("names", "")).split())
    envelope_name = " ".join(str(item.get("envelope_name", names)).split())

    if not SLUG_PATTERN.fullmatch(slug):
        raise SystemExit(
            f"Invalid slug {slug!r}; use lowercase letters, numbers and hyphens"
        )
    if not names:
        raise SystemExit(f"Invitation {slug!r} has no names")
    if not envelope_name:
        raise SystemExit(f"Invitation {slug!r} has no envelope_name")
    if len(envelope_name) > 100:
        raise SystemExit(
            f"Envelope name for {slug!r} is too long; use an envelope_name override"
        )

    title = str(
        item.get("title", f"{names} — En un lugar de la Mancha...")
    ).strip()
    description = str(
        item.get(
            "description",
            f"Una invitación de boda para {names}. 24 de julio de 2027.",
        )
    ).strip()

    witness_value = item.get("witness_name")
    witness_name = None
    if witness_value is not None:
        witness_name = " ".join(str(witness_value).split())
        if not witness_name:
            raise SystemExit(f"Invitation {slug!r} has an empty witness_name")

    return slug, names, envelope_name, title, description, witness_name


def render_text_layer(text: str, font_path: Path) -> tuple[Image.Image, int]:
    """Render tightly cropped text at the largest height-safe font size."""

    box_height = NAME_BOX[3] - NAME_BOX[1]
    selected_font: ImageFont.FreeTypeFont | None = None
    selected_bbox: tuple[int, int, int, int] | None = None
    selected_size = MAX_FONT_SIZE

    # Signature fonts have unusually long ascenders and descenders. Measure
    # their real ink bounds rather than estimating from character count.
    for size in range(MAX_FONT_SIZE, 11, -1):
        font = ImageFont.truetype(str(font_path), size=size)
        bbox = font.getbbox(text)
        if bbox[3] - bbox[1] <= box_height - 6:
            selected_font = font
            selected_bbox = bbox
            selected_size = size
            break

    if selected_font is None or selected_bbox is None:
        raise RuntimeError(f"Could not fit lettering for {text!r}")

    left, top, right, bottom = selected_bbox
    width = max(1, right - left)
    height = max(1, bottom - top)
    padding = 5
    layer = Image.new("RGBA", (width + padding * 2, height + padding * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.text(
        (padding - left, padding - top),
        text,
        font=selected_font,
        fill=TEXT_COLOR,
    )

    alpha_box = layer.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError(f"The font produced no visible lettering for {text!r}")
    return layer.crop(alpha_box), selected_size


def fit_name(text: str, font_path: Path) -> tuple[Image.Image, NameLayout]:
    """Fit exact rendered pixels inside NAME_BOX, including script swashes."""

    layer, font_size = render_text_layer(text, font_path)
    box_width = NAME_BOX[2] - NAME_BOX[0]
    box_height = NAME_BOX[3] - NAME_BOX[1]

    # Normal-length names are gently widened to resemble the airy source
    # lettering. Long names are condensed instead of overflowing. If they need
    # excessive condensation, uniformly reduce the layer first for readability.
    horizontal_scale = min(MAX_HORIZONTAL_SCALE, box_width / layer.width)
    compressed = horizontal_scale < 1.0

    if horizontal_scale < MIN_PREFERRED_HORIZONTAL_SCALE:
        uniform_scale = horizontal_scale / MIN_PREFERRED_HORIZONTAL_SCALE
        new_size = (
            max(1, round(layer.width * uniform_scale)),
            max(1, round(layer.height * uniform_scale)),
        )
        layer = layer.resize(new_size, Image.Resampling.LANCZOS)
        font_size = max(1, round(font_size * uniform_scale))
        horizontal_scale = min(
            MIN_PREFERRED_HORIZONTAL_SCALE, box_width / layer.width
        )
        compressed = True

    fitted_width = min(box_width, max(1, round(layer.width * horizontal_scale)))
    if fitted_width != layer.width:
        layer = layer.resize((fitted_width, layer.height), Image.Resampling.LANCZOS)

    if layer.height > box_height:
        scale = box_height / layer.height
        layer = layer.resize(
            (max(1, round(layer.width * scale)), box_height),
            Image.Resampling.LANCZOS,
        )
        font_size = max(1, round(font_size * scale))

    x = NAME_BOX[0] + (box_width - layer.width) // 2
    y = NAME_BOX[1] + (box_height - layer.height) // 2
    layout = NameLayout(
        font_size=font_size,
        horizontal_scale=horizontal_scale,
        x=x,
        y=y,
        width=layer.width,
        height=layer.height,
        compressed=compressed,
    )

    # Hard safety invariant: no rendered recipient pixel may leave the card's
    # name area, regardless of name length or unusual glyph side bearings.
    if not (
        NAME_BOX[0] <= x
        and NAME_BOX[1] <= y
        and x + layer.width <= NAME_BOX[2]
        and y + layer.height <= NAME_BOX[3]
    ):
        raise RuntimeError(f"Unsafe envelope layout for {text!r}: {layout}")

    return layer, layout


def generate_envelope(
    envelope_name: str, font_path: Path, output_directory: Path
) -> tuple[Path, NameLayout]:
    base = Image.open(ENVELOPE_TEMPLATE).convert("RGBA")
    name_layer, layout = fit_name(envelope_name, font_path)
    base.alpha_composite(name_layer, (layout.x, layout.y))

    rgb = Image.new("RGB", base.size, "#faf1e8")
    rgb.paste(base.convert("RGB"))

    # First encode in memory so the filename changes whenever the image changes.
    from io import BytesIO

    buffer = BytesIO()
    rgb.save(
        buffer,
        format="JPEG",
        quality=93,
        optimize=True,
        progressive=True,
        subsampling=2,
    )
    image_bytes = buffer.getvalue()
    digest = hashlib.sha256(image_bytes).hexdigest()[:10]
    image_path = output_directory / f"sobre-{digest}.jpeg"

    for stale_image in output_directory.glob("sobre-*.jpeg"):
        stale_image.unlink()
    image_path.write_bytes(image_bytes)
    return image_path, layout


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(
            f"Expected exactly one {label} marker in index.html, found {count}"
        )
    return source.replace(old, new, 1)


def render_witness_text(
    text: str,
    font_path: Path,
    filename: str,
    target_width: int,
    bottom_pad_ratio: float = 0.0,
) -> Path:
    """Render a calligraphic phrase with Brittany, cropped, at 2x width."""

    WITNESS_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(str(font_path), size=220)
    bbox = font.getbbox(text)
    width = max(1, bbox[2] - bbox[0])
    height = max(1, bbox[3] - bbox[1])
    pad = 30
    layer = Image.new(
        "RGBA", (width + pad * 2, height + pad * 2), (0, 0, 0, 0)
    )
    draw = ImageDraw.Draw(layer)
    draw.text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=WITNESS_INK)
    alpha_box = layer.getchannel("A").getbbox()
    layer = layer.crop(alpha_box)
    if layer.width > target_width:
        new_height = max(1, round(layer.height * target_width / layer.width))
        layer = layer.resize((target_width, new_height), Image.Resampling.LANCZOS)
    if bottom_pad_ratio > 0:
        pad_pixels = max(1, round(layer.height * bottom_pad_ratio))
        padded = Image.new(
            "RGBA",
            (layer.width, layer.height + pad_pixels),
            (0, 0, 0, 0),
        )
        padded.paste(layer, (0, 0), layer)
        layer = padded
    output = WITNESS_IMAGE_DIR / filename
    layer.save(output, "PNG", optimize=True)
    return output


def render_witness_seal(font_path: Path) -> Path:
    """Wax seal with the JyP monogram, like the favicon."""

    WITNESS_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    size = 180
    font = ImageFont.truetype(str(font_path), size=108)
    bbox = font.getbbox(WITNESS_SEAL_TEXT)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((3, 3, size - 3, size - 3), fill=WITNESS_INK)
    draw.ellipse(
        (13, 13, size - 13, size - 13),
        outline=WITNESS_PAPER,
        width=3,
    )
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    draw.text((x, y), WITNESS_SEAL_TEXT, font=font, fill=WITNESS_PAPER)

    output = WITNESS_IMAGE_DIR / "witness-seal.png"
    layer.save(output, "PNG", optimize=True)
    return output


def generate_witness_section(
    witness_name: str,
    teaser_path: Path,
    title_path: Path,
    seal_path: Path,
) -> str:
    """Return the lightweight interactive envelope used for wedding witnesses."""

    witness_escaped = html.escape(witness_name, quote=True)
    with Image.open(teaser_path) as teaser:
        teaser_w, teaser_h = teaser.size
    with Image.open(title_path) as title:
        title_w, title_h = title.size
    with Image.open(seal_path) as seal:
        seal_size = seal.size[0]

    teaser_url = f"/assets/witness/{teaser_path.name}"
    title_url = f"/assets/witness/{title_path.name}"
    seal_url = f"/assets/witness/{seal_path.name}"
    return f'''  <section
    class="witness-section"
    id="witness-question"
    aria-label="Pregunta especial">
    <svg
      class="witness-arch"
      viewBox="0 0 600 780"
      aria-hidden="true"
      focusable="false">
      <path
        d="M38 780 V370 A262 262 0 0 1 562 370 V780"
        fill="none"
        stroke="#622c22"
        stroke-opacity=".16"
        stroke-width="2"/>
    </svg>
    <div class="witness-inner">
      <button
        class="witness-envelope"
        type="button"
        aria-expanded="false"
        aria-controls="witness-message"
        aria-label="Abrir mensaje especial para {witness_escaped}">
        <span class="witness-envelope-stage">
          <span class="witness-envelope-back" aria-hidden="true"></span>
          <span
            class="witness-letter"
            id="witness-message"
            role="status"
            aria-live="polite"
            aria-hidden="true">
            <span class="witness-heart" aria-hidden="true">♡</span>
            <span>Nos encantaría que fueras</span>
            <img
              class="witness-title-img"
              src="{title_url}"
              alt="testigo de nuestra boda"
              width="{title_w}"
              height="{title_h}">
          </span>
          <span class="witness-envelope-flap" aria-hidden="true"></span>
          <span class="witness-envelope-front" aria-hidden="true"></span>
          <img
            class="witness-seal"
            src="{seal_url}"
            alt=""
            width="{seal_size}"
            height="{seal_size}">
          <span class="witness-envelope-teaser" aria-hidden="true">
            <img
              class="witness-teaser-img"
              src="{teaser_url}"
              alt=""
              width="{teaser_w}"
              height="{teaser_h}">
          </span>
        </span>
      </button>
      <p class="witness-teaser-line">Hay algo más que tenemos que decirte…</p>
      <p class="witness-tap">Toca el sobre para abrirlo</p>
    </div>
    <noscript>
      <style>
        .witness-letter {{ transform: translateY(-80%) !important; }}
        .witness-envelope-flap,
        .witness-envelope-teaser,
        .witness-tap {{ display: none !important; }}
        .witness-seal {{ display: none !important; }}
      </style>
    </noscript>
  </section>'''


def generate_html(
    template: str,
    site_url: str,
    slug: str,
    names: str,
    title: str,
    description: str,
    image_filename: str,
    witness_name: str | None,
    witness_images: dict[str, Path] | None = None,
) -> str:
    canonical = f"{site_url}/invitacion/{slug}/"
    image_url = f"{canonical}{image_filename}"
    title_escaped = html.escape(title, quote=True)
    description_escaped = html.escape(description, quote=True)
    names_escaped = html.escape(names, quote=True)
    alt_text = f"Sobre de invitación de boda para {names_escaped}"

    result = template
    result = replace_once(
        result,
        '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '  <base href="/">\n'
        '  <meta name="robots" content="noindex, nofollow, noarchive">',
        "viewport",
    )
    result = replace_once(
        result,
        "  <title>En un lugar de la Mancha...</title>",
        f"  <title>{title_escaped}</title>",
        "document title",
    )
    result = replace_once(
        result,
        '  <meta name="description" content="En un lugar de la Mancha... te esperamos en nuestra boda.">',
        f'  <meta name="description" content="{description_escaped}">',
        "description",
    )
    result = replace_once(
        result,
        '  <link rel="canonical" href="https://bienvenidosanuestraboda.com/">',
        f'  <link rel="canonical" href="{canonical}">',
        "canonical URL",
    )
    result = replace_once(
        result,
        '  <meta property="og:title" content="En un lugar de la Mancha...">',
        f'  <meta property="og:title" content="{title_escaped}">',
        "Open Graph title",
    )
    result = replace_once(
        result,
        '  <meta property="og:description" content="En un lugar de la Mancha... te esperamos en nuestra boda.">',
        f'  <meta property="og:description" content="{description_escaped}">',
        "Open Graph description",
    )
    result = replace_once(
        result,
        '  <meta property="og:url" content="https://bienvenidosanuestraboda.com/">',
        f'  <meta property="og:url" content="{canonical}">',
        "Open Graph URL",
    )
    result = result.replace(
        "https://bienvenidosanuestraboda.com/assets/sobre.jpeg", image_url
    )
    result = replace_once(
        result,
        '  <meta name="twitter:title" content="En un lugar de la Mancha...">',
        f'  <meta name="twitter:title" content="{title_escaped}">',
        "Twitter title",
    )
    result = replace_once(
        result,
        '  <meta name="twitter:description" content="En un lugar de la Mancha... te esperamos en nuestra boda.">',
        f'  <meta name="twitter:description" content="{description_escaped}">',
        "Twitter description",
    )
    result = result.replace("assets/sobre.jpeg", f"/invitacion/{slug}/{image_filename}")
    result = result.replace(
        "Sobre de la invitación de boda de Jorge y Piedad", alt_text
    )

    if witness_name:
        if not witness_images:
            raise RuntimeError("Missing witness raster images")
        result = replace_once(
            result,
            "\n</main>",
            "\n\n"
            + generate_witness_section(
                witness_name,
                witness_images["teaser"],
                witness_images["title"],
                witness_images["seal"],
            )
            + "\n\n</main>",
            "main closing tag",
        )
        # Inside the normal ending, point softly towards the extra message.
        hint = (
            '\n        <div class="el text-el witness-hint" aria-hidden="true">\n'
            '          <span class="witness-hint-text">aún hay algo más…</span>\n'
            '          <span class="witness-hint-arrows"><i></i><i></i></span>\n'
            '        </div>'
        )
        result = replace_once(
            result,
            '        <div class="el text-el s3-t3">¡Te volveremos a escribir para contarte más detalles!</div>',
            '        <div class="el text-el s3-t3">¡Te volveremos a escribir para contarte más detalles!</div>'
            + hint,
            "closing section text",
        )

    # Both OG and Twitter image references must be static absolute URLs.
    if result.count(image_url) != 3:
        raise RuntimeError(
            f"Expected three absolute social-image references, got {result.count(image_url)}"
        )
    return result


def main() -> int:
    args = parse_args()
    config_path = args.config.resolve()
    font_path = args.font.expanduser().resolve()

    if not font_path.is_file():
        raise SystemExit(
            f"Brittany Signature font not found: {font_path}\n"
            "Put a licensed file at tools/fonts/Brittany-Signature.ttf, set "
            "INVITATION_FONT, or pass --font."
        )
    if not HTML_TEMPLATE.is_file() or not ENVELOPE_TEMPLATE.is_file():
        raise SystemExit("index.html or assets/sobre-base.png is missing")

    site_url, invitations = load_configuration(config_path)
    template = HTML_TEMPLATE.read_text(encoding="utf-8")
    generated = 0

    witness_images: dict[str, Path] | None = None
    if any(item.get("witness_name") for item in invitations):
        witness_images = {
            "teaser": render_witness_text(
                WITNESS_TEASER,
                font_path,
                "witness-teaser.png",
                460,
                bottom_pad_ratio=0.22,
            ),
            "title": render_witness_text(
                WITNESS_TITLE, font_path, "witness-title.png", 900
            ),
            "seal": render_witness_seal(font_path),
        }

    for item in invitations:
        (
            slug,
            names,
            envelope_name,
            title,
            description,
            witness_name,
        ) = validate_invitation(item)
        if args.only and slug != args.only:
            continue

        output_directory = OUTPUT_ROOT / slug
        output_directory.mkdir(parents=True, exist_ok=True)
        image_path, layout = generate_envelope(
            envelope_name, font_path, output_directory
        )
        page = generate_html(
            template,
            site_url,
            slug,
            names,
            title,
            description,
            image_path.name,
            witness_name,
            witness_images,
        )
        (output_directory / "index.html").write_text(page, encoding="utf-8")
        generated += 1

        warning = " — compressed to fit" if layout.compressed else ""
        print(
            f"✓ {slug}: {image_path.name}, "
            f"name {layout.width}×{layout.height}px at ({layout.x}, {layout.y})"
            f"{warning}"
        )
        if layout.font_size < MIN_PREFERRED_FONT_SIZE:
            print(
                "  warning: lettering is small; consider a shorter envelope_name",
                file=sys.stderr,
            )

    if args.only and generated == 0:
        raise SystemExit(f"No invitation has slug {args.only!r}")
    print(f"Generated {generated} invitation(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
