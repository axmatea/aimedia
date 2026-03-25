#!/usr/bin/env python3
"""Generate AX Media logo concepts via Fal AI (recraft-v3)."""

import os, sys, json, requests
from pathlib import Path

API_KEY = "53e108a1-4772-4942-b23d-4546a08b4604:0133f34378135065112069db1dd8fc13"
OUT_DIR = Path(__file__).parent.parent / "public" / "logo-gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "Authorization": f"Key {API_KEY}",
    "Content-Type": "application/json",
}

# Using recraft-v3 — best model for logos / graphic design
MODEL = "fal-ai/recraft-v3"

CONCEPTS = [
    {
        "id": "01-blade",
        "prompt": (
            "Minimalist logo design for 'AX MEDIA', pure vector style. "
            "Black background. The letters A and X in bold geometric sans-serif, "
            "white, massive, dominant. A thin sharp red horizontal slash cuts "
            "through the X like a blade. Below in small tracked caps: MEDIA. "
            "No gradients, no shadows, no texture. Maximum aggression through simplicity. "
            "Style: Dieter Rams meets Pavel Durov. Ultra-clean, boardroom-level authority."
        ),
        "style": "vector_illustration",
    },
    {
        "id": "02-stamp",
        "prompt": (
            "Logo concept: bold white square on black background containing "
            "the letters 'AX' in heavy black condensed type — like a stamp or brand mark. "
            "To the right of the square, 'MEDIA' in thin white caps with wide tracking. "
            "Aesthetic: minimal, aggressive, tech brand identity. "
            "No decoration, no effects. Feels like a classified military designation. "
            "Dark background. Red accent dot only."
        ),
        "style": "vector_illustration",
    },
    {
        "id": "03-psychedelic",
        "prompt": (
            "Psychedelic minimalist logo for 'AX MEDIA'. Black background. "
            "Giant letter A in stark white. Giant letter X in electric crimson red #FF2D55. "
            "Letters overlap slightly, creating depth. Subtle glow on the X — like neon, "
            "like a signal from another frequency. 'MEDIA' micro-text below with dot separator. "
            "Mood: underground luxury, Web3, digital aggression. "
            "Like a record label meets a hacker collective. No clutter."
        ),
        "style": "vector_illustration",
    },
    {
        "id": "04-monogram",
        "prompt": (
            "Single-symbol logo mark: the letters A and X fused into one geometric glyph. "
            "White on pure black. The A's peak and the X's diagonals merge into a unified "
            "angular shape — like a weapon or a cipher. Below it, 'AX MEDIA' in micro type "
            "with extreme letter spacing. Reminiscent of Balenciaga or Rick Owens typography "
            "applied to a tech brand. Minimal, iconic, unmistakable."
        ),
        "style": "vector_illustration",
    },
]


def generate(concept: dict) -> str | None:
    print(f"  Generating {concept['id']}...", flush=True)
    payload = {
        "prompt": concept["prompt"],
        "style": concept["style"],
        "image_size": "square_hd",
        "num_images": 1,
    }
    r = requests.post(
        f"https://fal.run/{MODEL}",
        headers=HEADERS,
        json=payload,
        timeout=120,
    )
    if r.status_code != 200:
        print(f"    ✗ Error {r.status_code}: {r.text[:200]}")
        return None

    data = r.json()
    images = data.get("images", [])
    if not images:
        print(f"    ✗ No images returned")
        return None

    url = images[0]["url"]
    # Download the image
    img_r = requests.get(url, timeout=60)
    out_path = OUT_DIR / f"{concept['id']}.png"
    out_path.write_bytes(img_r.content)
    print(f"    ✓ Saved → {out_path.name}")
    return f"/logo-gen/{concept['id']}.png"


if __name__ == "__main__":
    print("🎨 Generating AX Media logo concepts via Fal AI...\n")
    results = []
    for c in CONCEPTS:
        path = generate(c)
        if path:
            results.append({"id": c["id"], "path": path})

    # Write manifest
    manifest = OUT_DIR / "manifest.json"
    manifest.write_text(json.dumps(results, indent=2))
    print(f"\n✅ Done — {len(results)}/{len(CONCEPTS)} generated")
    print(f"   Open: http://localhost:3000/logo-preview-gen.html")
